import '@/shim';
import * as contract from 'tbc-contract';
import * as tbc from 'tbc-lib-js';

import { api } from '@/lib/axios';

interface BalanceResponse {
	status: number;
	address: string;
	data: {
		balance: number;
		confirmed: number;
		unconfirmed: number;
	};
}

interface UnspentOutput {
	tx_hash: string;
	tx_pos: number;
	height: number;
	value: number;
}

interface FTBalanceResponse {
	combineScript: string;
	ftContractId: string;
	ftDecimal: number;
	ftBalance: number;
}

export async function getTbcBalance(address: string): Promise<number> {
	const response = await api.get<BalanceResponse>(
		`https://turingwallet.xyz/v1/tbc/main/address/${address}/get/balance`,
	);

	if (response.data.status !== 0) {
		throw new Error('Failed to get balance');
	}

	return response.data.data.balance * 1e-6;
}

export const getExchangeRate = async () => {
	const res = await api.get(`https://turingwallet.xyz/v1/tbc/main/exchangerate/`);
	if (!res.data) {
		throw new Error('Could not fetch exchange rate ');
	}
	const changePercent = res.data.change_percent;
	const rate = Number(res.data.rate.toFixed(3));
	return { rate, changePercent };
};

export async function getTbcBalance_byMultiSigAddress(address: string): Promise<number> {
	const asmString = contract.MultiSig.getMultiSigLockScript(address);
	const multiScript = tbc.Script.fromASM(asmString).toHex();
	const script_hash = Buffer.from(
		tbc.crypto.Hash.sha256(Buffer.from(multiScript, 'hex')).toString('hex'),
		'hex',
	)
		.reverse()
		.toString('hex');
	const url = `https://turingwallet.xyz/v1/tbc/main/script/hash/${script_hash}/unspent/`;

	try {
		const response = await api.get<UnspentOutput[]>(url);
		const totalValue = response.data.reduce((sum, utxo) => sum + utxo.value, 0);
		return totalValue * 1e-6;
	} catch (error) {
		throw new Error('Failed to get TBC balance');
	}
}

export async function getFTBalance_byMultiSigAddress(
	contract_id: string,
	address: string,
): Promise<number> {
	try {
		const combine_script = contract.MultiSig.getCombineHash(address);
		const response = await api.get<FTBalanceResponse>(
			`https://turingwallet.xyz/v1/tbc/main/ft/balance/combine/script/${combine_script}/contract/${contract_id}`,
		);

		return response.data.ftBalance * Math.pow(10, -response.data.ftDecimal);
	} catch (error) {
		throw new Error('Failed to get FT balance');
	}
}
