import {
	addTransactionHistory,
	getTransactionHistoryById,
	getTransactionHistoryCount,
	updateTransactionHistory,
} from '@/utils/sqlite';
import { selectAddress } from '@/lib/util';
import { api } from '@/lib/axios';

interface TransactionHistoryResponse {
	address: string;
	script: string;
	history_count: number;
	result: {
		balance_change: string;
		banlance_change: string;
		tx_hash: string;
		sender_addresses: string[];
		recipient_addresses: string[];
		fee: string;
		time_stamp: number;
		utc_time: string;
		tx_type: string;
	}[];
}

export async function fetchTransactionHistory(
	address: string,
	page: number,
): Promise<TransactionHistoryResponse> {
	const response = await api.get(
		`https://turingwallet.xyz/v1/tbc/main/address/${address}/history/page/${page}`,
		{ timeout: 20000 },
	);
	return response.data;
}

export async function getTransactionHistoryInfo(
	address: string,
): Promise<{ totalCount: number; maxPage: number }> {
	try {
		const response = await fetchTransactionHistory(address, 0);
		const totalCount = response.history_count;
		const maxPage = Math.ceil(totalCount / 10) - 1;
		return { totalCount, maxPage };
	} catch (error) {
		return { totalCount: 0, maxPage: 0 };
	}
}

export async function initTransactionHistory(address: string): Promise<void> {
	try {
		const { maxPage } = await getTransactionHistoryInfo(address);
		for (let page = 0; page <= maxPage; page++) {
			const response = await fetchTransactionHistory(address, page);

			for (const tx of response.result) {
				const [sendAddress, receiveAddress] =
					tx.tx_type === 'P2MS'
						? [selectAddress(tx.sender_addresses), selectAddress(tx.recipient_addresses)]
						: [tx.sender_addresses[0] || '', tx.recipient_addresses[0] || ''];

				const history = {
					id: tx.tx_hash,
					send_address: sendAddress,
					receive_address: receiveAddress,
					fee: parseFloat(tx.fee),
					timestamp: tx.time_stamp,
					type: tx.tx_type === 'P2MS' ? 'TBC MS' : tx.tx_type,
					balance_change: parseFloat(tx.balance_change),
				};
				await addTransactionHistory(history, address, 'tbc');
			}
		}
	} catch (error) {
		throw new Error('Failed to initialize transaction history');
	}
}

export async function syncTransactionHistory(address: string): Promise<void> {
	try {
		const { totalCount } = await getTransactionHistoryInfo(address);
		const dbCount = await getTransactionHistoryCount(address, 'tbc');
		if (dbCount === totalCount) {
			return;
		}
		const currentTimestamp = Math.floor(Date.now() / 1000);
		let page = 0;
		while (true) {
			const response = await fetchTransactionHistory(address, page);
			let foundExistingWithSameTimestamp = false;
			for (const tx of response.result) {
				const existingTx = await getTransactionHistoryById(tx.tx_hash, address);
				if (existingTx && existingTx.timestamp && existingTx.timestamp === tx.time_stamp) {
					foundExistingWithSameTimestamp = true;
					break;
				}

				if (existingTx) {
					await updateTransactionHistory(
						{
							...existingTx,
							timestamp: tx.time_stamp || currentTimestamp,
						},
						address,
					);
					continue;
				}

				const [sendAddress, receiveAddress] =
					tx.tx_type === 'P2MS'
						? [selectAddress(tx.sender_addresses), selectAddress(tx.recipient_addresses)]
						: [tx.sender_addresses[0] || '', tx.recipient_addresses[0] || ''];

				const history = {
					id: tx.tx_hash,
					send_address: sendAddress,
					receive_address: receiveAddress,
					fee: parseFloat(tx.fee),
					timestamp: tx.time_stamp || currentTimestamp,
					type: tx.tx_type === 'P2MS' ? 'TBC MS' : tx.tx_type,
					balance_change: parseFloat(tx.balance_change),
				};
				await addTransactionHistory(history, address, 'tbc');
			}

			if (foundExistingWithSameTimestamp || response.result.length < 10) {
				break;
			}

			page++;
		}
	} catch (error) {
		throw new Error('Failed to sync transaction history');
	}
}
