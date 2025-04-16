import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';
import React, { useLayoutEffect, useState, useEffect } from 'react';
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import * as Updates from 'expo-updates';
import Toast from 'react-native-toast-message';

import { hp, wp } from '@/lib/common';

const appVersion = Constants.expoConfig?.version || '1.0.0';

const STORE_URLS = {
	ios: 'https://apps.apple.com/us/app/turingwallet/id6739019122',
	android: 'https://play.google.com/store/apps/details?id=xyz.turingwallet.app',
};

export default function SystemSettingsPage() {
	const { t, i18n } = useTranslation();
	const navigation = useNavigation();
	const [checking, setChecking] = useState(false);
	const [hasUpdate, setHasUpdate] = useState(false);
	const [updating, setUpdating] = useState(false);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerTitle: t('systemSettings'),
		});
	}, [navigation, t]);

	useEffect(() => {
		checkForUpdates(true);
	}, []);

	const checkForUpdates = async (silent = false) => {
		if (!silent) {
			setChecking(true);
		}

		try {
			const update = await Updates.checkForUpdateAsync();

			if (update.isAvailable) {
				setHasUpdate(true);

				if (!silent) {
					Toast.show({
						type: 'info',
						text1: t('updateAvailable'),
						text2: t('newVersionAvailable'),
						position: 'top',
						visibilityTime: 4000,
						autoHide: true,
					});
				}
			} else if (!silent) {
				Toast.show({
					type: 'success',
					text1: t('upToDate'),
					text2: t('appIsUpToDate'),
					position: 'top',
					visibilityTime: 2000,
				});
			}
		} catch (error) {
			if (!silent) {
				Toast.show({
					type: 'error',
					text1: t('failedToCheckForUpdates'),
					position: 'top',
					visibilityTime: 3000,
				});
				goToStore();
			}
		} finally {
			if (!silent) {
				setChecking(false);
			}
		}
	};

	const downloadUpdate = async () => {
		setUpdating(true);
		try {
			await Updates.fetchUpdateAsync();
			Toast.show({
				type: 'success',
				text1: t('updateDownloaded'),
				text2: t('updateReadyToInstall'),
				position: 'top',
				visibilityTime: 3000,
				onPress: () => Updates.reloadAsync(),
			});
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: t('updateFailed'),
				text2: t('couldNotDownloadUpdate'),
				position: 'top',
				visibilityTime: 3000,
			});
			goToStore();
		} finally {
			setUpdating(false);
		}
	};

	const goToStore = () => {
		const storeUrl = Platform.select({
			ios: STORE_URLS.ios,
			android: STORE_URLS.android,
			default: STORE_URLS.android,
		});

		Linking.openURL(storeUrl);
	};

	const handleCheckUpdate = () => {
		if (hasUpdate) {
			downloadUpdate();
		} else {
			checkForUpdates();
		}
	};

	const getLanguageDisplay = () => {
		switch (i18n.language) {
			case 'zh':
				return t('chinese');
			case 'en':
			default:
				return t('english');
		}
	};

	return (
		<View style={styles.container}>
			<ScrollView style={styles.scrollView}>
				<View style={styles.listContainer}>
					<TouchableOpacity
						style={styles.settingItem}
						onPress={() => router.push('/settings/language')}
					>
						<View style={styles.settingInfo}>
							<Text style={styles.settingName}>{t('language')}</Text>
							<View style={styles.settingValueContainer}>
								<Text style={styles.settingValue}>{getLanguageDisplay()}</Text>
								<MaterialIcons name="chevron-right" size={24} color="#999" />
							</View>
						</View>
					</TouchableOpacity>

					<TouchableOpacity style={styles.settingItem}>
						<View style={styles.settingInfo}>
							<Text style={styles.settingName}>{t('appVersion')}</Text>
							<Text style={styles.settingValue}>
								{appVersion}
								{hasUpdate && <Text style={styles.updateBadge}> ({t('updateAvailable')})</Text>}
							</Text>
						</View>
					</TouchableOpacity>

					<TouchableOpacity
						style={styles.settingItem}
						onPress={handleCheckUpdate}
						disabled={checking || updating}
					>
						<View style={styles.settingInfo}>
							<Text style={styles.settingName}>
								{hasUpdate ? t('update') : t('checkForUpdates')}
							</Text>
							<View style={styles.settingValueContainer}>
								{checking || updating ? (
									<ActivityIndicator size="small" color="#999" style={{ marginRight: 10 }} />
								) : hasUpdate ? (
									<Text style={styles.updateAvailable}>{t('newVersionAvailable')}</Text>
								) : null}
								<MaterialIcons name="chevron-right" size={24} color="#999" />
							</View>
						</View>
					</TouchableOpacity>

					{hasUpdate && updating && (
						<TouchableOpacity style={styles.settingItem} onPress={() => Updates.reloadAsync()}>
							<View style={styles.settingInfo}>
								<Text style={styles.settingName}>{t('restart')}</Text>
								<View style={styles.settingValueContainer}>
									<MaterialIcons name="refresh" size={24} color="#999" />
								</View>
							</View>
						</TouchableOpacity>
					)}

					<TouchableOpacity
						style={styles.settingItem}
						onPress={() => router.push('/settings/privacy-policy')}
					>
						<View style={styles.settingInfo}>
							<Text style={styles.settingName}>{t('privacyPolicy')}</Text>
							<View style={styles.settingValueContainer}>
								<MaterialIcons name="chevron-right" size={24} color="#999" />
							</View>
						</View>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	scrollView: {
		flex: 1,
	},
	listContainer: {
		backgroundColor: '#f5f5f5',
	},
	settingItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: wp(4),
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
		backgroundColor: '#f5f5f5',
	},
	settingInfo: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	settingName: {
		fontSize: hp(1.8),
		fontWeight: '500',
		color: '#333',
	},
	settingValueContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	settingValue: {
		fontSize: hp(1.6),
		color: '#666',
		marginRight: wp(1),
	},
	updateBadge: {
		color: '#ff6b6b',
		fontSize: hp(1.4),
	},
	updateAvailable: {
		color: '#ff6b6b',
		fontSize: hp(1.4),
		marginRight: wp(2),
	},
});
