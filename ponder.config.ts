import { createConfig } from 'ponder';
import { gnosis } from 'viem/chains';

import { svZCHFABI } from './abis/svZCHFABI';
import { Address, http } from 'viem';

export const config = {
	[gnosis.id]: {
		rpc: `https://gnosis-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: parseInt(
			process.env.MAX_REQUESTS_PER_SECOND || '50'
		),
		pollingInterval: 5_000,
		svZCHF: '0x6165946250dd04740ab1409217e95a4f38374fe9' as Address,
		bridgedSavings: '0xbF594D0feD79AE56d910Cb01b5dD4f4c57B04402' as Address,
		startBlock: 42067509,
	},
};

export default createConfig({
	chains: {
		[gnosis.name]: {
			id: gnosis.id,
			maxRequestsPerSecond: config[gnosis.id].maxRequestsPerSecond,
			pollingInterval: config[gnosis.id].pollingInterval,
			rpc: http(config[gnosis.id].rpc),
		},
	},
	contracts: {
		svZCHF: {
			chain: gnosis.name,
			abi: svZCHFABI,
			address: config[gnosis.id].svZCHF,
			startBlock: config[gnosis.id].startBlock,
		},
	},
});
