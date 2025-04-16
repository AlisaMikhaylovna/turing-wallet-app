import React, { useEffect, useState } from 'react';
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

import { Modal } from '@/components/ui/modal';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { getMultiSigByAddress, restoreMultiSig } from '@/utils/sqlite';

interface RestoreMultiSigModalProps {
	visible: boolean;
	onClose: () => void;
	onSubmit: (multiSigAddress: string) => Promise<void>;
	userAddress: string;
}

export const RestoreMultiSigModal = ({
	visible,
	onClose,
	onSubmit,
	userAddress,
}: RestoreMultiSigModalProps) => {
	const { t } = useTranslation();
	const [multiSigAddress, setMultiSigAddress] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!visible) {
			resetForm();
		}
	}, [visible]);

	const resetForm = () => {
		setMultiSigAddress('');
		setError('');
	};

	const validateForm = () => {
		if (!multiSigAddress.trim()) {
			setError(t('multiSigAddressCannotBeEmpty'));
			return false;
		}

		if (!/^[0-9a-zA-Z]{34,42}$/.test(multiSigAddress.trim())) {
			setError(t('invalidMultiSigAddressFormat'));
			return false;
		}

		return true;
	};

	const handleSubmit = async () => {
		if (!validateForm()) {
			return;
		}

		setIsLoading(true);
		try {
			const existingMultiSig = await getMultiSigByAddress(multiSigAddress.trim(), userAddress);

			if (existingMultiSig) {
				if (existingMultiSig.isDeleted === 1) {
					await restoreMultiSig(multiSigAddress.trim(), userAddress);
					await onSubmit(multiSigAddress.trim());
					onClose();
				} else {
					setError(t('multiSigAddressAlreadyExists'));
				}
			} else {
				setError(t('multiSigAddressNotFound'));
			}
		} catch (error) {
			//console.error('Failed to restore MultiSig address:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: error instanceof Error ? error.message : t('failedToRestoreMultiSigAddress'),
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Modal visible={visible} onClose={onClose}>
			<View style={styles.container}>
				<Text style={styles.title}>{t('restoreMultiSigAddress')}</Text>

				<View style={styles.formGroup}>
					<Text style={styles.label}>{t('multiSigAddress')}</Text>
					<TextInput
						style={[styles.input, error && styles.inputError]}
						value={multiSigAddress}
						onChangeText={(text) => {
							setMultiSigAddress(text);
							setError('');
						}}
						placeholder={t('enterMultiSigAddressToRestore')}
						autoCapitalize="none"
						autoCorrect={false}
						editable={!isLoading}
					/>
					{error ? <Text style={styles.errorText}>{error}</Text> : null}
				</View>

				<TouchableOpacity
					style={[styles.button, isLoading && styles.buttonDisabled]}
					onPress={handleSubmit}
					disabled={isLoading}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" size="small" />
					) : (
						<Text style={styles.buttonText}>{t('restore')}</Text>
					)}
				</TouchableOpacity>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		width: '100%',
	},
	title: {
		fontSize: hp(2),
		fontWeight: '600',
		marginBottom: hp(2),
	},
	formGroup: {
		width: '100%',
		marginBottom: hp(2),
	},
	label: {
		fontSize: hp(1.6),
		marginBottom: hp(0.5),
		color: '#333',
	},
	input: {
		width: '100%',
		height: hp(5),
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingHorizontal: wp(3),
		fontSize: hp(1.6),
	},
	inputError: {
		borderColor: '#e53935',
	},
	errorText: {
		color: '#e53935',
		fontSize: hp(1.4),
		marginTop: hp(0.5),
	},
	button: {
		backgroundColor: theme.colors.primary,
		paddingHorizontal: wp(6),
		paddingVertical: hp(1.5),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(1),
		width: '100%',
	},
	buttonDisabled: {
		backgroundColor: '#666',
	},
	buttonText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '500',
	},
});
