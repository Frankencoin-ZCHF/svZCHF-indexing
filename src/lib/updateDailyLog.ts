import { type Context } from 'ponder:registry';
import { config } from '../../ponder.config';
import { gnosis } from 'viem/chains';
import { dailyAggregatedLog } from 'ponder:schema';
import { svZCHFABI } from '../../abis/svZCHFABI';
import { BridgedSavingsABI } from '../../abis/BridgedSavingsABI';

interface UpdateDailyLogProps {
	client: Context['client'];
	db: Context['db'];
	chainId: number;
	timestamp: bigint;
	kind: 'deposit' | 'withdraw';
	assets: bigint;
	shares: bigint;
	txHash: string;
}

export async function updateDailyLog({
	client,
	db,
	chainId,
	timestamp,
	kind,
	assets,
	shares,
	txHash,
}: UpdateDailyLogProps) {
	const dateObj = new Date(parseInt(timestamp.toString()) * 1000);
	const timestampDay = dateObj.setUTCHours(0, 0, 0, 0);
	const dateString =
		dateObj.toISOString().split('T').at(0) || dateObj.toISOString();

	const dayId = `${chainId}-${dateString}`;

	try {
		const contractAddress = config[gnosis.id].svZCHF;
		const savingsAddress = config[gnosis.id].bridgedSavings;

		// Query previous day's entry to get previous price
		const previousDayEntry = (
			await db.sql
				.select()
				.from(dailyAggregatedLog)
				.orderBy(dailyAggregatedLog.timestamp)
				.limit(1)
		)[0];

		const previousPrice = previousDayEntry?.svZCHFPrice;

		const nativeYield = BigInt(
			await client.readContract({
				address: savingsAddress,
				abi: BridgedSavingsABI,
				functionName: 'currentRatePPM',
			}),
		);

		const svZCHFPrice = await client.readContract({
			address: contractAddress,
			abi: svZCHFABI,
			functionName: 'price',
		});

		const totalAssets = await client.readContract({
			address: contractAddress,
			abi: svZCHFABI,
			functionName: 'totalAssets',
		});

		const totalShares = await client.readContract({
			address: contractAddress,
			abi: svZCHFABI,
			functionName: 'totalSupply',
		});

		let timeAliveSec = timestamp - 1757586790n;
		let timeAliveDays =
			parseFloat(String((timeAliveSec * 1000n) / 3600n / 24n)) / 1000;

		// Calculate implied yield in PPM (parts per million), annualized
		let impliedYield = 0n;
		if (previousPrice && previousPrice > 0n) {
			const priceDiff = svZCHFPrice - previousPrice;
			impliedYield = (priceDiff * 1000000n * 365n) / previousPrice;
		}

		// Calculate accumulative yield in PPM (parts per million)
		let accumulativeYield = 0n;
		if (previousPrice && previousPrice > 0n) {
			const totalYield = parseFloat(String(svZCHFPrice)) / 10 ** 18;
			accumulativeYield = BigInt(
				Math.floor(
					(totalYield ** (365000 / timeAliveDays) - 1) * 1000000,
				),
			);
		}

		await db
			.insert(dailyAggregatedLog)
			.values({
				id: dayId,
				date: dateString,
				chainId,
				nativeYield,
				impliedYield,
				accumulativeYield,
				depositCount: kind === 'deposit' ? 1n : 0n,
				deposits: kind === 'deposit' ? assets : 0n,
				withdrawCount: kind === 'withdraw' ? 1n : 0n,
				withdrawals: kind === 'withdraw' ? assets : 0n,
				svZCHFPrice,
				totalAssets,
				totalShares,
				timeAlive: timeAliveSec,
				timestamp: BigInt(timestampDay),
			})
			.onConflictDoUpdate((current) => ({
				depositCount:
					kind === 'deposit'
						? current.depositCount + 1n
						: current.depositCount,
				withdrawCount:
					kind === 'withdraw'
						? current.withdrawCount + 1n
						: current.withdrawCount,
				deposits:
					kind === 'deposit'
						? current.deposits + assets
						: current.deposits,
				withdrawals:
					kind === 'withdraw'
						? current.withdrawals + assets
						: current.withdrawals,
				svZCHFPrice,
				totalAssets,
				totalShares,
				nativeYield,
				impliedYield,
			}));
	} catch (error) {
		console.error('Error updating daily log:', error);
		throw error;
	}
}
