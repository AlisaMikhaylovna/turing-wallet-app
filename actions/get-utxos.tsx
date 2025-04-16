import { StoredUtxo } from '@/types';
import { api } from '@/lib/axios';

interface UTXOResponse {
	tx_hash: string;
	tx_pos: number;
	height: number;
	value: number;
}

export async function fetchUTXOs(address: string): Promise<StoredUtxo[]> {
	const url = `https://turingwallet.xyz/v1/tbc/main/address/${address}/unspent/`;

	try {
		const response = await api.get<UTXOResponse[]>(url);
		const data = response.data;
		
		if (data.length === 0) {
			throw new Error('The balance in the account is zero.');
		}

		return data.map((utxo) => ({
			txId: utxo.tx_hash,
			outputIndex: utxo.tx_pos,
			satoshis: utxo.value,
			height: utxo.height,
			isSpented: false,
			address: address,
		}));
	} catch (error: any) {
		throw new Error(error.message || 'Failed to fetch UTXOs');
	}
}
