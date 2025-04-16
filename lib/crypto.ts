import CryptoJS from 'crypto-js';

export const generateRandomSalt = (length = 16): string => {
	const timestamp = new Date().getTime().toString();
	const randomPart = Math.random().toString().substring(2);
	const extraEntropy = (Math.random() * 1000000).toString();
	const combinedString = timestamp + randomPart + extraEntropy;
	const hash = CryptoJS.SHA256(combinedString);
	return hash.toString(CryptoJS.enc.Hex).substring(0, length * 2);
};

export const deriveKey = (password: string, salt: string): string => {
	try {
		const key = CryptoJS.PBKDF2(password, salt, {
			keySize: 512 / 32,
			iterations: 1000,
			hasher: CryptoJS.algo.SHA256,
		});
		const finalKey = CryptoJS.SHA256(key);
		return finalKey.toString();
	} catch (error) {
		return '';
	}
};

export const encrypt = (textToEncrypt: string, password: string): string => {
	const iv = generateRandomSalt(16);
	const encryptionKey = CryptoJS.PBKDF2(password, iv, {
		keySize: 256 / 32,
		iterations: 1000,
	}).toString();

	const encrypted = CryptoJS.AES.encrypt(textToEncrypt, CryptoJS.enc.Hex.parse(encryptionKey), {
		iv: CryptoJS.enc.Hex.parse(iv),
		padding: CryptoJS.pad.Pkcs7,
		mode: CryptoJS.mode.CBC,
	});

	const hmac = CryptoJS.HmacSHA256(iv + encrypted.toString(), encryptionKey);

	return iv + encrypted.toString() + hmac;
};

export const decrypt = (ciphertext: string, password: string): string => {
	try {
		const iv = ciphertext.substring(0, 32);
		const hmac = ciphertext.slice(-64);
		const actualCiphertext = ciphertext.substring(32, ciphertext.length - 64);

		const decryptionKey = CryptoJS.PBKDF2(password, iv, {
			keySize: 256 / 32,
			iterations: 1000,
		}).toString();

		const expectedHmac = CryptoJS.HmacSHA256(iv + actualCiphertext, decryptionKey).toString();
		if (hmac !== expectedHmac) {
			throw new Error('Invalid HMAC');
		}

		const decrypted = CryptoJS.AES.decrypt(
			actualCiphertext,
			CryptoJS.enc.Hex.parse(decryptionKey),
			{
				iv: CryptoJS.enc.Hex.parse(iv),
				padding: CryptoJS.pad.Pkcs7,
				mode: CryptoJS.mode.CBC,
			},
		);

		return decrypted.toString(CryptoJS.enc.Utf8);
	} catch (error) {
		return '';
	}
};
