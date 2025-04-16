import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
	InteractionManager,
	ActivityIndicator,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ScrollView,
	Switch,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import '@/shim';
import * as tbc from 'tbc-lib-js';

import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { generateKeysEncrypted_wif, verifyPassword } from '@/lib/key';
import { theme } from '@/lib/theme';
import { Account, AccountType } from '@/types';
import { initializeWalletData } from '@/lib/init';
import { formatLongString } from '@/lib/util';
import { initDApps } from '@/actions/get-dapps';
import { clearAllData, deleteAccountData } from '@/utils/sqlite';

const RestoreByPriKeyPage = () => {
	const { t } = useTranslation();
	const [privateKey, setPrivateKey] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [shouldRestore, setShouldRestore] = useState(true);
	const {
		addAccount,
		setCurrentAccount,
		setPassKeyAndSalt,
		getAccountsCount,
		getPassKey,
		getSalt,
		getAllAccounts,
	} = useAccount();
	const router = useRouter();

	const passKey = getPassKey();
	const salt = getSalt();
	const hasExistingAccount = passKey && salt;

	const validatePassword = (password: string) => {
		if (password.length < 8) {
			showToast('error', t('passwordTooShort'));
			return false;
		}

		const validChars = /^[a-zA-Z0-9!@#$%*]+$/;
		if (!validChars.test(password)) {
			showToast('error', t('passwordInvalidChars'));
			return false;
		}

		return true;
	};

	const showToast = (type: 'success' | 'error' | 'info', message: string) => {
		Toast.show({
			type,
			text1: type.charAt(0).toUpperCase() + type.slice(1),
			text2: message,
			position: 'top',
			topOffset: 60,
			visibilityTime: 3000,
		});
	};

	const validateAndSubmitForm = async () => {
		if (hasExistingAccount) {
			if (!confirmPassword) {
				showToast('error', t('pleaseEnterPassword'));
				setIsSubmitting(false);
				return;
			}
			if (!verifyPassword(confirmPassword, passKey, salt)) {
				showToast('error', t('incorrectPassword'));
				setIsSubmitting(false);
				return;
			}
			setPassword(confirmPassword);
		} else {
			if (!privateKey.trim()) {
				showToast('error', t('pleaseEnterPrivateKey'));
				setIsSubmitting(false);
				return;
			}

			if (!password || !confirmPassword) {
				showToast('error', t('pleaseFillAllPasswordFields'));
				setIsSubmitting(false);
				return;
			}

			if (!validatePassword(password)) {
				setIsSubmitting(false);
				return;
			}

			if (password !== confirmPassword) {
				showToast('error', t('passwordsDoNotMatch'));
				setIsSubmitting(false);
				return;
			}
		}

		try {
			setLoading(true);

			if (hasExistingAccount) {
				const result = generateKeysEncrypted_wif(
					confirmPassword,
					tbc.PrivateKey.fromString(privateKey).toWIF(),
					salt,
				);
				if (!result) {
					throw new Error(t('privateKeyInvalid'));
				}

				const {
					encryptedKeys,
					tbcAddress,
					pubKey,
					taprootAddress,
					taprootLegacyAddress,
					legacyAddress,
				} = result;

				const accounts = getAllAccounts();
				const isDuplicate = accounts.some(
					(account) =>
						account.addresses.tbcAddress === tbcAddress ||
						account.addresses.taprootAddress === taprootAddress ||
						account.pubKey.tbcPubKey === pubKey,
				);

				if (isDuplicate) {
					throw new Error(t('thisAccountAlreadyExists'));
				}

				const accountsCount = getAccountsCount();
				const newAccount: Account = {
					accountName: `Wallet ${accountsCount + 1}`,
					addresses: {
						tbcAddress,
						taprootAddress,
						taprootLegacyAddress,
						legacyAddress,
					},
					encryptedKeys,
					balance: {
						tbc: 0,
						btc: 0,
					},
					pubKey: {
						tbcPubKey: pubKey,
					},
					paymentUtxos: [],
					type: AccountType.TBC,
				};

				if (shouldRestore) {
					try {
						await initializeWalletData(tbcAddress);
					} catch (error) {
						await deleteAccountData(tbcAddress);
						throw new Error(t('failedToRestoreWalletData'));
					}
					try {
						await initializeWalletData(taprootLegacyAddress);
					} catch (error) {
						await deleteAccountData(taprootLegacyAddress);
					}
				}

				await addAccount(newAccount);
				await setCurrentAccount(tbcAddress);
			} else {
				const result = generateKeysEncrypted_wif(
					password,
					tbc.PrivateKey.fromString(privateKey).toWIF(),
				);
				if (!result) {
					throw new Error(t('privateKeyInvalid'));
				}

				const {
					salt,
					passKey,
					encryptedKeys,
					tbcAddress,
					pubKey,
					taprootAddress,
					taprootLegacyAddress,
					legacyAddress,
				} = result;

				const accountsCount = getAccountsCount();
				const newAccount: Account = {
					accountName: `Wallet ${accountsCount + 1}`,
					addresses: {
						tbcAddress,
						taprootAddress,
						taprootLegacyAddress,
						legacyAddress,
					},
					encryptedKeys,
					balance: {
						tbc: 0,
						btc: 0,
					},
					pubKey: {
						tbcPubKey: pubKey,
					},
					paymentUtxos: [],
					type: AccountType.TBC,
				};

				if (shouldRestore) {
					try {
						await initializeWalletData(tbcAddress);
						await initDApps();
					} catch (error) {
						await clearAllData();
						throw new Error(t('failedToRestoreWalletData'));
					}
					try {
						await initializeWalletData(taprootLegacyAddress);
					} catch (error) {
						await deleteAccountData(taprootLegacyAddress);
					}
				}
				await setPassKeyAndSalt(passKey, salt);
				await addAccount(newAccount);
				await setCurrentAccount(tbcAddress);
			}

			router.replace('/(tabs)/home');
			showToast('success', t('walletRestored'));
		} catch (error: any) {
			showToast('error', error.message);
		} finally {
			setLoading(false);
			setIsSubmitting(false);
		}
	};

	const onSubmit = () => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		requestAnimationFrame(() => {
			InteractionManager.runAfterInteractions(() => {
				validateAndSubmitForm();
			});
		});
	};

	const isButtonDisabled = loading || isSubmitting;
	const buttonStyle = [
		styles.button,
		isButtonDisabled && styles.disabledButton,
		isSubmitting && styles.buttonSubmitting,
		loading && styles.buttonLoading,
	];

	const handlePrivateKeyChange = (text: string) => {
		setPrivateKey(text);
	};

	return (
		<ScreenWrapper bg="white">
			<StatusBar style="dark" />
			{loading ? (
				<View style={styles.loadingContent}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
					<Text style={styles.loadingText}>{t('restoringData')}</Text>
				</View>
			) : (
				<KeyboardAvoidingWrapper>
					<ScrollView
						style={styles.container}
						contentContainerStyle={styles.contentContainer}
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.content}>
							<Text style={styles.welcomeText}>
								{hasExistingAccount ? t('importWallet') : t('restoreWallet')}
							</Text>

							<View style={styles.form}>
								{!hasExistingAccount && (
									<Text style={styles.description}>{t('passwordRequirements')}</Text>
								)}

								<View style={styles.inputGroup}>
									<View style={styles.labelContainer}>
										<Text style={styles.label}>{t('privateKey')}</Text>
									</View>
									<Input
										value={formatLongString(privateKey, 12)}
										onChangeText={handlePrivateKeyChange}
										editable={!isButtonDisabled}
										placeholder={t('pleaseEnterPrivateKey')}
										multiline={false}
										autoCapitalize="none"
										autoCorrect={false}
										contextMenuHidden={false}
									/>
								</View>

								{!hasExistingAccount && (
									<View style={styles.inputGroup}>
										<Text style={styles.label}>{t('password')}</Text>
										<Input
											icon={<MaterialIcons name="lock" size={26} color={theme.colors.text} />}
											secureTextEntry
											placeholder={t('setPassword')}
											value={password}
											onChangeText={setPassword}
											editable={!isButtonDisabled}
										/>
									</View>
								)}

								<View style={styles.inputGroup}>
									<Text style={styles.label}>{t('confirmPassword')}</Text>
									<Input
										icon={<MaterialIcons name="lock" size={26} color={theme.colors.text} />}
										secureTextEntry
										placeholder={hasExistingAccount ? t('enterPassword') : t('confirmYourPassword')}
										value={confirmPassword}
										onChangeText={setConfirmPassword}
										editable={!isButtonDisabled}
									/>
								</View>

								<View style={styles.switchContainer}>
									<Text style={styles.switchLabel}>{t('restoreFromBlockchain')}</Text>
									<Switch
										value={shouldRestore}
										onValueChange={setShouldRestore}
										disabled={isButtonDisabled}
										trackColor={{ false: '#767577', true: theme.colors.primary }}
										thumbColor={shouldRestore ? '#fff' : '#f4f3f4'}
									/>
								</View>
							</View>

							<TouchableOpacity
								style={buttonStyle}
								onPress={onSubmit}
								disabled={isButtonDisabled}
								activeOpacity={0.5}
								pressRetentionOffset={{ top: 10, left: 10, bottom: 10, right: 10 }}
							>
								<Text style={styles.buttonText}>{t('restoreWallet')}</Text>
							</TouchableOpacity>
						</View>
					</ScrollView>
				</KeyboardAvoidingWrapper>
			)}
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: wp(5),
		paddingBottom: hp(4),
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		flexGrow: 1,
		paddingVertical: hp(4),
	},
	welcomeText: {
		fontSize: hp(2.8),
		fontWeight: '700',
		color: theme.colors.text,
		marginBottom: hp(2),
	},
	form: {
		gap: hp(2),
	},
	description: {
		fontSize: hp(1.5),
		color: theme.colors.text,
		marginBottom: hp(1),
	},
	inputGroup: {
		gap: hp(1),
		marginBottom: hp(1),
	},
	label: {
		fontSize: hp(1.6),
		fontWeight: '600',
		color: theme.colors.text,
		marginLeft: wp(2),
	},
	labelContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginLeft: wp(2),
		marginRight: wp(2),
	},
	disabledButton: {
		opacity: 0.7,
		backgroundColor: theme.colors.primary,
	},
	button: {
		backgroundColor: theme.colors.primary,
		height: hp(6.6),
		justifyContent: 'center',
		alignItems: 'center',
		borderRadius: theme.radius.xl,
		borderCurve: 'continuous',
		marginTop: hp(3),
	},
	buttonSubmitting: {
		backgroundColor: '#999',
	},
	buttonLoading: {
		backgroundColor: '#999',
	},
	buttonText: {
		fontSize: hp(2.5),
		color: 'white',
		fontWeight: '700',
	},
	loadingContent: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		gap: hp(3),
		marginTop: hp(10),
	},
	loadingText: {
		fontSize: hp(1.8),
		color: theme.colors.text,
		textAlign: 'center',
		marginHorizontal: wp(10),
	},
	switchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: wp(2),
		marginBottom: hp(1),
	},
	switchLabel: {
		fontSize: hp(1.6),
		color: theme.colors.text,
		flex: 1,
		marginRight: wp(2),
	},
});

export default RestoreByPriKeyPage;
