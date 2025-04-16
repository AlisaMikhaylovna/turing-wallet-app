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
	Modal,
	Pressable,
	Switch,
	KeyboardAvoidingView,
	Platform,
	TextInput,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { generateKeysEncrypted_byMnemonic, verifyPassword, verifyMnemonic } from '@/lib/key';
import { theme } from '@/lib/theme';
import { Account, AccountType } from '@/types';
import { initializeWalletData } from '@/lib/init';
import { MnemonicInput } from '@/components/ui/mnemonic-input';
import { initDApps } from '@/actions/get-dapps';
import { clearAllData, deleteAccountData } from '@/utils/sqlite';

enum Tag {
	Turing = 'turing',
	Tp = 'tp',
	Okx = 'okx',
	Nabox = 'nabox',
}

enum DerivationPathTab {
	Common = 'common',
	Custom = 'custom',
}

const RestorePage = () => {
	const { t } = useTranslation();
	const [mnemonic, setMnemonic] = useState('');
	const [selectedTag, setSelectedTag] = useState<Tag>(Tag.Turing);
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isPickerVisible, setPickerVisible] = useState(false);
	const [shouldRestore, setShouldRestore] = useState(true);
	const [derivationPathTab, setDerivationPathTab] = useState<DerivationPathTab>(
		DerivationPathTab.Common,
	);
	const [customDerivationPath, setCustomDerivationPath] = useState("236'/0'/1/0");
	const {
		addAccount,
		setCurrentAccount,
		setPassKeyAndSalt,
		getAccountsCount,
		getPassKey,
		getSalt,
		clear,
		getAllAccounts,
	} = useAccount();
	const router = useRouter();

	const passKey = getPassKey();
	const salt = getSalt();
	const hasExistingAccount = passKey && salt;

	const walletTypes = [
		{ label: 'Turing', value: Tag.Turing },
		{ label: 'TokenPocket', value: Tag.Tp },
		{ label: 'OKX', value: Tag.Okx },
		{ label: 'Nabox', value: Tag.Nabox },
	];

	const getDerivationPath = () => {
		if (derivationPathTab === DerivationPathTab.Custom) {
			return `m/44'/${customDerivationPath}`;
		} else {
			switch (selectedTag) {
				case Tag.Tp:
					return "m/44'/0'/0'/0/0";
				case Tag.Okx:
					return "m/44'/0'/0'/0/0";
				case Tag.Nabox:
					return "m/44'/60'/0'/0/0";
				default:
					return "m/44'/236'/0'/1/0";
			}
		}
	};

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

	const onSubmit = () => {
		if (isSubmitting) return;

		setIsSubmitting(true);

		requestAnimationFrame(() => {
			InteractionManager.runAfterInteractions(() => {
				validateAndSubmitForm();
			});
		});
	};

	const validateAndSubmitForm = async () => {
		if (hasExistingAccount) {
			if (!confirmPassword) {
				showToast('error', t('passwordRequired'));
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
			if (!mnemonic.trim()) {
				showToast('error', t('mnemonicRequired'));
				setIsSubmitting(false);
				return;
			}

			const mnemonicWords = mnemonic.trim().split(/\s+/);
			if (mnemonicWords.length !== 12) {
				showToast('error', t('mnemonicLength'));
				setIsSubmitting(false);
				return;
			}

			if (!verifyMnemonic(mnemonic.trim())) {
				showToast('error', t('mnemonicInvalid'));
				setIsSubmitting(false);
				return;
			}

			if (!password || !confirmPassword) {
				showToast('error', t('fillAllFields'));
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

		if (derivationPathTab === DerivationPathTab.Custom) {
			if (!customDerivationPath) {
				showToast('error', t('derivationPathRequired'));
				setIsSubmitting(false);
				return;
			}

			const pathRegex = /^\d+'\/\d+'\/\d+\/\d+$/;
			if (!pathRegex.test(customDerivationPath)) {
				showToast('error', t('derivationPathInvalid'));
				setIsSubmitting(false);
				return;
			}
			
			const parts = customDerivationPath.split('/');
			for (let i = 0; i < parts.length; i++) {
				const numStr = parts[i].replace(/'/g, '');
				const num = parseInt(numStr, 10);
				
				if (isNaN(num) || num < 0 || num > 255) {
					showToast('error', t('derivationPathNumberRange'));
					setIsSubmitting(false);
					return;
				}
			}
		}

		try {
			setLoading(true);
			const walletDerivation = getDerivationPath();
			if (hasExistingAccount) {
				const result = generateKeysEncrypted_byMnemonic(
					confirmPassword,
					mnemonic,
					walletDerivation,
					salt,
				);
				if (!result) {
					throw new Error('Failed to generate keys');
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
					throw new Error('This account already exists in your wallet');
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
						throw new Error('Failed to restore wallet data from blockchain.');
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
				const result = generateKeysEncrypted_byMnemonic(password, mnemonic, walletDerivation);
				if (!result) {
					throw new Error('Failed to generate keys');
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
						throw new Error('Failed to restore wallet data from blockchain.');
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
			if (hasExistingAccount) {
			} else {
				await clearAllData();
				await clear();
			}
			showToast('error', error.message);
		} finally {
			setLoading(false);
			setIsSubmitting(false);
		}
	};

	const isButtonDisabled = loading || isSubmitting;
	const buttonStyle = [
		styles.button,
		isButtonDisabled && styles.disabledButton,
		isSubmitting && styles.buttonSubmitting,
		loading && styles.buttonLoading,
	];

	const handleClearAll = () => {
		setMnemonic('');
	};

	const renderDerivationPathSection = () => {
		return (
			<View style={styles.inputGroup}>
				<Text style={styles.label}>{t('derivationPath')}</Text>

				<View style={styles.tabContainer}>
					<TouchableOpacity
						style={[styles.tab, derivationPathTab === DerivationPathTab.Common && styles.activeTab]}
						onPress={() => setDerivationPathTab(DerivationPathTab.Common)}
						disabled={isButtonDisabled}
					>
						<Text
							style={[
								styles.tabText,
								derivationPathTab === DerivationPathTab.Common && styles.activeTabText,
							]}
						>
							{t('common')}
						</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.tab, derivationPathTab === DerivationPathTab.Custom && styles.activeTab]}
						onPress={() => setDerivationPathTab(DerivationPathTab.Custom)}
						disabled={isButtonDisabled}
					>
						<Text
							style={[
								styles.tabText,
								derivationPathTab === DerivationPathTab.Custom && styles.activeTabText,
							]}
						>
							{t('custom')}
						</Text>
					</TouchableOpacity>
				</View>

				{derivationPathTab === DerivationPathTab.Common ? (
					<Pressable
						style={styles.pickerButton}
						onPress={() => setPickerVisible(true)}
						disabled={isButtonDisabled}
					>
						<Text style={styles.pickerButtonText}>
							{walletTypes.find((type) => type.value === selectedTag)?.label}
						</Text>
						<MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text} />
					</Pressable>
				) : (
					<View style={styles.customPathContainer}>
						<Text style={styles.pathPrefix}>m/44'/</Text>
						<TextInput
							style={styles.customPathInput}
							value={customDerivationPath}
							onChangeText={setCustomDerivationPath}
							placeholder="x'/x'/x/x"
							placeholderTextColor="#999"
							editable={!isButtonDisabled}
						/>
					</View>
				)}

				{derivationPathTab === DerivationPathTab.Custom && (
					<Text style={styles.pathHelpText}>
						{t('derivationPathHelpText')}
					</Text>
				)}
			</View>
		);
	};

	return (
		<ScreenWrapper bg="white">
			<StatusBar style="dark" />
			{loading ? (
				<View style={styles.loadingContent}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
					<Text style={styles.loadingText}>
						{t('restoringData')}
					</Text>
				</View>
			) : (
				<KeyboardAvoidingView
					style={{ flex: 1, backgroundColor: '#fff' }}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
					keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
				>
					<ScrollView
						style={{ flex: 1 }}
						contentContainerStyle={{
							paddingHorizontal: wp(5),
							paddingTop: hp(4),
							paddingBottom: hp(20),
						}}
						keyboardShouldPersistTaps="handled"
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.content}>
							<Text style={styles.welcomeText}>
								{hasExistingAccount ? t('importWallet') : t('restoreWallet')}
							</Text>
							<View style={styles.form}>
								{!hasExistingAccount && (
									<View style={styles.descriptionContainer}>
										<Text style={styles.description} numberOfLines={0}>
											{t('passwordRequirements')}
										</Text>
									</View>
								)}

								<View style={[styles.inputGroup, { marginTop: !hasExistingAccount ? hp(2) : 0 }]}>
									<View style={styles.labelContainer}>
										<Text style={styles.label}>{t('mnemonicPhrase')}</Text>
										{mnemonic && (
											<TouchableOpacity onPress={handleClearAll} disabled={isButtonDisabled}>
												<MaterialIcons name="close" size={20} color={theme.colors.text} />
											</TouchableOpacity>
										)}
									</View>
									<MnemonicInput
										value={mnemonic}
										onChangeText={setMnemonic}
										editable={!isButtonDisabled}
										onClearAll={handleClearAll}
									/>
								</View>

								{renderDerivationPathSection()}

								{!hasExistingAccount ? (
									<>
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
										
										<View style={styles.inputGroup}>
											<Text style={styles.label}>{t('confirmPassword')}</Text>
											<Input
												icon={<MaterialIcons name="lock" size={26} color={theme.colors.text} />}
												secureTextEntry
												placeholder={t('confirmYourPassword')}
												value={confirmPassword}
												onChangeText={setConfirmPassword}
												editable={!isButtonDisabled}
											/>
										</View>
									</>
								) : (
									<View style={styles.inputGroup}>
										<Text style={styles.label}>{t('confirmPassword')}</Text>
										<Input
											icon={<MaterialIcons name="lock" size={26} color={theme.colors.text} />}
											secureTextEntry
											placeholder={t('enterPassword')}
											value={confirmPassword}
											onChangeText={setConfirmPassword}
											editable={!isButtonDisabled}
										/>
									</View>
								)}

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
								<Text style={styles.buttonText}>{t('restore')}</Text>
							</TouchableOpacity>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			)}

			<Modal
				visible={isPickerVisible}
				transparent
				animationType="slide"
				onRequestClose={() => setPickerVisible(false)}
			>
				<Pressable style={styles.modalOverlay} onPress={() => setPickerVisible(false)}>
					<View style={styles.modalContent}>
						{walletTypes.map((type) => (
							<Pressable
								key={type.value}
								style={styles.optionButton}
								onPress={() => {
									setSelectedTag(type.value);
									setPickerVisible(false);
								}}
							>
								<Text
									style={[styles.optionText, selectedTag === type.value && styles.selectedOption]}
								>
									{type.label}
								</Text>
							</Pressable>
						))}
					</View>
				</Pressable>
			</Modal>
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {},
	contentContainer: {
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
		marginBottom: hp(2),
	},
	descriptionContainer: {
		width: '100%',
	},
	description: {
		fontSize: hp(1.5),
		color: theme.colors.text,
		lineHeight: hp(2.2),
	},
	inputGroup: {
		gap: hp(0.5),
		marginBottom: hp(1),
	},
	label: {
		fontSize: hp(1.6),
		fontWeight: '600',
		color: theme.colors.text,
		marginLeft: wp(2),
	},
	pickerButton: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderWidth: 0.4,
		borderColor: theme.colors.text,
		borderRadius: theme.radius.xxl,
		borderCurve: 'continuous',
		padding: 18,
		paddingHorizontal: 20,
	},
	pickerButtonText: {
		fontSize: hp(1.6),
		color: theme.colors.text,
	},
	bottomContainer: {
		paddingHorizontal: wp(2),
		paddingBottom: hp(4),
		backgroundColor: 'white',
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
		marginTop: hp(2),
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
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: wp(2),
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'flex-end',
	},
	modalContent: {
		backgroundColor: 'white',
		borderTopLeftRadius: theme.radius.xl,
		borderTopRightRadius: theme.radius.xl,
		padding: 20,
	},
	optionButton: {
		paddingVertical: 15,
		alignItems: 'center',
	},
	optionText: {
		fontSize: hp(1.8),
		color: theme.colors.text,
	},
	selectedOption: {
		color: theme.colors.primary,
		fontWeight: '600',
	},
	mnemonicInput: {
		height: hp(12),
		paddingTop: 12,
		textAlignVertical: 'top',
	},
	mnemonicInputContainer: {
		height: hp(12),
		alignItems: 'flex-start',
		paddingVertical: 12,
	},
	labelContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginLeft: wp(2),
		marginRight: wp(2),
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
	tabContainer: {
		flexDirection: 'row',
		marginBottom: hp(1.5),
		borderRadius: theme.radius.lg,
		borderWidth: 1,
		overflow: 'hidden',
		alignSelf: 'flex-start',
		width: '60%',
	},
	tab: {
		flex: 1,
		paddingVertical: hp(1),
		alignItems: 'center',
		backgroundColor: '#f5f5f5',
	},
	activeTab: {
		backgroundColor: theme.colors.primary,
	},
	tabText: {
		fontSize: hp(1.5),
		color: theme.colors.text,
	},
	activeTabText: {
		color: 'white',
		fontWeight: '600',
	},
	customPathContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 0.4,
		borderColor: theme.colors.text,
		borderRadius: theme.radius.xxl,
		borderCurve: 'continuous',
		paddingHorizontal: 20,
		height: hp(6),
	},
	pathPrefix: {
		fontSize: hp(1.6),
		color: theme.colors.text,
		fontWeight: '500',
	},
	customPathInput: {
		flex: 1,
		fontSize: hp(1.6),
		color: theme.colors.text,
		paddingVertical: 0,
		height: '100%',
	},
	pathHelpText: {
		fontSize: hp(1.2),
		color: '#666',
		marginTop: hp(0.5),
		marginLeft: wp(2),
	},
});

export default RestorePage;
