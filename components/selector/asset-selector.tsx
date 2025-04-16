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
import { formatBalance, formatBalance_btc } from '@/lib/util';

interface Asset {
	label: string;
	value: string;
	balance: number;
	contractId?: string;
}

interface AssetSelectorProps {
	visible: boolean;
	onClose: () => void;
	onSelect: (asset: Asset) => void;
	assets: Asset[];
	selectedAsset?: Asset | null;
}

export const AssetSelector = ({ visible, onClose, onSelect, assets }: AssetSelectorProps) => {
	const { t } = useTranslation();
	const [searchText, setSearchText] = useState('');
	const [filteredAssets, setFilteredAssets] = useState<Asset[]>(assets);

	useEffect(() => {
		if (searchText) {
			const filtered = assets.filter((asset) =>
				asset.label.toLowerCase().includes(searchText.toLowerCase()),
			);
			setFilteredAssets(filtered);
		} else {
			setFilteredAssets(assets);
		}
	}, [searchText, assets]);

	const handleSelect = (asset: Asset) => {
		onSelect(asset);
		onClose();
		setSearchText('');
	};

	const handleClose = () => {
		onClose();
		setSearchText('');
	};

	const renderAssetItem = ({ item }: { item: Asset }) => (
		<TouchableOpacity style={styles.assetItem} onPress={() => handleSelect(item)}>
			<View style={styles.assetInfo}>
				<Text style={styles.assetName}>{item.label}</Text>
				<Text style={styles.balance}>
					{item.value === 'BTC' 
						? formatBalance_btc(item.balance)
						: item.value === 'TBC' || item.label === 'TBC'
							? formatBalance(item.balance)
							: formatBalance(item.balance * 1e-6)}
				</Text>
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
								<Text style={styles.title}>{t('selectAsset')}</Text>
								<View style={styles.searchInputWrapper}>
									<MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
									<TextInput
										style={styles.searchInput}
										placeholder={t('searchAssets')}
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

							{filteredAssets.length > 0 ? (
								<FlatList
									data={filteredAssets}
									renderItem={renderAssetItem}
									keyExtractor={(item) => item.value}
									style={styles.list}
									ItemSeparatorComponent={() => <View style={styles.separator} />}
									showsVerticalScrollIndicator={false}
								/>
							) : (
								<Text style={styles.emptyText}>
									{searchText ? t('noMatchingAssetsFound') : t('noAssetsAvailable')}
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
	searchContainer: {
		paddingHorizontal: wp(4),
		paddingVertical: hp(1.5),
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
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
	assetItem: {
		paddingVertical: hp(1.5),
		paddingHorizontal: wp(4),
		backgroundColor: '#f8f8f8',
	},
	separator: {
		height: 1,
		backgroundColor: '#e0e0e0',
	},
	assetInfo: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	assetName: {
		fontSize: hp(1.8),
		color: '#333',
		fontWeight: '500',
	},
	balance: {
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
