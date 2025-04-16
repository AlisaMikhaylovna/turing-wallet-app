import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState, useEffect } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Image,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	Dimensions,
	Animated,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { syncCollections } from '@/actions/get-collections';
import { ConfirmModal } from '@/components/modals/confirm-modal';
import { RestoreCollectionModal } from '@/components/modals/restore-collection-modal';
import { Navbar } from '@/components/ui/navbar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import {
	Collection,
	NFT,
	getActiveNFTs,
	getAllCollections,
	softDeleteCollection,
	softDeleteNFT,
} from '@/utils/sqlite';
import { syncNFTs } from '@/actions/get-nfts';
import { RestoreNFTModal } from '@/components/modals/restore-nft-modal';
import { AccountType } from '@/types';

const NFTPage = () => {
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState<'collections' | 'nfts'>('collections');
	const screenWidth = Dimensions.get('window').width;
	const panX = React.useRef(new Animated.Value(0)).current;

	const handleTabChange = (tab: 'collections' | 'nfts') => {
		setActiveTab(tab);

		Animated.timing(panX, {
			toValue: tab === 'collections' ? 0 : -screenWidth,
			duration: 300,
			useNativeDriver: true,
		}).start();
	};

	return (
		<ScreenWrapper bg="#f5f5f5">
			<Navbar />
			<View style={styles.tabContainer}>
				<TouchableOpacity
					style={[styles.tabButton, activeTab === 'collections' && styles.activeTabButton]}
					onPress={() => handleTabChange('collections')}
				>
					<Text style={[styles.tabText, activeTab === 'collections' && styles.activeTabText]}>
						{t('collections')}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.tabButton, activeTab === 'nfts' && styles.activeTabButton]}
					onPress={() => handleTabChange('nfts')}
				>
					<Text style={[styles.tabText, activeTab === 'nfts' && styles.activeTabText]}>
						{t('nfts')}
					</Text>
				</TouchableOpacity>
			</View>

			<Animated.View style={[styles.tabContentContainer, { transform: [{ translateX: panX }] }]}>
				<View style={[styles.tabContent, { width: screenWidth }]}>
					<CollectionsTab />
				</View>
				<View style={[styles.tabContent, { width: screenWidth }]}>
					<NFTsTab />
				</View>
			</Animated.View>
		</ScreenWrapper>
	);
};

const CollectionsTab = () => {
	const { t } = useTranslation();
	const [collections, setCollections] = useState<Collection[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [searchText, setSearchText] = useState('');
	const { getCurrentAccountAddress, getCurrentAccountType } = useAccount();
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [restoreModalVisible, setRestoreModalVisible] = useState(false);
	const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
	const accountType = getCurrentAccountType();
	const disableCollection =
		accountType === AccountType.TAPROOT || accountType === AccountType.LEGACY;

	const loadCollections = useCallback(async () => {
		try {
			if (!disableCollection) {
				if (!refreshing) {
					setLoading(true);
				}
				const userAddress = getCurrentAccountAddress();
				const userCollections = await getAllCollections(userAddress);
				setCollections(userCollections);
			}
		} catch (error) {
			//console.error('Failed to load collections:', error);
		} finally {
			setLoading(false);
		}
	}, [getCurrentAccountAddress, disableCollection, refreshing]);

	useFocusEffect(
		useCallback(() => {
			loadCollections();
		}, [loadCollections]),
	);

	useEffect(() => {
		if (disableCollection) {
			setCollections([]);
			setLoading(false);
		} else {
			loadCollections();
		}
	}, [disableCollection, loadCollections, accountType]);

	const handleRefresh = async () => {
		try {
			setRefreshing(true);
			const userAddress = getCurrentAccountAddress();

			await syncCollections(userAddress);
			await loadCollections();
			Toast.show({
				type: 'success',
				text1: t('collectionsRefreshed'),
			});
		} catch (error) {
			//console.error('Failed to refresh collections:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToRefreshCollections'),
			});
		} finally {
			setRefreshing(false);
		}
	};

	const handleDeleteCollection = (collection: Collection) => {
		setSelectedCollection(collection);
		setDeleteModalVisible(true);
	};

	const confirmDeleteCollection = async () => {
		if (!selectedCollection) return;

		try {
			await softDeleteCollection(selectedCollection.id);
			Toast.show({
				type: 'success',
				text1: t('collectionHidden'),
			});
			loadCollections();
		} catch (error) {
			//console.error('Failed to hide collection:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToHideCollection'),
			});
		} finally {
			setDeleteModalVisible(false);
			setSelectedCollection(null);
		}
	};

	const filteredCollections = collections.filter(
		(collection) =>
			collection.name.toLowerCase().startsWith(searchText.toLowerCase()) ||
			collection.id.toLowerCase().startsWith(searchText.toLowerCase()),
	);

	const renderCollectionItem = ({ item }: { item: Collection }) => (
		<TouchableOpacity
			style={styles.collectionItem}
			onPress={() => router.push(`/(tabs)/nft/collection/collection-detail?id=${item.id}`)}
		>
			<Image source={{ uri: item.icon }} style={styles.image} resizeMode="cover" />
			<TouchableOpacity
				style={styles.deleteButton}
				onPress={(e) => {
					e.stopPropagation();
					handleDeleteCollection(item);
				}}
			>
				<MaterialIcons name="visibility-off" size={24} color="#fff" />
			</TouchableOpacity>
			<Text style={styles.collectionName} numberOfLines={1}>
				{item.name}
			</Text>
		</TouchableOpacity>
	);

	if (loading && !refreshing) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={theme.colors.primary} />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.searchContainer}>
				<View style={styles.searchInputContainer}>
					<MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder={t('searchByNameOrId')}
						value={searchText}
						onChangeText={setSearchText}
					/>
					{searchText.length > 0 && (
						<TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
							<MaterialIcons name="close" size={20} color="#999" />
						</TouchableOpacity>
					)}
				</View>
				<View style={styles.actionButtons}>
					<TouchableOpacity
						style={[
							styles.actionButton,
							(disableCollection || refreshing) && styles.disabledButton,
						]}
						onPress={handleRefresh}
						disabled={disableCollection || refreshing}
					>
						<MaterialIcons
							name="refresh"
							size={24}
							color={disableCollection || refreshing ? '#999' : '#333'}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionButton, disableCollection && styles.disabledButton]}
						onPress={() => setRestoreModalVisible(true)}
						disabled={disableCollection}
					>
						<MaterialIcons
							name="visibility"
							size={24}
							color={disableCollection ? '#999' : '#333'}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionButton, disableCollection && styles.disabledButton]}
						onPress={() => router.push('/(tabs)/nft/collection/create-collection')}
						disabled={disableCollection}
					>
						<MaterialIcons
							name="add-circle-outline"
							size={24}
							color={disableCollection ? '#999' : '#333'}
						/>
					</TouchableOpacity>
				</View>
			</View>

			{filteredCollections.length > 0 ? (
				<FlatList
					data={filteredCollections}
					renderItem={renderCollectionItem}
					keyExtractor={(item) => item.id}
					numColumns={2}
					columnWrapperStyle={styles.columnWrapper}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					refreshing={refreshing}
					onRefresh={handleRefresh}
				/>
			) : (
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyText}>
						{searchText ? t('noMatchingCollectionsFound') : t('noCollectionsFound')}
					</Text>
				</View>
			)}

			<ConfirmModal
				visible={deleteModalVisible}
				title={t('hideCollection')}
				message={t('confirmHideCollection')}
				onConfirm={confirmDeleteCollection}
				onCancel={() => {
					setDeleteModalVisible(false);
					setSelectedCollection(null);
				}}
			/>

			<RestoreCollectionModal
				visible={restoreModalVisible}
				onClose={() => setRestoreModalVisible(false)}
				onSuccess={loadCollections}
			/>
		</View>
	);
};

const NFTsTab = () => {
	const { t } = useTranslation();
	const [nfts, setNfts] = useState<NFT[]>([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [searchText, setSearchText] = useState('');
	const { getCurrentAccountAddress, getCurrentAccountType } = useAccount();
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [restoreModalVisible, setRestoreModalVisible] = useState(false);
	const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
	const accountType = getCurrentAccountType();
	const disableNFT = accountType === AccountType.TAPROOT || accountType === AccountType.LEGACY;

	const loadNFTs = useCallback(async () => {
		try {
			if (!disableNFT) {
				if (!refreshing) {
					setLoading(true);
				}
				const userAddress = getCurrentAccountAddress();
				const userNFTs = await getActiveNFTs(userAddress);
				setNfts(userNFTs);
			}
		} catch (error) {
			//console.error('Failed to load NFTs:', error);
		} finally {
			setLoading(false);
		}
	}, [getCurrentAccountAddress, disableNFT, refreshing]);

	useFocusEffect(
		useCallback(() => {
			loadNFTs();
		}, [loadNFTs]),
	);

	useEffect(() => {
		if (disableNFT) {
			setNfts([]);
			setLoading(false);
		} else {
			loadNFTs();
		}
	}, [disableNFT, loadNFTs, accountType]);

	const handleRefresh = async () => {
		try {
			setRefreshing(true);
			const userAddress = getCurrentAccountAddress();

			await syncNFTs(userAddress);
			await loadNFTs();
			Toast.show({
				type: 'success',
				text1: t('nftsRefreshed'),
			});
		} catch (error) {
			//console.error('Failed to refresh NFTs:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToRefreshNFTs'),
			});
		} finally {
			setRefreshing(false);
		}
	};

	const handleDeleteNFT = (nft: NFT) => {
		setSelectedNFT(nft);
		setDeleteModalVisible(true);
	};

	const confirmDeleteNFT = async () => {
		if (!selectedNFT) return;

		try {
			await softDeleteNFT(selectedNFT.id);
			Toast.show({
				type: 'success',
				text1: t('nftHidden'),
			});
			loadNFTs();
		} catch (error) {
			//console.error('Failed to hide NFT:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToHideNFT'),
			});
		} finally {
			setDeleteModalVisible(false);
			setSelectedNFT(null);
		}
	};

	const filteredNFTs = nfts.filter(
		(nft) =>
			nft.name.toLowerCase().startsWith(searchText.toLowerCase()) ||
			nft.id.toLowerCase().startsWith(searchText.toLowerCase()),
	);

	const renderNFTItem = ({ item }: { item: NFT }) => (
		<TouchableOpacity
			style={styles.collectionItem}
			onPress={() => router.push(`/(tabs)/nft/nft-detail?id=${item.id}`)}
		>
			<Image source={{ uri: item.icon }} style={styles.image} resizeMode="cover" />
			<TouchableOpacity
				style={styles.deleteButton}
				onPress={(e) => {
					e.stopPropagation();
					handleDeleteNFT(item);
				}}
			>
				<MaterialIcons name="visibility-off" size={24} color="#fff" />
			</TouchableOpacity>
			<Text style={styles.collectionName} numberOfLines={1}>
				{item.name}
			</Text>
		</TouchableOpacity>
	);

	if (loading && !refreshing) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={theme.colors.primary} />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<View style={styles.searchContainer}>
				<View style={styles.searchInputContainer}>
					<MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder={t('searchByNameOrId')}
						value={searchText}
						onChangeText={setSearchText}
					/>
					{searchText.length > 0 && (
						<TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
							<MaterialIcons name="close" size={20} color="#999" />
						</TouchableOpacity>
					)}
				</View>
				<View style={styles.actionButtons}>
					<TouchableOpacity
						style={[styles.actionButton, (disableNFT || refreshing) && styles.disabledButton]}
						onPress={handleRefresh}
						disabled={disableNFT || refreshing}
					>
						<MaterialIcons
							name="refresh"
							size={24}
							color={disableNFT || refreshing ? '#999' : '#333'}
						/>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.actionButton, disableNFT && styles.disabledButton]}
						onPress={() => setRestoreModalVisible(true)}
						disabled={disableNFT}
					>
						<MaterialIcons name="visibility" size={24} color={disableNFT ? '#999' : '#333'} />
					</TouchableOpacity>
				</View>
			</View>

			{filteredNFTs.length > 0 ? (
				<FlatList
					data={filteredNFTs}
					renderItem={renderNFTItem}
					keyExtractor={(item) => item.id}
					numColumns={2}
					columnWrapperStyle={styles.columnWrapper}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
					refreshing={refreshing}
					onRefresh={handleRefresh}
				/>
			) : (
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyText}>
						{searchText ? t('noMatchingNFTsFound') : t('noNFTsFound')}
					</Text>
				</View>
			)}

			<RestoreNFTModal
				visible={restoreModalVisible}
				onClose={() => setRestoreModalVisible(false)}
				onSuccess={loadNFTs}
			/>

			<ConfirmModal
				visible={deleteModalVisible}
				title={t('hideNFT')}
				message={t('confirmHideNFT')}
				onConfirm={confirmDeleteNFT}
				onCancel={() => {
					setDeleteModalVisible(false);
					setSelectedNFT(null);
				}}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		paddingHorizontal: wp(4),
	},
	tabContainer: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
		backgroundColor: '#f5f5f5',
	},
	tabButton: {
		flex: 1,
		paddingVertical: hp(1.5),
		alignItems: 'center',
	},
	activeTabButton: {
		borderBottomWidth: 3,
		borderBottomColor: theme.colors.primary,
	},
	tabText: {
		fontSize: hp(1.6),
		fontWeight: '600',
		color: '#999',
	},
	activeTabText: {
		color: theme.colors.text,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f5f5f5',
	},
	columnWrapper: {
		justifyContent: 'space-between',
		marginBottom: hp(1.5),
	},
	listContent: {
		paddingTop: hp(2),
		paddingBottom: hp(4),
	},
	collectionItem: {
		width: wp(43),
		height: wp(43),
		borderRadius: 12,
		overflow: 'hidden',
		marginBottom: hp(2),
		position: 'relative',
	},
	imageContainer: {
		width: '100%',
		height: wp(39),
		borderRadius: 8,
		overflow: 'hidden',
		marginBottom: hp(1),
		position: 'relative',
	},
	image: {
		width: '100%',
		height: '100%',
	},
	deleteButton: {
		position: 'absolute',
		top: wp(2),
		right: wp(2),
		zIndex: 10,
	},
	collectionName: {
		position: 'absolute',
		bottom: wp(2),
		left: 0,
		right: 0,
		fontSize: hp(1.6),
		fontWeight: '600',
		color: '#fff',
		textAlign: 'center',
		textShadowColor: 'rgba(0, 0, 0, 0.75)',
		textShadowOffset: { width: 1, height: 1 },
		textShadowRadius: 3,
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingBottom: hp(10),
	},
	emptyText: {
		fontSize: hp(1.8),
		color: '#999',
		marginBottom: hp(2),
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: wp(4),
		paddingVertical: hp(1.5),
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
		backgroundColor: '#f5f5f5',
	},
	searchInputContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#eeeeee',
		borderRadius: 8,
		paddingHorizontal: wp(2),
	},
	searchIcon: {
		marginRight: wp(1),
	},
	searchInput: {
		flex: 1,
		height: hp(4.5),
		fontSize: hp(1.6),
	},
	actionButtons: {
		flexDirection: 'row',
		marginLeft: wp(2),
	},
	actionButton: {
		padding: wp(1.5),
		marginLeft: wp(1),
	},
	clearButton: {
		padding: wp(1),
	},
	tabContentContainer: {
		flex: 1,
		flexDirection: 'row',
		width: Dimensions.get('window').width * 2,
	},
	tabContent: {
		flex: 1,
	},
	disabledButton: {
		opacity: 0.5,
	},
});

export default NFTPage;
