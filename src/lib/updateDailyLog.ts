import { type Context } from 'ponder:registry';
import { config } from '../../ponder.config';
import { ABI } from '../../abis/svZCHF';
import { gnosis } from 'viem/chains';
import { dailyAggregatedLog } from 'ponder:schema';

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

		const svZCHFPrice = await client.readContract({
			address: contractAddress,
			abi: ABI,
			functionName: 'price',
		});

		const totalAssets = await client.readContract({
			address: contractAddress,
			abi: ABI,
			functionName: 'totalAssets',
		});

		const totalShares = await client.readContract({
			address: contractAddress,
			abi: ABI,
			functionName: 'totalSupply',
		});

		await db
			.insert(dailyAggregatedLog)
			.values({
				id: dayId,
				date: dateString,
				chainId,
				depositCount: kind === 'deposit' ? 1n : 0n,
				withdrawCount: kind === 'withdraw' ? 1n : 0n,
				totalDeposits: kind === 'deposit' ? assets : 0n,
				totalWithdrawals: kind === 'withdraw' ? assets : 0n,
				svZCHFPrice,
				totalAssets,
				totalShares,
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
				totalDeposits:
					kind === 'deposit'
						? current.totalDeposits + assets
						: current.totalDeposits,
				totalWithdrawals:
					kind === 'withdraw'
						? current.totalWithdrawals + assets
						: current.totalWithdrawals,
				svZCHFPrice,
				totalAssets,
				totalShares,
			}));
	} catch (error) {
		console.error('Error updating daily log:', error);
		throw error;
	}
}
