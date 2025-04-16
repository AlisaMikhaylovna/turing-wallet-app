import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { ConfirmModal } from '@/components/modals/confirm-modal';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { clearAllData } from '@/utils/sqlite';
import { useTranslation } from 'react-i18next';

export const Navbar = () => {
	const [menuVisible, setMenuVisible] = useState(false);
	const [logoutModalVisible, setLogoutModalVisible] = useState(false);
	const router = useRouter();
	const { clear, getCurrentAccountAddress } = useAccount();
	const { t } = useTranslation();
	const address = getCurrentAccountAddress();

	const handleSignOut = () => {
		setMenuVisible(false);
		setLogoutModalVisible(true);
	};

	const confirmSignOut = async () => {
		await clearAllData();
		await clear();
		setLogoutModalVisible(false);
		router.replace('/');
	};

	const menuItems = [
		{
			label: 'Scan QR Code',
			onPress: () => {
				setMenuVisible(false);
				router.push('/settings/scan');
			},
		},
		{
			label: 'Information Management',
			onPress: () => {
				setMenuVisible(false);
				router.push('/settings/information');
			},
		},
		{
			label: 'Account Management',
			onPress: () => {
				setMenuVisible(false);
				router.push('/settings/account-management');
			},
		},
		{
			label: 'System Settings',
			onPress: () => {
				setMenuVisible(false);
				router.push('/settings/system-settings');
			},
		},
		{
			label: 'Address Book',
			onPress: () => {
				setMenuVisible(false);
				router.push('/settings/address-book');
			},
		},
		{
			label: 'Export Mnemonic',
			onPress: () => {
				setMenuVisible(false);
				router.push('/settings/export');
			},
		},
		{
			label: 'Sign Out',
			onPress: handleSignOut,
			danger: true,
		},
	];

	return (
		<View style={styles.container}>
			<View style={styles.avatarContainer}>
				<Avatar address={address} onPress={() => setMenuVisible(true)} />
				<DropdownMenu
					visible={menuVisible}
					onClose={() => setMenuVisible(false)}
					items={menuItems.map((item) => ({
						...item,
						icon: null,
					}))}
					address={address}
				/>
			</View>

			<ConfirmModal
				visible={logoutModalVisible}
				title={t('signOutAllAccounts')}
				message={t('confirmSignOutMessage')}
				onConfirm={confirmSignOut}
				onCancel={() => setLogoutModalVisible(false)}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		height: hp(6),
		paddingHorizontal: wp(5),
		backgroundColor: '#f5f5f5',
		borderBottomWidth: 1,
		borderBottomColor: '#E0E0E0',
		paddingTop: hp(0.5),
	},
	avatarContainer: {
		position: 'relative',
	},
});
