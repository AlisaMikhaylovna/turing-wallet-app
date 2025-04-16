import '@/shim';
import { useCallback } from 'react';
import * as tbc from 'tbc-lib-js';

import { fetchUTXOs } from '@/actions/get-utxos';
import { useAccount } from '@/hooks/useAccount';
import { StoredUtxo } from '@/types';

export const useUtxo = () => {
	const { getCurrentAccountUtxos, updateCurrentAccountUtxos } = useAccount();

	const getUTXOs = useCallback(
		async (address: string, tbc_amount: number): Promise<tbc.Transaction.IUnspentOutput[]> => {
			try {
				const satoshis_amount = Math.floor(tbc_amount * 1e6);
				let utxos = getCurrentAccountUtxos(address);

				if (!utxos || utxos.length === 0) {
					utxos = await fetchUTXOs(address);
					await updateCurrentAccountUtxos(utxos, address);
					let utxo_amount = utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0);
					if (utxo_amount < satoshis_amount) {
						throw new Error('Insufficient tbc balance.');
					}
				} else {
					let utxo_amount = utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0);
					if (utxo_amount < satoshis_amount) {
						utxos = await fetchUTXOs(address);
						if (!utxos || utxos.length === 0) {
							throw new Error('The balance in the account is zero.');
						}
						await updateCurrentAccountUtxos(utxos, address);
						utxo_amount = utxos.reduce((acc, utxo) => acc + utxo.satoshis, 0);
						if (utxo_amount < satoshis_amount) {
							throw new Error('Insufficient tbc balance.');
						}
					}
				}

				const scriptPubKey = tbc.Script.buildPublicKeyHashOut(address).toBuffer().toString('hex');
				utxos.sort((a, b) => a.satoshis - b.satoshis);
				const largeUTXO = utxos.find((utxo) => utxo.satoshis >= satoshis_amount);
				if (largeUTXO) {
					return [
						{
							txId: largeUTXO.txId,
							outputIndex: largeUTXO.outputIndex,
							satoshis: largeUTXO.satoshis,
							script: scriptPubKey,
						},
					];
				}

				const maxHeight = Math.max(...utxos.map((utxo) => utxo.height));
				let prioritizedUTXOs = utxos.filter((utxo) => maxHeight - utxo.height > 300);

				let selectedUTXOs: StoredUtxo[] = [];
				let accumulatedSatoshis = 0;

				for (const utxo of prioritizedUTXOs) {
					selectedUTXOs.push(utxo);
					accumulatedSatoshis += utxo.satoshis;
					if (accumulatedSatoshis >= satoshis_amount) {
						break;
					}
				}

				if (accumulatedSatoshis < satoshis_amount) {
					for (const utxo of utxos) {
						if (!selectedUTXOs.includes(utxo)) {
							selectedUTXOs.push(utxo);
							accumulatedSatoshis += utxo.satoshis;
							if (accumulatedSatoshis >= satoshis_amount) {
								break;
							}
						}
					}
				}

				return selectedUTXOs.map((utxo) => ({
					txId: utxo.txId,
					outputIndex: utxo.outputIndex,
					satoshis: utxo.satoshis,
					script: scriptPubKey,
				}));
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[getCurrentAccountUtxos, updateCurrentAccountUtxos, fetchUTXOs],
	);

	return {
		getUTXOs,
	};
};
