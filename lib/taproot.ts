import '@/shim';
import * as bitcoin from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from '@bitcoinerlab/secp256k1';

bitcoin.initEccLib(ecc);

const ECPair = ECPairFactory(ecc);

export function createFromWIF(wif: string): any {
	try {
		const network = bitcoin.networks.bitcoin;
		return ECPair.fromWIF(wif, network);
	} catch (error) {
		throw error;
	}
}

export function getTaprootAndLegacyAddress(keyPair: any) {
	try {
		const network = bitcoin.networks.bitcoin;
		const pubkey = Buffer.from(keyPair.publicKey.subarray(1, 33));

		if (!pubkey) {
			throw new Error('Invalid public key');
		}

		const legacyAddress = bitcoin.payments.p2pkh({
			pubkey: keyPair.publicKey,
			network,
		}).address;

		const taprootAddress = bitcoin.payments.p2tr({
			internalPubkey: pubkey,
			network,
		}).address;

		if (!legacyAddress) {
			throw new Error('Failed to generate legacy address');
		}

		if (!taprootAddress) {
			throw new Error('Failed to generate taproot address');
		}

		return {
			taprootAddress,
			legacyAddress,
		};
	} catch (error) {
		//console.error('Failed to get taproot address:', error);
		throw error;
	}
}
