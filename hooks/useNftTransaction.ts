import '@/shim';
import { useCallback } from 'react';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { useAccount } from '@/hooks/useAccount';
import { useUtxo } from '@/hooks/useUtxo';
import { retrieveKeys } from '@/lib/key';
import { calculateFee } from '@/lib/util';
import { Transaction } from '@/types';
import { getTaprootTweakPrivateKey } from '@/lib/taproot-legacy';

export const useNftTransaction = () => {
	const { isTaprootLegacyAccount } = useAccount();
	const { getUTXOs } = useUtxo();

	const createCollection = useCallback(
		async (
			collection_data: contract.CollectionData,
			address_from: string,
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
				const utxos = await getUTXOs(address_from, 0.05);
				const txraw = contract.NFT.createCollection(
					address_from,
					privateKey,
					collection_data,
					utxos,
				);
				return {
					txHex: txraw,
					fee: calculateFee(txraw),
					utxos: utxos.map((utxo) => ({
						...utxo,
						height: 0,
						isSpented: false,
						address: address_from,
					})),
				};
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[isTaprootLegacyAccount, getUTXOs],
	);

	const createNFT = useCallback(
		async (
			collection_id: string,
			nft_data: contract.NFTData,
			address_from: string,
			password: string,
		) => {
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
				const utxos = await getUTXOs(address_from, 0.05);
				const nfttxo = await contract.API.fetchNFTTXO({
					script: contract.NFT.buildMintScript(address_from).toBuffer().toString('hex'),
					tx_hash: collection_id,
					network: 'mainnet',
				});
				const txraw = contract.NFT.createNFT(
					collection_id,
					address_from,
					privateKey,
					nft_data,
					utxos,
					nfttxo,
				);
				return {
					txHex: txraw,
					fee: calculateFee(txraw),
					utxos: utxos.map((utxo) => ({
						...utxo,
						height: 0,
						isSpented: false,
						address: address_from,
					})),
				};
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[isTaprootLegacyAccount, getUTXOs],
	);

	const transferNFT = useCallback(
		async (
			contract_id: string,
			address_from: string,
			address_to: string,
			transfer_times: number,
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

				const nft = new contract.NFT(contract_id);
				const nftInfo = await contract.API.fetchNFTInfo(contract_id, 'mainnet');
				nft.initialize(nftInfo);
				let utxos;
				if (transfer_times === 0) {
					utxos = await getUTXOs(address_from, 0.5);
				} else {
					utxos = await getUTXOs(address_from, 0.05);
				}
				const nfttxo = await contract.API.fetchNFTTXO({
					script: contract.NFT.buildCodeScript(nftInfo.collectionId, nftInfo.collectionIndex)
						.toBuffer()
						.toString('hex'),
					network: 'mainnet',
				});
				const pre_tx = await contract.API.fetchTXraw(nfttxo.txId, 'mainnet');
				const pre_pre_tx = await contract.API.fetchTXraw(
					pre_tx.toObject().inputs[0].prevTxId,
					'mainnet',
				);
				const txraw = nft.transferNFT(
					address_from,
					address_to,
					privateKey,
					utxos,
					pre_tx,
					pre_pre_tx,
				);
				return {
					txHex: txraw,
					fee: calculateFee(txraw),
					address_to,
					utxos: utxos.map((utxo) => ({
						...utxo,
						height: 0,
						isSpented: false,
						address: address_from,
					})),
				};
			} catch (error: any) {
				throw new Error(error.message);
			}
		},
		[isTaprootLegacyAccount, getUTXOs],
	);

	return {
		createCollection,
		createNFT,
		transferNFT,
	};
};
