import * as Clipboard from 'expo-clipboard';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { ConfirmModal } from '@/components/modals/confirm-modal';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { Collection, NFT, getCollection, getNFTsByCollection, softDeleteNFT } from '@/utils/sqlite';
import { formatContractId } from '@/lib/util';
import { fetchNFTCounts_byCollection } from '@/actions/get-nfts';

const CollectionDetailPage = () => {
	const { t } = useTranslation();
	const { id } = useLocalSearchParams<{ id: string }>();
	const [collection, setCollection] = useState<Collection | null>(null);
	const [nfts, setNfts] = useState<NFT[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchText, setSearchText] = useState('');
	const { getCurrentAccountAddress } = useAccount();
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
	const [createdNFTCount, setCreatedNFTCount] = useState<number>(0);

	const loadCollectionAndNFTs = useCallback(async () => {
		if (!id) return;

		try {
			setLoading(true);
			const userAddress = getCurrentAccountAddress();

			const collectionData = await getCollection(id);
			setCollection(collectionData);

			const nftData = await getNFTsByCollection(id, userAddress);
			setNfts(nftData);

			try {
				const count = await fetchNFTCounts_byCollection(id);
				setCreatedNFTCount(count);
			} catch (error) {
				//console.error('Failed to fetch NFT count:', error);
				setCreatedNFTCount(0);
			}
		} catch (error) {
			//console.error('Failed to load collection details:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToLoadCollectionDetails'),
			});
		} finally {
			setLoading(false);
		}
	}, [id, getCurrentAccountAddress, t]);

	useFocusEffect(
		useCallback(() => {
			loadCollectionAndNFTs();
		}, []),
	);

	const handleCopyId = async () => {
		if (collection?.id) {
			await Clipboard.setStringAsync(collection.id);
			Toast.show({
				type: 'success',
				text1: t('collectionIdCopied'),
			});
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
			loadCollectionAndNFTs();
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

	if (loading) {
		return (
			<ScreenWrapper bg="#f5f5f5">
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
				</View>
			</ScreenWrapper>
		);
	}

	if (!collection) {
		return (
			<ScreenWrapper bg="#f5f5f5">
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyText}>{t('collectionNotFound')}</Text>
				</View>
			</ScreenWrapper>
		);
	}

	return (
		<ScreenWrapper bg="#f5f5f5" disableTopPadding>
			<ScrollView
				style={styles.container}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
				contentInsetAdjustmentBehavior="never"
				automaticallyAdjustContentInsets={false}
			>
				<View style={styles.collectionHeader}>
					<Image
						source={{ uri: collection.icon }}
						style={styles.collectionImage}
						resizeMode="cover"
					/>
					<View style={styles.collectionInfo}>
						<Text style={styles.collectionName}>{collection.name}</Text>
						<View style={styles.idContainer}>
							<Text style={styles.collectionId} numberOfLines={1} ellipsizeMode="middle">
								{t('collectionId')}: {formatContractId(collection.id, 10)}
							</Text>
							<TouchableOpacity style={styles.copyButton} onPress={handleCopyId}>
								<Ionicons name="copy-outline" size={20} color="#666" />
							</TouchableOpacity>
						</View>
						<View style={styles.supplyContainer}>
							<Text style={styles.collectionSupply}>
								{t('supply')}: {collection.supply}
							</Text>
							<Text style={[styles.collectionSupply, styles.remainingText]}>
								{t('remainingSupply')}: {Math.max(0, collection.supply - createdNFTCount)}
							</Text>
						</View>
					</View>
				</View>

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
					<TouchableOpacity
						style={[
							styles.addButton,
							collection.supply - createdNFTCount <= 0 && styles.disabledButton,
						]}
						onPress={() => {
							if (collection.supply - createdNFTCount > 0) {
								router.push(`/(tabs)/nft/create-nft?collectionId=${collection.id}`);
							} else {
								Toast.show({
									type: 'error',
									text1: 'Error',
									text2: 'Collection supply limit reached',
								});
							}
						}}
						disabled={collection.supply - createdNFTCount <= 0}
					>
						<MaterialIcons
							name="add"
							size={24}
							color={collection.supply - createdNFTCount <= 0 ? '#999' : '#333'}
						/>
					</TouchableOpacity>
				</View>

				{filteredNFTs.length > 0 ? (
					<View style={styles.nftGrid}>
						{filteredNFTs.map((nft) => (
							<TouchableOpacity
								key={nft.id}
								style={styles.nftItem}
								onPress={() => router.push(`/(tabs)/nft/nft-detail?id=${nft.id}`)}
							>
								<Image source={{ uri: nft.icon }} style={styles.image} resizeMode="cover" />
								<TouchableOpacity
									style={styles.deleteButton}
									onPress={(e) => {
										e.stopPropagation();
										handleDeleteNFT(nft);
									}}
								>
									<MaterialIcons name="visibility-off" size={24} color="#fff" />
								</TouchableOpacity>
								<Text style={styles.nftName} numberOfLines={1}>
									{nft.name}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				) : (
					<View style={styles.emptyContainer}>
						<Text style={styles.emptyText}>
							{searchText ? t('noMatchingNFTsFound') : t('noNFTsInCollection')}
						</Text>
					</View>
				)}
			</ScrollView>

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
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	scrollContent: {
		padding: 0,
		paddingHorizontal: wp(4),
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	collectionHeader: {
		marginBottom: hp(1),
	},
	collectionImage: {
		width: '100%',
		height: hp(35),
		borderRadius: 0,
		marginTop: hp(2.5),
		marginBottom: hp(2),
	},
	collectionInfo: {
		paddingHorizontal: wp(2),
	},
	collectionName: {
		fontSize: hp(2.2),
		fontWeight: '700',
		color: '#333',
		marginBottom: hp(1),
		textAlign: 'center',
	},
	idContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: hp(1),
	},
	collectionId: {
		fontSize: hp(1.6),
		color: '#666',
		flex: 1,
	},
	copyButton: {
		padding: wp(1),
	},
	collectionSupply: {
		fontSize: hp(1.6),
		color: '#666',
		fontWeight: '500',
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: wp(4),
		paddingVertical: hp(1),
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
		backgroundColor: '#f5f5f5',
		marginHorizontal: 0,
		marginBottom: hp(1),
		justifyContent: 'space-between',
	},
	searchInputContainer: {
		flex: 0.9,
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
	addButton: {
		padding: wp(1.5),
		marginLeft: wp(2),
	},
	columnWrapper: {
		justifyContent: 'space-between',
		marginBottom: hp(1.5),
	},
	listContent: {
		paddingHorizontal: wp(4),
		paddingTop: hp(1),
		paddingBottom: hp(4),
	},
	nftItem: {
		width: wp(43),
		height: wp(43),
		borderRadius: 12,
		overflow: 'hidden',
		marginBottom: hp(3.5),
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
	nftName: {
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
	},
	emptyText: {
		fontSize: hp(1.8),
		color: '#999',
	},
	clearButton: {
		padding: wp(1),
	},
	supplyContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		marginBottom: hp(1),
	},
	remainingText: {
		marginLeft: wp(4),
	},
	nftGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		paddingTop: hp(1),
		paddingBottom: hp(4),
		paddingHorizontal: 0,
	},
	disabledButton: {
		opacity: 0.5,
	},
});

export default CollectionDetailPage;
