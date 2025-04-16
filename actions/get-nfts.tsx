import {
	addNFT,
	getAllNFTs,
	getNFT,
	removeNFT,
	updateNFTTransferTimes,
	type NFT,
} from '@/utils/sqlite';
import { api } from '@/lib/axios';

interface NFTResponse {
	nftTotalCount: number;
	nftList: {
		collectionId: string;
		collectionIndex: number;
		collectionName: string;
		collectionIcon: string;
		collectionDescription: string;
		nftContractId: string;
		nftUtxoId: string;
		nftCodeBalance: number;
		nftP2pkhBalance: number;
		nftName: string;
		nftSymbol: string;
		nftAttributes: string;
		nftDescription: string;
		nftTransferTimeCount: number;
		nftHolder: string;
		nftCreateTimestamp: number;
		nftIcon: string;
	}[];
}

export async function fetchNFTs(address: string, page: number): Promise<NFTResponse> {
	const response = await api.get(
		`https://turingwallet.xyz/v1/tbc/main/nft/address/${address}/page/${page}/size/10?if_extra_collection_info_needed=false`,
		{ timeout: 60000 },
	);

	return response.data;
}

export async function fetchNFTCounts_byCollection(collection_id: string): Promise<number> {
	try {
		const response = await api.get(
			`https://turingwallet.xyz/v1/tbc/main/nft/collection/id/${collection_id}/page/0/size/0`,
		);

		return response.data.nftTotalCount;
	} catch (error) {
		//console.error('Failed to fetch NFT counts:', error);
		throw new Error('Failed to fetch NFT counts in collection');
	}
}

export async function getNFTInfo(
	address: string,
): Promise<{ totalCount: number; maxPage: number }> {
	try {
		const response = await fetchNFTs(address, 0);
		const totalCount = response.nftTotalCount;
		const maxPage = Math.ceil(totalCount / 10) - 1;
		return { totalCount, maxPage };
	} catch (error) {
		return { totalCount: 0, maxPage: 0 };
	}
}

export async function initNFTs(address: string): Promise<void> {
	try {
		const { maxPage } = await getNFTInfo(address);
		for (let page = 0; page <= maxPage; page++) {
			const response = await fetchNFTs(address, page);
			for (const nft of response.nftList) {
				const nftData: NFT = {
					id: nft.nftContractId,
					collection_id: nft.collectionId,
					collection_index: nft.collectionIndex,
					name: nft.nftName,
					symbol: nft.nftSymbol,
					description: nft.nftDescription,
					attributes: nft.nftAttributes,
					transfer_times: nft.nftTransferTimeCount,
					icon: nft.nftIcon,
					collection_name: nft.collectionName,
					isDeleted: false,
				};

				await addNFT(nftData, address);
			}
		}
	} catch (error) {
		throw new Error('Failed to initialize NFTs');
	}
}

export async function syncNFTs(address: string): Promise<void> {
	try {
		const { maxPage } = await getNFTInfo(address);
		const apiNFTIds = new Set<string>();

		for (let page = 0; page <= maxPage; page++) {
			const response = await fetchNFTs(address, page);
			for (const nft of response.nftList) {
				apiNFTIds.add(nft.nftContractId);
				const existingNFT = await getNFT(nft.nftContractId);

				if (existingNFT) {
					if (existingNFT.transfer_times !== nft.nftTransferTimeCount) {
						await updateNFTTransferTimes(nft.nftContractId, nft.nftTransferTimeCount);
					}
				} else {
					const nftData: NFT = {
						id: nft.nftContractId,
						collection_id: nft.collectionId,
						collection_index: nft.collectionIndex,
						name: nft.nftName,
						symbol: nft.nftSymbol,
						description: nft.nftDescription,
						attributes: nft.nftAttributes,
						transfer_times: nft.nftTransferTimeCount,
						icon: nft.nftIcon,
						collection_name: nft.collectionName,
						isDeleted: false,
					};

					await addNFT(nftData, address);
				}
			}
		}

		const dbNFTs = await getAllNFTs(address);
		for (const nft of dbNFTs) {
			if (!apiNFTIds.has(nft.id)) {
				await removeNFT(nft.id);
			}
		}
	} catch (error) {
		throw new Error('Failed to sync NFTs');
	}
}

export async function incrementalSyncNFTs(address: string): Promise<void> {
	try {
		let page = 0;
		while (true) {
			const response = await fetchNFTs(address, page);
			let foundUnchanged = false;

			for (const nft of response.nftList) {
				const existingNFT = await getNFT(nft.nftContractId);

				if (existingNFT) {
					if (existingNFT.transfer_times === nft.nftTransferTimeCount) {
						foundUnchanged = true;
						break;
					} else {
						await updateNFTTransferTimes(nft.nftContractId, nft.nftTransferTimeCount);
					}
				} else {
					const nftData: NFT = {
						id: nft.nftContractId,
						collection_id: nft.collectionId,
						collection_index: nft.collectionIndex,
						name: nft.nftName,
						symbol: nft.nftSymbol,
						description: nft.nftDescription,
						attributes: nft.nftAttributes,
						transfer_times: nft.nftTransferTimeCount,
						icon: nft.nftIcon,
						collection_name: nft.collectionName,
						isDeleted: false,
					};

					await addNFT(nftData, address);
				}
			}

			if (foundUnchanged || response.nftList.length < 10) {
				break;
			}

			page++;
		}
	} catch (error) {
		throw new Error('Failed to sync NFTs');
	}
}
