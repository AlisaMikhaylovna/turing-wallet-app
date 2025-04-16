import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
	FlatList,
	Modal,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { hp, wp } from '@/lib/common';
import { getAllAddressesFromBook, getAllMultiSigAddresses } from '@/utils/sqlite';
import { useAccount } from '@/hooks/useAccount';
import { AccountType } from '@/types';

interface AddressItem {
	address: string;
	label?: string;
	isCurrentAccount?: boolean;
	accountType?: AccountType;
	hasAlternateAddresses?: boolean;
}

interface AddressSelectorProps {
	visible: boolean;
	onClose: () => void;
	onSelect: (address: string) => void;
	userAddress: string;
}

export const AddressSelector = ({
	visible,
	onClose,
	onSelect,
	userAddress,
}: AddressSelectorProps) => {
	const { t } = useTranslation();
	const [addressItems, setAddressItems] = useState<AddressItem[]>([]);
	const [multiSigAddresses, setMultiSigAddresses] = useState<string[]>([]);
	const [searchText, setSearchText] = useState('');
	const [filteredAddressItems, setFilteredAddressItems] = useState<AddressItem[]>([]);
	
	const { 
		getAllAccounts, 
		getCurrentAccountType
	} = useAccount();

	useEffect(() => {
		if (visible) {
			loadAddresses();
			setSearchText('');
		}
	}, [visible]);
	
	useEffect(() => {
		if (searchText) {
			const filtered = addressItems.filter((item) =>
				item.address.toLowerCase().startsWith(searchText.toLowerCase()) ||
				(item.label && item.label.toLowerCase().startsWith(searchText.toLowerCase()))
			);
			setFilteredAddressItems(filtered);
		} else {
			setFilteredAddressItems(addressItems);
		}
	}, [searchText, addressItems]);

	const loadAddresses = async () => {
		try {
			const bookAddresses = await getAllAddressesFromBook();
			const currentAddress = userAddress;
			const currentAccountType = getCurrentAccountType();
			const allAccounts = getAllAccounts();
			const items: AddressItem[] = [];
			
			items.push({
				address: currentAddress,
				isCurrentAccount: true,
				accountType: currentAccountType,
				hasAlternateAddresses: true
			});
			
			allAccounts.forEach(account => {
				let addressToShow = '';
				let accountType = currentAccountType; 
				
				if (currentAccountType === AccountType.TBC && account.addresses.tbcAddress) {
					addressToShow = account.addresses.tbcAddress;
				} else if (currentAccountType === AccountType.TAPROOT_LEGACY && account.addresses.taprootLegacyAddress) {
					addressToShow = account.addresses.taprootLegacyAddress;
				} else if (currentAccountType === AccountType.TAPROOT && account.addresses.taprootAddress) {
					addressToShow = account.addresses.taprootAddress;
				} else if (currentAccountType === AccountType.LEGACY && account.addresses.legacyAddress) {
					addressToShow = account.addresses.legacyAddress;
				} else {
					if (account.type === AccountType.TBC) {
						addressToShow = account.addresses.tbcAddress;
						accountType = AccountType.TBC;
					} else if (account.type === AccountType.TAPROOT_LEGACY) {
						addressToShow = account.addresses.taprootLegacyAddress;
						accountType = AccountType.TAPROOT_LEGACY;
					} else if (account.type === AccountType.TAPROOT) {
						addressToShow = account.addresses.taprootAddress;
						accountType = AccountType.TAPROOT;
					} else if (account.type === AccountType.LEGACY) {
						addressToShow = account.addresses.legacyAddress;
						accountType = AccountType.LEGACY;
					}
				}
				
				if (addressToShow && addressToShow !== currentAddress && !items.some(item => item.address === addressToShow)) {
					items.push({ 
						address: addressToShow,
						accountType,
						label: account.accountName,
						hasAlternateAddresses: true
					});
				}
			});
			
			bookAddresses.forEach(address => {
				const isAccountAddress = allAccounts.some(acc => 
					acc.addresses.tbcAddress === address ||
					acc.addresses.taprootAddress === address ||
					acc.addresses.taprootLegacyAddress === address ||
					acc.addresses.legacyAddress === address
				);
				
				if (!isAccountAddress && address !== currentAddress) {
					items.push({ address });
				}
			});
			
			setAddressItems(items);
			setFilteredAddressItems(items);

			const multiSigs = await getAllMultiSigAddresses(userAddress);
			setMultiSigAddresses(multiSigs);
		} catch (error) {
			console.error('Failed to load addresses:', error);
		}
	};

	const handleSelect = (address: string) => {
		onSelect(address);
		onClose();
	};
	
	const handleSwitchAddressType = (item: AddressItem) => {
		const account = getAllAccounts().find(
			(acc) =>
				acc.addresses.tbcAddress === item.address ||
				acc.addresses.taprootAddress === item.address ||
				acc.addresses.taprootLegacyAddress === item.address ||
				acc.addresses.legacyAddress === item.address,
		);
		
		if (!account) return;
		
		let alternateAddress: string | null = null;
		
		if (item.accountType === AccountType.TBC) {
			alternateAddress = account.addresses.taprootLegacyAddress;
		} else if (item.accountType === AccountType.TAPROOT_LEGACY) {
			alternateAddress = account.addresses.tbcAddress;
		} else if (item.accountType === AccountType.TAPROOT) {
			alternateAddress = account.addresses.legacyAddress;
		} else if (item.accountType === AccountType.LEGACY) {
			alternateAddress = account.addresses.taprootAddress;
		}
		
		if (alternateAddress) {
			handleSelect(alternateAddress);
		}
	};
	
	const handleClose = () => {
		onClose();
		setSearchText('');
	};

	const renderAddressItem = ({ item }: { item: AddressItem }) => (
		<TouchableOpacity style={styles.addressItem} onPress={() => handleSelect(item.address)}>
			<View style={{ flex: 1 }}>
				<Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
					{item.address}
				</Text>
				{item.isCurrentAccount && <Text style={styles.currentAddressLabel}>{t('currentAccount')}</Text>}
				{(item.label || item.accountType) && (
					<View style={styles.accountInfoRow}>
						{item.label && <Text style={styles.accountLabel}>{item.label}</Text>}
						{item.accountType && (
							<Text style={styles.accountTypeLabel}>
								{item.accountType === AccountType.TBC ? 'TBC' : 
								 item.accountType === AccountType.TAPROOT ? 'Taproot' :
								 item.accountType === AccountType.TAPROOT_LEGACY ? 'Taproot Legacy' : 'Legacy'}
							</Text>
						)}
					</View>
				)}
			</View>
			
			{item.hasAlternateAddresses && (
				<TouchableOpacity 
					style={styles.switchButton}
					onPress={() => handleSwitchAddressType(item)}
				>
					<MaterialIcons name="swap-horiz" size={20} color="#333" />
				</TouchableOpacity>
			)}
		</TouchableOpacity>
	);

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
			<TouchableWithoutFeedback onPress={handleClose}>
				<View style={styles.modalContainer}>
					<TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
						<View style={styles.modalContent}>
							<View style={styles.header}>
								<Text style={styles.title}>{t('selectAddress')}</Text>
								<View style={styles.headerRight}>
									<View style={styles.searchInputWrapper}>
										<MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
										<TextInput
											style={styles.searchInput}
											placeholder={t('searchAddresses')}
											value={searchText}
											onChangeText={setSearchText}
											autoCapitalize="none"
											autoCorrect={false}
										/>
										{searchText.length > 0 && (
											<TouchableOpacity
												style={styles.clearSearchButton}
												onPress={() => setSearchText('')}
											>
												<MaterialIcons name="close" size={18} color="#666" />
											</TouchableOpacity>
										)}
									</View>
									<TouchableOpacity onPress={handleClose} style={styles.closeButton}>
										<Ionicons name="close" size={24} color="#000" />
									</TouchableOpacity>
								</View>
							</View>

							<View style={styles.section}>
								<Text style={styles.sectionTitle}>{t('addresses')}</Text>
								{filteredAddressItems.length > 0 ? (
									<FlatList
										data={filteredAddressItems}
										renderItem={renderAddressItem}
										keyExtractor={(item) => item.address}
										style={styles.list}
										ItemSeparatorComponent={() => <View style={styles.separator} />}
										showsVerticalScrollIndicator={false}
									/>
								) : (
									<Text style={styles.emptyText}>
										{searchText ? t('noMatchingAddressesFound') : t('noAddressesInBook')}
									</Text>
								)}
							</View>

							{!searchText && (
								<View style={styles.section}>
									<Text style={styles.sectionTitle}>{t('associatedMultiSigAddresses')}</Text>
									{multiSigAddresses.length > 0 ? (
										<FlatList
											data={multiSigAddresses.map(address => ({ address }))}
											renderItem={renderAddressItem}
											keyExtractor={(item) => item.address}
											style={styles.list}
											ItemSeparatorComponent={() => <View style={styles.separator} />}
											showsVerticalScrollIndicator={false}
										/>
									) : (
										<Text style={styles.emptyText}>{t('noAssociatedMultiSigAddresses')}</Text>
									)}
								</View>
							)}
						</View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

const styles = StyleSheet.create({
	modalContainer: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
	},
	modalContent: {
		backgroundColor: 'white',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingHorizontal: wp(4),
		paddingBottom: hp(4),
		maxHeight: hp(70),
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: hp(2),
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	title: {
		fontSize: hp(2.2),
		fontWeight: '600',
		flex: 0.3,
	},
	headerRight: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 0.7,
	},
	closeButton: {
		padding: wp(1),
	},
	searchInputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f0f0f0',
		borderRadius: 8,
		paddingHorizontal: wp(2),
		height: hp(4),
		flex: 1,
		marginRight: wp(2),
	},
	searchIcon: {
		marginRight: wp(1),
	},
	searchInput: {
		flex: 1,
		paddingVertical: hp(0.5),
		fontSize: hp(1.5),
	},
	clearSearchButton: {
		padding: wp(1),
	},
	section: {
		marginTop: hp(2),
	},
	sectionTitle: {
		fontSize: hp(2),
		fontWeight: '600',
		marginBottom: hp(1),
	},
	list: {
		maxHeight: hp(20),
	},
	addressItem: {
		paddingVertical: hp(1.5),
		paddingHorizontal: wp(3),
		backgroundColor: '#f8f8f8',
		flexDirection: 'row',
		alignItems: 'center',
	},
	separator: {
		height: 1,
		backgroundColor: '#e0e0e0',
	},
	addressText: {
		fontSize: hp(1.8),
		color: '#333',
	},
	emptyText: {
		textAlign: 'center',
		color: '#999',
		marginTop: hp(1),
		marginBottom: hp(2),
		fontSize: hp(1.5),
	},
	currentAddressLabel: {
		fontSize: hp(1.2),
		color: '#007AFF',
		marginTop: hp(0.5),
	},
	accountInfoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: hp(0.5),
		gap: wp(2),
	},
	accountLabel: {
		fontSize: hp(1.2),
		color: '#666',
	},
	accountTypeLabel: {
		fontSize: hp(1.2),
		color: '#666',
	},
	switchButton: {
		padding: wp(2),
	},
});
