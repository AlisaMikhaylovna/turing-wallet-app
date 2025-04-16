import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState, useLayoutEffect } from 'react';
import {
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { retrieveKeys, verifyPassword } from '@/lib/key';

interface FormErrors {
	password?: string;
}

export default function ExportPage() {
	const { t } = useTranslation();
	const navigation = useNavigation();
	const { getSalt, getPassKey, getEncryptedKeys } = useAccount();
	const [password, setPassword] = useState('');
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [isPasswordValid, setIsPasswordValid] = useState(false);
	const [keys, setKeys] = useState<{ mnemonic?: string; walletWif: string; walletDerivationPath?: string }>({ walletWif: '' });
	const [isLoading, setIsLoading] = useState(false);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerTitle: t('export')
		});
	}, [navigation, t]);

	const handlePasswordChange = (value: string) => {
		const cleanValue = value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
		setPassword(cleanValue);
		setFormErrors({});
	};

	const handleClearPassword = () => {
		setPassword('');
		setFormErrors({});
		setIsPasswordValid(false);
		setKeys({ walletWif: '' });
	};

	const handleExport = async () => {
		if (!password) {
			setFormErrors({ password: t('passwordIsRequired') });
			return;
		}

		setIsLoading(true);

		await new Promise((resolve) => setTimeout(resolve, 50));

		try {
			const passKey = getPassKey();
			const salt = getSalt();

			if (!passKey || !salt) {
				setFormErrors({
					password: t('accountErrorTryAgain'),
				});
				setIsPasswordValid(false);
				return;
			}

			const isValid = verifyPassword(password, passKey, salt);
			if (!isValid) {
				setFormErrors({
					password: t('incorrectPassword'),
				});
				setIsPasswordValid(false);
				return;
			}

			setIsPasswordValid(true);
			const encryptedKeys = getEncryptedKeys();
			if (encryptedKeys) {
				const decryptedKeys = retrieveKeys(password, encryptedKeys);
				if (decryptedKeys.walletWif) {
					setKeys(decryptedKeys);
				} else {
					throw new Error('Failed to decrypt keys');
				}
			}
		} catch (error) {
			setFormErrors({
				password: t('incorrectPassword'),
			});
			setIsPasswordValid(false);
			setKeys({ walletWif: '' });
		} finally {
			setIsLoading(false);
		}
	};

	const handleCopy = async (text: string, label: string) => {
		await Clipboard.setStringAsync(text);
		Toast.show({
			type: 'success',
			text1: label === t('mnemonic') 
				? t('mnemonicCopied') 
				: label === t('derivationPath') 
					? t('derivationPathCopied') 
					: t('privateKeyCopied'),
		});
	};

	return (
		<View style={styles.container}>
			<View style={styles.inputGroup}>
				<Text style={styles.label}>{t('password')}</Text>
				<View style={styles.inputWrapper}>
					<TextInput
						style={[styles.input, formErrors.password && styles.inputError]}
						value={password}
						onChangeText={handlePasswordChange}
						placeholder={t('enterPassword')}
						secureTextEntry={true}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{password.length > 0 && (
						<TouchableOpacity style={styles.clearButton} onPress={handleClearPassword}>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
				{formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
			</View>

			<TouchableOpacity
				style={[styles.exportButton, (isLoading || !password) && styles.disabledButton]}
				onPress={handleExport}
				disabled={isLoading || !password}
			>
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />
						<Text style={styles.exportButtonText}>{t('verifying')}</Text>
					</View>
				) : (
					<Text style={styles.exportButtonText}>{t('exportKeys')}</Text>
				)}
			</TouchableOpacity>

			{isPasswordValid && (
				<View style={styles.keysContainer}>
					{keys.mnemonic && (
						<View style={styles.keyGroup}>
							<Text style={styles.keyLabel}>{t('mnemonic')}</Text>
							<TouchableOpacity 
								style={styles.keyWrapper}
								onPress={() => handleCopy(keys.mnemonic!, t('mnemonic'))}
							>
								<Text style={styles.keyValue}>{keys.mnemonic}</Text>
							</TouchableOpacity>
						</View>
					)}

					{keys.walletDerivationPath && (
						<View style={styles.keyGroup}>
							<Text style={styles.keyLabel}>{t('derivationPath')}</Text>
							<TouchableOpacity 
								style={styles.keyWrapper}
								onPress={() => handleCopy(keys.walletDerivationPath!, t('derivationPath'))}
							>
								<Text style={styles.keyValue}>{keys.walletDerivationPath}</Text>
							</TouchableOpacity>
						</View>
					)}

					<View style={styles.keyGroup}>
						<Text style={styles.keyLabel}>{t('privateKey')}</Text>
						<TouchableOpacity 
							style={styles.keyWrapper}
							onPress={() => handleCopy(keys.walletWif, t('privateKey'))}
						>
							<Text style={styles.keyValue}>{keys.walletWif}</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		padding: wp(4),
	},
	inputGroup: {
		marginBottom: hp(2),
	},
	label: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
		marginBottom: hp(1),
		marginLeft: wp(1),
	},
	inputWrapper: {
		position: 'relative',
		flexDirection: 'row',
		alignItems: 'center',
	},
	input: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingHorizontal: wp(3),
		paddingVertical: hp(1.5),
		fontSize: hp(1.6),
		backgroundColor: '#f8f8f8',
		paddingRight: wp(10),
	},
	clearButton: {
		position: 'absolute',
		right: wp(2),
		padding: wp(2),
	},
	inputError: {
		borderColor: '#ff4444',
	},
	errorText: {
		color: '#ff4444',
		fontSize: hp(1.4),
		marginTop: hp(0.5),
		marginLeft: wp(1),
	},
	exportButton: {
		backgroundColor: '#1a1a1a',
		borderRadius: 8,
		paddingVertical: hp(1.5),
		alignItems: 'center',
		marginTop: hp(2),
	},
	exportButtonText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '600',
	},
	disabledButton: {
		backgroundColor: '#888',
		opacity: 0.7,
	},
	keysContainer: {
		marginTop: hp(2),
	},
	keyGroup: {
		marginBottom: hp(3),
	},
	keyLabel: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
		marginBottom: hp(1),
		marginLeft: wp(1),
	},
	keyWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f8f8f8',
		borderRadius: 8,
		padding: wp(3),
	},
	keyValue: {
		flex: 1,
		fontSize: hp(1.6),
		color: '#333',
		paddingRight: wp(2),
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
});
