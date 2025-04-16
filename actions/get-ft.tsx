import { addFTPublic, type FTPublic, getFTPublic, updateFTPublicHoldsCount } from '@/utils/sqlite';
import { api } from '@/lib/axios';

interface FTInfoResponse {
	ftContractId: string;
	ftCodeScript: string;
	ftTapeScript: string;
	ftSupply: number;
	ftDecimal: number;
	ftName: string;
	ftSymbol: string;
	ftDescription: string;
	ftOriginUtxo: string;
	ftCreatorCombineScript: string;
	ftHoldersCount: number;
	ftIconUrl: string;
	ftCreateTimestamp: number;
	ftTokenPrice: string;
}

export async function fetchFTInfo(contract_id: string): Promise<FTInfoResponse> {
	const response = await api.get(
		`https://turingwallet.xyz/v1/tbc/main/ft/info/contract/id/${contract_id}`,
	);
	return response.data;
}

export async function syncFTInfo(contractId: string): Promise<void> {
	try {
		const response = await fetchFTInfo(contractId);
		const existingFTPublic = await getFTPublic(contractId);

		const ftPublicData: FTPublic = {
			id: response.ftContractId,
			name: response.ftName,
			symbol: response.ftSymbol,
			decimal: response.ftDecimal,
			supply: response.ftSupply,
			holds_count: response.ftHoldersCount,
		};

		if (existingFTPublic) {
			await updateFTPublicHoldsCount(contractId, response.ftHoldersCount);
		} else {
			await addFTPublic(ftPublicData);
		}
	} catch (error) {
		throw new Error('Failed to sync FT info');
	}
}
