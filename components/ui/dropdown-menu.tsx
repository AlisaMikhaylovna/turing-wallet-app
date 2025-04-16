import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { SwitchTypeModal } from '@/components/modals/switch-type-modal';

interface MenuItem {
	icon: any;
	label: string;
	onPress: () => void;
	id?: string;
}

interface DropdownMenuProps {
	visible: boolean;
	onClose: () => void;
	items: MenuItem[];
	address: string;
}

export const DropdownMenu = ({ visible, onClose, items, address }: DropdownMenuProps) => {
	const { t } = useTranslation();
	const { getCurrentAccountName } = useAccount();
	const [switchTypeModalVisible, setSwitchTypeModalVisible] = useState(false);

	const handleClose = useCallback(() => {
		onClose();
	}, [onClose]);

	const handleSwitchType = () => {
		onClose();
		setTimeout(() => {
			setSwitchTypeModalVisible(true);
		}, 100);
	};

	const handleSwitchTypeModalClose = () => {
		setSwitchTypeModalVisible(false);
	};

	const handleSwitchComplete = () => {
		setSwitchTypeModalVisible(false);
	};

	if (!visible && !switchTypeModalVisible) {
		return null;
	}

	const username = getCurrentAccountName();

	const processedItems = items.map((item) => {
		const id = item.id || getLabelId(item.label);
		return {
			...item,
			id,
			label: t(id),
		};
	});

	return (
		<>
			{visible && !switchTypeModalVisible && (
				<Modal visible={true} transparent animationType="none" onRequestClose={handleClose}>
					<TouchableOpacity style={styles.overlay} onPress={handleClose} activeOpacity={1}>
						<View style={styles.menuContainer}>
							<View style={styles.header}>
								<View style={styles.usernameContainer}>
									<Text style={styles.username}>{username}</Text>
									<TouchableOpacity style={styles.switchTypeButton} onPress={handleSwitchType}>
										<MaterialIcons name="swap-horiz" size={20} color="white" />
									</TouchableOpacity>
								</View>
								<Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
									{address}
								</Text>
							</View>

							<View style={styles.divider} />

							{processedItems.map((item, index) => (
								<TouchableOpacity
									key={index}
									style={styles.menuItem}
									onPress={() => {
										handleClose();
										item.onPress();
									}}
								>
									<View style={styles.iconContainer}>
										<Ionicons name={getIconName(item.id || '')} size={20} color="white" />
									</View>
									<Text style={[styles.menuItemText]}>{item.label}</Text>
								</TouchableOpacity>
							))}
						</View>
					</TouchableOpacity>
				</Modal>
			)}

			<SwitchTypeModal
				visible={switchTypeModalVisible}
				onClose={handleSwitchTypeModalClose}
				onSwitchComplete={handleSwitchComplete}
			/>
		</>
	);
};

const getLabelId = (label: string): string => {
	switch (label) {
		case 'Scan QR Code':
			return 'scanQRCode';
		case 'Information Management':
			return 'informationManagement';
		case 'Account Management':
			return 'accountManagement';
		case 'System Settings':
			return 'systemSettings';
		case 'Address Book':
			return 'addressBook';
		case 'Export Mnemonic':
			return 'exportMnemonic';
		case 'Sign Out':
			return 'signOut';
		default:
			return label.toLowerCase().replace(/\s+(.)/g, (_, c) => c.toUpperCase());
	}
};

const getIconName = (id: string): any => {
	switch (id) {
		case 'scanQRCode':
			return 'scan-outline';
		case 'informationManagement':
			return 'information-circle-outline';
		case 'accountManagement':
			return 'person-outline';
		case 'systemSettings':
			return 'settings-outline';
		case 'addressBook':
			return 'book-outline';
		case 'exportMnemonic':
			return 'key-outline';
		case 'signOut':
			return 'log-out-outline';
		default:
			return 'ellipsis-horizontal';
	}
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	menuContainer: {
		position: 'absolute',
		top: hp(8),
		right: wp(5),
		backgroundColor: '#1A1A1A',
		borderRadius: theme.radius.md,
		width: wp(50),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
		overflow: 'hidden',
	},
	header: {
		padding: hp(1.5),
	},
	usernameContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: hp(0.5),
	},
	username: {
		fontSize: hp(1.8),
		fontWeight: '600',
		color: 'white',
	},
	switchTypeButton: {
		padding: 4,
	},
	address: {
		fontSize: hp(1.4),
		color: 'rgba(255,255,255,0.6)',
		flex: 1,
	},
	divider: {
		height: 1,
		backgroundColor: 'rgba(255,255,255,0.1)',
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		paddingVertical: hp(1.2),
		paddingHorizontal: wp(2),
		height: hp(5),
	},
	iconContainer: {
		width: wp(5),
		alignItems: 'center',
		justifyContent: 'center',
	},
	itemDivider: {
		height: 1,
		backgroundColor: 'rgba(255,255,255,0.1)',
		marginHorizontal: wp(4),
	},
	menuItemText: {
		flex: 1,
		fontSize: hp(1.4),
		color: 'white',
		marginLeft: wp(3),
		textAlignVertical: 'center',
	},
	dangerText: {
		color: '#ff4444',
	},
});
