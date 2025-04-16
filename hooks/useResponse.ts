import '@/shim';
import { useCallback } from 'react';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { useAccount } from '@/hooks/useAccount';
import { useFtTransaction } from '@/hooks/useFtTransaction';
import { useNftTransaction } from '@/hooks/useNftTransaction';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { retrieveKeys } from '@/lib/key';
import { fetchUTXOs } from '@/actions/get-utxos';
import {
	addCollection,
	addNFT,
	getCollection,
	getFT,
	removeFT,
	removeNFT,
	transferFT,
	updateNFTTransferTimes,
	updateNFTUserAddress,
	upsertFT,
} from '@/utils/sqlite';
import { fetchNFTCounts_byCollection } from '@/actions/get-nfts';
import { getTaprootTweakPrivateKey } from '@/lib/taproot-legacy';

export interface SendTransactionResponse {
	txid?: string;
	error?: string;
}

export interface SendTransactionRequest {
	flag:
		| 'P2PKH'
		| 'COLLECTION_CREATE'
		| 'NFT_CREATE'
		| 'NFT_TRANSFER'
		| 'FT_MINT'
		| 'FT_TRANSFER'
		| 'POOLNFT_MINT'
		| 'POOLNFT_INIT'
		| 'POOLNFT_LP_INCREASE'
		| 'POOLNFT_LP_CONSUME'
		| 'POOLNFT_SWAP_TO_TOKEN'
		| 'POOLNFT_SWAP_TO_TBC'
		| 'POOLNFT_MERGE'
		| 'FTLP_MERGE';
	satoshis?: number;
	address?: string;
	collection_data?: string;
	ft_data?: string;
	nft_data?: string;
	collection_id?: string;
	nft_contract_address?: string;
	ft_contract_address?: string;
	tbc_amount?: number;
	ft_amount?: number;
	merge_times?: number;
	with_lock?: boolean;
	poolNFT_version?: number;
	serviceFeeRate?: number;
	serverProvider_tag?: string;
}

interface FTData {
	name: string;
	symbol: string;
	decimal: number;
	amount: number;
}

export const useResponse = () => {
	const {
		getCurrentAccountAddress,
		updateCurrentAccountUtxos,
		getAllAccountAddresses,
		getAddresses,
		isTaprootLegacyAccount,
	} = useAccount();
	const { sendTbc, finish_transaction } = useTbcTransaction();
	const { getUTXO, mergeFT, sendFT, getFTUtxoByContractId } = useFtTransaction();
	const { createCollection, createNFT, transferNFT } = useNftTransaction();

	const sendTbcResponse = useCallback(
		async (address_to: string, amount: number, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
				const { txHex, utxos } = await sendTbc(address_from, address_to, amount, password);

				let txid: string | undefined;
				try {
					txid = await finish_transaction(txHex, utxos!);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);

						const result = await sendTbc(address_from, address_to, amount, password);
						txid = await finish_transaction(result.txHex, result.utxos!);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}

				if (!txid) {
					throw new Error('Failed to broadcast transaction.');
				}

				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, sendTbc, finish_transaction],
	);

	const createCollectionResponse = useCallback(
		async (collection_data: contract.CollectionData, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
				const { txHex, utxos } = await createCollection(collection_data, address_from, password);

				let txid: string | undefined;
				try {
					txid = await finish_transaction(txHex, utxos!);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);

						const result = await createCollection(collection_data, address_from, password);
						txid = await finish_transaction(result.txHex, result.utxos!);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}

				if (!txid) {
					throw new Error('Failed to broadcast transaction.');
				} else {
					await addCollection(
						{
							id: txid,
							name: collection_data.collectionName,
							supply: collection_data.supply,
							creator: address_from,
							icon: collection_data.file,
							isDeleted: false,
						},
						address_from,
					);
				}

				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, createCollection, finish_transaction],
	);

	const createNFTResponse = useCallback(
		async (collection_id: string, nft_data: contract.NFTData, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
				const collection = await getCollection(collection_id);
				if (!nft_data.file) {
					nft_data.file = collection?.icon || '';
				}
				const { txHex, utxos } = await createNFT(collection_id, nft_data, address_from, password);
				let txid: string | undefined;
				try {
					txid = await finish_transaction(txHex, utxos!);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);

						const result = await createNFT(collection_id, nft_data, address_from, password);
						txid = await finish_transaction(result.txHex, result.utxos!);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}

				if (!txid) {
					throw new Error('Failed to broadcast transaction.');
				} else {
					const collectionIndex = await fetchNFTCounts_byCollection(collection_id);
					await addNFT(
						{
							id: txid,
							collection_id: collection_id,
							collection_index: collectionIndex + 1,
							name: nft_data.nftName,
							symbol: nft_data.symbol,
							description: nft_data.description,
							attributes: nft_data.attributes,
							transfer_times: 0,
							icon: nft_data.file || '',
							collection_name: collection?.name || '',
							isDeleted: false,
						},
						address_from,
					);
				}

				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, createNFT, finish_transaction],
	);

	const transferNFTResponse = useCallback(
		async (contract_id: string, address_to: string, transfer_times: number, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
				const { txHex, utxos } = await transferNFT(
					contract_id,
					address_from,
					address_to,
					transfer_times,
					password,
				);
				let txid: string | undefined;
				try {
					txid = await finish_transaction(txHex, utxos!);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);

						const result = await transferNFT(
							contract_id,
							address_from,
							address_to,
							transfer_times,
							password,
						);
						txid = await finish_transaction(result.txHex, result.utxos!);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}

				if (!txid) {
					throw new Error('Failed to broadcast transaction.');
				} else {
					if (address_to === address_from) {
						await updateNFTTransferTimes(contract_id, transfer_times + 1);
					} else {
						const allAddresses = getAllAccountAddresses();

						if (allAddresses.includes(address_to)) {
							await updateNFTUserAddress(contract_id, address_to);
						} else {
							await removeNFT(contract_id);
						}
					}
				}

				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, transferNFT, finish_transaction],
	);

	const mintFTResponse = useCallback(
		async (ft_data: FTData, password: string) => {
			try {
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

				const address_from = getCurrentAccountAddress();
				const utxo = await getUTXO(address_from, 0.01, password);
				const newToken = new contract.FT({
					name: ft_data.name,
					symbol: ft_data.symbol,
					amount: ft_data.amount,
					decimal: ft_data.decimal,
				});
				let [txSourceRaw, txMintRaw]: [string, string] = ['', ''];
				[txSourceRaw, txMintRaw] = newToken.MintFT(privateKey, address_from, utxo);
				let txSourceId: string | undefined;
				try {
					txSourceId = await finish_transaction(txSourceRaw, [
						{ ...utxo, height: 0, isSpented: false, address: address_from },
					]);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);
						const utxo_new = await getUTXO(address_from, 0.01, password);

						[txSourceRaw, txMintRaw] = newToken.MintFT(privateKey, address_from, utxo_new);
						txSourceId = await finish_transaction(txSourceRaw, [
							{ ...utxo_new, height: 0, isSpented: false, address: address_from },
						]);
					} else {
						throw new Error('Failed to broadcast sourcetransaction.');
					}
				}

				if (!txSourceId) {
					return { error: 'broadcast-source-transaction-failed' };
				}
				const txid = await contract.API.broadcastTXraw(txMintRaw);
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				} else {
					await upsertFT(
						{
							id: txid,
							name: ft_data.name,
							symbol: ft_data.symbol,
							decimal: ft_data.decimal,
							amount: ft_data.amount,
							isDeleted: false,
						},
						address_from,
					);
				}

				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	const transferFTResponse = useCallback(
		async (contract_id: string, address_to: string, amount: number, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
				const { txHex, utxos } = await sendFT(
					contract_id,
					address_from,
					address_to,
					amount,
					password,
				);
				let txid: string | undefined;
				try {
					txid = await finish_transaction(txHex, utxos!);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);

						const result = await sendFT(contract_id, address_from, address_to, amount, password);
						txid = await finish_transaction(result.txHex, result.utxos!);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				} else {
					const allAccountAddresses = getAllAccountAddresses();
					const senderToken = await getFT(contract_id, address_from);
					if (address_to !== address_from) {
						if (
							allAccountAddresses.includes(address_to) ||
							getAddresses().tbcAddress === address_to ||
							getAddresses().taprootLegacyAddress === address_to
						) {
							const receiverToken = await getFT(contract_id, address_to);

							if (receiverToken) {
								await transferFT(
									contract_id,
									Math.floor(Number(amount) * Math.pow(10, receiverToken.decimal)),
									address_to,
								);
							} else {
								if (senderToken) {
									await upsertFT(
										{
											id: contract_id,
											name: senderToken.name,
											decimal: senderToken.decimal,
											amount: Math.floor(Number(amount) * Math.pow(10, senderToken.decimal)),
											symbol: senderToken.symbol,
											isDeleted: false,
										},
										address_to,
									);
								}
							}
						}
						if (senderToken) {
							await transferFT(
								contract_id,
								-Math.floor(Number(amount) * Math.pow(10, senderToken.decimal)),
								address_from,
							);
							const updatedSenderToken = await getFT(contract_id, address_from);
							if (updatedSenderToken && updatedSenderToken.amount <= 0) {
								await removeFT(contract_id, address_from);
							}
						}
					}
				}

				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, sendFT, finish_transaction],
	);

	const mintPoolNFTResponse = useCallback(
		async (
			contractId: string,
			with_lock: boolean,
			poolNFT_version: number,
			serviceFeeRate: number,
			serverProvider_tag: string,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
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

				const utxo = await getUTXO(address_from, 0.01, password);
				let txSourceRaw: string = '';
				let txMintRaw: string = '';
				if (poolNFT_version === 1) {
					const pool = new contract.poolNFT({ network: 'mainnet' });
					await pool.initCreate(contractId);
					with_lock
						? ([txSourceRaw, txMintRaw] = await pool.createPoolNftWithLock(privateKey, utxo))
						: ([txSourceRaw, txMintRaw] = await pool.createPoolNFT(privateKey, utxo));
					let txSourceId: string | undefined;
					try {
						txSourceId = await finish_transaction(txSourceRaw, [
							{ ...utxo, height: 0, isSpented: false, address: address_from },
						]);
					} catch (error: any) {
						if (
							error.message.includes('Missing inputs') ||
							error.message.includes('txn-mempool-conflict')
						) {
							const newUtxos = await fetchUTXOs(address_from);
							await updateCurrentAccountUtxos(newUtxos, address_from);
							const utxo_new = await getUTXO(address_from, 0.01, password);
							with_lock
								? ([txSourceRaw, txMintRaw] = await pool.createPoolNftWithLock(
										privateKey,
										utxo_new,
								  ))
								: ([txSourceRaw, txMintRaw] = await pool.createPoolNFT(privateKey, utxo_new));
							txSourceId = await finish_transaction(txSourceRaw, [
								{ ...utxo_new, height: 0, isSpented: false, address: address_from },
							]);
						} else {
							throw new Error('Failed to broadcast source transaction.');
						}
					}
					if (!txSourceId) {
						return { error: 'broadcast-source-transaction-failed' };
					}
					const txid = await contract.API.broadcastTXraw(txMintRaw);
					if (!txid) {
						return { error: 'broadcast-transaction-failed' };
					}
					return { txid };
				} else {
					const pool = new contract.poolNFT2({ network: 'mainnet' });
					pool.initCreate(contractId);
					with_lock
						? ([txSourceRaw, txMintRaw] = await pool.createPoolNftWithLock(
								privateKey,
								utxo,
								serverProvider_tag,
								serviceFeeRate,
						  ))
						: ([txSourceRaw, txMintRaw] = await pool.createPoolNFT(
								privateKey,
								utxo,
								serverProvider_tag,
								serviceFeeRate,
						  ));
					let txSourceId: string | undefined;
					try {
						txSourceId = await finish_transaction(txSourceRaw, [
							{ ...utxo, height: 0, isSpented: false, address: address_from },
						]);
					} catch (error: any) {
						if (
							error.message.includes('Missing inputs') ||
							error.message.includes('txn-mempool-conflict')
						) {
							const newUtxos = await fetchUTXOs(address_from);
							await updateCurrentAccountUtxos(newUtxos, address_from);
							const utxo_new = await getUTXO(address_from, 0.01, password);
							with_lock
								? ([txSourceRaw, txMintRaw] = await pool.createPoolNftWithLock(
										privateKey,
										utxo_new,
										serverProvider_tag,
										serviceFeeRate,
								  ))
								: ([txSourceRaw, txMintRaw] = await pool.createPoolNFT(
										privateKey,
										utxo_new,
										serverProvider_tag,
										serviceFeeRate,
								  ));
							txSourceId = await finish_transaction(txSourceRaw, [
								{ ...utxo_new, height: 0, isSpented: false, address: address_from },
							]);
						} else {
							throw new Error('Failed to broadcast source transaction.');
						}
					}
					if (!txSourceId) {
						return { error: 'broadcast-source-transaction-failed' };
					}
					const txid = await contract.API.broadcastTXraw(txMintRaw);
					if (!txid) {
						return { error: 'broadcast-transaction-failed' };
					}
					return { txid };
				}
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	const initPoolNFTResponse = useCallback(
		async (
			contractId: string,
			address_to: string,
			tbc_amount: number,
			ft_amount: number,
			poolNFT_version: number,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
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

				const utxo = await getUTXO(address_from, tbc_amount + 0.01, password);
				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();

				const ftUtxo = await getFTUtxoByContractId(
					address_from,
					ft_amount,
					poolUse.ft_a_contractTxid,
				);
				if (!ftUtxo) {
					await mergeFT(poolUse.ft_a_contractTxid, address_from, password);
				}

				let txHex = await poolUse.initPoolNFT(privateKey, address_to, utxo, tbc_amount, ft_amount);
				let txid: string | undefined;
				try {
					txid = await finish_transaction(txHex, [
						{ ...utxo, height: 0, isSpented: false, address: address_from },
					]);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);
						const utxo_new = await getUTXO(address_from, tbc_amount + 0.01, password);
						await poolUse.initfromContractId();
						txHex = await poolUse.initPoolNFT(
							privateKey,
							address_to,
							utxo_new,
							tbc_amount,
							ft_amount,
						);
						txid = await finish_transaction(txHex, [
							{ ...utxo_new, height: 0, isSpented: false, address: address_from },
						]);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}

				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	const increaseLPResponse = useCallback(
		async (
			contractId: string,
			address_to: string,
			tbc_amount: number,
			poolNFT_version: number,
			password: string,
		) => {
			const tbcAmount: number = tbc_amount;
			try {
				const address_from = getCurrentAccountAddress();
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

				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: contractId,
						network: 'mainnet',
					});
				}

				await poolUse.initfromContractId();
				let ft_amount = BigInt(0);
				if (BigInt(poolUse.tbc_amount) > BigInt(Math.floor(tbcAmount * Math.pow(10, 6)))) {
					ft_amount =
						(BigInt(poolUse.ft_a_amount) * BigInt(Math.pow(10, 6))) /
						BigInt(
							(BigInt(poolUse.tbc_amount) * BigInt(Math.pow(10, 6))) /
								BigInt(Math.floor(tbcAmount * Math.pow(10, 6))),
						);
				} else {
					ft_amount =
						(BigInt(poolUse.ft_a_amount) *
							BigInt(
								(BigInt(Math.floor(tbcAmount * Math.pow(10, 6))) * BigInt(Math.pow(10, 6))) /
									BigInt(poolUse.tbc_amount),
							)) /
						BigInt(Math.pow(10, 6));
				}

				const ftUtxoSuit = await getFTUtxoByContractId(
					address_from,
					ft_amount,
					poolUse.ft_a_contractTxid,
				);
				if (!ftUtxoSuit) {
					await mergeFT(poolUse.ft_a_contractTxid, address_from, password);
				}

				const utxo = await getUTXO(address_from, tbcAmount + 0.01, password);
				let txHex = await poolUse.increaseLP(privateKey, address_to, utxo, tbcAmount);
				let txid: string | undefined;
				try {
					txid = await finish_transaction(txHex, [
						{ ...utxo, height: 0, isSpented: false, address: address_from },
					]);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);
						const utxo_new = await getUTXO(address_from, tbcAmount + 0.01, password);
						await poolUse.initfromContractId();
						txHex = await poolUse.increaseLP(privateKey, address_to, utxo_new, tbcAmount);
						txid = await finish_transaction(txHex, [
							{ ...utxo_new, height: 0, isSpented: false, address: address_from },
						]);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}

				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, mergeFT, finish_transaction],
	);

	const consumeLPResponse = useCallback(
		async (
			contractId: string,
			address_to: string,
			ft_amount: number,
			poolNFT_version: number,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
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

				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();

				const utxo = await getUTXO(address_from, 0.01, password);
				let txHex: string = '';

				try {
					txHex = await poolUse.consumeLP(privateKey, address_to, utxo, ft_amount);
				} catch (error: any) {
					if (error.message.includes('Please merge FT-LP UTXOs')) {
						try {
							await mergeFTLPResponse(contractId, poolNFT_version, password);
						} catch (mergeError: any) {
							throw new Error('Failed to merge FT-LP: ' + mergeError.message);
						}
					} else if (error.message.includes('Insufficient PoolTbc, please merge FT UTXOs')) {
						try {
							await poolNFTMergeResponse(contractId, 10, poolNFT_version, password);
						} catch (mergeError: any) {
							throw new Error('Failed to merge poolNFT: ' + mergeError.message);
						}
					} else {
						throw new Error(error.message);
					}
				}

				if (txHex.length === 0) {
					try {
						const utxo = await getUTXO(address_from, 0.01, password);
						await poolUse.initfromContractId();
						txHex = await poolUse.consumeLP(privateKey, address_to, utxo, ft_amount);
					} catch (error: any) {
						if (error.message.includes('Insufficient PoolTbc, please merge FT UTXOs')) {
							try {
								await poolNFTMergeResponse(contractId, 10, poolNFT_version, password);
							} catch (mergeError: any) {
								throw new Error('Failed to merge poolNFT: ' + mergeError.message);
							}
						} else {
							throw new Error(error.message);
						}
					}
				}

				if (txHex.length === 0) {
					try {
						const utxo = await getUTXO(address_from, 0.01, password);
						await poolUse.initfromContractId();
						txHex = await poolUse.consumeLP(privateKey, address_to, utxo, ft_amount);
					} catch (error: any) {
						if (error.message.includes('Insufficient PoolTbc, please merge FT UTXOs')) {
							try {
								await poolNFTMergeResponse(contractId, 10, poolNFT_version, password);
							} catch (mergeError: any) {
								throw new Error('Failed to merge poolNFT: ' + mergeError.message);
							}
						} else {
							throw new Error(error.message);
						}
					}
				}

				if (txHex.length === 0) {
					const utxo = await getUTXO(address_from, 0.01, password);
					await poolUse.initfromContractId();
					txHex = await poolUse.consumeLP(privateKey, address_to, utxo, ft_amount);
				}

				let txid: string | undefined;
				try {
					txid = await finish_transaction(txHex, [
						{ ...utxo, height: 0, isSpented: false, address: address_from },
					]);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);
						const utxo_new = await getUTXO(address_from, 0.01, password);
						await poolUse.initfromContractId();
						txHex = await poolUse.consumeLP(privateKey, address_to, utxo_new, ft_amount);
						txid = await finish_transaction(txHex, [
							{ ...utxo_new, height: 0, isSpented: false, address: address_from },
						]);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	const swapToTbcResponse = useCallback(
		async (
			poolNft_contractId: string,
			address_to: string,
			ft_amount: number,
			poolNFT_version: number,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
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

				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: poolNft_contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: poolNft_contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();

				const ftUtxoSuit = await getFTUtxoByContractId(
					address_from,
					ft_amount,
					poolUse.ft_a_contractTxid,
				);
				if (!ftUtxoSuit) {
					await mergeFT(poolUse.ft_a_contractTxid, address_from, password);
				}

				const utxo = await getUTXO(address_from, 0.01, password);
				let txHex: string = '';
				try {
					txHex = await poolUse.swaptoTBC_baseToken(privateKey, address_to, utxo, ft_amount);
				} catch (error: any) {
					if (error.message.includes('Insufficient PoolTbc, please merge FT UTXOs')) {
						try {
							await poolNFTMergeResponse(poolNft_contractId, 10, poolNFT_version, password);
						} catch (mergeError: any) {
							throw new Error('Failed to merge poolNFT: ' + mergeError.message);
						}
					} else {
						throw new Error(error.message);
					}
				}

				if (txHex.length === 0) {
					const utxo = await getUTXO(address_from, 0.01, password);
					await poolUse.initfromContractId();
					txHex = await poolUse.swaptoTBC_baseToken(privateKey, address_to, utxo, ft_amount);
				}
				let txid: string | undefined;
				try {
					txid = await finish_transaction(txHex, [
						{ ...utxo, height: 0, isSpented: false, address: address_from },
					]);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);
						const utxo_new = await getUTXO(address_from, 0.01, password);
						await poolUse.initfromContractId();
						txHex = await poolUse.swaptoTBC_baseToken(privateKey, address_to, utxo_new, ft_amount);
						txid = await finish_transaction(txHex, [
							{ ...utxo_new, height: 0, isSpented: false, address: address_from },
						]);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, mergeFT, finish_transaction],
	);

	const swapToTokenResponse = useCallback(
		async (
			contractId: string,
			address_to: string,
			tbc_amount: number,
			poolNFT_version: number,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
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

				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();

				const utxo = await getUTXO(address_from, tbc_amount + 0.01, password);
				let txHex: string = '';
				try {
					txHex = await poolUse.swaptoToken_baseTBC(privateKey, address_to, utxo, tbc_amount);
				} catch (error: any) {
					if (error.message.includes('Insufficient PoolFT, please merge FT UTXOs')) {
						try {
							await poolNFTMergeResponse(contractId, 10, poolNFT_version, password);
						} catch (mergeError: any) {
							throw new Error('Failed to merge poolNFT: ' + mergeError.message);
						}
					} else {
						throw new Error(error.message);
					}
				}
				if (txHex.length === 0) {
					const utxo = await getUTXO(address_from, tbc_amount + 0.01, password);
					await poolUse.initfromContractId();
					txHex = await poolUse.swaptoToken_baseTBC(privateKey, address_to, utxo, tbc_amount);
				}
				let txid: string | undefined;
				try {
					txid = await finish_transaction(txHex, [
						{ ...utxo, height: 0, isSpented: false, address: address_from },
					]);
				} catch (error: any) {
					if (
						error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict')
					) {
						const newUtxos = await fetchUTXOs(address_from);
						await updateCurrentAccountUtxos(newUtxos, address_from);
						const utxo_new = await getUTXO(address_from, tbc_amount + 0.01, password);
						await poolUse.initfromContractId();
						txHex = await poolUse.swaptoToken_baseTBC(privateKey, address_to, utxo_new, tbc_amount);
						txid = await finish_transaction(txHex, [
							{ ...utxo_new, height: 0, isSpented: false, address: address_from },
						]);
					} else {
						throw new Error('Failed to broadcast transaction.');
					}
				}
				if (!txid) {
					return { error: 'broadcast-transaction-failed' };
				}
				return { txid };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, mergeFT, finish_transaction],
	);

	const poolNFTMergeResponse = useCallback(
		async (
			poolNft_contractId: string,
			merge_times: number,
			poolNFT_version: number,
			password: string,
		) => {
			try {
				const address_from = getCurrentAccountAddress();
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

				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: poolNft_contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: poolNft_contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();
				let txids: string[] = [];
				for (let i = 0; i < merge_times; i++) {
					const utxo = await getUTXO(address_from, 0.01, password);
					let txHex = await poolUse.mergeFTinPool(privateKey, utxo);
					if (txHex === true) break;
					let txid: string | undefined;
					try {
						txid = await finish_transaction(txHex as string, [
							{ ...utxo, height: 0, isSpented: false, address: address_from },
						]);
					} catch (error: any) {
						if (
							error.message.includes('Missing inputs') ||
							error.message.includes('txn-mempool-conflict')
						) {
							const newUtxos = await fetchUTXOs(address_from);
							await updateCurrentAccountUtxos(newUtxos, address_from);
							const utxo_new = await getUTXO(address_from, 0.01, password);
							await poolUse.initfromContractId();
							txHex = await poolUse.mergeFTinPool(privateKey, utxo_new);
							txid = await finish_transaction(txHex as string, [
								{ ...utxo_new, height: 0, isSpented: false, address: address_from },
							]);
						} else {
							throw new Error('Failed to broadcast transaction.');
						}
					}

					if (!txid) {
						return { error: 'broadcast-transaction-failed' };
					}

					txids[i] = txid;
					if (i < merge_times - 1) {
						await new Promise((resolve) => setTimeout(resolve, 3000));
					}
				}

				return { txid: txids.join(', ') };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	const mergeFTLPResponse = useCallback(
		async (poolNft_contractId: string, poolNFT_version: number, password: string) => {
			try {
				const address_from = getCurrentAccountAddress();
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

				let poolUse;
				if (poolNFT_version === 1) {
					poolUse = new contract.poolNFT({
						txidOrParams: poolNft_contractId,
						network: 'mainnet',
					});
				} else {
					poolUse = new contract.poolNFT2({
						txid: poolNft_contractId,
						network: 'mainnet',
					});
				}
				await poolUse.initfromContractId();
				let txids: string[] = [];
				for (let i = 0; i < 10; i++) {
					const utxo = await getUTXO(address_from, 0.01, password);
					let txHex = await poolUse.mergeFTLP(privateKey, utxo);
					if (txHex === true) break;
					let txid: string | undefined;
					try {
						txid = await finish_transaction(txHex as string, [
							{ ...utxo, height: 0, isSpented: false, address: address_from },
						]);
					} catch (error: any) {
						if (
							error.message.includes('Missing inputs') ||
							error.message.includes('txn-mempool-conflict')
						) {
							const newUtxos = await fetchUTXOs(address_from);
							await updateCurrentAccountUtxos(newUtxos, address_from);
							const utxo_new = await getUTXO(address_from, 0.01, password);
							await poolUse.initfromContractId();
							txHex = await poolUse.mergeFTLP(privateKey, utxo_new);
							txid = await finish_transaction(txHex as string, [
								{ ...utxo_new, height: 0, isSpented: false, address: address_from },
							]);
						} else {
							throw new Error('Failed to broadcast transaction.');
						}
					}

					if (!txid) {
						return { error: 'broadcast-transaction-failed' };
					}
					txids[i] = txid;
					if (i < 9) {
						await new Promise((resolve) => setTimeout(resolve, 3000));
					}
				}
				return { txid: txids.join(', ') };
			} catch (error: any) {
				return { error: error.message ?? 'unknown' };
			}
		},
		[getCurrentAccountAddress, getUTXO, finish_transaction],
	);

	return {
		sendTbcResponse,
		createCollectionResponse,
		createNFTResponse,
		transferNFTResponse,
		mintFTResponse,
		transferFTResponse,
		mintPoolNFTResponse,
		initPoolNFTResponse,
		increaseLPResponse,
		consumeLPResponse,
		swapToTbcResponse,
		swapToTokenResponse,
		poolNFTMergeResponse,
		mergeFTLPResponse,
	};
};
