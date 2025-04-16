import { api } from '@/lib/axios';
import { addFTHistory, getFTHistoryById, updateFTHistory, type FTHistory } from '@/utils/sqlite';

interface FTHistoryResponse {
	address: string;
	script_hash: string;
	history_count: number;
	result: {
		txid: string;
		ft_contract_id: string;
		ft_balance_change: number;
		ft_decimal: number;
		tx_fee: number;
		sender_combine_script: string[];
		recipient_combine_script: string[];
		time_stamp: number;
		utc_time: string;
	}[];
}

export async function fetchFTHistory(
	address: string,
	contract_id: string,
	page: number,
): Promise<FTHistoryResponse> {
	const response = await api.get(
		`https://turingwallet.xyz/v1/tbc/main/ft/history/address/${address}/contract/${contract_id}/page/${page}/size/10`,
		{ timeout: 20000 },
	);
	return response.data;
}

export async function syncFTHistory(address: string, contract_id: string): Promise<void> {
	try {
		let page = 0;
		const currentTimestamp = Math.floor(Date.now() / 1000);

		while (true) {
			const response = await fetchFTHistory(address, contract_id, page);
			let foundExistingWithSameTimestamp = false;

			for (const tx of response.result) {
				const existingHistory = await getFTHistoryById(tx.txid, address);

				if (
					existingHistory &&
					existingHistory.timestamp &&
					existingHistory.timestamp === tx.time_stamp
				) {
					foundExistingWithSameTimestamp = true;
					break;
				}

				if (existingHistory) {
					await updateFTHistory(
						{
							...existingHistory,
							timestamp: tx.time_stamp || currentTimestamp,
						},
						address,
					);
					continue;
				}

				const senderAddress =
					tx.sender_combine_script &&
					tx.sender_combine_script.length > 0 &&
					tx.sender_combine_script[0]
						? tx.sender_combine_script[0]
						: tx.recipient_combine_script[0] || '';

				const history: FTHistory = {
					id: tx.txid,
					send_address: senderAddress,
					receive_address: tx.recipient_combine_script[0] || '',
					fee: tx.tx_fee,
					timestamp: tx.time_stamp || currentTimestamp,
					contract_id: tx.ft_contract_id,
					balance_change: tx.ft_balance_change,
				};

				await addFTHistory(history, address);
			}

			if (foundExistingWithSameTimestamp || response.result.length < 10) {
				break;
			}

			page++;
		}
	} catch (error) {
		throw new Error('Failed to sync FT history');
	}
}
