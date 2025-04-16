import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	FlatList,
	ScrollView,
} from 'react-native';
import { Menu, MenuItem } from 'react-native-material-menu';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { syncTransactionHistory } from '@/actions/get-transaction-history';
import {
	sync_Legacy_TransactionHistory,
	sync_Taproot_TransactionHistory,
} from '@/actions/get-btc-information';
import { TransactionHistoryCard } from '@/components/transaction-cards/transaction-history-card';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { getTransactionHistoryByType, type TransactionHistory } from '@/utils/sqlite';
import { AccountType } from '@/types';
import React from 'react';

type SortOption = 'timeAsc' | 'timeDesc' | 'changeAsc' | 'changeDesc' | 'feeAsc' | 'feeDesc';
type FilterType = 'all' | 'positive' | 'negative';

type TxType = 'P2PKH' | 'TBC20' | 'TBC721' | 'TBC MS' | 'P2TR';

const HistoryPage = () => {
	const { t } = useTranslation();
	const { getCurrentAccountAddress, getCurrentAccountType } = useAccount();
	const accountType = getCurrentAccountType();
	const [activeType, setActiveType] = useState<TxType>('P2PKH');
	const [histories, setHistories] = useState<TransactionHistory[]>([]);
	const [searchText, setSearchText] = useState('');
	const [menuVisible, setMenuVisible] = useState(false);
	const [filterType, setFilterType] = useState<FilterType>('all');
	const [filterMenuVisible, setFilterMenuVisible] = useState(false);
	const [refreshing, setRefreshing] = useState(false);

	const availableTypes: TxType[] = (() => {
		switch (accountType) {
			case AccountType.TBC:
				return ['P2PKH', 'TBC20', 'TBC721', 'TBC MS'];
			case AccountType.TAPROOT_LEGACY:
				return ['P2PKH', 'TBC20', 'TBC721'];
			case AccountType.LEGACY:
				return ['P2PKH'];
			case AccountType.TAPROOT:
				return ['P2TR'];
			default:
				return ['P2PKH'];
		}
	})();

	useEffect(() => {
		setActiveType(availableTypes[0]);
	}, [accountType]);

	useEffect(() => {
		loadHistories();
	}, [activeType]);

	const loadHistories = async () => {
		try {
			const address = getCurrentAccountAddress();
			let dbType: 'tbc' | 'taproot' | 'legacy';

			switch (accountType) {
				case AccountType.TAPROOT:
					dbType = 'taproot';
					break;
				case AccountType.LEGACY:
					dbType = 'legacy';
					break;
				default:
					dbType = 'tbc';
			}

			const data = await getTransactionHistoryByType(activeType, address, dbType);
			setHistories(data);
		} catch (error) {
			//console.error('Failed to load histories:', error);
		}
	};

	const handleRefresh = async () => {
		try {
			setRefreshing(true);
			const address = getCurrentAccountAddress();

			switch (accountType) {
				case AccountType.TAPROOT:
					await sync_Taproot_TransactionHistory(address);
					break;
				case AccountType.LEGACY:
					await sync_Legacy_TransactionHistory(address);
					break;
				default:
					await syncTransactionHistory(address);
			}

			await loadHistories();

			Toast.show({
				type: 'success',
				text1: t('success'),
				text2: t('transactionHistoryUpdated'),
				position: 'top',
				visibilityTime: 2000,
			});
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: t('refreshFailed'),
				text2: error instanceof Error ? error.message : t('failedToUpdateTransactionHistory'),
				position: 'top',
				visibilityTime: 3000,
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
				case 'changeAsc':
					return Math.abs(a.balance_change) - Math.abs(b.balance_change);
				case 'changeDesc':
					return Math.abs(b.balance_change) - Math.abs(a.balance_change);
				case 'feeAsc':
					return a.fee - b.fee;
				case 'feeDesc':
					return b.fee - a.fee;
				default:
					return 0;
			}
		});
		setHistories(sorted);
		setMenuVisible(false);
	};

	const handleFilter = (type: FilterType) => {
		setFilterType(type);
		setFilterMenuVisible(false);
	};

	const filteredHistories = React.useMemo(() => {
		let filtered = histories;

		filtered = filtered.filter((history) =>
			history.id.toLowerCase().startsWith(searchText.toLowerCase()),
		);

		switch (filterType) {
			case 'positive':
				filtered = filtered.filter((history) => history.balance_change > 0);
				break;
			case 'negative':
				filtered = filtered.filter((history) => history.balance_change < 0);
				break;
		}

		return filtered;
	}, [histories, searchText, filterType]);

	return (
		<View style={styles.container}>
	
			<View style={styles.tabContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false}>
					{availableTypes.map((type) => (
						<TouchableOpacity
							key={type}
							style={[styles.tabButton, activeType === type && styles.activeTabButton]}
							onPress={() => setActiveType(type)}
						>
							<Text style={[styles.tabText, activeType === type && styles.activeTabText]}>
								{type}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
			</View>

			<View style={styles.searchContainer}>
				<View style={styles.searchWrapper}>
					<MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder={t('searchByTxId')}
						value={searchText}
						onChangeText={setSearchText}
						autoCapitalize="none"
						autoCorrect={false}
					/>
					{searchText.length > 0 && (
						<TouchableOpacity style={styles.clearButton} onPress={() => setSearchText('')}>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>
				<View style={styles.actions}>
					<Menu
						visible={filterMenuVisible}
						anchor={
							<TouchableOpacity
								onPress={() => setFilterMenuVisible(true)}
								style={styles.actionButton}
							>
								<MaterialIcons
									name="filter-list"
									size={24}
									color={filterType !== 'all' ? theme.colors.primary : '#666'}
								/>
							</TouchableOpacity>
						}
						onRequestClose={() => setFilterMenuVisible(false)}
						style={styles.menu}
					>
						<MenuItem onPress={() => handleFilter('all')} textStyle={styles.menuItemText}>
							<Text>{t('all')}</Text>
						</MenuItem>
						<MenuItem onPress={() => handleFilter('positive')} textStyle={styles.menuItemText}>
							<Text style={styles.positive}>{t('positive')}</Text>
						</MenuItem>
						<MenuItem onPress={() => handleFilter('negative')} textStyle={styles.menuItemText}>
							<Text style={styles.negative}>{t('negative')}</Text>
						</MenuItem>
					</Menu>
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
							<Text>{t('time')} ↓</Text>
						</MenuItem>
						<MenuItem onPress={() => handleSort('timeAsc')} textStyle={styles.menuItemText}>
							<Text>{t('time')} ↑</Text>
						</MenuItem>
						<MenuItem onPress={() => handleSort('changeDesc')} textStyle={styles.menuItemText}>
							<Text>{t('change')} ↓</Text>
						</MenuItem>
						<MenuItem onPress={() => handleSort('changeAsc')} textStyle={styles.menuItemText}>
							<Text>{t('change')} ↑</Text>
						</MenuItem>
						<MenuItem onPress={() => handleSort('feeDesc')} textStyle={styles.menuItemText}>
							<Text>{t('fee')} ↓</Text>
						</MenuItem>
						<MenuItem onPress={() => handleSort('feeAsc')} textStyle={styles.menuItemText}>
							<Text>{t('fee')} ↑</Text>
						</MenuItem>
					</Menu>
				</View>
			</View>

			<FlatList
				data={filteredHistories}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => <TransactionHistoryCard history={item} />}
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
	tabContainer: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
		backgroundColor: '#f5f5f5',
	},
	tabButton: {
		paddingVertical: hp(1.5),
		paddingHorizontal: wp(4),
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
	positive: {
		color: '#4CAF50',
	},
	negative: {
		color: '#F44336',
	},
	clearButton: {
		position: 'absolute',
		right: wp(2),
		height: '100%',
		justifyContent: 'center',
		padding: wp(1),
	},
});

export default HistoryPage;
