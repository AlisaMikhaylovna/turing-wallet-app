import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
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
import { useFtTransaction } from '@/hooks/useFtTransaction';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { formatBalance, formatFee } from '@/lib/util';
import { getFT, removeFT, transferFT, upsertFT } from '@/utils/sqlite';
import { fetchUTXOs } from '@/actions/get-utxos';
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper';

interface FormData {
	addressTo: string;
	amount: string;
	password: string;
}

interface FormErrors {
	addressTo?: string;
	amount?: string;
	password?: string;
}

const TokenTransferPage = () => {
	const { t } = useTranslation();
	const {
		getCurrentAccountAddress,
		getSalt,
		getPassKey,
		getAllAccountAddresses,
		updateCurrentAccountUtxos,
		getAddresses,
	} = useAccount();
	const { finish_transaction } = useTbcTransaction();
	const { sendFT } = useFtTransaction();
	const { contractId, amount } = useLocalSearchParams<{
		contractId: string;
		amount: string;
	}>();
	const [formData, setFormData] = useState<FormData>({
		addressTo: '',
		amount: '',
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
	const [isCalculatingFee, setIsCalculatingFee] = useState(false);
	const [showAddressSelector, setShowAddressSelector] = useState(false);
	const [availableAmount, setAvailableAmount] = useState<number>(0);
	const [pendingTransaction, setPendingTransaction] = useState<{
		txHex: string;
		utxos: any[];
	} | null>(null);
	const currentAddress = getCurrentAccountAddress();
	const passKey = getPassKey();
	const salt = getSalt();
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (amount) {
			setAvailableAmount(Number(formatBalance(Number(amount) * Math.pow(10, -6))));
		}
	}, [amount]);

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

	const validateAmount = (amountStr: string) => {
		if (!amountStr) return t('amountRequired');
		const num = Number(amountStr);
		if (isNaN(num) || num <= 0) {
			return t('enterValidPositiveNumber');
		}

		if (num > availableAmount) {
			return t('amountExceedsBalance');
		}

		return '';
	};

	const validatePassword = (password: string) => {
		if (!password) {
			return t('passwordIsRequired');
		}

		if (!passKey || !salt) {
			return t('accountErrorTryAgain');
		}

		try {
			const isValid = verifyPassword(password, passKey, salt);
			return isValid ? '' : t('incorrectPassword');
		} catch (error) {
			return t('incorrectPassword');
		}
	};

	const debouncedAddressValidation = useCallback(
		debounce(async (address: string) => {
			const error = validateAddress(address);
			setFormErrors((prev) => ({ ...prev, addressTo: error }));
		}, 1000),
		[],
	);

	const debouncedAmountValidation = useCallback(
		debounce(async (amountStr: string) => {
			const error = validateAmount(amountStr);
			setFormErrors((prev) => ({ ...prev, amount: error }));
		}, 1000),
		[availableAmount],
	);

	const handleInputChange = async (field: keyof FormData, value: string) => {
		if (field === 'password') {
			value = value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
		}

		const updatedFormData = { ...formData, [field]: value };
		setFormData(updatedFormData);

		setFormErrors((prev) => ({ ...prev, [field]: '' }));

		if (field === 'addressTo') {
			debouncedAddressValidation(value);
		} else if (field === 'amount') {
			debouncedAmountValidation(value);
		} else if (field === 'password') {
			const error = validatePassword(value);
			setFormErrors((prev) => ({ ...prev, password: error }));
		}

		if (updatedFormData.addressTo && updatedFormData.amount && updatedFormData.password) {
			debouncedCalculateFee(updatedFormData, Object.values(formErrors).some(Boolean));
		}
	};

	const handleClearField = (field: keyof FormData) => {
		setFormData((prev) => ({ ...prev, [field]: '' }));
		setFormErrors((prev) => ({ ...prev, [field]: '' }));

		if (field === 'password' || field === 'addressTo' || field === 'amount') {
			setEstimatedFee(null);
		}
	};

	const handleSelectAddress = (address: string) => {
		handleInputChange('addressTo', address);
	};

	const debouncedCalculateFee = useCallback(
		debounce(async (formData: FormData, hasErrors: boolean) => {
			if (!formData.addressTo || !formData.amount || !formData.password || hasErrors) return;

			if (!passKey || !salt) {
				return;
			}

			const isPasswordValid = verifyPassword(formData.password, passKey, salt);
			if (!isPasswordValid) {
				setFormErrors((prev) => ({ ...prev, password: t('incorrectPassword') }));
				return;
			}

			setIsCalculatingFee(true);
			try {
				const result = await sendFT(
					contractId,
					currentAddress,
					formData.addressTo,
					Number(formData.amount),
					formData.password,
				);
				setEstimatedFee(result.fee);
				setPendingTransaction({
					txHex: result.txHex,
					utxos: result.utxos || [],
				});
			} catch (error: any) {
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
		[contractId, currentAddress, sendFT, passKey, salt],
	);

	useEffect(() => {
		debouncedCalculateFee(formData, Object.values(formErrors).some(Boolean));
	}, [formData]);

	const handleSubmit = async () => {
		if (!pendingTransaction) {
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('pleaseWaitForTransaction'),
			});
			return;
		}

		try {
			setIsSubmitting(true);
			await new Promise((resolve) => setTimeout(resolve, 50));

			if (!formData.password) {
				setFormErrors((prev) => ({ ...prev, password: t('passwordRequired') }));
				setIsSubmitting(false);
				return;
			}

			const isPasswordValid = verifyPassword(formData.password, passKey, salt);
			if (!isPasswordValid) {
				setFormErrors((prev) => ({ ...prev, password: t('incorrectPassword') }));
				setIsSubmitting(false);
				return;
			}

			let txid: string | undefined;
			try {
				txid = await finish_transaction(pendingTransaction.txHex, pendingTransaction.utxos!);
			} catch (error: any) {
				if (
					error.message.includes('Missing inputs') ||
					error.message.includes('txn-mempool-conflict')
				) {
					const utxos = await fetchUTXOs(currentAddress);
					await updateCurrentAccountUtxos(utxos, currentAddress);
					const result = await sendFT(
						contractId,
						currentAddress,
						formData.addressTo,
						Number(formData.amount),
						formData.password,
					);
					txid = await finish_transaction(result.txHex, result.utxos!);
				} else {
					throw new Error('Failed to broadcast transaction!');
				}
			}

			if (txid) {
				const allAccountAddresses = getAllAccountAddresses();
				const senderToken = await getFT(contractId, currentAddress);
				if (formData.addressTo !== currentAddress && senderToken) {
					setAvailableAmount(
						Number(
							formatBalance(
								(Number(amount) -
									Math.floor(Number(formData.amount) * Math.pow(10, senderToken.decimal))) *
									1e-6,
							),
						),
					);
					if (
						allAccountAddresses.includes(formData.addressTo) ||
						getAddresses().tbcAddress === formData.addressTo ||
						getAddresses().taprootLegacyAddress === formData.addressTo
					) {
						const receiverToken = await getFT(contractId, formData.addressTo);

						if (receiverToken) {
							await transferFT(
								contractId,
								Math.floor(Number(formData.amount) * Math.pow(10, receiverToken.decimal)),
								formData.addressTo,
							);
						} else {
							await upsertFT(
								{
									id: contractId,
									name: senderToken.name,
									decimal: senderToken.decimal,
									amount: Math.floor(Number(formData.amount) * Math.pow(10, senderToken.decimal)),
									symbol: senderToken.symbol,
									isDeleted: false,
								},
								formData.addressTo,
							);
						}
					}
					if (senderToken) {
						await transferFT(
							contractId,
							-Math.floor(Number(formData.amount) * Math.pow(10, senderToken.decimal)),
							currentAddress,
						);
						const updatedSenderToken = await getFT(contractId, currentAddress);
						if (updatedSenderToken && updatedSenderToken.amount <= 0) {
							await removeFT(contractId, currentAddress);
						}
					}
				}

				Toast.show({
					type: 'success',
					text1: t('success'),
					text2: t('transactionSentSuccessfully'),
				});

				setFormData({
					addressTo: '',
					amount: '',
					password: '',
				});
				setEstimatedFee(null);
				setPendingTransaction(null);
			}
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: error instanceof Error ? error.message : t('transactionFailed'),
			});
			setFormData({
				addressTo: '',
				amount: '',
				password: '',
			});
			setEstimatedFee(null);
			setPendingTransaction(null);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<KeyboardAvoidingWrapper contentContainerStyle={styles.container} backgroundColor="#fff">
			<View style={styles.inputGroup}>
				<View style={styles.inputGroup}>
					<View style={styles.labelRow}>
						<Text style={styles.label}>{t('recipientAddress')}</Text>
						<TouchableOpacity onPress={() => setShowAddressSelector(true)}>
							<Ionicons name="book-outline" size={20} color="#333" />
						</TouchableOpacity>
					</View>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.addressTo && styles.inputError]}
							value={formData.addressTo}
							onChangeText={(text) => handleInputChange('addressTo', text)}
							placeholder={t('enterRecipientAddress')}
							autoCapitalize="none"
							autoCorrect={false}
						/>
						{formData.addressTo.length > 0 && (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => handleClearField('addressTo')}
							>
								<MaterialIcons name="close" size={20} color="#666" />
							</TouchableOpacity>
						)}
					</View>
					{formErrors.addressTo && <Text style={styles.errorText}>{formErrors.addressTo}</Text>}
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
								onPress={() => handleClearField('amount')}
							>
								<MaterialIcons name="close" size={20} color="#666" />
							</TouchableOpacity>
						)}
					</View>
					{formErrors.amount ? (
						<Text style={styles.errorText}>{formErrors.amount}</Text>
					) : (
						<Text style={styles.balanceText}>
							{t('available')}: {availableAmount}
						</Text>
					)}
				</View>

				<View style={styles.inputGroup}>
					<Text style={styles.label}>{t('password')}</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.password && styles.inputError]}
							value={formData.password}
							onChangeText={(text) => handleInputChange('password', text)}
							placeholder={t('enterYourPassword')}
							secureTextEntry={true}
							autoCapitalize="none"
							autoCorrect={false}
						/>
						{formData.password.length > 0 && (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => handleClearField('password')}
							>
								<MaterialIcons name="close" size={20} color="#666" />
							</TouchableOpacity>
						)}
					</View>
					{formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
				</View>

				<View style={styles.divider} />
				<View style={styles.feeContainer}>
					<Text style={styles.feeLabel}>{t('estimatedFee')}</Text>
					<View style={styles.feeValueContainer}>
						{isCalculatingFee ? (
							<ActivityIndicator size="small" color="#999" />
						) : (
							estimatedFee !== null && (
								<Text style={styles.feeAmount}>{formatFee(estimatedFee)} TBC</Text>
							)
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
					userAddress={currentAddress}
				/>
			</View>
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
	balanceText: {
		fontSize: hp(1.4),
		color: '#666',
		marginTop: hp(0.5),
		marginLeft: wp(1),
	},
	submitButton: {
		backgroundColor: '#000',
		borderRadius: 8,
		paddingVertical: hp(1.5),
		alignItems: 'center',
		marginTop: hp(2),
	},
	submitButtonText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '500',
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
});

export default TokenTransferPage;
