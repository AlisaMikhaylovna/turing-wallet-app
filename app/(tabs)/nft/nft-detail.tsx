import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { formatContractId } from '@/lib/util';
import { Collection, NFT, getCollection, getNFT } from '@/utils/sqlite';

const NFTDetailPage = () => {
	const { t } = useTranslation();
	const { id } = useLocalSearchParams<{ id: string }>();
	const [nft, setNFT] = useState<NFT | null>(null);
	const [collection, setCollection] = useState<Collection | null>(null);
	const [loading, setLoading] = useState(true);
	const { getCurrentAccountAddress } = useAccount();

	const loadNFTDetails = useCallback(async () => {
		if (!id) return;

		try {
			setLoading(true);

			const nftData = await getNFT(id);
			setNFT(nftData);

			if (nftData?.collection_id) {
				const collectionData = await getCollection(nftData.collection_id);
				setCollection(collectionData);
			}
		} catch (error) {
			//console.error('Failed to load NFT details:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToLoadNFTDetails'),
			});
		} finally {
			setLoading(false);
		}
	}, [id, getCurrentAccountAddress, t]);

	useFocusEffect(
		useCallback(() => {
			loadNFTDetails();
		}, [loadNFTDetails]),
	);

	const handleCopyId = async () => {
		if (nft?.id) {
			await Clipboard.setStringAsync(nft.id);
			Toast.show({
				type: 'success',
				text1: t('nftIdCopied'),
			});
		}
	};

	const handleCopyCollectionId = async () => {
		if (nft?.collection_id) {
			await Clipboard.setStringAsync(nft.collection_id);
			Toast.show({
				type: 'success',
				text1: t('collectionIdCopied'),
			});
		}
	};

	const handleViewCollection = () => {
		if (collection?.id) {
			router.push(`/(tabs)/nft/collection/collection-detail?id=${collection.id}`);
		}
	};

	if (loading) {
		return (
			<ScreenWrapper bg="#f5f5f5">
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={theme.colors.primary} />
				</View>
			</ScreenWrapper>
		);
	}

	if (!nft) {
		return (
			<ScreenWrapper bg="#f5f5f5">
				<View style={styles.emptyContainer}>
					<Text style={styles.emptyText}>{t('nftNotFound')}</Text>
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
				<View style={styles.nftHeader}>
					<Image source={{ uri: nft.icon }} style={styles.nftImage} resizeMode="cover" />
					<View style={styles.nftInfo}>
						<Text style={styles.nftName}>{nft.name}</Text>
						<View style={styles.idContainer}>
							<Text style={styles.nftId} numberOfLines={1} ellipsizeMode="middle">
								{t('nftId')}: {formatContractId(nft.id, 10)}
							</Text>
							<TouchableOpacity style={styles.copyButton} onPress={handleCopyId}>
								<Ionicons name="copy-outline" size={20} color="#666" />
							</TouchableOpacity>
						</View>

						{nft.collection_id && (
							<View style={styles.idContainer}>
								<Text style={styles.nftId} numberOfLines={1} ellipsizeMode="middle">
									{t('collectionId')}: {formatContractId(nft.collection_id, 10)}
								</Text>
								<TouchableOpacity style={styles.copyButton} onPress={handleCopyCollectionId}>
									<Ionicons name="copy-outline" size={20} color="#666" />
								</TouchableOpacity>
							</View>
						)}

						<View style={styles.infoContainer}>
							<Text style={styles.infoText}>
								{t('transferTimes')}: {nft.transfer_times || '0'}
							</Text>
							<Text style={styles.infoText}>
								{t('collectionName')}: {collection ? collection.name : 'Unknown'}
							</Text>
							<Text style={styles.infoText}>
								{t('collectionIndex')}: {nft.collection_index || 'N/A'}
							</Text>
						</View>

						{collection && (
							<TouchableOpacity style={styles.viewCollectionButton} onPress={handleViewCollection}>
								<Text style={styles.viewCollectionText}>{t('viewCollection')}</Text>
							</TouchableOpacity>
						)}

						<TouchableOpacity
							style={[styles.viewCollectionButton, { marginTop: hp(0.5) }]}
							onPress={() => router.push(`/(tabs)/nft/nft-history?id=${nft.id}`)}
						>
							<Text style={styles.viewCollectionText}>{t('viewNFTHistory')}</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[styles.viewCollectionButton, { marginTop: hp(0.5) }]}
							onPress={() =>
								router.push(
									`/(tabs)/nft/nft-transfer?id=${nft.id}&transferTimes=${nft.transfer_times}`,
								)
							}
						>
							<Text style={styles.viewCollectionText}>{t('transferNFT')}</Text>
						</TouchableOpacity>
					</View>
				</View>
			</ScrollView>
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
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyText: {
		fontSize: hp(1.8),
		color: '#999',
	},
	nftHeader: {
		marginBottom: hp(1),
	},
	nftImage: {
		width: '100%',
		height: hp(35),
		borderRadius: 0,
		marginTop: hp(2.5),
		marginBottom: hp(2),
	},
	nftInfo: {
		paddingHorizontal: wp(2),
	},
	nftName: {
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
	nftId: {
		fontSize: hp(1.6),
		color: '#666',
		flex: 1,
	},
	copyButton: {
		padding: wp(1),
	},
	infoContainer: {
		marginBottom: hp(2),
	},
	infoText: {
		fontSize: hp(1.6),
		color: '#666',
		marginBottom: hp(1),
		lineHeight: hp(2.2),
	},
	viewCollectionButton: {
		backgroundColor: theme.colors.primary,
		paddingVertical: hp(1),
		borderRadius: 8,
		alignItems: 'center',
		marginBottom: hp(1),
	},
	viewCollectionText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '600',
	},
});

export default NFTDetailPage;
