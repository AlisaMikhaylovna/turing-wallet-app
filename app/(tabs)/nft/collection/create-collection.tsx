import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { debounce } from 'lodash';
import React, { useCallback, useState, useEffect } from 'react';
import {
	ActivityIndicator,
	Image,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { useAccount } from '@/hooks/useAccount';
import { useNftTransaction } from '@/hooks/useNftTransaction';
import { useTbcTransaction } from '@/hooks/useTbcTransaction';
import { hp, wp } from '@/lib/common';
import { verifyPassword } from '@/lib/key';
import { formatFee } from '@/lib/util';
import { addCollection } from '@/utils/sqlite';
import { theme } from '@/lib/theme';
import { fetchUTXOs } from '@/actions/get-utxos';
import { KeyboardAvoidingWrapper } from '@/components/ui/keyboard-avoiding-wrapper';

interface FormData {
	name: string;
	description: string;
	supply: string;
	image: string | null;
	password: string;
}

interface FormErrors {
	name?: string;
	description?: string;
	supply?: string;
	image?: string;
	password?: string;
}

const CreateCollectionPage = () => {
	const { t } = useTranslation();
	const [formData, setFormData] = useState<FormData>({
		name: '',
		description: '',
		supply: '',
		image: null,
		password: '',
	});
	const [formErrors, setFormErrors] = useState<FormErrors>({});
	const [estimatedFee, setEstimatedFee] = useState<number | null>(null);
	const [isCalculatingFee, setIsCalculatingFee] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [pendingTransaction, setPendingTransaction] = useState<{
		txHex: string;
		utxos: any[];
	} | null>(null);

	const { getCurrentAccountAddress, getSalt, getPassKey, updateCurrentAccountUtxos } = useAccount();
	const { createCollection } = useNftTransaction();
	const { finish_transaction } = useTbcTransaction();

	const currentAddress = getCurrentAccountAddress();

	const validateName = (name: string) => {
		if (!name) return t('collectionNameRequired');
		if (name.length < 1 || name.length > 20) return t('nameMustBe1To20Chars');

		if (name.startsWith(' ') || name.endsWith(' ')) {
			return t('nameCannotStartOrEndWithSpaces');
		}

		if (!/^[a-zA-Z0-9 ]+$/.test(name)) {
			return t('nameCanOnlyContainLettersNumbersSpaces');
		}

		return '';
	};

	const validateDescription = (description: string) => {
		if (!description) return t('descriptionRequired');
		if (description.length > 100) return t('descriptionMustBeLessThan100Chars');
		return '';
	};

	const validateSupply = (supply: string) => {
		if (!supply) return t('supplyRequired');
		const num = Number(supply);
		if (isNaN(num) || !Number.isInteger(num) || num < 1 || num > 1000) {
			return t('supplyMustBeIntegerBetween1And1000');
		}
		return '';
	};

	const validateImage = (image: string | null) => {
		if (!image) return t('collectionImageRequired');
		return '';
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
			if (
				!formData.name ||
				!formData.description ||
				!formData.supply ||
				!formData.image ||
				!formData.password
			) {
				return;
			}

			const nameError = validateName(formData.name);
			const descriptionError = validateDescription(formData.description);
			const supplyError = validateSupply(formData.supply);
			const imageError = validateImage(formData.image);
			const passwordError = validatePassword(formData.password);

			if (nameError || descriptionError || supplyError || imageError || passwordError) {
				return;
			}

			setIsCalculatingFee(true);
			try {
				const collectionData = {
					collectionName: formData.name,
					description: formData.description,
					supply: parseInt(formData.supply),
					file: formData.image,
				};

				const transaction = await createCollection(collectionData, currentAddress, formData.password);
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
		[formData, currentAddress, createCollection, t]
	);

	const handleInputChange = (field: keyof FormData, value: string) => {
		if (field === 'password') {
			value = value.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
		}

		const updatedFormData = { ...formData, [field]: value };
		setFormData(updatedFormData);

		let error = '';
		if (field === 'name') {
			error = validateName(value);
		} else if (field === 'description') {
			error = validateDescription(value);
		} else if (field === 'supply') {
			error = validateSupply(value);
		} else if (field === 'password') {
			error = validatePassword(value);
		}

		setFormErrors((prev) => ({ ...prev, [field]: error }));

		if (
			updatedFormData.name &&
			updatedFormData.description &&
			updatedFormData.supply &&
			updatedFormData.image &&
			updatedFormData.password
		) {
			debouncedCalculateFee();
		}
	};

	const handleClearInput = (field: keyof FormData) => {
		setFormData((prev) => ({ ...prev, [field]: field === 'image' ? null : '' }));
		setFormErrors((prev) => ({ ...prev, [field]: '' }));

		if (
			field === 'password' ||
			field === 'name' ||
			field === 'description' ||
			field === 'supply' ||
			field === 'image'
		) {
			setEstimatedFee(null);
		}
	};

	const handlePickImage = async () => {
		try {
			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ['images'],
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
				base64: true,
			});

			if (!result.canceled && result.assets && result.assets.length > 0) {
				const selectedAsset = result.assets[0];

				const base64 = selectedAsset.base64;
				if (base64) {
					const fileSizeInBytes = Math.round((base64.length * 3) / 4);
					const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

					if (fileSizeInMB > 5) {
						Toast.show({
							type: 'error',
							text1: 'File too large',
							text2: 'Please select an image smaller than 5MB',
						});
						return;
					}

					const updatedFormData = { ...formData, image: `data:image/jpeg;base64,${base64}` };
					setFormData(updatedFormData);
					setFormErrors((prev) => ({ ...prev, image: '' }));
				}
			}
		} catch (error) {
			//console.error('Error picking image:', error);
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Failed to pick image',
			});
		}
	};

	const handleCreateCollection = async () => {
		if (
			!formData.name ||
			!formData.description ||
			!formData.supply ||
			!formData.image ||
			!formData.password ||
			!estimatedFee
		) {
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
			setIsCreating(true);
			await new Promise((resolve) => setTimeout(resolve, 50));
			let txId: string | undefined;
			try {
				txId = await finish_transaction(pendingTransaction.txHex, pendingTransaction.utxos!);
			} catch (error: any) {
				if (
					error.message.includes('Missing inputs') ||
					error.message.includes('txn-mempool-conflict')
				) {
					const utxos = await fetchUTXOs(currentAddress);
					await updateCurrentAccountUtxos(utxos, currentAddress);

					const collectionData = {
						collectionName: formData.name,
						description: formData.description,
						supply: parseInt(formData.supply),
						file: formData.image,
					};

					const transaction = await createCollection(
						collectionData,
						currentAddress,
						formData.password,
					);
					txId = await finish_transaction(transaction.txHex, transaction.utxos!);
				} else {
					throw new Error('Failed to broadcast transaction.');
				}
			}

			if (txId) {
				await addCollection(
					{
						id: txId,
						name: formData.name,
						supply: parseInt(formData.supply),
						creator: currentAddress,
						icon: formData.image,
						isDeleted: false,
					},
					currentAddress,
				);

				Toast.show({
					type: 'success',
					text1: t('success'),
					text2: t('collectionCreatedSuccessfully'),
				});

				router.back();
			}
		} catch (error) {
			//console.error('Error creating collection:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2:
					typeof error === 'object' && error !== null && 'message' in error
						? String(error.message)
						: t('failedToCreateCollection'),
			});
		} finally {
			setIsCreating(false);
		}
	};

	useEffect(() => {
		if (
			formData.name &&
			formData.description &&
			formData.supply &&
			formData.image &&
			formData.password
		) {
			debouncedCalculateFee();
		}
	}, [formData, debouncedCalculateFee]);

	return (
		<View style={styles.container}>
			<KeyboardAvoidingWrapper 
				contentContainerStyle={{ padding: wp(4) }}
				backgroundColor="#fff"
			>
				<View style={styles.formGroup}>
					<Text style={styles.label}>{t('collectionName')}</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.name ? styles.inputError : null]}
							placeholder={t('enterCollectionName')}
							value={formData.name}
							onChangeText={(text) => handleInputChange('name', text)}
							maxLength={20}
						/>
						{formData.name ? (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => handleClearInput('name')}
							>
								<MaterialIcons name="clear" size={20} color="#999" />
							</TouchableOpacity>
						) : null}
					</View>
					{formErrors.name ? <Text style={styles.errorText}>{formErrors.name}</Text> : null}
				</View>

				<View style={styles.formGroup}>
					<Text style={styles.label}>{t('description')}</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[
								styles.input,
								styles.textArea,
								formErrors.description ? styles.inputError : null,
							]}
							placeholder={t('enterCollectionDescription')}
							value={formData.description}
							onChangeText={(text) => handleInputChange('description', text)}
							multiline
							numberOfLines={4}
							maxLength={100}
							textAlignVertical="top"
						/>
						{formData.description ? (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => handleClearInput('description')}
							>
								<MaterialIcons name="clear" size={20} color="#999" />
							</TouchableOpacity>
						) : null}
					</View>
					{formErrors.description ? (
						<Text style={styles.errorText}>{formErrors.description}</Text>
					) : null}
				</View>

				<View style={styles.formGroup}>
					<Text style={styles.label}>{t('supply')}</Text>
					<View style={styles.inputWrapper}>
						<TextInput
							style={[styles.input, formErrors.supply ? styles.inputError : null]}
							placeholder={t('enterSupply')}
							value={formData.supply}
							onChangeText={(text) => handleInputChange('supply', text)}
							keyboardType="numeric"
							maxLength={4}
						/>
						{formData.supply ? (
							<TouchableOpacity
								style={styles.clearButton}
								onPress={() => handleClearInput('supply')}
							>
								<MaterialIcons name="clear" size={20} color="#999" />
							</TouchableOpacity>
						) : null}
					</View>
					{formErrors.supply ? <Text style={styles.errorText}>{formErrors.supply}</Text> : null}
				</View>

				<View style={styles.formGroup}>
					<Text style={styles.label}>{t('collectionImage')}</Text>
					<TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
						{formData.image ? (
							<View style={{ position: 'relative' }}>
								<Image source={{ uri: formData.image }} style={styles.previewImage} />
								<TouchableOpacity
									style={styles.imageCloseButton}
									onPress={() => handleClearInput('image')}
								>
									<MaterialIcons name="close" size={20} color="#fff" />
								</TouchableOpacity>
							</View>
						) : (
							<View style={styles.imagePlaceholder}>
								<MaterialIcons name="add-photo-alternate" size={40} color="#999" />
								<Text style={styles.imagePlaceholderText}>{t('tapToSelectImage')}</Text>
							</View>
						)}
					</TouchableOpacity>
					{formErrors.image ? <Text style={styles.errorText}>{formErrors.image}</Text> : null}
				</View>

				<View style={styles.formGroup}>
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
								onPress={() => handleClearInput('password')}
							>
								<MaterialIcons name="clear" size={20} color="#999" />
							</TouchableOpacity>
						) : null}
					</View>
					{formErrors.password ? <Text style={styles.errorText}>{formErrors.password}</Text> : null}
				</View>

				<View style={[styles.feeContainer, { marginTop: hp(1) }]}>
					<Text style={styles.feeLabel}>{t('estimatedFee')}</Text>
					<View style={styles.feeValueContainer}>
						{isCalculatingFee ? (
							<ActivityIndicator size="small" color="#000" />
						) : estimatedFee !== null ? (
							<Text style={styles.feeAmount}>{formatFee(estimatedFee)} TBC</Text>
						) : (
							<Text style={styles.feeAmount}>-</Text>
						)}
					</View>
				</View>

				<TouchableOpacity
					style={[
						styles.createButton,
						(!estimatedFee || isCreating || isCalculatingFee) && styles.createButtonDisabled,
					]}
					onPress={handleCreateCollection}
					disabled={!estimatedFee || isCreating || isCalculatingFee}
				>
					{isCreating ? (
						<Text style={styles.createButtonText}>{t('sending')}</Text>
					) : isCalculatingFee ? (
						<Text style={styles.createButtonText}>{t('calculatingFee')}</Text>
					) : (
						<Text style={styles.createButtonText}>{t('createCollection')}</Text>
					)}
				</TouchableOpacity>
			</KeyboardAvoidingWrapper>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	formGroup: {
		marginBottom: hp(1.5),
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
	textArea: {
		height: hp(10),
		textAlignVertical: 'top',
	},
	clearButton: {
		position: 'absolute',
		right: wp(2),
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		padding: wp(1),
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
	imagePickerButton: {
		width: '100%',
		height: hp(30),
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		overflow: 'hidden',
	},
	imagePlaceholder: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8f8f8',
	},
	imagePlaceholderText: {
		marginTop: hp(1),
		color: '#999',
		fontSize: hp(1.6),
	},
	previewImage: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
	},
	imageCloseButton: {
		position: 'absolute',
		top: wp(2),
		right: wp(2),
		backgroundColor: 'rgba(0,0,0,0.5)',
		borderRadius: 15,
		width: 30,
		height: 30,
		justifyContent: 'center',
		alignItems: 'center',
	},
	feeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: hp(1.5),
		paddingHorizontal: wp(1),
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
		marginTop: hp(1),
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
	createButton: {
		backgroundColor: theme.colors.primary,
		padding: wp(4),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(2),
		marginBottom: hp(4),
	},
	createButtonDisabled: {
		backgroundColor: '#999',
	},
	createButtonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '600',
	},
});

export default CreateCollectionPage;
