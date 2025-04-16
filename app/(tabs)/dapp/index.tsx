import React, { useState, useEffect, useCallback } from 'react';
import {
	View,
	Text,
	Image,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	TextInput,
	RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Navbar } from '@/components/ui/navbar';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { wp, hp } from '@/lib/common';
import { useAccount } from '@/hooks/useAccount';
import { getAllDApps } from '@/utils/sqlite';
import { syncDApps } from '@/actions/get-dapps';
import type { DApp } from '@/utils/sqlite';

export default function DAppPage() {
	const { t } = useTranslation();
	const [searchText, setSearchText] = useState('');
	const [dapps, setDapps] = useState<DApp[]>([]);
	const [filteredDapps, setFilteredDapps] = useState<DApp[]>([]);
	const [refreshing, setRefreshing] = useState(false);
	const { 
		isTbcAccount, 
		isTaprootLegacyAccount, 
		getCurrentAccountType,
	} = useAccount();
	const [isSearching, setIsSearching] = useState(false);
	const [noResults, setNoResults] = useState(false);

	const isConnectAccount = isTbcAccount() || isTaprootLegacyAccount();

	const loadDApps = useCallback(async () => {
		const allDApps = await getAllDApps();
		const filteredDApps = allDApps.filter(
			(dapp) => isConnectAccount || (!isConnectAccount && !dapp.if_need_tbc_address),
		);
		setDapps(filteredDApps);
	}, [isConnectAccount]);

	useEffect(() => {
		const accountType = getCurrentAccountType();
		loadDApps();
	}, [getCurrentAccountType(), loadDApps]);

	useEffect(() => {
		if (!searchText.trim()) {
			setFilteredDapps(dapps);
			setIsSearching(false);
			setNoResults(false);
			return;
		}

		setIsSearching(true);

		const searchTerms = searchText
			.toLowerCase()
			.split(/\s+/)
			.filter((term) => term.length > 0);

		const filtered = dapps.filter((dapp) => {
			const name = dapp.name.toLowerCase();
			const url = dapp.url.toLowerCase();
			const description = dapp.description ? dapp.description.toLowerCase() : '';

			return searchTerms.every(
				(term) => name.includes(term) || url.includes(term) || description.includes(term),
			);
		});

		setFilteredDapps(filtered);
		setNoResults(filtered.length === 0);
		setIsSearching(false);
	}, [searchText, dapps]);

	const onRefresh = async () => {
		try {
			setRefreshing(true);
			await syncDApps();
			await loadDApps();
		} catch (error) {
			//console.error('Failed to refresh DApps:', error);
		} finally {
			setRefreshing(false);
		}
	};

	const handleDAppPress = (dapp: DApp) => {
		router.push({
			pathname: '/dapp/webview',
			params: { url: dapp.url, name: dapp.name },
		});
	};

	const handleSearch = (text: string) => {
		setSearchText(text);
	};

	return (
		<ScreenWrapper bg="#f5f5f5">
			<Navbar />
			<View style={styles.container}>
				<View style={styles.searchContainer}>
					<View style={styles.searchInputContainer}>
						<MaterialIcons name="search" size={24} color="#999" style={styles.searchIcon} />
						<TextInput
							style={styles.searchInput}
							placeholder={t('searchDapps')}
							value={searchText}
							onChangeText={handleSearch}
						/>
						{searchText.length > 0 && (
							<TouchableOpacity onPress={() => setSearchText('')} style={styles.clearButton}>
								<MaterialIcons name="close" size={20} color="#999" />
							</TouchableOpacity>
						)}
					</View>

					<TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={refreshing}>
						<MaterialIcons name="refresh" size={24} color={refreshing ? '#999' : '#333'} />
					</TouchableOpacity>
				</View>

				<ScrollView
					style={styles.scrollView}
					refreshControl={
						<RefreshControl
							refreshing={refreshing}
							onRefresh={onRefresh}
							colors={['#333']}
							tintColor="#333"
						/>
					}
				>
					<View style={styles.listContainer}>
						{isSearching ? (
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>{t('searching')}</Text>
							</View>
						) : noResults ? (
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>
									{t('noDappsFoundMatching')} "{searchText}"
								</Text>
								<Text style={styles.emptySubText}>{t('tryDifferentKeywords')}</Text>
							</View>
						) : filteredDapps.length > 0 ? (
							filteredDapps.map((dapp) => (
								<TouchableOpacity
									key={dapp.id}
									style={styles.dappItem}
									onPress={() => handleDAppPress(dapp)}
								>
									<Image
										source={{ uri: dapp.icon }}
										style={styles.icon}
									/>
									<View style={styles.dappInfo}>
										<Text style={styles.name}>{dapp.name}</Text>
										<Text style={styles.description} numberOfLines={1}>
											{dapp.description}
										</Text>
									</View>
								</TouchableOpacity>
							))
						) : (
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>{t('noDappsAvailable')}</Text>
							</View>
						)}
					</View>
				</ScrollView>
			</View>
		</ScreenWrapper>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
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
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#eeeeee',
		borderRadius: 8,
		paddingHorizontal: wp(2),
		flex: 1,
	},
	searchIcon: {
		marginRight: wp(1),
	},
	searchInput: {
		flex: 1,
		height: hp(4.5),
		fontSize: hp(1.6),
	},
	clearButton: {
		padding: wp(1),
	},
	scrollView: {
		flex: 1,
		paddingTop: hp(1),
	},
	listContainer: {
		backgroundColor: '#f5f5f5',
	},
	dappItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
		backgroundColor: '#f5f5f5',
	},
	icon: {
		width: wp(10),
		height: wp(10),
		borderRadius: wp(2),
	},
	dappInfo: {
		flex: 1,
		marginLeft: wp(3),
	},
	name: {
		fontSize: hp(1.8),
		fontWeight: '500',
		marginBottom: hp(0.5),
		color: '#000',
	},
	description: {
		fontSize: hp(1.4),
		color: '#666',
	},
	emptyContainer: {
		padding: wp(4),
		alignItems: 'center',
	},
	emptyText: {
		fontSize: hp(1.8),
		color: '#999',
	},
	emptySubText: {
		fontSize: hp(1.4),
		color: '#999',
		marginTop: hp(0.5),
	},
	refreshButton: {
		marginLeft: wp(2),
		padding: wp(1),
		width: wp(10),
		height: wp(10),
		justifyContent: 'center',
		alignItems: 'center',
	},
});
