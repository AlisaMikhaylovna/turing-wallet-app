import { initCollections } from '@/actions/get-collections';
import { initFTs } from '@/actions/get-fts';
import { initMultiSigs } from '@/actions/get-multiSigs';
import { initNFTs } from '@/actions/get-nfts';
import { initTransactionHistory } from '@/actions/get-transaction-history';

export const initializeWalletData = async (address: string) => {
	try {
		await initCollections(address);
		await initNFTs(address);
		await initFTs(address);
		await initMultiSigs(address);
		await initTransactionHistory(address);
	} catch (error: any) {
		throw new Error(`Failed to initialize wallet data: ${error.message}`);
	}
};