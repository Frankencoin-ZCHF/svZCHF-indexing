import { onchainTable } from 'ponder';

export const dailyAggregatedLog = onchainTable('daily_aggregated_log', (t) => ({
	id: t.text().primaryKey(),
	date: t.text().notNull(),
	chainId: t.integer().notNull(),
	depositCount: t.bigint().notNull().default(0n),
	withdrawCount: t.bigint().notNull().default(0n),
	totalDeposits: t.bigint().notNull().default(0n),
	totalWithdrawals: t.bigint().notNull().default(0n),
	svZCHFPrice: t.bigint(),
	totalAssets: t.bigint(),
	totalShares: t.bigint(),
	timestamp: t.bigint().notNull(),
}));
