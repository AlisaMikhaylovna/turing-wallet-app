import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	ScrollView,
	KeyboardAvoidingView,
	Platform,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { debounce } from 'lodash';
import { useTranslation } from 'react-i18next';

import { getTbcBalance_byMultiSigAddress } from '@/actions/get-balance';
import { AddressSelector } from '@/components/selector/address-selector';
import { AssetSelector } from '@/components/selector/asset-selector';
import { MultiSigAddressSelector } from '@/components/selector/multiSig-address-selector';
import { useAccount } from '@/hooks/useAccount';
import { useFtTransaction } from '@/hooks/useFtTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { theme } from '@/lib/theme';
import { formatBalance } from '@/lib/util';
import { getActiveMultiSigs } from '@/utils/sqlite';
import { fetchFTs_multiSig } from '@/actions/get-fts';

interface FormData {
	senderAddress: string;
	asset: string;
	receiverAddress: string;
	amount: string;
	password: string;
}

interface FormErrors {
	senderAddress?: string;
	asset?: string;
	receiverAddress?: string;
	amount?: string;
	password?: string;
}

interface Asset {
	label: string;
	value: string;
	balance: number;
	contractId?: string;
}

interface MultiSigAddress {
	multiSig_address: string;
	pubKeys: string[];
}

export default function InitiateMultiSigTransactionPage() {
	const { t } = useTranslation();
	const { getCurrentAccountAddress, getPassKey, getSalt } = useAccount();
	const { createMultiSigTransaction } = useFtTransaction();

	const [formData, setFormData] = useState<FormData>({
		senderAddress: '',
		asset: '',
		receiverAddress: '',
		amount: '',
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [isLoading, setIsLoading] = useState(false);
	const [assets, setAssets] = useState<Asset[]>([]);
	const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
	const [showAssetSelector, setShowAssetSelector] = useState(false);
	const [multiSigAddresses, setMultiSigAddresses] = useState<MultiSigAddress[]>([]);
	const [showMultiSigAddressSelector, setShowMultiSigAddressSelector] = useState(false);
	const [showAddressSelector, setShowAddressSelector] = useState(false);

	const currentAddress = getCurrentAccountAddress();
	const passKey = getPassKey();
	const salt = getSalt();

	useEffect(() => {
		loadMultiSigAddresses();
	}, []);

	const loadMultiSigAddresses = async () => {
		try {
			const activeMultiSigs = await getActiveMultiSigs(currentAddress);
			setMultiSigAddresses(activeMultiSigs);

			if (activeMultiSigs.length > 0) {
				const firstAddress = activeMultiSigs[0].multiSig_address;
				setFormData((prev) => ({ ...prev, senderAddress: firstAddress }));

				await loadAssets(firstAddress);
			}
		} catch (error) {
			//console.error('Failed to load multi-signature addresses:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToLoadMultiSigAddresses'),
				visibilityTime: 3000,
			});
		}
	};

	const loadAssets = async (address: string) => {
		try {
			const tbcBalance = await getTbcBalance_byMultiSigAddress(address);
			const assetList: Asset[] = [{ label: 'TBC', value: 'TBC', balance: tbcBalance || 0 }];
			const response = await fetchFTs_multiSig(address);

			for (const token of response.token_list) {
				assetList.push({
					label: token.ft_symbol || token.ft_name,
					value: token.ft_contract_id,
					balance: token.ft_balance * Math.pow(10, -token.ft_decimal),
					contractId: token.ft_contract_id,
				});
			}

			setAssets(assetList);

			const tbcAsset = assetList.find((asset) => asset.value === 'TBC');
			if (tbcAsset) {
				setSelectedAsset(tbcAsset);
				setFormData((prev) => ({ ...prev, asset: 'TBC' }));
			}
		} catch (error) {
			//console.error('Failed to load assets:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToLoadAssets'),
				visibilityTime: 3000,
			});
		}
	};

	const handleSelectMultiSigAddress = async (address: string) => {
		setFormData((prev) => ({
			...prev,
			senderAddress: address,
			asset: '',
			amount: '',
		}));
		setSelectedAsset(null);
		setFormErrors((prev) => ({
			...prev,
			asset: '',
			amount: '',
		}));
		await loadAssets(address);
	};

	const handleSelectReceiverAddress = (address: string) => {
		setFormData((prev) => ({ ...prev, receiverAddress: address }));
		setFormErrors((prev) => ({ ...prev, receiverAddress: undefined }));
	};

	const handleAssetSelect = (asset: Asset) => {
		setSelectedAsset(asset);
		setFormData((prev) => ({
			...prev,
			asset: asset.value,
			amount: '',
		}));
		setFormErrors((prev) => ({
			...prev,
			amount: '',
		}));
	};

	const validateAmount = (amountStr: string) => {
		if (!amountStr) return t('amountRequired');
		if (!selectedAsset) return t('selectAssetFirst');

		const num = Number(amountStr);
		if (isNaN(num) || num <= 0) return t('enterValidPositiveNumber');
		if (num > selectedAsset.balance) return t('amountExceedsBalance');
		return '';
	};

	const debouncedAmountValidation = useCallback(
		debounce(async (amountStr: string) => {
			const error = validateAmount(amountStr);
			setFormErrors((prev) => ({ ...prev, amount: error }));
		}, 1000),
		[selectedAsset],
	);

	const debouncedReceiverAddressValidation = useCallback(
		debounce(async (address: string) => {
			const error = address ? '' : 'Receiver address is required';
			setFormErrors((prev) => ({ ...prev, receiverAddress: error }));
		}, 1000),
		[],
	);

	const handleInputChange = (field: keyof FormData, value: string) => {
		if (field === 'password') {
			const cleanValue = value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
			setFormData((prev) => ({ ...prev, password: cleanValue }));
			setFormErrors((prev) => ({ ...prev, password: undefined }));
		} else {
			setFormData((prev) => ({ ...prev, [field]: value }));

			setFormErrors((prev) => ({ ...prev, [field]: '' }));

			if (field === 'amount') {
				debouncedAmountValidation(value);
			} else if (field === 'receiverAddress') {
				debouncedReceiverAddressValidation(value);
			}
		}
	};

	const validateForm = (): boolean => {
		const errors: FormErrors = {};

		if (!formData.senderAddress) {
			errors.senderAddress = t('senderAddressRequired');
		}

		if (!formData.asset) {
			errors.asset = t('assetRequired');
		}

		if (!formData.receiverAddress) {
			errors.receiverAddress = t('receiverAddressRequired');
		} else if (!/^[0-9a-zA-Z]{34,42}$/.test(formData.receiverAddress.trim())) {
			errors.receiverAddress = t('invalidReceiverAddress');
		}

		if (!formData.amount) {
			errors.amount = t('amountRequired');
		} else {
			const amountError = validateAmount(formData.amount);
			if (amountError) {
				errors.amount = amountError;
			}
		}

		if (!formData.password) {
			errors.password = t('passwordRequired');
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async () => {
		if (!validateForm()) {
			return;
		}

		const isPasswordValid = verifyPassword(formData.password, passKey, salt);
		if (!isPasswordValid) {
			setFormErrors((prev) => ({ ...prev, password: t('invalidPassword') }));
			return;
		}

		setIsLoading(true);

		try {
			const contractId = selectedAsset?.value !== 'TBC' ? selectedAsset?.contractId : undefined;

			await createMultiSigTransaction(
				formData.senderAddress,
				formData.receiverAddress,
				Number(formData.amount),
				formData.password,
				contractId,
			);

			Toast.show({
				type: 'success',
				text1: t('success'),
				text2: t('transactionInitiatedSuccessfully'),
				visibilityTime: 3000,
			});

			router.back();
		} catch (error) {
			//console.error('Failed to initiate transaction:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: error instanceof Error ? error.message : t('failedToInitiateTransaction'),
				visibilityTime: 3000,
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<KeyboardAvoidingView
			style={{ flex: 1, backgroundColor: '#fff' }}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			keyboardVerticalOffset={100}
		>
			<ScrollView 
				style={{ flex: 1 }}
				contentContainerStyle={{ padding: wp(4), paddingTop: hp(3) }}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.inputGroup}>
					<View style={styles.labelRow}>
						<Text style={styles.label}>{t('senderAddress')}</Text>
						<TouchableOpacity onPress={() => setShowMultiSigAddressSelector(true)}>
							<MaterialIcons name="menu-book" size={24} color={theme.colors.primary} />
						</TouchableOpacity>
					</View>
					{formData.senderAddress && (
						<View style={styles.selectedAssetWrapper}>
							<Text style={styles.selectedAssetText}>{formData.senderAddress}</Text>
						</View>
					)}
					{formErrors.senderAddress && (
						<Text style={styles.errorText}>{formErrors.senderAddress}</Text>
					)}
				</View>

				<View style={styles.inputGroup}>
					<View style={styles.labelRow}>
						<Text style={styles.label}>{t('asset')}</Text>
						<TouchableOpacity onPress={() => setShowAssetSelector(true)}>
							<MaterialIcons name="account-balance-wallet" size={24} color={theme.colors.primary} />
						</TouchableOpacity>
					</View>
					{selectedAsset && (
						<View style={styles.selectedAssetWrapper}>
							<Text style={styles.selectedAssetText}>
								{selectedAsset.label}: {formatBalance(selectedAsset.balance)}
							</Text>
						</View>
					)}
					{formErrors.asset && <Text style={styles.errorText}>{formErrors.asset}</Text>}
				</View>

				<View style={styles.inputGroup}>
					<View style={styles.labelRow}>
						<Text style={styles.label}>{t('receiverAddress')}</Text>
						<TouchableOpacity onPress={() => setShowAddressSelector(true)}>
							<MaterialIcons name="contacts" size={24} color="#666" />
						</TouchableOpacity>
					</View>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.receiverAddress && styles.inputError]}
							value={formData.receiverAddress}
							onChangeText={(text) => handleInputChange('receiverAddress', text)}
							placeholder={t('enterReceiverAddress')}
						/>
						{formData.receiverAddress.length > 0 && (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => {
									setFormData((prev) => ({ ...prev, receiverAddress: '' }));
									setFormErrors((prev) => ({ ...prev, receiverAddress: '' }));
								}}
							>
								<MaterialIcons name="close" size={20} color="#666" />
							</TouchableOpacity>
						)}
					</View>
					{formErrors.receiverAddress && (
						<Text style={styles.errorText}>{formErrors.receiverAddress}</Text>
					)}
				</View>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>{t('amount')}</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.amount && styles.inputError]}
							value={formData.amount}
							onChangeText={(text) => handleInputChange('amount', text)}
							placeholder={t('enterAmount')}
							keyboardType="decimal-pad"
							autoCapitalize="none"
							autoCorrect={false}
						/>
						{formData.amount.length > 0 && (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => {
									setFormData((prev) => ({ ...prev, amount: '' }));
									setFormErrors((prev) => ({ ...prev, amount: '' }));
								}}
							>
								<MaterialIcons name="close" size={20} color="#666" />
							</TouchableOpacity>
						)}
					</View>
					{formErrors.amount && <Text style={styles.errorText}>{formErrors.amount}</Text>}
				</View>

				<View style={styles.inputGroup}>
					<View style={styles.labelRow}>
						<Text style={styles.label}>{t('password')}</Text>
					</View>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.password && styles.inputError]}
							value={formData.password}
							onChangeText={(text) => handleInputChange('password', text)}
							placeholder={t('enterPassword')}
							secureTextEntry
						/>
						{formData.password.length > 0 && (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => {
									setFormData((prev) => ({ ...prev, password: '' }));
									setFormErrors((prev) => ({ ...prev, password: undefined }));
								}}
							>
								<MaterialIcons name="close" size={20} color="#666" />
							</TouchableOpacity>
						)}
					</View>
					{formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
				</View>

				<TouchableOpacity
					style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
					onPress={handleSubmit}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" size="small" />
					) : (
						<Text style={styles.sendButtonText}>{t('initiateTransaction')}</Text>
					)}
				</TouchableOpacity>
			</ScrollView>
			
			<MultiSigAddressSelector
				visible={showMultiSigAddressSelector}
				onClose={() => setShowMultiSigAddressSelector(false)}
				onSelect={handleSelectMultiSigAddress}
				addresses={multiSigAddresses}
			/>
			<AssetSelector
				visible={showAssetSelector}
				onClose={() => setShowAssetSelector(false)}
				onSelect={handleAssetSelect}
				assets={assets}
				selectedAsset={selectedAsset}
			/>
			<AddressSelector
				visible={showAddressSelector}
				onClose={() => setShowAddressSelector(false)}
				onSelect={handleSelectReceiverAddress}
				userAddress={currentAddress}
			/>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
		padding: wp(4),
		paddingTop: hp(3),
	},
	inputGroup: {
		marginBottom: hp(2),
	},
	labelRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: hp(1),
		paddingHorizontal: wp(1),
	},
	label: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
	},
	balanceText: {
		fontSize: hp(1.4),
		color: '#666',
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
	inputText: {
		fontSize: hp(1.6),
		color: '#333',
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
	addressBookButton: {
		position: 'absolute',
		right: wp(2),
		padding: wp(2),
	},
	sendButton: {
		backgroundColor: theme.colors.primary,
		padding: wp(4),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(2),
	},
	sendButtonDisabled: {
		opacity: 0.6,
	},
	sendButtonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '600',
	},
	selectedAssetWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginLeft: wp(1),
		marginTop: hp(0.5),
		backgroundColor: '#f8f8f8',
		padding: wp(2),
		borderRadius: 8,
	},
	selectedAssetText: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
	},
	clearButton: {
		position: 'absolute',
		right: wp(2),
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		padding: wp(1),
	},
});
