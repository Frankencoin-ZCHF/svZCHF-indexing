import { onchainTable } from 'ponder';

export const dailyAggregatedLog = onchainTable('daily_aggregated_log', (t) => ({
	id: t.text().primaryKey(),
	date: t.text().notNull(),
	chainId: t.integer().notNull(),
	depositCount: t.bigint().notNull().default(0n),
	deposits: t.bigint().notNull().default(0n),
	withdrawCount: t.bigint().notNull().default(0n),
	withdrawals: t.bigint().notNull().default(0n),
	svZCHFPrice: t.bigint(),
	totalAssets: t.bigint(),
	totalShares: t.bigint(),
	nativeYield: t.bigint(),
	impliedYield: t.bigint(),
	timestamp: t.bigint().notNull(),
}));
