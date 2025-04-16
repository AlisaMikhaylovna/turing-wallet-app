import '@/shim';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import React, { useCallback, useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { syncFTs } from '@/actions/get-fts';
import { AddContractModal } from '@/components/modals/add-token-modal';
import { BalanceCard } from '@/components/balance-card';
import { SearchFilterBar } from '@/components/search-filter-bar';
import { AddedTokenCard } from '@/components/token-cards/added-token-card';
import { OwnedTokenCard } from '@/components/token-cards/owned-token-card';
import { ConfirmModal } from '@/components/modals/confirm-modal';
import { Navbar } from '@/components/ui/navbar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp } from '@/lib/common';
import {
	getActiveFTs,
	getAllFTPublics,
	removeFTPublic,
	softDeleteFT,
	toggleFTPin,
	toggleFTPublicPin,
	type FT,
	type FTPublic,
} from '@/utils/sqlite';
import { AccountType } from '@/types';

type TabType = 'owned' | 'added';
type SortOption = 'default' | 'amountHighToLow' | 'amountLowToHigh';

export default function HomePage() {
	const { t } = useTranslation();
	const [activeTab, setActiveTab] = useState<TabType>('owned');
	const [ownedTokens, setOwnedTokens] = useState<FT[]>([]);
	const [addedTokens, setAddedTokens] = useState<FTPublic[]>([]);
	const [searchText, setSearchText] = useState('');
	const { getCurrentAccountAddress, getCurrentAccountType } = useAccount();
	const [deleteModalVisible, setDeleteModalVisible] = useState(false);
	const [tokenToDelete, setTokenToDelete] = useState<FT | FTPublic | null>(null);
	const [addModalVisible, setAddModalVisible] = useState(false);
	const accountType = getCurrentAccountType();
	const disableTokens = accountType === AccountType.TAPROOT || accountType === AccountType.LEGACY;
	const [pinModalVisible, setPinModalVisible] = useState(false);
	const [tokenToPin, setTokenToPin] = useState<FT | FTPublic | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	useEffect(() => {
		if (disableTokens) {
			setOwnedTokens([]);
			setAddedTokens([]);
		} else {
			if (activeTab === 'owned') {
				loadOwnedTokens();
			} else {
				loadAddedTokens();
			}
		}
	}, [disableTokens, accountType, activeTab]);

	useFocusEffect(
		useCallback(() => {
			if (disableTokens) {
				setOwnedTokens([]);
				setAddedTokens([]);
				return;
			}

			if (activeTab === 'owned') {
				loadOwnedTokens();
			} else {
				loadAddedTokens();
			}
		}, [activeTab, disableTokens]),
	);

	const loadOwnedTokens = async () => {
		if (!disableTokens) {
			const tokens = await getActiveFTs(getCurrentAccountAddress());
			const sorted = tokens.sort((a, b) => {
				if (a.is_pin && !b.is_pin) return -1;
				if (!a.is_pin && b.is_pin) return 1;
				return a.name.localeCompare(b.name);
			});
			setOwnedTokens(sorted);
		}
	};

	const loadAddedTokens = async () => {
		if (!disableTokens) {
			const tokens = await getAllFTPublics();
			const sorted = tokens.sort((a, b) => {
				if (a.is_pin && !b.is_pin) return -1;
				if (!a.is_pin && b.is_pin) return 1;
				return a.name.localeCompare(b.name);
			});
			setAddedTokens(sorted);
		}
	};

	const handleSort = (option: SortOption) => {
		if (activeTab === 'owned') {
			let sorted = [...ownedTokens];

			if (option === 'default') {
				sorted = sorted.sort((a, b) => {
					if (a.is_pin && !b.is_pin) return -1;
					if (!a.is_pin && b.is_pin) return 1;
					return a.name.localeCompare(b.name);
				});
			} else {
				const pinnedTokens = sorted.filter((token) => token.is_pin);
				const unpinnedTokens = sorted.filter((token) => !token.is_pin);

				unpinnedTokens.sort((a, b) => {
					return option === 'amountHighToLow' ? b.amount - a.amount : a.amount - b.amount;
				});

				sorted = [...pinnedTokens, ...unpinnedTokens];
			}

			setOwnedTokens(sorted);
		} else {
			let sorted = [...addedTokens];

			if (option === 'default') {
				sorted = sorted.sort((a, b) => {
					if (a.is_pin && !b.is_pin) return -1;
					if (!a.is_pin && b.is_pin) return 1;
					return a.name.localeCompare(b.name);
				});
			} else {
				const pinnedTokens = sorted.filter((token) => token.is_pin);
				const unpinnedTokens = sorted.filter((token) => !token.is_pin);

				unpinnedTokens.sort((a, b) => {
					return option === 'amountHighToLow' ? b.supply - a.supply : a.supply - b.supply;
				});

				sorted = [...pinnedTokens, ...unpinnedTokens];
			}

			setAddedTokens(sorted);
		}
	};

	const handleRefresh = async () => {
		if (disableTokens) return;

		try {
			setRefreshing(true);
			const address = getCurrentAccountAddress();
			await syncFTs(address);

			if (activeTab === 'owned') {
				await loadOwnedTokens();
			}

			Toast.show({
				type: 'success',
				text1: t('success'),
				text2: t('tokensRefreshed'),
			});
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToRefreshTokens'),
			});
		} finally {
			setRefreshing(false);
		}
	};

	const onRefresh = useCallback(() => {
		handleRefresh();
	}, [disableTokens]);

	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
		if (tab === 'owned') {
			loadOwnedTokens();
		} else if (tab === 'added' && addedTokens.length === 0) {
			loadAddedTokens();
		}
	};

	const handleSearch = (text: string) => {
		setSearchText(text);
	};

	const handleHistoryPress = (token: FT) => {
		router.push({
			pathname: '/(tabs)/home/token/token-history',
			params: { contractId: token.id },
		});
	};

	const handleTransferPress = (token: FT) => {
		router.push({
			pathname: '/(tabs)/home/token/token-transfer',
			params: { contractId: token.id, amount: token.amount.toString() },
		});
	};

	const handleAddToken = () => {
		if (activeTab === 'added') {
			loadAddedTokens();
		}
	};

	const handleOwnedTokenDelete = (token: FT) => {
		setTokenToDelete(token);
		setDeleteModalVisible(true);
	};

	const handleAddedTokenDelete = (token: FTPublic) => {
		setTokenToDelete(token);
		setDeleteModalVisible(true);
	};

	const handleConfirmDelete = async () => {
		if (!tokenToDelete) return;

		try {
			if ('amount' in tokenToDelete) {
				await softDeleteFT(tokenToDelete.id, getCurrentAccountAddress());
				await loadOwnedTokens();
			} else {
				await removeFTPublic(tokenToDelete.id);
				await loadAddedTokens();
			}
			if ('amount' in tokenToDelete) {
				Toast.show({
					type: 'success',
					text1: t('success'),
					text2: t('tokenHiddenSuccessfully'),
				});
			} else {
				Toast.show({
					type: 'success',
					text1: t('success'),
					text2: t('tokenDeletedSuccessfully'),
				});
			}
		} catch (error) {
			//console.error('Failed to hide token:', error);
			if ('amount' in tokenToDelete) {
				Toast.show({
					type: 'error',
					text1: t('error'),
					text2: t('failedToHideToken'),
				});
			} else {
				Toast.show({
					type: 'error',
					text1: t('error'),
					text2: t('failedToDeleteToken'),
				});
			}
		} finally {
			setDeleteModalVisible(false);
			setTokenToDelete(null);
		}
	};

	const filteredOwnedTokens = React.useMemo(
		() =>
			ownedTokens.filter(
				(token) =>
					token.name.toLowerCase().startsWith(searchText.toLowerCase()) ||
					token.id.toLowerCase().startsWith(searchText.toLowerCase()),
			),
		[ownedTokens, searchText],
	);

	const filteredAddedTokens = React.useMemo(
		() =>
			addedTokens.filter(
				(token) =>
					token.name.toLowerCase().startsWith(searchText.toLowerCase()) ||
					token.id.toLowerCase().startsWith(searchText.toLowerCase()),
			),
		[addedTokens, searchText],
	);

	const handleRefreshLists = async () => {
		if (activeTab === 'owned') {
			await loadOwnedTokens();
		} else {
			await loadAddedTokens();
		}
	};

	const handleAddModalClose = () => {
		setAddModalVisible(false);
	};

	const handleTokenLongPress = (token: FT | FTPublic) => {
		setTokenToPin(token);
		setPinModalVisible(true);
	};

	const handleConfirmPin = async () => {
		if (!tokenToPin) return;

		try {
			const isPinned = tokenToPin.is_pin;

			if ('amount' in tokenToPin) {
				await toggleFTPin(tokenToPin.id, getCurrentAccountAddress(), !isPinned);
				await loadOwnedTokens();
			} else {
				await toggleFTPublicPin(tokenToPin.id, !isPinned);
				await loadAddedTokens();
			}

			Toast.show({
				type: 'success',
				text1: t('success'),
				text2: isPinned ? t('tokenUnpinned') : t('tokenPinned'),
			});
		} catch (error) {
			//console.error('Failed to toggle pin status:', error);
			Toast.show({
				type: 'error',
				text1: t('error'),
				text2: t('failedToUpdatePinStatus'),
			});
		} finally {
			setPinModalVisible(false);
			setTokenToPin(null);
		}
	};

	return (
		<ScreenWrapper bg="white">
			<Navbar />
			<ScrollView
				style={styles.container}
				showsVerticalScrollIndicator={false}
				bounces={!disableTokens}
				decelerationRate="normal"
				overScrollMode="never"
				contentContainerStyle={styles.scrollContent}
				refreshControl={
					!disableTokens ? (
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							colors={['#4CAF50']}
							tintColor={'#4CAF50'}
						/>
					) : undefined
				}
			>
				<View style={styles.content}>
					<BalanceCard />
					<SearchFilterBar
						onTabChange={handleTabChange}
						onSearch={handleSearch}
						onSort={handleSort}
						onRefresh={handleRefresh}
						onAddToken={handleAddToken}
						disableAddToken={disableTokens}
						disableAllActions={disableTokens}
					/>
					{activeTab === 'owned'
						? filteredOwnedTokens.map((token) => (
								<OwnedTokenCard
									key={token.id}
									token={token}
									onHistoryPress={handleHistoryPress}
									onTransferPress={handleTransferPress}
									onDeletePress={handleOwnedTokenDelete}
									onLongPress={handleTokenLongPress}
								/>
						  ))
						: filteredAddedTokens.map((token) => (
								<AddedTokenCard
									key={token.id}
									token={token}
									onDeletePress={handleAddedTokenDelete}
									onRefresh={loadAddedTokens}
									onLongPress={handleTokenLongPress}
								/>
						  ))}
				</View>
			</ScrollView>
			<ConfirmModal
				visible={deleteModalVisible}
				title={'amount' in (tokenToDelete || {}) ? t('hideToken') : t('deleteToken')}
				message={`${t('areYouSureWantTo')} ${
					'amount' in (tokenToDelete || {}) ? t('hide') : t('delete')
				} ${tokenToDelete?.name || t('thisToken')}? ${
					'amount' in (tokenToDelete || {})
						? t('youCanRestoreAnytime')
						: t('thisWillRemoveFromList')
				}`}
				onConfirm={handleConfirmDelete}
				onCancel={() => {
					setDeleteModalVisible(false);
					setTokenToDelete(null);
				}}
			/>
			<ConfirmModal
				visible={pinModalVisible}
				title={tokenToPin?.is_pin ? t('unpinToken') : t('pinToken')}
				message={`${t('areYouSureWantTo')} ${tokenToPin?.is_pin ? t('unpin') : t('pin')} ${
					tokenToPin?.name || t('thisToken')
				}? ${tokenToPin?.is_pin ? t('thisWillRemoveFromTop') : t('thisWillKeepAtTop')}`}
				onConfirm={handleConfirmPin}
				onCancel={() => {
					setPinModalVisible(false);
					setTokenToPin(null);
				}}
			/>
			<AddContractModal
				visible={addModalVisible}
				onClose={handleAddModalClose}
				onRefreshLists={handleRefreshLists}
			/>
		</ScreenWrapper>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: hp(2),
	},
	content: {
		flex: 1,
		alignItems: 'stretch',
		paddingTop: hp(2),
		paddingHorizontal: 16,
	},
});
