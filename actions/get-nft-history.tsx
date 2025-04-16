import {
	addNFTHistory,
	getNFTHistoryById,
	updateNFTHistory,
	type NFTHistory,
} from '@/utils/sqlite';
import { api } from '@/lib/axios';

interface NFTHistoryResponse {
	address: string;
	script_hash: string;
	history_count: number;
	result: {
		txid: string;
		collection_id: string;
		collection_index: number;
		collection_name: string;
		nft_contract_id: string;
		nft_name: string;
		nft_symbol: string;
		nft_description: string;
		sender_addresses: string[];
		recipient_addresses: string[];
		time_stamp: number;
		utc_time: string;
		nft_icon: string;
	}[];
}

export async function fetchNFTHistory(address: string, page: number): Promise<NFTHistoryResponse> {
	const response = await api.get(
		`https://turingwallet.xyz/v1/tbc/main/nft/history/address/${address}/page/${page}/size/10`,
	);
	return response.data;
}

export async function syncNFTHistory(address: string, contract_id?: string): Promise<void> {
	try {
		let page = 0;
		const currentTimestamp = Math.floor(Date.now() / 1000);

		while (true) {
			const response = await fetchNFTHistory(address, page);
			let foundExisting = false;

			for (const tx of response.result) {
				if (contract_id && tx.nft_contract_id !== contract_id) {
					continue;
				}

				const existingHistory = await getNFTHistoryById(tx.txid, address);

				if (
					existingHistory &&
					existingHistory.timestamp &&
					existingHistory.timestamp === tx.time_stamp
				) {
					foundExisting = true;
					break;
				}

				if (existingHistory) {
					await updateNFTHistory(
						{
							...existingHistory,
							timestamp: tx.time_stamp || currentTimestamp,
						},
						address,
					);
					continue;
				}

				const senderAddress =
					tx.sender_addresses && tx.sender_addresses.length > 0 && tx.sender_addresses[0]
						? tx.sender_addresses[0]
						: tx.recipient_addresses[0] || '';

				const history: NFTHistory = {
					id: tx.txid,
					send_address: senderAddress,
					receive_address: tx.recipient_addresses[0] || '',
					timestamp: tx.time_stamp || currentTimestamp,
					contract_id: tx.nft_contract_id,
				};

				await addNFTHistory(history, address);
			}

			if (foundExisting || response.result.length < 10) {
				break;
			}

			page++;
		}
	} catch (error) {
		throw new Error('Failed to sync NFT history');
	}
}
