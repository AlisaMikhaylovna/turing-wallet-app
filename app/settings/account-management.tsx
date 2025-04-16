import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useLayoutEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { ConfirmModal } from '@/components/modals/confirm-modal';
import { Modal } from '@/components/ui/modal';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { AccountType } from '@/types';
import { deleteAccountData, clearAllData } from '@/utils/sqlite';
import { SwitchTypeModal } from '@/components/modals/switch-type-modal';

export default function AccountManagementPage() {
	const { t } = useTranslation();
	const navigation = useNavigation();
	const { accounts, currentAccount, removeAccount, switchAccount, clear } = useAccount();

	useLayoutEffect(() => {
		navigation.setOptions({
			headerTitle: t('accountManagement')
		});
	}, [navigation, t]);

	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [deleteAddress, setDeleteAddress] = useState('');
	const [switchAccountsModalVisible, setSwitchAccountsModalVisible] = useState(false);
	const [switchTypeModalVisible, setSwitchTypeModalVisible] = useState(false);

	const handleLongPress = (address: string) => {
		setDeleteAddress(address);
		setDeleteModalVisible(true);
	};

	const handleSwitchAccount = (address: string) => {
		if (address === currentAccount) return;
		switchAccount(address);
	};

	const confirmDelete = async () => {
		try {
			setDeleteModalVisible(false);
			const isCurrentAccount = deleteAddress === currentAccount;

			if (isCurrentAccount) {
				const accountAddresses = Object.keys(accounts);
				const currentIndex = accountAddresses.indexOf(currentAccount);
				const nextAccount =
					accountAddresses[currentIndex + 1] || accountAddresses[currentIndex - 1];

				const accountToDelete = accounts[deleteAddress];
				const addressesToDelete = [
					accountToDelete.addresses.tbcAddress,
					accountToDelete.addresses.taprootAddress,
					accountToDelete.addresses.taprootLegacyAddress,
					accountToDelete.addresses.legacyAddress,
				].filter(Boolean);

				for (const addr of addressesToDelete) {
					await deleteAccountData(addr);
				}

				await removeAccount(deleteAddress);

				if (nextAccount) {
					await switchAccount(nextAccount);
				} else {
					await clearAllData();
					await clear();
					router.replace('/');
				}
			} else {
				const accountToDelete = accounts[deleteAddress];
				const addressesToDelete = [
					accountToDelete.addresses.tbcAddress,
					accountToDelete.addresses.taprootAddress,
					accountToDelete.addresses.taprootLegacyAddress,
					accountToDelete.addresses.legacyAddress,
				].filter(Boolean);

				for (const addr of addressesToDelete) {
					await deleteAccountData(addr);
				}

				await removeAccount(deleteAddress);
			}
		} catch (error) {
			//console.error('Failed to delete account:', error);
		}
	};

	const getAccountTypeLabel = (type: AccountType) => {
		switch (type) {
			case AccountType.TBC:
				return 'TBC';
			case AccountType.TAPROOT:
				return 'Taproot';
			case AccountType.TAPROOT_LEGACY:
				return t('tbcTaprootLegacy');
			case AccountType.LEGACY:
				return t('btcLegacy');
			default:
				return t('unknown');
		}
	};

	const handleAddAccount = () => {
		router.push('/login');
	};

	return (
		<View style={styles.container}>
			<ScrollView style={styles.scrollView}>
				<View style={styles.listContainer}>
					{Object.entries(accounts)
						.sort(([address]) => (address === currentAccount ? -1 : 1))
						.map(([address, account]) => (
							<TouchableOpacity
								key={address}
								style={styles.accountItem}
								onPress={() => handleSwitchAccount(address)}
								onLongPress={() => handleLongPress(address)}
								delayLongPress={500}
							>
								<View style={styles.accountInfo}>
									<Text style={styles.accountName}>{account.accountName}</Text>
									<View style={styles.typeContainer}>
										<Text style={styles.accountType}>{getAccountTypeLabel(account.type)}</Text>
									</View>
								</View>
							</TouchableOpacity>
						))}
					<TouchableOpacity style={styles.addAccountItem} onPress={handleAddAccount}>
						<MaterialIcons name="add-circle-outline" size={24} color={theme.colors.primary} />
						<Text style={styles.addAccountText}>{t('addNewAccount')}</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			<ConfirmModal
				visible={deleteModalVisible}
				title={t('deleteAccount')}
				message={t('confirmDeleteAccountMessage')}
				onConfirm={confirmDelete}
				onCancel={() => setDeleteModalVisible(false)}
			/>

			<Modal
				visible={switchAccountsModalVisible}
				onClose={() => setSwitchAccountsModalVisible(false)}
			>
				<View style={styles.switchAccountsModal}>
					<Text style={styles.modalTitle}>{t('selectAccount')}</Text>
					{Object.entries(accounts)
						.filter(([addr]) => addr !== currentAccount)
						.map(([address, account]) => (
							<TouchableOpacity
								key={address}
								style={styles.modalAccountItem}
								onPress={() => {
									setSwitchAccountsModalVisible(false);
									handleSwitchAccount(address);
								}}
							>
								<Text style={styles.modalAccountName}>{account.accountName}</Text>
								<Text style={styles.modalAccountAddress} numberOfLines={1} ellipsizeMode="middle">
									{address}
								</Text>
							</TouchableOpacity>
						))}
				</View>
			</Modal>

			<SwitchTypeModal
				visible={switchTypeModalVisible}
				onClose={() => setSwitchTypeModalVisible(false)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	scrollView: {
		flex: 1,
		paddingTop: hp(2),
	},
	listContainer: {
		backgroundColor: '#eeeeee',
	},
	accountItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	accountInfo: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	accountName: {
		fontSize: hp(1.8),
		fontWeight: '500',
	},
	accountType: {
		fontSize: hp(1.6),
		color: theme.colors.primary,
	},
	addAccountItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: wp(4),
		gap: wp(2),
	},
	addAccountText: {
		fontSize: hp(1.8),
		color: theme.colors.primary,
	},
	switchAccountsModal: {
		padding: wp(4),
	},
	modalTitle: {
		fontSize: hp(2),
		fontWeight: '600',
		marginBottom: hp(2),
		textAlign: 'center',
	},
	modalAccountItem: {
		padding: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
	},
	modalAccountName: {
		fontSize: hp(1.8),
		fontWeight: '500',
		marginBottom: hp(0.5),
	},
	modalAccountAddress: {
		fontSize: hp(1.4),
		color: '#666',
	},
	typeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: wp(2),
	},
	switchTypeButton: {
		padding: 4,
	},
});
