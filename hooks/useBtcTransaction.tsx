import '@/shim';
import { useCallback } from 'react';
import * as bitcoin from 'bitcoinjs-lib';

import { createFromWIF } from '@/lib/taproot';
import { useAccount } from '@/hooks/useAccount';
import { retrieveKeys } from '@/lib/key';
import { api } from '@/lib/axios';

interface UTXO {
	txid: string;
	vout: number;
	value: number;
	address: string;
}

export const useBtcTransaction = () => {
	const getUTXOsFromBlockstream = useCallback(async (address: string): Promise<UTXO[]> => {
		const APIs = [
			{
				url: 'https://blockstream.info/api',
				fetch: async () => {
					const response = await api.get(`https://blockstream.info/api/address/${address}/utxo`);
					return response.data.map((utxo: any) => ({
						txid: utxo.txid,
						vout: utxo.vout,
						value: utxo.value,
						address: address,
					}));
				},
			},
			{
				url: 'https://mempool.space/api',
				fetch: async () => {
					const response = await api.get(`https://mempool.space/api/address/${address}/utxo`);
					return response.data.map((utxo: any) => ({
						txid: utxo.txid,
						vout: utxo.vout,
						value: utxo.value,
						address: address,
					}));
				},
			},
		];

		for (const API of APIs) {
			try {
				return await API.fetch();
			} catch (error) {
				//console.warn(`Failed to fetch UTXOs from ${API.url}:`, error);
				continue;
			}
		}

		throw new Error('Failed to get UTXOs.');
	}, []);

	const getFeeRates = useCallback(async (): Promise<{
		fast: number;
		medium: number;
		slow: number;
	}> => {
		const APIs = [
			{
				url: 'https://mempool.space/api',
				fetch: async () => {
					const response = await api.get('https://mempool.space/api/v1/fees/recommended');
					return {
						fast: response.data.fastestFee,
						medium: response.data.halfHourFee,
						slow: response.data.economyFee,
					};
				},
			},
			{
				url: 'https://blockstream.info/api',
				fetch: async () => {
					const response = await api.get('https://blockstream.info/api/fee-estimates');
					return {
						fast: response.data['1'],
						medium: response.data['3'],
						slow: response.data['6'],
					};
				},
			},
		];

		for (const API of APIs) {
			try {
				return await API.fetch();
			} catch (error) {
				//console.warn(`Failed to fetch fee rates from ${API.url}:`, error);
				continue;
			}
		}

		return {
			fast: 20,
			medium: 10,
			slow: 5,
		};
	}, []);

	const getTxHexBuffer = useCallback(async (txid: string): Promise<Buffer> => {
		const APIs = [
			{
				url: 'https://blockstream.info/api',
				fetch: async () => {
					const response = await api.get(`https://blockstream.info/api/tx/${txid}/hex`);
					return Buffer.from(response.data, 'hex');
				},
			},
			{
				url: 'https://mempool.space/api',
				fetch: async () => {
					const response = await api.get(`https://mempool.space/api/tx/${txid}/hex`);
					return Buffer.from(response.data, 'hex');
				},
			},
		];

		for (const API of APIs) {
			try {
				return await API.fetch();
			} catch (error) {
				//console.warn(`Failed to fetch tx hex from ${API.url}:`, error);
				continue;
			}
		}

		throw new Error('Failed to get transaction data.');
	}, []);

	const selectOptimalUtxos = useCallback(
		(
			utxos: UTXO[],
			amount_btc: number,
			feeRateSatoshisPerByte: number,
		): { selectedUtxos: UTXO[]; totalInputAmount: number } => {
			const amountSatoshis = Math.floor(amount_btc * Math.pow(10, 8));
			const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);
			const singleLargeUtxo = sortedUtxos.find((utxo) => {
				const estimatedSize = 1 * 180 + 2 * 34 + 10;
				const estimatedFee = Math.ceil(estimatedSize * feeRateSatoshisPerByte);
				return utxo.value >= amountSatoshis + estimatedFee;
			});

			if (singleLargeUtxo) {
				return {
					selectedUtxos: [singleLargeUtxo],
					totalInputAmount: singleLargeUtxo.value,
				};
			}

			let selectedUtxos: UTXO[] = [];
			let totalInputAmount = 0;
			const inputFee = Math.ceil(180 * feeRateSatoshisPerByte);
			const baseFee = Math.ceil((2 * 34 + 10) * feeRateSatoshisPerByte);
			let targetAmount = amountSatoshis + baseFee;

			for (const utxo of sortedUtxos) {
				if (utxo.value > inputFee) {
					selectedUtxos.push(utxo);
					totalInputAmount += utxo.value;
					targetAmount += inputFee;

					if (totalInputAmount >= targetAmount) {
						break;
					}
				}
			}

			return { selectedUtxos, totalInputAmount };
		},
		[],
	);

	const createTransaction_taproot = useCallback(
		async (
			recipientAddress: string,
			amount_btc: number,
			feeRateSatoshisPerByte: number,
			utxos: UTXO[],
			totalInputAmount: number,
			password: string,
		): Promise<string> => {
			const network = bitcoin.networks.bitcoin;
			const encryptedKeys = useAccount.getState().getEncryptedKeys();

			if (!encryptedKeys) {
				throw new Error('No keys found');
			}

			const { walletWif } = retrieveKeys(password, encryptedKeys);
			const keyPair = createFromWIF(walletWif);

			const internalPubkey = Buffer.from(keyPair.publicKey.subarray(1, 33));
			const amountSatoshis = Math.floor(amount_btc * Math.pow(10, 8));

			const psbt = new bitcoin.Psbt({ network });

			for (const utxo of utxos) {
				try {
					const txHex = await getTxHexBuffer(utxo.txid);
					const tx = bitcoin.Transaction.fromBuffer(txHex);
					const output = tx.outs[utxo.vout];

					psbt.addInput({
						hash: utxo.txid,
						index: utxo.vout,
						witnessUtxo: {
							script: output.script,
							value: output.value,
						},
						tapInternalKey: internalPubkey,
					});
				} catch (error: any) {
					throw new Error(`Failed to add transaction input: ${error.message}`);
				}
			}

			psbt.addOutput({
				address: recipientAddress,
				value: amountSatoshis,
			});

			const estimatedSize = utxos.length * 150 + 2 * 34 + 10;
			let estimatedFee = Math.ceil(estimatedSize * feeRateSatoshisPerByte);

			const maxFeeRatio = 0.5;
			let actualFeeRate = feeRateSatoshisPerByte;

			if (estimatedFee > amountSatoshis * maxFeeRatio) {
				actualFeeRate = Math.max(1, Math.floor(feeRateSatoshisPerByte / 2));
				const newEstimatedFee = Math.ceil(estimatedSize * actualFeeRate);
				estimatedFee = newEstimatedFee;
			}

			const changeAmount = totalInputAmount - amountSatoshis - estimatedFee;
			if (changeAmount < 0) {
				throw new Error(`Insufficient funds`);
			}

			if (changeAmount > 546) {
				const changeAddress = bitcoin.payments.p2tr({
					internalPubkey: internalPubkey,
					network,
				}).address!;

				psbt.addOutput({
					address: changeAddress,
					value: changeAmount,
				});
			}

			try {
				const tweakedSigner = keyPair.tweak(bitcoin.crypto.taggedHash('TapTweak', internalPubkey));

				for (let i = 0; i < utxos.length; i++) {
					try {
						await psbt.signInputAsync(i, tweakedSigner);
					} catch (error: any) {
						//console.error(`Error signing input ${i}:`, error);
						throw new Error(`Failed to sign input ${i}: ${error.message}`);
					}
				}
				psbt.finalizeAllInputs();
				const tx = psbt.extractTransaction();
				return tx.toHex();
			} catch (error: any) {
				//console.error('Tweak error:', error);
				throw new Error(`Failed to tweak signer: ${error.message}`);
			}
		},
		[getTxHexBuffer, selectOptimalUtxos],
	);

	const createTransaction_legacy = useCallback(
		async (
			recipientAddress: string,
			amount_btc: number,
			feeRateSatoshisPerByte: number,
			utxos: UTXO[],
			totalInputAmount: number,
			password: string,
		): Promise<string> => {
			const network = bitcoin.networks.bitcoin;
			const encryptedKeys = useAccount.getState().getEncryptedKeys();

			if (!encryptedKeys) {
				throw new Error('No keys found');
			}

			const { walletWif } = retrieveKeys(password, encryptedKeys);
			const keyPair = createFromWIF(walletWif);

			const amountSatoshis = Math.floor(amount_btc * Math.pow(10, 8));

			const psbt = new bitcoin.Psbt({ network });

			for (const utxo of utxos) {
				try {
					psbt.addInput({
						hash: utxo.txid,
						index: utxo.vout,
						nonWitnessUtxo: await getTxHexBuffer(utxo.txid),
					});
				} catch (error: any) {
					throw new Error(`${error.message}`);
				}
			}

			psbt.addOutput({
				address: recipientAddress,
				value: amountSatoshis,
			});

			const estimatedSize = utxos.length * 180 + 2 * 34 + 10;
			let estimatedFee = Math.ceil(estimatedSize * feeRateSatoshisPerByte);

			const maxFeeRatio = 0.5;
			let actualFeeRate = feeRateSatoshisPerByte;

			if (estimatedFee > amountSatoshis * maxFeeRatio) {
				actualFeeRate = Math.max(1, Math.floor(feeRateSatoshisPerByte / 2));

				const newEstimatedFee = Math.ceil(estimatedSize * actualFeeRate);

				estimatedFee = newEstimatedFee;
			}

			const changeAmount = totalInputAmount - amountSatoshis - estimatedFee;

			if (changeAmount < 0) {
				throw new Error(`Insufficient funds`);
			}

			if (changeAmount > 546) {
				const changeAddress = bitcoin.payments.p2pkh({
					pubkey: keyPair.publicKey,
					network,
				}).address!;

				psbt.addOutput({
					address: changeAddress,
					value: changeAmount,
				});
			}

			for (let i = 0; i < utxos.length; i++) {
				psbt.signInput(i, keyPair);
			}

			psbt.finalizeAllInputs();

			const tx = psbt.extractTransaction();

			return tx.toHex();
		},
		[getTxHexBuffer, selectOptimalUtxos],
	);

	const calculateTransactionFee = useCallback(
		(
			txHex: string,
			totalInputAmount: number,
		): {
			fee: number;
			feeRate: number;
			txSize: number;
			txVsize: number;
		} => {
			const tx = bitcoin.Transaction.fromHex(txHex);
			const totalOutputAmount = tx.outs.reduce((sum, output) => sum + output.value, 0);
			const fee = totalInputAmount - totalOutputAmount;
			const txSize = tx.byteLength();
			const txWeight = tx.weight();
			const txVsize = Math.ceil(txWeight / 4);
			const feeRate = Math.round((fee / txVsize) * 100) / 100;

			return {
				fee,
				feeRate,
				txSize,
				txVsize,
			};
		},
		[],
	);

	const broadcastTransaction = useCallback(async (txHex: string): Promise<string> => {
		const APIs = [
			{
				url: 'https://blockstream.info/api',
				fetch: async () => {
					const response = await api.post(`https://blockstream.info/api/tx`, txHex);
					return response.data;
				},
			},
			{
				url: 'https://mempool.space/api',
				fetch: async () => {
					const response = await api.post(`https://mempool.space/api/tx`, txHex);
					return response.data;
				},
			},
		];

		for (const API of APIs) {
			try {
				return await API.fetch();
			} catch (error) {
				//console.warn(`Failed to broadcast tx from ${API.url}:`, error);
				continue;
			}
		}

		throw new Error('Failed to broadcast transaction.');
	}, []);

	return {
		getUTXOsFromBlockstream,
		getFeeRates,
		createTransaction_taproot,
		calculateTransactionFee,
		broadcastTransaction,
		createTransaction_legacy,
		selectOptimalUtxos,
	};
};
