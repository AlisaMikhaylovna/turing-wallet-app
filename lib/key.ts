import '@/shim';
import * as bip39 from 'bip39';
import * as tbc from 'tbc-lib-js';

import { decrypt, deriveKey, encrypt, generateRandomSalt } from '@/lib/crypto';
import { Keys } from '@/types';
import { createFromWIF, getTaprootAndLegacyAddress } from '@/lib/taproot';
import { getTaprootLegacyAddress } from './taproot-legacy';

export const generateKeysEncrypted_byMnemonic = (
	password: string,
	mnemonic: string,
	walletDerivation: string,
	salt?: string,
) => {
	if (!tbc.Mnemonic.isValid(mnemonic)) {
		throw new Error('Invalid mnemonic');
	}

	const keys = getKeys_mnemonic(mnemonic, walletDerivation);
	if (!salt) {
		salt = generateRandomSalt();
	}
	const passKey = deriveKey(password, salt);
	const encryptedKeys = encrypt(JSON.stringify(keys), password);
	const pubKey = tbc.PrivateKey.fromWIF(keys.walletWif).toPublicKey().toString();
	const tbcAddress = tbc.PrivateKey.fromWIF(keys.walletWif).toAddress().toString();
	const { legacyAddress, taprootAddress } = getTaprootAndLegacyAddress(
		createFromWIF(keys.walletWif),
	);
	const taprootLegacyAddress = getTaprootLegacyAddress(taprootAddress);
	return {
		salt,
		passKey,
		encryptedKeys,
		tbcAddress,
		taprootAddress,
		taprootLegacyAddress,
		legacyAddress,
		pubKey,
	};
};

export const generateKeysEncrypted_mnemonic = (password: string, salt?: string) => {
	const entropy = generateRandomSalt(16);
	const mnemonic = bip39.entropyToMnemonic(entropy);

	if (!tbc.Mnemonic.isValid(mnemonic)) {
		throw new Error('Invalid mnemonic');
	}

	const walletDerivation = "m/44'/236'/0'/1/0";

	const keys = getKeys_mnemonic(mnemonic, walletDerivation);
	if (!salt) {
		salt = generateRandomSalt();
	}
	const passKey = deriveKey(password, salt);
	const encryptedKeys = encrypt(JSON.stringify(keys), password);
	const pubKey = tbc.PrivateKey.fromWIF(keys.walletWif).toPublicKey().toString();
	const tbcAddress = tbc.PrivateKey.fromWIF(keys.walletWif).toAddress().toString();
	const { legacyAddress, taprootAddress } = getTaprootAndLegacyAddress(
		createFromWIF(keys.walletWif),
	);
	const taprootLegacyAddress = getTaprootLegacyAddress(taprootAddress);
	return {
		salt,
		passKey,
		encryptedKeys,
		tbcAddress,
		taprootAddress,
		taprootLegacyAddress,
		legacyAddress,
		pubKey,
	};
};

export const generateKeysEncrypted_wif = (password: string, wif: string, salt?: string) => {
	if (!tbc.PrivateKey.isValid(wif)) return null;
	const keys = getKeys_wif(wif);
	if (!salt) {
		salt = generateRandomSalt();
	}
	const passKey = deriveKey(password, salt);
	const encryptedKeys = encrypt(JSON.stringify(keys), password);
	const pubKey = tbc.PrivateKey.fromString(keys.walletWif).toPublicKey().toString();
	const tbcAddress = tbc.PrivateKey.fromString(keys.walletWif).toAddress().toString();
	const { legacyAddress, taprootAddress } = getTaprootAndLegacyAddress(
		createFromWIF(keys.walletWif),
	);
	const taprootLegacyAddress = getTaprootLegacyAddress(taprootAddress);

	return {
		salt,
		passKey,
		encryptedKeys,
		tbcAddress,
		taprootAddress,
		taprootLegacyAddress,
		legacyAddress,
		pubKey,
	};
};

export const getKeys_mnemonic = (mnemonic: string, walletDerivationPath: string): Keys => {
	const HDPrivateKey = tbc.Mnemonic.fromString(mnemonic).toHDPrivateKey('', 'livenet');
	const derivedHDPrivateKey = HDPrivateKey.deriveChild(walletDerivationPath);
	const privateKey = derivedHDPrivateKey.privateKey;
	return {
		mnemonic,
		walletDerivationPath,
		walletWif: privateKey.toWIF(),
	};
};

export const getKeys_wif = (wif: string): Keys => {
	return {
		walletWif: wif,
	};
};

export const verifyPassword = (password: string, passKey: string, salt: string): boolean => {
	if (!password || !passKey || !salt) {
		return false;
	}
	try {
		const derivedKey = deriveKey(password, salt);
		if (derivedKey.length !== passKey.length) {
			return false;
		}

		let result = 0;
		for (let i = 0; i < derivedKey.length; i++) {
			result |= derivedKey.charCodeAt(i) ^ passKey.charCodeAt(i);
		}
		return result === 0;
	} catch (error) {
		return false;
	}
};

export const retrieveKeys = (password: string, encryptedKeys: string): Keys => {
	try {
		const decrypted = decrypt(encryptedKeys, password);
		if (!decrypted) {
			throw new Error('Decryption failed');
		}
		return JSON.parse(decrypted);
	} catch (error) {
		console.debug('Key retrieval warning:', error);
		return { walletWif: '' };
	}
};

export const verifyPubKey = (pubKey: string): boolean => {
	return tbc.PublicKey.isValid(pubKey);
};

export const verifyMnemonic = (mnemonic: string): boolean => {
	return tbc.Mnemonic.isValid(mnemonic);
};
