import { ponder } from 'ponder:registry';
import { updateDailyLog } from './lib/updateDailyLog';

ponder.on('svZCHF:Deposit', async ({ event, context }) => {
	await updateDailyLog({
		client: context.client,
		db: context.db,
		chainId: context.chain.id,
		timestamp: event.block.timestamp,
		kind: 'deposit',
		assets: event.args.assets,
		shares: event.args.shares,
		txHash: event.transaction.hash,
	});
});

ponder.on('svZCHF:Withdraw', async ({ event, context }) => {
	await updateDailyLog({
		client: context.client,
		db: context.db,
		chainId: context.chain.id,
		timestamp: event.block.timestamp,
		kind: 'withdraw',
		assets: event.args.assets,
		shares: event.args.shares,
		txHash: event.transaction.hash,
	});
});
