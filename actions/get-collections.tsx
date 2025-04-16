import { addCollection, getCollection, getCollectionCount, type Collection } from '@/utils/sqlite';
import { api } from '@/lib/axios';

interface CollectionResponse {
	collectionCount: number;
	collectionList: {
		collectionId: string;
		collectionName: string;
		collectionCreator: string;
		collectionSymbol: string;
		collectionAttributes: string;
		collectionDescription: string;
		collectionSupply: number;
		collectionCreateTimestamp: number;
		collectionIcon: string;
	}[];
}

export async function fetchCollections(address: string, page: number): Promise<CollectionResponse> {
	const response = await api.get(
		`https://turingwallet.xyz/v1/tbc/main/nft/collection/address/${address}/page/${page}/size/10`,
		{ timeout: 60000 },
	);
	return response.data;
}

export async function getCollectionInfo(
	address: string,
): Promise<{ totalCount: number; maxPage: number }> {
	try {
		const response = await fetchCollections(address, 0);
		const totalCount = response.collectionCount;
		const maxPage = Math.ceil(totalCount / 10) - 1;
		return { totalCount, maxPage };
	} catch (error) {
		return { totalCount: 0, maxPage: 0 };
	}
}

export async function initCollections(address: string): Promise<void> {
	try {
		const { maxPage } = await getCollectionInfo(address);
		for (let page = 0; page <= maxPage; page++) {
			const response = await fetchCollections(address, page);
			for (const col of response.collectionList) {
				const collection: Collection = {
					id: col.collectionId,
					name: col.collectionName,
					supply: col.collectionSupply,
					creator: col.collectionCreator,
					icon: col.collectionIcon,
					isDeleted: false,
				};
				await addCollection(collection, address);
			}
		}
	} catch (error) {
		throw new Error('Failed to initialize collections');
	}
}

export async function syncCollections(address: string): Promise<void> {
	try {
		const { totalCount } = await getCollectionInfo(address);
		const dbCount = await getCollectionCount(address);

		if (dbCount === totalCount) {
			return;
		}

		let page = 0;
		while (true) {
			const response = await fetchCollections(address, page);
			let foundExisting = false;

			for (const col of response.collectionList) {
				const existingCollection = await getCollection(col.collectionId);
				if (existingCollection) {
					foundExisting = true;
					break;
				}

				const collection: Collection = {
					id: col.collectionId,
					name: col.collectionName,
					supply: col.collectionSupply,
					creator: col.collectionCreator,
					icon: col.collectionIcon,
					isDeleted: false,
				};
				await addCollection(collection, address);
			}

			if (foundExisting || response.collectionList.length < 10) {
				break;
			}

			page++;
		}
	} catch (error) {
		throw new Error('Failed to sync collections');
	}
}
