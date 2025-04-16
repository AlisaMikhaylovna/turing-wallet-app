import '@/shim';
import { useCallback } from 'react';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { useAccount } from '@/hooks/useAccount';
import { useUtxo } from '@/hooks/useUtxo';
import { retrieveKeys } from '@/lib/key';
import { calculateFee } from '@/lib/util';
import { StoredUtxo, Transaction } from '@/types';
import { getTaprootTweakPrivateKey } from '@/lib/taproot-legacy';
import { fetchUTXOs } from '@/actions/get-utxos';

export const useTbcTransaction = () => {
	const { isTaprootLegacyAccount, getCurrentAccountUtxos, updateCurrentAccountUtxos } =
		useAccount();
	const { getUTXOs } = useUtxo();

	const sendTbc = useCallback(
		async (
			address_from: string,
			receive_address: string,
			tbc_amount: number,
			password: string,
		): Promise<Transaction> => {
			try {
				const satoshis_amount = Math.floor(tbc_amount * 1e6);
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys);
				let privateKey: tbc.PrivateKey;
				if (isTaprootLegacyAccount()) {
					privateKey = tbc.PrivateKey.fromString(getTaprootTweakPrivateKey(walletWif));
				} else {
					privateKey = tbc.PrivateKey.fromString(walletWif);
				}
				const tx = new tbc.Transaction();
				const utxos = await getUTXOs(address_from, tbc_amount + 0.001);
				if (receive_address.startsWith('1')) {
					tx.from(utxos).to(receive_address, satoshis_amount);
					if (tx.getEstimateSize() < 1000) {
						tx.fee(80);
					} else {
						tx.feePerKb(100);
					}
					tx.change(address_from).sign(privateKey).seal();
					const fee = tx.getFee();
					return {
						txHex: tx.uncheckedSerialize(),
						fee,
						address_to: receive_address,
						utxos: utxos.map((utxo) => ({
							...utxo,
							height: 0,
							isSpented: false,
							address: address_from,
						})),
						satoshis: satoshis_amount,
					};
				} else {
					const txraw = contract.MultiSig.p2pkhToMultiSig_sendTBC(
						address_from,
						receive_address,
						tbc_amount,
						utxos,
						privateKey,
					);
					return {
						txHex: txraw,
						fee: calculateFee(txraw),
						address_to: receive_address,
						utxos: utxos.map((utxo) => ({
							...utxo,
							height: 0,
							isSpented: false,
							address: address_from,
						})),
						satoshis: satoshis_amount,
					};
				}
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[isTaprootLegacyAccount],
	);

	const sendTbc_multiSig_create = useCallback(
		async (address_from: string, address_to: string, tbc_amount: number, password: string) => {
			try {
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				const script_asm = contract.MultiSig.getMultiSigLockScript(address_from);
				const umtxos = await contract.API.getUMTXOs(script_asm, tbc_amount + 0.001, 'mainnet');
				const multiTxraw = contract.MultiSig.buildMultiSigTransaction_sendTBC(
					address_from,
					address_to,
					tbc_amount,
					umtxos,
				);
				const sigs = contract.MultiSig.signMultiSigTransaction_sendTBC(
					address_from,
					multiTxraw,
					privateKey,
				);
				return { multiTxraw, sigs };
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	const sendTbc_multiSig_sign = useCallback(
		(multiSigAddress: string, multiTxraw: contract.MultiSigTxRaw, password: string): string[] => {
			try {
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				const sigs = contract.MultiSig.signMultiSigTransaction_sendTBC(
					multiSigAddress,
					multiTxraw,
					privateKey,
				);
				return sigs;
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	const sendTbc_multiSig_finish = useCallback(
		async (multiSigTxraw: contract.MultiSigTxRaw, sigs: string[][], pubKeys: string[]) => {
			try {
				const txraw = contract.MultiSig.finishMultiSigTransaction_transferFT(
					multiSigTxraw.txraw,
					sigs,
					pubKeys,
				);
				const txId = await contract.API.broadcastTXraw(txraw, 'mainnet');
				if (txId) {
					return txId;
				} else {
					throw new Error('Failed to broadcast transaction.');
				}
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	const createMultiSigWallet = useCallback(
		async (
			pubKeys: string[],
			sigCount: number,
			address_from: string,
			password: string,
		): Promise<string> => {
			try {
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				const utxos = await getUTXOs(address_from, 0.01);
				const txraw = contract.MultiSig.createMultiSigWallet(
					address_from,
					pubKeys,
					sigCount,
					pubKeys.length,
					utxos,
					privateKey,
				);
				const storedUtxos = utxos.map((utxo) => ({
					...utxo,
					height: 0,
					isSpented: false,
					address: address_from,
				}));

				try {
					await finish_transaction(txraw, storedUtxos);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);

						const utxos_new = await getUTXOs(address_from, 0.01);
						const newTxraw = contract.MultiSig.createMultiSigWallet(
							address_from,
							pubKeys,
							sigCount,
							pubKeys.length,
							utxos_new,
							privateKey,
						);
						const storedUtxos_new = utxos_new.map((utxo) => ({
							...utxo,
							height: 0,
							isSpented: false,
							address: address_from,
						}));
						await finish_transaction(newTxraw, storedUtxos_new);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}

				return contract.MultiSig.getMultiSigAddress(pubKeys, sigCount, pubKeys.length);
			} catch (error: any) {
				throw new Error('Failed to create MultiSig wallet!');
			}
		},
		[getUTXOs],
	);

	const finish_transaction = useCallback(
		async (txHex: string, utxos: StoredUtxo[]) => {
			try {
				const txId = await contract.API.broadcastTXraw(txHex);
				const address = useAccount.getState().getCurrentAccountAddress();
				if (txId) {
					let currentUtxos = getCurrentAccountUtxos(address);
					const updatedUtxos = currentUtxos!.map((utxo) => {
						const isSpent = utxos!.some(
							(spentUtxo) =>
								spentUtxo.txId === utxo.txId && spentUtxo.outputIndex === utxo.outputIndex,
						);
						return isSpent ? { ...utxo, isSpented: true } : utxo;
					});

					await updateCurrentAccountUtxos(updatedUtxos, address);
					return txId;
				}
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[getCurrentAccountUtxos, updateCurrentAccountUtxos],
	);

	return {
		sendTbc,
		sendTbc_multiSig_create,
		sendTbc_multiSig_sign,
		sendTbc_multiSig_finish,
		finish_transaction,
		createMultiSigWallet,
	};
};
