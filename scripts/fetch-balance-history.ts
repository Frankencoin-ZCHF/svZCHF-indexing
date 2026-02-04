import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as echarts from 'echarts';
import { createCanvas } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXPORTS_DIR = path.join(__dirname, '../exports');
const CHARTS_DIR = path.join(EXPORTS_DIR, 'balance-charts');
const CHART_WIDTH = 1200;
const CHART_HEIGHT = 600;

const GRAPHQL_ENDPOINT = 'https://ponder.frankencoin.com';
const TOKEN_1 = '0xB58E61C3098d85632Df34EecfB899A1Ed80921cB';
const TOKEN_2 = '0xD4dD9e2F021BB459D5A5f6c24C12fE09c5D45553';
const TOP_ACCOUNTS_LIMIT = 20;

// 2 weeks in seconds
const TWO_WEEKS_SEC = 14 * 24 * 60 * 60;
const NOW_SEC = Math.floor(Date.now() / 1000);
const TWO_WEEKS_AGO_SEC = NOW_SEC - TWO_WEEKS_SEC;

interface BalanceMapping {
	chainId: number;
	account: string;
	balance: string;
}

interface BalanceHistory {
	chainId: number;
	from: string;
	to: string;
	balanceFrom: string;
	balanceTo: string;
	created: string;
}

interface AccountWithHistory {
	account: string;
	chainId: number;
	currentBalance: string;
	history: BalanceHistory[];
}

async function graphqlFetch<T>(query: string): Promise<T> {
	const response = await fetch(GRAPHQL_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ query }),
	});

	if (!response.ok) {
		throw new Error(`GraphQL request failed: ${response.statusText}`);
	}

	const result = await response.json();
	if (result.errors) {
		throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
	}

	return result.data;
}

async function fetchTopAccounts(): Promise<BalanceMapping[]> {
	const query = `
		query TopAccounts {
			eRC20BalanceMappings(
				orderBy: "balance"
				orderDirection: "DESC"
				where: {
					OR: [
						{ token: "${TOKEN_1}" },
						{ token: "${TOKEN_2}" }
					]
				}
				limit: ${TOP_ACCOUNTS_LIMIT}
			) {
				items {
					chainId
					account
					balance
				}
			}
		}
	`;

	const data = await graphqlFetch<{
		eRC20BalanceMappings: { items: BalanceMapping[] };
	}>(query);

	return data.eRC20BalanceMappings.items;
}

async function fetchAccountHistory(
	account: string,
	chainId: number,
): Promise<BalanceHistory[]> {
	const query = `
		query AccountHistory {
			eRC20Balances(
				orderBy: "created"
				orderDirection: "DESC"
				where: {
					chainId: ${chainId}
					created_gte: "${TWO_WEEKS_AGO_SEC}"
					token_in: ["${TOKEN_1}", "${TOKEN_2}"]
					OR: [
						{ to: "${account}" },
						{ from: "${account}" }
					]
				}
			) {
				items {
					chainId
					from
					to
					balanceFrom
					balanceTo
					created
				}
			}
		}
	`;

	const data = await graphqlFetch<{
		eRC20Balances: { items: BalanceHistory[] };
	}>(query);

	return data.eRC20Balances.items;
}

// Helper function to convert wei to decimal (18 decimals)
function weiToDecimal(wei: string): number {
	return Number(BigInt(wei)) / Math.pow(10, 18);
}

// Helper function to format large numbers
function formatLargeNumber(value: number): string {
	const absValue = Math.abs(value);
	if (absValue >= 1e6) {
		return `${(value / 1e6).toFixed(2)}M`;
	} else if (absValue >= 1e3) {
		return `${(value / 1e3).toFixed(1)}K`;
	}
	return value.toFixed(0);
}

// Helper function to format timestamp to date string
function formatTimestamp(timestamp: string): string {
	const date = new Date(Number(timestamp) * 1000);
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get the correct balance for an account from a history entry
function getAccountBalance(account: string, entry: BalanceHistory): number {
	const accountLower = account.toLowerCase();
	if (entry.from.toLowerCase() === accountLower) {
		return weiToDecimal(entry.balanceFrom);
	}
	return weiToDecimal(entry.balanceTo);
}

// Create balance chart for an account
function createAccountChart(accountData: AccountWithHistory, index: number) {
	const canvas = createCanvas(CHART_WIDTH, CHART_HEIGHT);
	const chart = echarts.init(canvas as any);

	// Process history - reverse to chronological order and extract balance points
	const chronologicalHistory = [...accountData.history].reverse();

	const dataPoints = chronologicalHistory.map((entry) => ({
		date: formatTimestamp(entry.created),
		timestamp: Number(entry.created),
		balance: getAccountBalance(accountData.account, entry),
	}));

	// Deduplicate by keeping the latest balance per timestamp
	const uniquePoints = new Map<number, { date: string; balance: number }>();
	for (const point of dataPoints) {
		uniquePoints.set(point.timestamp, {
			date: point.date,
			balance: point.balance,
		});
	}

	const sortedPoints = Array.from(uniquePoints.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([, v]) => v);

	const dates = sortedPoints.map((p) => p.date);
	const balances = sortedPoints.map((p) => p.balance);

	if (balances.length === 0) {
		chart.dispose();
		return null;
	}

	const minBalance = Math.min(...balances);
	const maxBalance = Math.max(...balances);
	const padding = (maxBalance - minBalance) * 0.1 || maxBalance * 0.1;

	const option = {
		title: {
			text: `Balance History: ${accountData.account.slice(0, 8)}...${accountData.account.slice(-6)}`,
			subtext: `Chain ID: ${accountData.chainId}`,
			left: 'center',
			textStyle: {
				fontSize: 18,
				fontWeight: 'bold',
			},
		},
		tooltip: {
			trigger: 'axis',
			formatter: (params: any) => {
				const param = params[0];
				return `${param.name}<br/>Balance: ${formatLargeNumber(param.value)} ZCHF`;
			},
		},
		grid: {
			left: 100,
			right: 60,
			top: 80,
			bottom: 80,
		},
		xAxis: {
			type: 'category',
			data: dates,
			axisLabel: {
				rotate: 45,
				interval: Math.max(0, Math.floor(dates.length / 10) - 1),
			},
		},
		yAxis: {
			type: 'value',
			name: 'Balance (ZCHF)',
			min: Math.max(0, minBalance - padding),
			max: maxBalance + padding,
			axisLabel: {
				formatter: formatLargeNumber,
			},
			splitNumber: 5,
		},
		series: [
			{
				name: 'Balance',
				type: 'line',
				data: balances,
				smooth: true,
				lineStyle: {
					width: 3,
					color: '#5470c6',
				},
				areaStyle: {
					color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
						{ offset: 0, color: 'rgba(84, 112, 198, 0.5)' },
						{ offset: 1, color: 'rgba(84, 112, 198, 0.05)' },
					]),
				},
				symbol: 'circle',
				symbolSize: 6,
			},
		],
	};

	chart.setOption(option);

	const buffer = (chart.getDom() as any).toBuffer('image/png');
	const filename = `${String(index + 1).padStart(3, '0')}-${accountData.account.slice(0, 10)}.png`;
	fs.writeFileSync(path.join(CHARTS_DIR, filename), buffer);

	chart.dispose();
	return filename;
}

async function main() {
	console.log(
		`🔍 Fetching top ${TOP_ACCOUNTS_LIMIT} accounts by balance...\n`,
	);

	const topAccounts = await fetchTopAccounts();
	console.log(`✅ Found ${topAccounts.length} accounts\n`);

	const results: AccountWithHistory[] = [];

	console.log('📊 Fetching 2-week balance history for each account...\n');

	for (let i = 0; i < topAccounts.length; i++) {
		const account = topAccounts[i];
		process.stdout.write(
			`\r  Processing ${i + 1}/${topAccounts.length}: ${account.account.slice(0, 10)}...`,
		);

		try {
			const history = await fetchAccountHistory(
				account.account,
				account.chainId,
			);
			results.push({
				account: account.account,
				chainId: account.chainId,
				currentBalance: account.balance,
				history,
			});
		} catch (error) {
			console.error(
				`\n❌ Error fetching history for ${account.account}:`,
				error,
			);
		}

		// Small delay to avoid rate limiting
		await new Promise((resolve) => setTimeout(resolve, 50));
	}

	console.log('\n\n✅ All accounts processed\n');

	// Export to JSON
	const exportData = {
		generatedAt: new Date().toISOString(),
		periodStart: new Date(TWO_WEEKS_AGO_SEC * 1000).toISOString(),
		periodEnd: new Date(NOW_SEC * 1000).toISOString(),
		tokens: [TOKEN_1, TOKEN_2],
		accounts: results,
	};

	const jsonPath = path.join(EXPORTS_DIR, 'balance-history-2w.json');
	fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2));
	console.log(`📁 Exported JSON to: ${jsonPath}`);

	// Create charts directory
	if (!fs.existsSync(CHARTS_DIR)) {
		fs.mkdirSync(CHARTS_DIR, { recursive: true });
	}

	// Generate charts for each account
	console.log('\n🎨 Generating balance charts...\n');
	let chartsGenerated = 0;

	for (let i = 0; i < results.length; i++) {
		const accountData = results[i]!;
		process.stdout.write(
			`\r  Generating chart ${i + 1}/${results.length}: ${accountData.account.slice(0, 10)}...`,
		);

		if (accountData.history.length > 0) {
			const filename = createAccountChart(accountData, i);
			if (filename) {
				chartsGenerated++;
			}
		}
	}

	console.log(`\n\n✅ Generated ${chartsGenerated} charts`);
	console.log(`📁 Charts saved to: ${CHARTS_DIR}`);

	// Export summary stats
	const totalHistoryEntries = results.reduce(
		(sum, r) => sum + r.history.length,
		0,
	);
	console.log(`\n📈 Summary:`);
	console.log(`   Accounts: ${results.length}`);
	console.log(`   Total history entries: ${totalHistoryEntries}`);
	console.log(`   Charts generated: ${chartsGenerated}`);
}

main().catch(console.error);
