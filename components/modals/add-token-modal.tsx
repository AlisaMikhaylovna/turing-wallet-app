import { MaterialIcons } from '@expo/vector-icons';
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

import { syncFTInfo } from '@/actions/get-ft';
import { Modal } from '@/components/ui/modal';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { getFT, getFTPublic, restoreFT } from '@/utils/sqlite';

interface AddContractModalProps {
	visible: boolean;
	onClose: () => void;
	onRefreshLists: () => void;
}

export const AddContractModal = ({ visible, onClose, onRefreshLists }: AddContractModalProps) => {
	const { t } = useTranslation();
	const [contractId, setContractId] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const { getCurrentAccountAddress } = useAccount();

	useEffect(() => {
		if (!visible) {
			setContractId('');
		}
	}, [visible]);

	const handleClose = () => {
		onClose();
	};

	const handleContractIdChange = (text: string) => {
		const hexOnly = text.replace(/[^0-9a-fA-F]/g, '');
		setContractId(hexOnly);
	};

	const handleSubmit = async () => {
		const trimmedId = contractId.trim();
		const userAddress = getCurrentAccountAddress();

		if (!trimmedId || trimmedId.length !== 64) {
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('enterValidContractId'),
			});
			return;
		}

		setIsLoading(true);

		try {
			const [existingFT, existingPublic] = await Promise.all([
				getFT(trimmedId, userAddress),
				getFTPublic(trimmedId),
			]);

			if (existingFT && !existingFT.isDeleted && existingPublic) {
				Toast.show({
					type: 'error',
					text1: t('error'),
					text2: t('tokenAlreadyExists'),
				});
				return;
			}

			if (existingFT?.isDeleted) {
				await restoreFT(trimmedId, userAddress);
				if (!existingPublic) {
					await syncFTInfo(trimmedId);
					Toast.show({
						type: 'success',
						text1: t('success'),
						text2: t('tokenRestoredAndAdded'),
					});
				} else {
					Toast.show({
						type: 'success',
						text1: t('success'),
						text2: t('tokenRestored'),
					});
				}
			} else if (!existingPublic) {
				await syncFTInfo(trimmedId);
				Toast.show({
					type: 'success',
					text1: t('success'),
					text2: t('tokenAdded'),
				});
			} else {
				Toast.show({
					type: 'success',
					text1: t('success'),
					text2: t('tokenAdded'),
				});
			}

			onRefreshLists();
			onClose();
		} catch (error) {
			//console.error('Failed to add token:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToAddToken'),
			});
		} finally {
			setIsLoading(false);
		}
	};

	const displayContractId =
		contractId.length > 41
			? `${contractId.substring(0, 12)}...${contractId.substring(contractId.length - 12)}`
			: contractId;

	return (
		<Modal visible={visible} onClose={handleClose}>
			<View style={styles.container}>
				<Text style={styles.title}>{t('addOrRestoreToken')}</Text>
				<View style={styles.inputWrapper}>
					<TextInput
						style={styles.input}
						placeholder={t('enterContractId')}
						value={displayContractId}
						onChangeText={handleContractIdChange}
						autoCapitalize="none"
						autoCorrect={false}
						editable={!isLoading}
					/>
					{contractId.trim() && (
						<TouchableOpacity
							style={styles.clearIcon}
							onPress={() => setContractId('')}
							disabled={isLoading}
						>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
				<TouchableOpacity
					style={[styles.button, (isLoading || contractId.length !== 64) && styles.buttonDisabled]}
					onPress={handleSubmit}
					disabled={isLoading || contractId.length !== 64}
				>
					{isLoading ? (
						<ActivityIndicator color="#fff" size="small" />
					) : (
						<Text style={styles.buttonText}>{t('confirm')}</Text>
					)}
				</TouchableOpacity>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
	},
	title: {
		fontSize: hp(2),
		fontWeight: '600',
		marginBottom: hp(2),
	},
	inputWrapper: {
		width: '100%',
		position: 'relative',
		marginBottom: hp(2),
	},
	input: {
		width: '100%',
		height: hp(5),
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingHorizontal: wp(3),
		paddingRight: wp(10),
		fontSize: hp(1.6),
	},
	button: {
		backgroundColor: '#000',
		paddingHorizontal: wp(6),
		paddingVertical: hp(1),
		borderRadius: 8,
		minWidth: wp(20),
		alignItems: 'center',
	},
	buttonDisabled: {
		backgroundColor: '#666',
	},
	buttonText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '500',
	},
	clearIcon: {
		position: 'absolute',
		right: wp(2),
		height: hp(5),
		justifyContent: 'center',
		paddingHorizontal: wp(1),
	},
});
