import { addMultiSig, getAllMultiSigs, type MultiSig } from '@/utils/sqlite';
import { api } from '@/lib/axios';

interface MultiSigResponse {
	multi_wallet_list: {
		multi_address: string;
		pubkey_list: string[];
	}[];
}

export async function fetchMultiSigs(address: string): Promise<MultiSigResponse> {
	const response = await api.get(
		`https://turingwallet.xyz/v1/tbc/main/multisig/pubkeys/address/${address}`,
	);
	const uniqueWallets = new Map();

	response.data.multi_wallet_list
		.filter((wallet) => wallet.pubkey_list && wallet.pubkey_list.length > 0)
		.forEach((wallet) => {
			if (!uniqueWallets.has(wallet.multi_address)) {
				uniqueWallets.set(wallet.multi_address, wallet);
			}
		});

	return {
		multi_wallet_list: Array.from(uniqueWallets.values()),
	};
}

export async function initMultiSigs(address: string): Promise<void> {
	try {
		const response = await fetchMultiSigs(address);

		for (const multiSig of response.multi_wallet_list) {
			const multiSigData: MultiSig = {
				multiSig_address: multiSig.multi_address,
				pubKeys: multiSig.pubkey_list,
				isDeleted: false,
			};

			await addMultiSig(multiSigData, address);
		}
	} catch (error) {
		throw new Error('Failed to initialize MultiSigs');
	}
}

export async function syncMultiSigs(address: string): Promise<void> {
	try {
		const response = await fetchMultiSigs(address);
		const dbMultiSigs = await getAllMultiSigs(address);
		const dbMultiSigAddresses = new Set(dbMultiSigs.map((ms) => ms.multiSig_address));

		for (const multiSig of response.multi_wallet_list) {
			if (!dbMultiSigAddresses.has(multiSig.multi_address)) {
				const multiSigData: MultiSig = {
					multiSig_address: multiSig.multi_address,
					pubKeys: multiSig.pubkey_list,
					isDeleted: false,
				};

				await addMultiSig(multiSigData, address);
			}
		}
	} catch (error) {
		throw new Error('Failed to sync MultiSigs');
	}
}
