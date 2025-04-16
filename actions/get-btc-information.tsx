import {
	addTransactionHistory,
	getTransactionHistoryById,
	updateTransactionHistory,
} from '@/utils/sqlite';
import { api } from '@/lib/axios';

export async function get_BTC_AddressBalance(address: string): Promise<{
	total: number;
}> {
	const APIs = [
		{
			fetch: async () => {
				const addressInfo = await api.get(`https://blockstream.info/api/address/${address}`);
				const stats = addressInfo.data;
				const chainStats = stats.chain_stats;
				const mempoolStats = stats.mempool_stats;
				const spendableBalance = chainStats.funded_txo_sum - chainStats.spent_txo_sum;
				const unconfirmedBalance = mempoolStats.funded_txo_sum - mempoolStats.spent_txo_sum;
				return (spendableBalance + unconfirmedBalance) * Math.pow(10, -8);
			},
		},
		{
			fetch: async () => {
				const response = await api.get(`https://mempool.space/api/address/${address}`);
				return response.data.chain_stats.funded_txo_sum * Math.pow(10, -8);
			},
		},
	];

	for (const API of APIs) {
		try {
			const total = await API.fetch();
			return { total };
		} catch (error) {
			//console.warn(`Failed to fetch balance`, error);
			continue;
		}
	}

	throw new Error('Failed to get BTC address balance.');
}

async function get_BTC_TransactionHistory(
	address: string,
	limit: number = 30,
): Promise<
	Array<{
		txid: string;
		timestamp: number | null;
		amount: number;
		fee: number;
		senders: string[];
		recipients: string[];
		myAddress: string;
	}>
> {
	const baseUrl = 'https://blockstream.info/api';

	try {
		const response = await api.get(`${baseUrl}/address/${address}/txs/chain/${limit}`);

		const txs = await Promise.all(
			response.data.map(async (tx: any) => {
				const senders = tx.vin
					.map((input: any) => input.prevout.scriptpubkey_address)
					.filter((addr: string | null) => addr !== null);

				if (senders.length === 0) {
					senders.push(address);
				}

				let recipients = tx.vout
					.map((output: any) => output.scriptpubkey_address)
					.filter((addr: string | null) => addr !== null);

				if (recipients.length === 0) {
					recipients.push(address);
				}

				let amount = 0;

				const inputAmount = tx.vin
					.filter((input: any) => input.prevout.scriptpubkey_address === address)
					.reduce((sum: number, input: any) => sum + input.prevout.value, 0);

				const outputAmount = tx.vout
					.filter((output: any) => output.scriptpubkey_address === address)
					.reduce((sum: number, output: any) => sum + output.value, 0);

				amount = outputAmount - inputAmount;

				const result = {
					txid: tx.txid,
					confirmed: tx.status.confirmed,
					timestamp: tx.status.block_time || null,
					amount,
					fee: tx.fee || 0,
					senders: Array.from(new Set(senders)),
					recipients: Array.from(new Set(recipients)),
				};

				return result;
			}),
		);

		return txs;
	} catch (error) {
		throw new Error(`Failed to get BTC transaction history: ${error}`);
	}
}

export async function getBTCPriceInfo(): Promise<{
	currentPrice: number;
	priceChangePercent24h: number;
}> {
	const APIs = [
		{
			fetch: async () => {
				const response = await api.get('https://api.gateio.ws/api/v4/spot/tickers', {
					params: { currency_pair: 'BTC_USDT' },
				});
				return {
					currentPrice: parseFloat(response.data[0].last),
					priceChangePercent24h: parseFloat(response.data[0].change_percentage),
				};
			},
		},
		{
			fetch: async () => {
				const response = await api.get('https://api.huobi.pro/market/detail/merged', {
					params: { symbol: 'btcusdt' },
				});
				return {
					currentPrice: response.data.tick.close,
					priceChangePercent24h:
						((response.data.tick.close - response.data.tick.open) / response.data.tick.open) * 100,
				};
			},
		},
		{
			fetch: async () => {
				const response = await api.get('https://www.okx.com/api/v5/market/ticker', {
					params: { instId: 'BTC-USDT' },
				});
				return {
					currentPrice: parseFloat(response.data.data[0].last),
					priceChangePercent24h:
						((parseFloat(response.data.data[0].last) - parseFloat(response.data.data[0].open24h)) /
							parseFloat(response.data.data[0].open24h)) *
						100,
				};
			},
		},
		{
			fetch: async () => {
				const response = await api.get('https://api.binance.com/api/v3/ticker/24hr', {
					params: { symbol: 'BTCUSDT' },
				});
				return {
					currentPrice: parseFloat(response.data.lastPrice),
					priceChangePercent24h: parseFloat(response.data.priceChangePercent),
				};
			},
		},
		{
			fetch: async () => {
				const response = await api.get('https://api.coingecko.com/api/v3/simple/price', {
					params: {
						ids: 'bitcoin',
						vs_currencies: 'usd',
						include_24hr_change: true,
					},
				});
				return {
					currentPrice: response.data.bitcoin.usd,
					priceChangePercent24h: response.data.bitcoin.usd_24h_change,
				};
			},
		},
	];

	for (const API of APIs) {
		try {
			const priceInfo = await API.fetch();
			return priceInfo;
		} catch (error) {
			//console.warn('Failed to fetch price info', error);
			continue;
		}
	}

	throw new Error('Failed to get BTC price info.');
}

export async function sync_Taproot_TransactionHistory(address: string): Promise<void> {
	try {
		const transactions = await get_BTC_TransactionHistory(address);
		const currentTimestamp = Math.floor(Date.now() / 1000);

		for (const tx of transactions) {
			const existingTx = await getTransactionHistoryById(tx.txid, address);

			if (existingTx && existingTx.timestamp === tx.timestamp) {
				break;
			}

			if (existingTx) {
				await updateTransactionHistory(
					{
						...existingTx,
						timestamp: tx.timestamp || currentTimestamp,
					},
					address,
				);
				continue;
			}

			const history = {
				id: tx.txid,
				send_address: tx.senders[0],
				receive_address: tx.recipients[0],
				fee: tx.fee * Math.pow(10, -8),
				timestamp: tx.timestamp || currentTimestamp,
				type: 'P2TR',
				balance_change: tx.amount * Math.pow(10, -8),
			};

			await addTransactionHistory(history, address, 'taproot');
		}
	} catch (error) {
		throw new Error('Failed to sync BTC transaction history');
	}
}

export async function sync_Legacy_TransactionHistory(address: string): Promise<void> {
	try {
		const transactions = await get_BTC_TransactionHistory(address);
		const currentTimestamp = Math.floor(Date.now() / 1000);

		for (const tx of transactions) {
			const existingTx = await getTransactionHistoryById(tx.txid, address);

			if (existingTx && existingTx.timestamp === tx.timestamp) {
				break;
			}

			if (existingTx) {
				await updateTransactionHistory(
					{
						...existingTx,
						timestamp: tx.timestamp || currentTimestamp,
					},
					address,
				);
				continue;
			}

			const history = {
				id: tx.txid,
				send_address: tx.senders[0],
				receive_address: tx.recipients[0],
				fee: tx.fee * Math.pow(10, -8),
				timestamp: tx.timestamp || currentTimestamp,
				type: 'P2PKH',
				balance_change: tx.amount * Math.pow(10, -8),
			};

			await addTransactionHistory(history, address, 'legacy');
		}
	} catch (error) {
		throw new Error('Failed to sync BTC transaction history');
	}
}
