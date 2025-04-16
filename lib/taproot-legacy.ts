import '@/shim';
import * as tbc from 'tbc-lib-js';

export const getTaprootTweakPrivateKey = (privateKeyWif: string): string => {
	const privateKeyHex = tbc.Taproot.wifToSeckey(privateKeyWif);
	const taprootTweakPrivateKey = tbc.Taproot.seckeyToTaprootTweakSeckey(privateKeyHex);
	return taprootTweakPrivateKey.toString('hex');
};

export const getTaprootLegacyAddress = (taprootAddress: string): string => {
	return tbc.Taproot.taprootAddressToTaprootTweakLegacyAddress(taprootAddress);
};

