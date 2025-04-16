import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Menu, MenuItem } from 'react-native-material-menu';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { syncNFTHistory } from '@/actions/get-nft-history';
import { NFTHistoryCard } from '@/components/nft-cards/nft-history-card';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import type { NFTHistory } from '@/utils/sqlite';
import { getNFTHistoryByContractId } from '@/utils/sqlite';

type SortOption = 'timeAsc' | 'timeDesc';

const NFTHistoryPage = () => {
	const { t } = useTranslation();
	const { id } = useLocalSearchParams<{
		id: string;
	}>();

	const [histories, setHistories] = useState<NFTHistory[]>([]);
	const [searchText, setSearchText] = useState('');
	const [menuVisible, setMenuVisible] = useState(false);
	const { getCurrentAccountAddress } = useAccount();
	const [refreshing, setRefreshing] = useState(false);

	const address = getCurrentAccountAddress();

	useEffect(() => {
		loadHistories();
	}, [id]);

	const loadHistories = async () => {
		try {
			const data = await getNFTHistoryByContractId(id, address);
			setHistories(data);
		} catch (error) {
			//console.error('Failed to load histories:', error);
		}
	};

	const handleRefresh = async () => {
		try {
			setRefreshing(true);
			await syncNFTHistory(address);
			await loadHistories();
			Toast.show({
				type: 'success',
				text1: t('success'),
				text2: t('historyRefreshedSuccessfully'),
			});
		} catch (error) {
			//console.error('Failed to refresh history:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToRefreshHistory'),
			});
		} finally {
			setRefreshing(false);
		}
	};

	const handleSort = (option: SortOption) => {
		const sorted = [...histories].sort((a, b) => {
			switch (option) {
				case 'timeAsc':
					return a.timestamp - b.timestamp;
				case 'timeDesc':
					return b.timestamp - a.timestamp;
				default:
					return 0;
			}
		});
		setHistories(sorted);
		setMenuVisible(false);
	};

	const filteredHistories = React.useMemo(() => {
		let filtered = histories;

		filtered = filtered.filter((history) =>
			history.id.toLowerCase().startsWith(searchText.toLowerCase()),
		);

		return filtered;
	}, [histories, searchText]);

	return (
		<View style={styles.container}>
			<View style={styles.searchContainer}>
				<View style={styles.searchWrapper}>
					<MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder={t('searchById')}
						value={searchText}
						onChangeText={setSearchText}
						autoCapitalize="none"
						autoCorrect={false}
						contextMenuHidden={false}
						textContentType="none"
						editable={true}
					/>
					{searchText.length > 0 && (
						<TouchableOpacity style={styles.clearButton} onPress={() => setSearchText('')}>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
				<View style={styles.actions}>
					<TouchableOpacity onPress={handleRefresh} style={styles.actionButton}>
						<MaterialIcons name="refresh" size={24} color="#666" />
					</TouchableOpacity>
					<Menu
						visible={menuVisible}
						anchor={
							<TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.actionButton}>
								<MaterialIcons name="sort" size={24} color="#666" />
							</TouchableOpacity>
						}
						onRequestClose={() => setMenuVisible(false)}
						style={styles.menu}
					>
						<MenuItem onPress={() => handleSort('timeDesc')} textStyle={styles.menuItemText}>
							<Text>{t('timeDescending')}</Text>
						</MenuItem>
						<MenuItem onPress={() => handleSort('timeAsc')} textStyle={styles.menuItemText}>
							<Text>{t('timeAscending')}</Text>
						</MenuItem>
					</Menu>
				</View>
			</View>

			<FlatList
				data={filteredHistories}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => <NFTHistoryCard key={item.id} history={item} />}
				refreshing={refreshing}
				onRefresh={handleRefresh}
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: wp(4),
		marginBottom: hp(2),
		marginTop: hp(2),
	},
	searchWrapper: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#e8e8e8',
		borderRadius: 8,
		paddingHorizontal: wp(2),
		height: hp(4),
		marginRight: wp(2),
	},
	searchIcon: {
		marginRight: wp(2),
	},
	searchInput: {
		flex: 1,
		height: hp(4),
		fontSize: hp(1.6),
		paddingRight: wp(8),
	},
	actions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: wp(2),
	},
	actionButton: {
		padding: 4,
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: wp(2),
		paddingTop: hp(1),
	},
	menu: {
		backgroundColor: '#fff',
	},
	menuItemText: {
		fontSize: hp(1.6),
	},
	clearButton: {
		position: 'absolute',
		right: wp(2),
		height: '100%',
		justifyContent: 'center',
		padding: wp(1),
	},
});

export default NFTHistoryPage;
