import { MaterialIcons } from '@expo/vector-icons';
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
import { formatLongString } from '@/lib/util';

interface MultiSigAddress {
	multiSig_address: string;
	pubKeys: string[];
}

interface MultiSigAddressSelectorProps {
	visible: boolean;
	onClose: () => void;
	onSelect: (address: string) => void;
	addresses: MultiSigAddress[];
}

export const MultiSigAddressSelector = ({
	visible,
	onClose,
	onSelect,
	addresses,
}: MultiSigAddressSelectorProps) => {
	const { t } = useTranslation();
	const [searchText, setSearchText] = useState('');
	const [filteredAddresses, setFilteredAddresses] = useState<MultiSigAddress[]>(addresses);

	useEffect(() => {
		if (searchText) {
			const filtered = addresses.filter((item) =>
				item.multiSig_address.toLowerCase().includes(searchText.toLowerCase()),
			);
			setFilteredAddresses(filtered);
		} else {
			setFilteredAddresses(addresses);
		}
	}, [searchText, addresses]);

	const handleSelect = (address: string) => {
		onSelect(address);
		onClose();
		setSearchText('');
	};

	const handleClose = () => {
		onClose();
		setSearchText('');
	};

	const renderAddressItem = ({ item }: { item: MultiSigAddress }) => (
		<TouchableOpacity
			style={styles.addressItem}
			onPress={() => handleSelect(item.multiSig_address)}
		>
			<View style={styles.addressInfo}>
				<Text style={styles.addressText}>{formatLongString(item.multiSig_address, 12)}</Text>
			</View>
		</TouchableOpacity>
	);

	return (
		<Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
			<TouchableWithoutFeedback onPress={handleClose}>
				<View style={styles.modalContainer}>
					<TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
						<View style={styles.modalContent}>
							<View style={styles.header}>
								<Text style={styles.title}>{t('selectMultiSigAddress')}</Text>
								<View style={styles.searchInputWrapper}>
									<MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
									<TextInput
										style={styles.searchInput}
										placeholder={t('search')}
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
									<MaterialIcons name="close" size={24} color="#000" />
								</TouchableOpacity>
							</View>

							{filteredAddresses.length > 0 ? (
								<FlatList
									data={filteredAddresses}
									renderItem={renderAddressItem}
									keyExtractor={(item) => item.multiSig_address}
									style={styles.list}
									ItemSeparatorComponent={() => <View style={styles.separator} />}
									showsVerticalScrollIndicator={false}
								/>
							) : (
								<Text style={styles.emptyText}>
									{searchText
										? t('noMatchingMultiSigAddressesFound')
										: t('noMultiSigAddressesAvailable')}
								</Text>
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
		paddingBottom: hp(4),
		maxHeight: hp(70),
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: hp(2),
		paddingHorizontal: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	title: {
		fontSize: hp(1.8),
		fontWeight: '600',
		marginRight: wp(4),
	},
	closeButton: {
		padding: wp(1),
	},
	searchInputWrapper: {
		flex: 0.7,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f0f0f0',
		borderRadius: 8,
		paddingHorizontal: wp(2),
		height: hp(3.5),
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
	list: {
		maxHeight: hp(50),
	},
	addressItem: {
		paddingVertical: hp(1.5),
		paddingHorizontal: wp(4),
		backgroundColor: '#f8f8f8',
	},
	separator: {
		height: 1,
		backgroundColor: '#e0e0e0',
	},
	addressInfo: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	addressText: {
		fontSize: hp(1.8),
		color: '#333',
		fontWeight: '500',
	},
	pubKeysCount: {
		fontSize: hp(1.6),
		color: '#666',
	},
	emptyText: {
		textAlign: 'center',
		color: '#999',
		marginTop: hp(3),
		fontSize: hp(1.5),
		paddingHorizontal: wp(4),
	},
});
