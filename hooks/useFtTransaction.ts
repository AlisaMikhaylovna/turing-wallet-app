import '@/shim';
import { useCallback } from 'react';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { fetchUTXOs } from '@/actions/get-utxos';
import { useAccount } from '@/hooks/useAccount';
import { MultiSigTransaction } from '@/hooks/useMultiSigTransaction';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { api } from '@/lib/axios';
import { retrieveKeys } from '@/lib/key';
import { getTaprootTweakPrivateKey } from '@/lib/taproot-legacy';
import { calculateFee } from '@/lib/util';
import { Transaction } from '@/types';
import { getMultiSigPubKeys } from '@/utils/sqlite';

export const useFtTransaction = () => {
	const {
		isTaprootLegacyAccount,
		updateCurrentAccountUtxos,
		getCurrentAccountUtxos,
		getCurrentAccountTbcPubKey,
	} = useAccount();
	const { sendTbc_multiSig_create, sendTbc_multiSig_sign, sendTbc_multiSig_finish, sendTbc } =
		useTbcTransaction();

	const sendFT = useCallback(
		async (
			contractId: string,
			address_from: string,
			address_to: string,
			ft_amount: number,
			password: string,
		): Promise<Transaction> => {
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
				const Token = new contract.FT(contractId);
				const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid);
				Token.initialize(TokenInfo);
				const transferTokenAmountBN = BigInt(Math.floor(ft_amount * Math.pow(10, Token.decimal)));
				const ftutxo_codeScript = contract.FT.buildFTtransferCode(Token.codeScript, address_from)
					.toBuffer()
					.toString('hex');
				let ftutxos: tbc.Transaction.IUnspentOutput[] = [];
				try {
					ftutxos = await contract.API.fetchFtUTXOs(
						Token.contractTxid,
						address_from,
						ftutxo_codeScript,
						'mainnet',
						transferTokenAmountBN,
					);
				} catch (error: any) {
					if (error.message.includes('Insufficient FTbalance, please merge FT UTXOs')) {
						try {
							await mergeFT(contractId, address_from, password);
						} catch (error: any) {
							throw new Error(error.message);
						}
					} else {
						throw new Error(error.message);
					}
				}
				if (ftutxos.length === 0) {
					ftutxos = await contract.API.fetchFtUTXOs(
						Token.contractTxid,
						address_from,
						ftutxo_codeScript,
						'mainnet',
						transferTokenAmountBN,
					);
				}
				let preTXs: tbc.Transaction[] = [];
				let prepreTxDatas: string[] = [];
				for (let i = 0; i < ftutxos.length; i++) {
					preTXs.push(await contract.API.fetchTXraw(ftutxos[i].txId, 'mainnet'));
					prepreTxDatas.push(
						await contract.API.fetchFtPrePreTxData(preTXs[i], ftutxos[i].outputIndex, 'mainnet'),
					);
				}
				const utxo = await getUTXO(address_from, 0.01, password);
				let txHex = '';
				if (address_to.startsWith('1')) {
					txHex = Token.transfer(
						privateKey,
						address_to,
						ft_amount,
						ftutxos,
						utxo,
						preTXs,
						prepreTxDatas,
					);
				} else {
					txHex = contract.MultiSig.p2pkhToMultiSig_transferFT(
						address_from,
						address_to,
						Token,
						ft_amount,
						utxo,
						ftutxos,
						preTXs,
						prepreTxDatas,
						privateKey,
					);
				}

				return {
					txHex,
					fee: calculateFee(txHex),
					address_to,
					utxos: [utxo].map((u) => ({
						...u,
						height: 0,
						isSpented: false,
						address: address_from,
					})),
				};
			} catch (error: any) {
				if (
					error.message &&
					(error.message.includes('length') ||
						error.message.includes('Invalid') ||
						error.message.includes('Password') ||
						error.message.includes('required') ||
						error.message.includes('too short') ||
						error.message.includes('string') ||
						error.message.includes('input'))
				) {
					return {
						txHex: '',
						fee: 0,
						address_to: '',
						utxos: [],
					};
				}
				throw error;
			}
		},
		[isTaprootLegacyAccount],
	);

	const mergeFT = useCallback(
		async (contractId: string, address_from: string, password: string) => {
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
				const Token = new contract.FT(contractId);
				const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid);
				Token.initialize(TokenInfo);
				const ftutxo_codeScript = contract.FT.buildFTtransferCode(Token.codeScript, address_from)
					.toBuffer()
					.toString('hex');
				const utxo = await getUTXO(address_from, 0.01, password);
				for (let i = 0; i < 10; i++) {
					const ftutxos = await contract.API.fetchFtUTXOs(
						Token.contractTxid,
						address_from,
						ftutxo_codeScript,
					);
					let preTXs: tbc.Transaction[] = [];
					let prepreTxDatas: string[] = [];
					for (let i = 0; i < ftutxos.length; i++) {
						preTXs.push(await contract.API.fetchTXraw(ftutxos[i].txId));
						prepreTxDatas.push(
							await contract.API.fetchFtPrePreTxData(preTXs[i], ftutxos[i].outputIndex),
						);
					}
					let txHex = Token.mergeFT(privateKey, ftutxos, utxo, preTXs, prepreTxDatas);
					if (txHex === true) break;
					let txId: string;
					try {
						txId = await contract.API.broadcastTXraw(txHex as string);
					} catch (error: any) {
						if (
							error.message.includes('Missing inputs') ||
							error.message.includes('txn-mempool-conflict')
						) {
							const newUtxos = await fetchUTXOs(address_from);
							await updateCurrentAccountUtxos(newUtxos, address_from);
							const utxo_new = await getUTXO(address_from, 0.01, password);
							txHex = Token.mergeFT(privateKey, ftutxos, utxo_new, preTXs, prepreTxDatas);
							txId = await contract.API.broadcastTXraw(txHex as string);
						} else {
							throw new Error('Failed to merge FT UTXO!');
						}
					}
					if (!txId) {
						throw new Error('Failed to merge FT UTXO!');
					}
					if (i < 9) {
						await new Promise((resolve) => setTimeout(resolve, 3000));
					}
				}
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	const transferFT_multiSig_create = useCallback(
		async (
			contractId: string,
			address_from: string,
			address_to: string,
			ft_amount: number,
			password: string,
		) => {
			try {
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys);
				const privateKey = tbc.PrivateKey.fromString(walletWif);
				const script_asm = contract.MultiSig.getMultiSigLockScript(address_from);
				const umtxo = await contract.API.fetchUMTXO(script_asm, 0.01, 'mainnet');
				const Token = new contract.FT(contractId);
				const TokenInfo = await contract.API.fetchFtInfo(Token.contractTxid, 'mainnet');
				Token.initialize(TokenInfo);
				const transferTokenAmountBN = BigInt(Math.floor(ft_amount * Math.pow(10, Token.decimal)));
				const hash_from = tbc.crypto.Hash.sha256ripemd160(
					tbc.crypto.Hash.sha256(tbc.Script.fromASM(script_asm).toBuffer()),
				).toString('hex');
				const ftutxo_codeScript = contract.FT.buildFTtransferCode(Token.codeScript, hash_from)
					.toBuffer()
					.toString('hex');
				const ftutxos = await contract.API.fetchFtUTXOS_multiSig(
					Token.contractTxid,
					hash_from,
					ftutxo_codeScript,
					transferTokenAmountBN,
					'mainnet',
				);
				let preTXs: tbc.Transaction[] = [];
				let prepreTxDatas: string[] = [];
				for (let i = 0; i < ftutxos.length; i++) {
					preTXs.push(await contract.API.fetchTXraw(ftutxos[i].txId, 'mainnet'));
					prepreTxDatas.push(
						await contract.API.fetchFtPrePreTxData(preTXs[i], ftutxos[i].outputIndex, 'mainnet'),
					);
				}
				const contractTX = await contract.API.fetchTXraw(umtxo.txId, 'mainnet');
				const multiSigTxraw = contract.MultiSig.buildMultiSigTransaction_transferFT(
					address_from,
					address_to,
					Token,
					ft_amount,
					umtxo,
					ftutxos,
					preTXs,
					prepreTxDatas,
					contractTX,
					privateKey,
				);
				const sigs = contract.MultiSig.signMultiSigTransaction_transferFT(
					address_from,
					multiSigTxraw,
					privateKey,
				);
				return { multiSigTxraw, sigs };
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	const transferFT_multiSig_sign = useCallback(
		(
			multiSigAddress: string,
			multiSigTxraw: contract.MultiSigTxRaw,
			password: string,
		): string[] => {
			try {
				const encryptedKeys = useAccount.getState().getEncryptedKeys();

				if (!encryptedKeys) {
					throw new Error('No keys found');
				}

				const { walletWif } = retrieveKeys(password, encryptedKeys);
				const privateKey = tbc.PrivateKey.fromString(walletWif);

				return contract.MultiSig.signMultiSigTransaction_transferFT(
					multiSigAddress,
					multiSigTxraw,
					privateKey,
				);
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	const transferFT_multiSig_finish = useCallback(
		async (
			multiSigTxraw: contract.MultiSigTxRaw,
			sigs: string[][],
			pubKeys: string[],
		): Promise<string> => {
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

	const createMultiSigTransaction = useCallback(
		async (
			address_from: string,
			address_to: string,
			amount: number,
			password: string,
			contractId?: string,
		) => {
			try {
				const url = 'https://turingwallet.xyz/multy/sig/create/history';
				const pubKey = getCurrentAccountTbcPubKey();
				if (!pubKey) {
					throw new Error('No public Key found');
				}
				const pubKeys = await getMultiSigPubKeys(address_from);
				if (!pubKeys) {
					throw new Error('No pubKeys list found');
				}

				if (!contractId) {
					const { multiTxraw, sigs } = await sendTbc_multiSig_create(
						address_from,
						address_to,
						amount,
						password,
					);
					const { txraw, amounts } = multiTxraw;
					const request = {
						unsigned_txid: tbc.crypto.Hash.sha256sha256(Buffer.from(txraw, 'hex')).toString('hex'),
						tx_raw: txraw,
						vin_balance_list: amounts,
						multi_sig_address: address_from,
						ft_contract_id: '',
						ft_decimal: 6,
						balance: amount * 1e6,
						receiver_addresses: [address_to],
						pubkey_list: pubKeys,
						signature_data: {
							pubkey: pubKey,
							sig_list: sigs,
						},
					};
					const response = await api.post(url, request);

					const { status, message } = response.data;

					if (status !== 0) {
						throw new Error(`Transaction failed: ${message}`);
					}
				} else {
					const { multiSigTxraw, sigs } = await transferFT_multiSig_create(
						contractId,
						address_from,
						address_to,
						amount,
						password,
					);
					const { txraw, amounts } = multiSigTxraw;
					const ft = new contract.FT(contractId);
					const TokenInfo = await contract.API.fetchFtInfo(ft.contractTxid, 'mainnet');
					ft.initialize(TokenInfo);
					const request = {
						unsigned_txid: tbc.crypto.Hash.sha256sha256(Buffer.from(txraw, 'hex')).toString('hex'),
						tx_raw: txraw,
						vin_balance_list: amounts,
						multi_sig_address: address_from,
						ft_contract_id: contractId,
						ft_decimal: ft.decimal,
						balance: Math.floor(amount * Math.pow(10, ft.decimal)),
						receiver_addresses: [address_to],
						pubkey_list: pubKeys,
						signature_data: {
							pubkey: pubKey,
							sig_list: sigs,
						},
					};
					const response = await api.post(url, request);

					const { status, message } = response.data;

					if (status !== 0) {
						throw new Error(`Transaction failed: ${message}`);
					}
				}
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[getCurrentAccountTbcPubKey, sendTbc_multiSig_create],
	);

	const signMultiSigTransaction = useCallback(
		async (multiTransaction: MultiSigTransaction, password: string) => {
			try {
				let sigs: string[] = [];
				if (multiTransaction.ft_contract_id) {
					sigs = transferFT_multiSig_sign(
						multiTransaction.multi_sig_address,
						{
							txraw: multiTransaction.tx_raw,
							amounts: multiTransaction.json_info.vin_balance_list,
						},
						password,
					);
				} else {
					sigs = sendTbc_multiSig_sign(
						multiTransaction.multi_sig_address,
						{
							txraw: multiTransaction.tx_raw,
							amounts: multiTransaction.json_info.vin_balance_list,
						},
						password,
					);
				}
				const request = { pubkey: getCurrentAccountTbcPubKey(), sig_list: sigs };
				const response = await api.post(
					`https://turingwallet.xyz/multy/sig/add/multi/sig/${multiTransaction.unsigned_txid}`,
					request,
				);
				if (response.data.status == 0) {
					return;
				} else {
					throw new Error(`Transaction failed: ${response.data.message}`);
				}
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	const finishMultiSigTransaction = useCallback(async (multiTransaction: MultiSigTransaction) => {
		try {
			const sigs: string[][] = multiTransaction.json_info.collected_sig_list[0].sig_list.map(
				(_, colIndex) =>
					multiTransaction.json_info.collected_sig_list.map((item) => item.sig_list[colIndex]),
			);
			let txId: string;
			if (multiTransaction.ft_contract_id) {
				txId = await transferFT_multiSig_finish(
					{ txraw: multiTransaction.tx_raw, amounts: multiTransaction.json_info.vin_balance_list },
					sigs,
					multiTransaction.json_info.pubkey_list,
				);
			} else {
				txId = await sendTbc_multiSig_finish(
					{ txraw: multiTransaction.tx_raw, amounts: multiTransaction.json_info.vin_balance_list },
					sigs,
					multiTransaction.json_info.pubkey_list,
				);
			}
			const response = await api.get(
				`https://turingwallet.xyz/multy/sig/notice/${multiTransaction.unsigned_txid}`,
				{
					params: { txid: txId },
				},
			);
			if (response.data.status == 0) {
				return;
			} else {
				throw new Error(`Transaction failed: ${response.data.message}`);
			}
		} catch (error: any) {
			throw new Error(error.message);
		}
	}, []);

	const withdrawMultiSigTransaction = useCallback(async (txId: string) => {
		try {
			const response = await api.get(`https://turingwallet.xyz/multy/sig/withdraw/history/${txId}`);
			if (response.data.status == 0) {
				return;
			} else {
				throw new Error(`Withdraw failed: ${response.data.message}`);
			}
		} catch (error: any) {
			throw new Error(error.message);
		}
	}, []);

	const getUTXO = useCallback(
		async (
			address: string,
			tbc_amount: number,
			password: string,
		): Promise<tbc.Transaction.IUnspentOutput> => {
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
					return {
						txId: largeUTXO.txId,
						outputIndex: largeUTXO.outputIndex,
						satoshis: largeUTXO.satoshis,
						script: scriptPubKey,
					};
				} else {
					let {
						txHex,
						utxos: spentUtxos,
						satoshis,
					} = await sendTbc(address, address, tbc_amount, password);
					let txId: string;
					try {
						txId = await contract.API.broadcastTXraw(txHex);
					} catch (error: any) {
						if (
							error.message.includes('Missing inputs') ||
							error.message.includes('txn-mempool-conflict')
						) {
							const newUtxos = await fetchUTXOs(address);
							await updateCurrentAccountUtxos(newUtxos, address);
							const result = await sendTbc(address, address, tbc_amount, password);
							txHex = result.txHex;
							spentUtxos = result.utxos;
							satoshis = result.satoshis;
							txId = await contract.API.broadcastTXraw(txHex);
						} else {
							throw new Error('Failed to broadcast transaction.');
						}
					}

					if (txId) {
						let currentUtxos = getCurrentAccountUtxos(address);
						const updatedUtxos = currentUtxos!.map((utxo) => {
							const isSpent = spentUtxos!.some(
								(spentUtxo) =>
									spentUtxo.txId === utxo.txId && spentUtxo.outputIndex === utxo.outputIndex,
							);
							return isSpent ? { ...utxo, isSpented: true } : utxo;
						});

						const newUtxo = {
							txId,
							outputIndex: 0,
							satoshis: satoshis!,
							script: scriptPubKey,
						};
						const storedUtxo = {
							...newUtxo,
							height: 0,
							isSpented: false,
							address,
						};

						await updateCurrentAccountUtxos([...updatedUtxos, storedUtxo], address);

						return newUtxo;
					} else {
						throw new Error('Failed to merge UTXO.');
					}
				}
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[getCurrentAccountUtxos, updateCurrentAccountUtxos, sendTbc],
	);

	const getFTUtxoByContractId = useCallback(
		async (address_from: string, ft_amount: number | BigInt, contract_id: string) => {
			try {
				const { data } = await api.get(
					`https://turingwallet.xyz/v1/tbc/main/ft/utxo/address/${address_from}/contract/${contract_id}`,
				);
				if (!data) throw new Error('Failed to fetch FT UTXO!');
				const decimal = data.ftUtxoList[0].ftDecimal;
				const totalFtBalance =
					typeof ft_amount === 'number'
						? BigInt(Math.floor(ft_amount * Math.pow(10, decimal)))
						: ft_amount;

				for (let i = 0; i < data.ftUtxoList.length; i++) {
					const ftutxo = data.ftUtxoList[i];
					if (ftutxo.ftBalance > totalFtBalance) {
						return ftutxo;
					}
				}
				return null;
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[],
	);

	return {
		sendFT,
		mergeFT,
		transferFT_multiSig_create,
		transferFT_multiSig_sign,
		transferFT_multiSig_finish,
		createMultiSigTransaction,
		signMultiSigTransaction,
		finishMultiSigTransaction,
		withdrawMultiSigTransaction,
		getUTXO,
		getFTUtxoByContractId,
	};
};
