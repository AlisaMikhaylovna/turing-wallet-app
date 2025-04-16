import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { AddressSelector } from '@/components/selector/address-selector';
import { useAccount } from '@/hooks/useAccount';
import { useNftTransaction } from '@/hooks/useNftTransaction';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { formatFee } from '@/lib/util';
import { updateNFTTransferTimes, updateNFTUserAddress, removeNFT } from '@/utils/sqlite';
import { fetchUTXOs } from '@/actions/get-utxos';
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper';

interface FormData {
	addressTo: string;
	password: string;
}

interface FormErrors {
	addressTo?: string;
	password?: string;
}

const NFTTransferPage = () => {
	const { t } = useTranslation();
	const {
		getCurrentAccountAddress,
		getSalt,
		getPassKey,
		getAllAccountAddresses,
		updateCurrentAccountUtxos,
	} = useAccount();
	const { finish_transaction } = useTbcTransaction();
	const { transferNFT } = useNftTransaction();
	const { id, transferTimes } = useLocalSearchParams<{
		id: string;
		transferTimes: string;
	}>();

	const [formData, setFormData] = useState<FormData>({
		addressTo: '',
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
	const [isCalculatingFee, setIsCalculatingFee] = useState(false);
	const [showAddressSelector, setShowAddressSelector] = useState(false);
	const [transferTimesCount, setTransferTimesCount] = useState<number>(0);
	const [pendingTransaction, setPendingTransaction] = useState<{
		txHex: string;
		utxos: any[];
	} | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const currentAddress = getCurrentAccountAddress();

	useEffect(() => {
		if (transferTimes) {
			setTransferTimesCount(parseInt(transferTimes));
		}
	}, [transferTimes]);

	const validateAddress = (address: string) => {
		if (!address) return t('addressRequired');

		if (!/^[a-zA-Z0-9]+$/.test(address)) {
			return t('invalidAddress');
		}

		if (address.startsWith('1')) {
			if (address.length !== 33 && address.length !== 34) {
				return t('invalidAddress');
			}
		} else {
			if (address.length !== 34) {
				return t('invalidAddress');
			}
		}
		return '';
	};

	const debouncedValidateAddress = useCallback(
		debounce((address: string) => {
			const error = validateAddress(address);
			setFormErrors((prev) => ({ ...prev, addressTo: error }));
		}, 1000),
		[]
	);

	const handleAddressChange = (text: string) => {
		setFormData((prev) => ({ ...prev, addressTo: text }));
		debouncedValidateAddress(text);
	};

	const validatePassword = (password: string) => {
		if (!password) {
			return t('passwordIsRequired');
		}

		const passKey = getPassKey();
		const salt = getSalt();

		if (!passKey || !salt) {
			return t('accountErrorTryAgain');
		}

		try {
			const isValid = verifyPassword(password, passKey, salt);
			return isValid ? '' : t('incorrectPassword');
		} catch (error) {
			//console.error('Password validation error:', error);
			return t('incorrectPassword');
		}
	};

	const debouncedCalculateFee = useCallback(
		debounce(async () => {
			if (!formData.addressTo || !formData.password) {
				return;
			}

			const addressError = validateAddress(formData.addressTo);
			const passwordError = validatePassword(formData.password);

			if (addressError || passwordError) {
				return;
			}

			setIsCalculatingFee(true);
			try {
				const transaction = await transferNFT(
					id!,
					currentAddress,
					formData.addressTo,
					transferTimesCount,
					formData.password,
				);
				setEstimatedFee(transaction.fee);
				setPendingTransaction({
					txHex: transaction.txHex || '',
					utxos: transaction.utxos || [],
				});
			} catch (error) {
				if (
					error instanceof Error &&
					!error.message.includes('Invalid') &&
					!error.message.includes('Password') &&
					!error.message.includes('required')
				) {
					Toast.show({
						type: 'error',
						text1: t('error'),
						text2: error.message,
					});
				}
				setEstimatedFee(null);
				setPendingTransaction(null);
			} finally {
				setIsCalculatingFee(false);
			}
		}, 1000),
		[formData, id, currentAddress, transferNFT, t],
	);

	const handleInputChange = async (field: keyof FormData, value: string) => {
		if (field === 'password') {
			value = value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
		}

		const updatedFormData = { ...formData, [field]: value };
		setFormData(updatedFormData);

		let error = '';
		if (field === 'addressTo') {
			error = validateAddress(value);
		} else if (field === 'password') {
			error = validatePassword(value);
		}

		setFormErrors((prev) => ({ ...prev, [field]: error }));

		if (updatedFormData.addressTo && updatedFormData.password) {
			debouncedCalculateFee();
		}
	};

	const handleClearField = (field: keyof FormData) => {
		setFormData((prev) => ({ ...prev, [field]: '' }));
		setFormErrors((prev) => ({ ...prev, [field]: '' }));
		setEstimatedFee(null);
	};

	const handleSelectAddress = (address: string) => {
		handleInputChange('addressTo', address);
	};

	useEffect(() => {
		if (formData.addressTo && formData.password) {
			debouncedCalculateFee();
		}
	}, [formData, debouncedCalculateFee]);

	const handleSubmit = async () => {
		const addressError = validateAddress(formData.addressTo);
		const passwordError = validatePassword(formData.password);

		const newErrors = {
			addressTo: addressError,
			password: passwordError,
		};

		setFormErrors(newErrors);

		if (Object.values(newErrors).some((error) => error)) {
			Toast.show({
				type: 'error',
				text1: 'Validation Error',
				text2: 'Please check your input',
			});
			return;
		}

		if (!pendingTransaction) {
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Please wait for transaction preparation',
			});
			return;
		}

		try {
			setIsSubmitting(true);
			await new Promise((resolve) => setTimeout(resolve, 50));

			let retried = false;
			let txid: string | undefined;
			try {
				txid = await finish_transaction(pendingTransaction.txHex, pendingTransaction.utxos!);
			} catch (error: any) {
				if (
					!retried &&
					(error.message.includes('Missing inputs') ||
						error.message.includes('txn-mempool-conflict'))
				) {
					retried = true;
					const utxos = await fetchUTXOs(currentAddress);
					await updateCurrentAccountUtxos(utxos, currentAddress);

					const result = await transferNFT(
						id,
						currentAddress,
						formData.addressTo,
						transferTimesCount,
						formData.password,
					);
					txid = await finish_transaction(result.txHex, result.utxos!);
				} else {
					throw new Error('Failed to broadcast transaction.');
				}
			}

			if (txid) {
				if (formData.addressTo === currentAddress) {
					await updateNFTTransferTimes(id, transferTimesCount + 1);
				} else {
					const allAddresses = getAllAccountAddresses();

					if (allAddresses.includes(formData.addressTo)) {
						await updateNFTUserAddress(id, formData.addressTo);
					} else {
						await removeNFT(id);
					}
				}

				Toast.show({
					type: 'success',
					text1: t('success'),
					text2: t('nftTransferredSuccessfully'),
				});

				router.back();
			}
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2:
					typeof error === 'object' && error !== null && 'message' in error
						? String(error.message)
						: t('failedToTransferNFT'),
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<KeyboardAvoidingWrapper contentContainerStyle={styles.container} backgroundColor="#fff">
			<View style={styles.inputGroup}>
				<View style={styles.labelRow}>
					<Text style={styles.label}>{t('recipientAddress')}</Text>
					<TouchableOpacity
						onPress={() => setShowAddressSelector(true)}
						style={styles.addressBookButton}
					>
						<Ionicons name="book-outline" size={20} color="#333" />
					</TouchableOpacity>
				</View>
				<View style={styles.inputWrapper}>
					<TextInput
						style={[styles.input, formErrors.addressTo ? styles.inputError : null]}
						placeholder={t('enterRecipientAddress')}
						value={formData.addressTo}
						onChangeText={handleAddressChange}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{formData.addressTo ? (
						<TouchableOpacity
							style={styles.clearButton}
							onPress={() => handleClearField('addressTo')}
						>
							<MaterialIcons name="clear" size={20} color="#999" />
						</TouchableOpacity>
					) : null}
				</View>
				{formErrors.addressTo ? <Text style={styles.errorText}>{formErrors.addressTo}</Text> : null}
			</View>

			<View style={styles.inputGroup}>
				<Text style={styles.label}>{t('password')}</Text>
				<View style={styles.inputWrapper}>
					<TextInput
						style={[styles.input, formErrors.password ? styles.inputError : null]}
						placeholder={t('enterYourPassword')}
						value={formData.password}
						onChangeText={(text) => handleInputChange('password', text)}
						secureTextEntry
					/>
					{formData.password ? (
						<TouchableOpacity
							style={styles.clearButton}
							onPress={() => handleClearField('password')}
						>
							<MaterialIcons name="clear" size={20} color="#999" />
						</TouchableOpacity>
					) : null}
				</View>
				{formErrors.password ? <Text style={styles.errorText}>{formErrors.password}</Text> : null}
			</View>

			<View style={styles.divider} />
			<View style={styles.feeContainer}>
				<Text style={styles.feeLabel}>{t('estimatedFee')}</Text>
				<View style={styles.feeValueContainer}>
					{isCalculatingFee ? (
						<ActivityIndicator size="small" color="#666" />
					) : estimatedFee !== null ? (
						<Text style={styles.feeAmount}>{formatFee(estimatedFee)} TBC</Text>
					) : (
						<Text style={styles.feeAmount}>-</Text>
					)}
				</View>
			</View>

			<TouchableOpacity
				style={[
					styles.transferButton,
					(!estimatedFee ||
						Object.values(formErrors).some(Boolean) ||
						isCalculatingFee ||
						isSubmitting) &&
						styles.transferButtonDisabled,
				]}
				onPress={handleSubmit}
				disabled={
					!estimatedFee ||
					Object.values(formErrors).some(Boolean) ||
					isCalculatingFee ||
					isSubmitting
				}
			>
				<Text style={styles.transferButtonText}>
					{isSubmitting ? t('sending') : isCalculatingFee ? t('calculatingFee') : t('transfer')}
				</Text>
			</TouchableOpacity>

			<AddressSelector
				visible={showAddressSelector}
				onClose={() => setShowAddressSelector(false)}
				onSelect={handleSelectAddress}
				userAddress={getCurrentAccountAddress()}
			/>
		</KeyboardAvoidingWrapper>
	);
};

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
		paddingLeft: wp(1),
		paddingRight: wp(1),
	},
	label: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
		marginBottom: hp(1),
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
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		padding: wp(1),
	},
	divider: {
		height: 1,
		backgroundColor: '#eee',
		marginVertical: hp(1.5),
	},
	feeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: hp(2),
		paddingHorizontal: wp(1),
	},
	feeLabel: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
	},
	feeValueContainer: {
		flex: 1,
		alignItems: 'flex-end',
	},
	feeAmount: {
		fontSize: hp(1.6),
		color: '#333',
		fontWeight: '500',
		textAlign: 'right',
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
	transferButton: {
		backgroundColor: '#000',
		padding: wp(4),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(2),
	},
	transferButtonDisabled: {
		backgroundColor: '#666',
	},
	transferButtonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '600',
	},
	calculateButton: {
		backgroundColor: '#000',
		padding: wp(4),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(2),
	},
	calculateButtonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '600',
	},
	addressBookButton: {
		padding: wp(1),
	},
});

export default NFTTransferPage;
