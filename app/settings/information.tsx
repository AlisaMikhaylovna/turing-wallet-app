import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState, useLayoutEffect } from 'react';
import {
	Modal,
	ScrollView,
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

import { syncMultiSigs } from '@/actions/get-multiSigs';
import { RestoreMultiSigModal } from '@/components/modals/restore-multisig-modal';
import { ConfirmModal } from '@/components/modals/confirm-modal';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { getActiveMultiSigs, softDeleteMultiSig } from '@/utils/sqlite';
import { AccountType } from '@/types';
import { getMultiSigType } from '@/lib/util';

interface MultiSigAddress {
	multiSig_address: string;
	pubKeys: string[];
}

export default function InformationPage() {
	const { t } = useTranslation();
	const navigation = useNavigation();
	const {
		getCurrentAccountAddress,
		getCurrentAccountTbcPubKey,
		getCurrentAccountName,
		updateCurrentAccountName,
		getAddresses,
		getCurrentAccountType,
	} = useAccount();
	const address = getCurrentAccountAddress();
	const publicKey = getCurrentAccountTbcPubKey();
	const username = getCurrentAccountName();
	const addresses = getAddresses();
	const accountType = getCurrentAccountType();
	const disableMultiSig =
		accountType === AccountType.TAPROOT ||
		accountType === AccountType.TAPROOT_LEGACY ||
		accountType === AccountType.LEGACY;

	const [modalVisible, setModalVisible] = useState(false);
	const [newUsername, setNewUsername] = useState(username);
	const [error, setError] = useState('');

	const [multiSigAddresses, setMultiSigAddresses] = useState<MultiSigAddress[]>([]);
	const [multiSigModalVisible, setMultiSigModalVisible] = useState(false);
	const [expandedMultiSig, setExpandedMultiSig] = useState<string | null>(null);
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [multiSigToDelete, setMultiSigToDelete] = useState<string | null>(null);
	const [refreshingMultiSigs, setRefreshingMultiSigs] = useState(false);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerTitle: t('informationManagement'),
		});
	}, [navigation, t]);

	useEffect(() => {
		if (disableMultiSig) {
			setMultiSigAddresses([]);
		} else {
			loadMultiSigAddresses();
		}
	}, [disableMultiSig]);

	const loadMultiSigAddresses = useCallback(async () => {
		try {
			if (!disableMultiSig) {
				const multiSigs = await getActiveMultiSigs(address);
				setMultiSigAddresses(multiSigs);
			}
		} catch (error) {
			//console.error('Failed to load MultiSig addresses:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToLoadMultiSigAddresses'),
			});
		}
	}, [address, disableMultiSig, t]);

	const handleCopy = async (text: string, label: string) => {
		await Clipboard.setStringAsync(text);
		Toast.show({
			type: 'success',
			text1: `${label} ${t('copied')}`,
		});
	};

	const handleSaveUsername = () => {
		if (!newUsername?.trim()) {
			setError(t('accountNameCannotBeEmpty'));
			return;
		}

		if (newUsername.trim().length < 3 || newUsername.trim().length > 15) {
			setError(t('accountNameMustBeBetween3And15'));
			return;
		}

		if (!/^[a-zA-Z0-9]+$/.test(newUsername.trim())) {
			setError(t('accountNameOnlyLettersAndNumbers'));
			return;
		}

		updateCurrentAccountName(newUsername.trim());
		setModalVisible(false);
		Toast.show({
			type: 'success',
			text1: t('accountNameUpdatedSuccessfully'),
		});
	};

	const handleRestoreMultiSig = async () => {
		Toast.show({
			type: 'success',
			text1: t('multiSigAddressRestoredSuccessfully'),
		});
		await loadMultiSigAddresses();
	};

	const handleRefreshMultiSigs = async () => {
		try {
			setRefreshingMultiSigs(true);
			await syncMultiSigs(address);
			await loadMultiSigAddresses();
			Toast.show({
				type: 'success',
				text1: 'MultiSig wallets synced successfully',
			});
		} catch (error) {
			//console.error('Failed to sync MultiSig wallets:', error);
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2: 'Failed to sync MultiSig wallets',
			});
		} finally {
			setRefreshingMultiSigs(false);
		}
	};

	const handleCreateMultiSig = () => {
		router.push('/multiSigs/create-multiSig-wallet');
	};

	const toggleMultiSigExpand = (multiSigAddress: string) => {
		if (expandedMultiSig === multiSigAddress) {
			setExpandedMultiSig(null);
		} else {
			setExpandedMultiSig(multiSigAddress);
		}
	};

	const handleDeleteMultiSig = async () => {
		if (!multiSigToDelete) return;

		try {
			await softDeleteMultiSig(multiSigToDelete, address);
			await loadMultiSigAddresses();
			Toast.show({
				type: 'success',
				text1: t('multiSigAddressDeletedSuccessfully'),
			});
		} catch (error) {
			//console.error('Failed to delete MultiSig address:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToDeleteMultiSig'),
			});
		} finally {
			setDeleteModalVisible(false);
			setMultiSigToDelete(null);
		}
	};

	useFocusEffect(
		useCallback(() => {
			loadMultiSigAddresses();
		}, [loadMultiSigAddresses]),
	);

	return (
		<ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
			<View style={styles.listContainer}>
				<View style={styles.listItem}>
					<View style={styles.itemLeft}>
						<Text style={styles.itemLabel}>{t('accountName')}</Text>
						<Text style={styles.itemValue}>{username}</Text>
					</View>
					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => {
							setNewUsername(username);
							setError('');
							setModalVisible(true);
						}}
					>
						<MaterialIcons name="edit" size={22} color={theme.colors.primary} />
					</TouchableOpacity>
				</View>

				<View style={styles.separator} />

				<View style={styles.listItem}>
					<View style={styles.itemLeft}>
						<Text style={styles.itemLabel}>{t('currentAddress')}</Text>
						<Text style={styles.itemValue} numberOfLines={1} ellipsizeMode="middle">
							{address}
						</Text>
					</View>
				</View>

				{addresses?.tbcAddress && (
					<>
						<View style={styles.addressItem}>
							<View style={styles.itemLeft}>
								<Text style={styles.addressLabel}>TBC legacy address</Text>
								<View style={styles.valueWithCopy}>
									<Text style={styles.addressValue} numberOfLines={1} ellipsizeMode="middle">
										{addresses.tbcAddress}
									</Text>
									<TouchableOpacity
										style={styles.inlineCopyButton}
										onPress={() => handleCopy(addresses.tbcAddress, 'TBC Address')}
									>
										<MaterialIcons name="content-copy" size={16} color={theme.colors.primary} />
									</TouchableOpacity>
								</View>
								<Text style={styles.addressDescription}>{t('tbcAddressDescription')}</Text>
							</View>
						</View>
					</>
				)}

				{addresses?.taprootLegacyAddress && (
					<>
						<View style={styles.addressItem}>
							<View style={styles.itemLeft}>
								<Text style={styles.addressLabel}> TBC Taproot legacy address</Text>
								<View style={styles.valueWithCopy}>
									<Text style={styles.addressValue} numberOfLines={1} ellipsizeMode="middle">
										{addresses.taprootLegacyAddress}
									</Text>
									<TouchableOpacity
										style={styles.inlineCopyButton}
										onPress={() =>
											handleCopy(addresses.taprootLegacyAddress!, 'Taproot Legacy Address')
										}
									>
										<MaterialIcons name="content-copy" size={16} color={theme.colors.primary} />
									</TouchableOpacity>
								</View>
								<Text style={styles.addressDescription}>
									{t('taprootLegacyAddressDescription')}
								</Text>
							</View>
						</View>
					</>
				)}

				{addresses?.taprootAddress && (
					<>
						<View style={styles.addressItem}>
							<View style={styles.itemLeft}>
								<Text style={styles.addressLabel}>BTC Taproot address</Text>
								<View style={styles.valueWithCopy}>
									<Text style={styles.addressValue} numberOfLines={1} ellipsizeMode="middle">
										{addresses.taprootAddress}
									</Text>
									<TouchableOpacity
										style={styles.inlineCopyButton}
										onPress={() => handleCopy(addresses.taprootAddress!, 'Taproot Address')}
									>
										<MaterialIcons name="content-copy" size={16} color={theme.colors.primary} />
									</TouchableOpacity>
								</View>
								<Text style={styles.addressDescription}>{t('taprootAddressDescription')}</Text>
							</View>
						</View>
					</>
				)}

				{addresses?.legacyAddress && (
					<>
						<View style={styles.addressItem}>
							<View style={styles.itemLeft}>
								<Text style={styles.addressLabel}>BTC Legacy address</Text>
								<View style={styles.valueWithCopy}>
									<Text style={styles.addressValue} numberOfLines={1} ellipsizeMode="middle">
										{addresses.legacyAddress}
									</Text>
									<TouchableOpacity
										style={styles.inlineCopyButton}
										onPress={() => handleCopy(addresses.legacyAddress!, 'Legacy Address')}
									>
										<MaterialIcons name="content-copy" size={16} color={theme.colors.primary} />
									</TouchableOpacity>
								</View>
								<Text style={styles.addressDescription}>{t('legacyAddressDescription')}</Text>
							</View>
						</View>
					</>
				)}

				<View style={styles.separator} />

				<View style={styles.listItem}>
					<View style={styles.itemLeft}>
						<Text style={styles.itemLabel}>{t('publicKey')}</Text>
						<View style={styles.valueWithCopy}>
							<Text style={styles.itemValue} numberOfLines={1} ellipsizeMode="middle">
								{publicKey}
							</Text>
							<TouchableOpacity
								style={styles.inlineCopyButton}
								onPress={() => handleCopy(publicKey!, 'Public Key')}
							>
								<MaterialIcons name="content-copy" size={18} color={theme.colors.primary} />
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</View>

			<View style={styles.sectionHeader}>
				<Text style={styles.sectionTitle}>{t('multiSigWallets')}</Text>
				<View style={styles.headerActions}>
					<TouchableOpacity
						style={[styles.actionButton, disableMultiSig && styles.disabledButton]}
						onPress={handleCreateMultiSig}
						disabled={disableMultiSig}
					>
						<MaterialIcons
							name="add"
							size={24}
							color={disableMultiSig ? '#999' : theme.colors.primary}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						style={[
							styles.actionButton,
							(refreshingMultiSigs || disableMultiSig) && styles.disabledButton,
						]}
						onPress={handleRefreshMultiSigs}
						disabled={refreshingMultiSigs || disableMultiSig}
					>
						{refreshingMultiSigs ? (
							<ActivityIndicator size="small" color="#333" />
						) : (
							<MaterialIcons name="refresh" size={24} color={disableMultiSig ? '#999' : '#333'} />
						)}
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionButton, disableMultiSig && styles.disabledButton]}
						onPress={() => setMultiSigModalVisible(true)}
						disabled={disableMultiSig}
					>
						<MaterialIcons
							name="visibility"
							size={22}
							color={disableMultiSig ? '#999' : theme.colors.primary}
						/>
					</TouchableOpacity>
				</View>
			</View>

			{multiSigAddresses.length > 0 &&
				multiSigAddresses.map((item) => (
					<View key={item.multiSig_address} style={styles.multiSigItem}>
						<TouchableOpacity
							style={styles.multiSigHeader}
							onPress={() => toggleMultiSigExpand(item.multiSig_address)}
						>
							<Text style={styles.multiSigAddress} numberOfLines={1} ellipsizeMode="middle">
								{item.multiSig_address}
							</Text>
							<View style={styles.multiSigActions}>
								<TouchableOpacity
									style={styles.actionButton}
									onPress={() => handleCopy(item.multiSig_address, 'MultiSig Address')}
								>
									<MaterialIcons name="content-copy" size={20} color={theme.colors.primary} />
								</TouchableOpacity>
								<TouchableOpacity
									style={styles.actionButton}
									onPress={() => {
										setMultiSigToDelete(item.multiSig_address);
										setDeleteModalVisible(true);
									}}
								>
									<MaterialIcons name="visibility-off" size={22} color="#666" />
								</TouchableOpacity>
								<MaterialIcons
									name={expandedMultiSig === item.multiSig_address ? 'expand-less' : 'expand-more'}
									size={24}
									color="#666"
								/>
							</View>
						</TouchableOpacity>

						{expandedMultiSig === item.multiSig_address && (
							<View style={styles.pubKeysContainer}>
								<View style={styles.multiSigTypeContainer}>
									<Text style={styles.multiSigTypeLabel}>{t('type')}:</Text>
									<Text style={styles.multiSigTypeValue}>
										{getMultiSigType(item.multiSig_address)}
									</Text>
								</View>
								<Text style={styles.pubKeysTitle}>{t('publicKeys')}:</Text>
								{item.pubKeys.map((pubKey, index) => (
									<View key={index} style={styles.pubKeyItem}>
										<Text style={styles.pubKeyText} numberOfLines={1} ellipsizeMode="middle">
											{pubKey}
										</Text>
										<TouchableOpacity
											style={styles.copyPubKeyButton}
											onPress={() => handleCopy(pubKey, `Public Key ${index + 1}`)}
										>
											<MaterialIcons name="content-copy" size={18} color={theme.colors.primary} />
										</TouchableOpacity>
									</View>
								))}
							</View>
						)}
					</View>
				))}

			<Modal visible={modalVisible} transparent animationType="fade">
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						<Text style={styles.modalTitle}>{t('editAccountName')}</Text>
						<TextInput
							style={styles.input}
							value={newUsername || ''}
							onChangeText={setNewUsername}
							placeholder={t('enterAccountName')}
							autoCapitalize="none"
							autoCorrect={false}
							maxLength={15}
						/>
						{error ? <Text style={styles.errorText}>{error}</Text> : null}
						<View style={styles.modalButtons}>
							<TouchableOpacity
								style={[styles.modalButton, styles.cancelButton]}
								onPress={() => setModalVisible(false)}
							>
								<Text style={styles.cancelButtonText}>{t('cancel')}</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.modalButton, styles.saveButton]}
								onPress={handleSaveUsername}
							>
								<Text style={styles.saveButtonText}>{t('save')}</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			<RestoreMultiSigModal
				visible={multiSigModalVisible}
				onClose={() => setMultiSigModalVisible(false)}
				onSubmit={handleRestoreMultiSig}
				userAddress={address}
			/>

			<ConfirmModal
				visible={deleteModalVisible}
				title="Hide MultiSig Wallet"
				message="Are you sure you want to hide this MultiSig wallet? You can restore it anytime."
				onConfirm={handleDeleteMultiSig}
				onCancel={() => {
					setDeleteModalVisible(false);
					setMultiSigToDelete(null);
				}}
			/>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	scrollContent: {
		padding: wp(4),
		paddingBottom: hp(4),
		flexGrow: 1,
	},
	listContainer: {
		marginBottom: hp(1),
	},
	multiSigActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: wp(1),
	},
	listItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: wp(4),
		paddingVertical: hp(2),
	},
	addressItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: wp(4),
		paddingVertical: hp(1.2),
		paddingLeft: wp(8),
	},
	multiSigItem: {
		paddingHorizontal: wp(4),
		paddingVertical: hp(0.3),
	},
	multiSigHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: hp(0.8),
	},
	itemLeft: {
		flex: 1,
	},
	itemLabel: {
		fontSize: hp(1.6),
		color: '#666',
		marginBottom: hp(0.5),
	},
	addressLabel: {
		fontSize: hp(1.5),
		color: '#888',
		marginBottom: hp(0.3),
	},
	itemValue: {
		fontSize: hp(1.8),
		color: '#333',
		flex: 1,
		paddingRight: wp(1),
	},
	addressValue: {
		fontSize: hp(1.6),
		color: '#555',
		flex: 1,
		paddingRight: wp(1),
	},
	valueWithCopy: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
	},
	inlineCopyButton: {
		padding: wp(1),
		marginLeft: wp(1),
	},
	actionButton: {
		padding: wp(2),
	},
	separator: {
		height: 1,
		backgroundColor: '#e0e0e0',
		marginLeft: wp(4),
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: wp(4),
		paddingVertical: hp(1),
		marginBottom: hp(0.2),
	},
	sectionTitle: {
		fontSize: hp(1.8),
		fontWeight: '600',
		color: '#333',
	},
	emptyState: {
		padding: hp(3),
		alignItems: 'center',
	},
	emptyText: {
		fontSize: hp(1.6),
		color: '#666',
	},
	pubKeysContainer: {
		marginTop: hp(1),
		paddingTop: hp(1),
		borderTopWidth: 1,
		borderTopColor: '#e0e0e0',
	},
	pubKeysTitle: {
		fontSize: hp(1.6),
		fontWeight: '500',
		color: '#666',
		marginBottom: hp(1),
	},
	pubKeyItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: hp(0.5),
	},
	pubKeyText: {
		fontSize: hp(1.5),
		color: '#333',
		flex: 1,
		paddingRight: wp(2),
	},
	copyPubKeyButton: {
		padding: wp(1),
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: wp(5),
		width: wp(80),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
	},
	modalTitle: {
		fontSize: hp(2.2),
		fontWeight: '600',
		color: '#333',
		marginBottom: hp(2),
		textAlign: 'center',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 8,
		padding: wp(3),
		fontSize: hp(1.8),
		marginBottom: hp(1),
		backgroundColor: '#f9f9f9',
	},
	errorText: {
		color: '#e53935',
		fontSize: hp(1.6),
		marginBottom: hp(1),
	},
	modalButtons: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: hp(2),
	},
	modalButton: {
		flex: 1,
		padding: wp(3),
		borderRadius: 8,
		alignItems: 'center',
	},
	cancelButton: {
		backgroundColor: '#f0f0f0',
		marginRight: wp(2),
	},
	cancelButtonText: {
		color: '#333',
		fontSize: hp(1.8),
		fontWeight: '500',
	},
	saveButton: {
		backgroundColor: theme.colors.primary,
	},
	saveButtonText: {
		color: '#fff',
		fontSize: hp(1.8),
		fontWeight: '500',
	},
	createButton: {
		backgroundColor: theme.colors.primary,
		paddingVertical: hp(1.5),
		paddingHorizontal: wp(4),
		borderRadius: 8,
		marginTop: hp(2),
		width: wp(80),
		alignSelf: 'center',
	},
	createButtonText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '500',
		textAlign: 'center',
	},
	createMultiSigButton: {
		marginTop: hp(2),
	},
	multiSigAddress: {
		fontSize: hp(1.8),
		color: '#333',
		flex: 1,
		paddingRight: wp(2),
	},
	copyButton: {
		padding: wp(1),
	},
	utxoSeparator: {
		height: 1,
		backgroundColor: '#e0e0e0',
		marginTop: hp(1),
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	disabledButton: {
		opacity: 0.5,
	},
	addressDescription: {
		fontSize: hp(1.4),
		color: '#666',
		marginTop: hp(0.5),
		lineHeight: hp(1.8),
	},
	multiSigTypeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: hp(1),
	},
	multiSigTypeLabel: {
		fontSize: hp(1.6),
		fontWeight: '500',
		color: '#666',
		marginRight: wp(1),
	},
	multiSigTypeValue: {
		fontSize: hp(1.6),
		fontWeight: '600',
		color: '#333',
	},
});
