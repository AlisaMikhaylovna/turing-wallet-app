import React, { useState, useCallback, useEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	TextInput,
	FlatList,
	ActivityIndicator,
	ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import useMultiSigTransaction, { MultiSigTransaction } from '@/hooks/useMultiSigTransaction';
import { useAccount } from '@/hooks/useAccount';
import { formatBalance, formatContractId } from '@/lib/util';
import { useFtTransaction } from '@/hooks/useFtTransaction';
import { ConfirmModal } from '@/components/modals/confirm-modal';
import { PasswordModal } from '@/components/modals/password-modal';

enum TabType {
	Completed = 'Completed',
	WaitBroadcasted = 'Wait Broadcast',
	WaitOtherSign = 'Wait Others',
	WaitSigned = 'Wait Sign',
}

export default function MultiSigTransactionsPage() {
	const { t } = useTranslation();
	const [searchText, setSearchText] = useState('');
	const [activeTab, setActiveTab] = useState<TabType>(TabType.Completed);
	const { getCurrentAccountTbcPubKey } = useAccount();
	const {
		completedTxs,
		waitBroadcastedTxs,
		waitOtherSignTxs,
		waitSignedTxs,
		currentPage,
		isLoading,
		fetchTransactions,
		totalCount,
	} = useMultiSigTransaction();
	const { finishMultiSigTransaction, signMultiSigTransaction, withdrawMultiSigTransaction } =
		useFtTransaction();
	const [passwordModalVisible, setPasswordModalVisible] = useState(false);
	const [passwordLoading, setPasswordLoading] = useState(false);
	const [selectedTransaction, setSelectedTransaction] = useState<MultiSigTransaction | null>(null);
	const [confirmModalVisible, setConfirmModalVisible] = useState(false);
	const [confirmAction, setConfirmAction] = useState<{
		type: 'broadcast' | 'withdraw';
		transaction: MultiSigTransaction;
	} | null>(null);

	const pubKey = getCurrentAccountTbcPubKey();

	useEffect(() => {
		if (pubKey) {
			fetchTransactions(pubKey, 0);
		}
	}, [pubKey]);

	const handleLoadMore = useCallback(() => {
		const currentTotal =
			completedTxs.length +
			waitBroadcastedTxs.length +
			waitOtherSignTxs.length +
			waitSignedTxs.length;

		if (!isLoading && pubKey && currentTotal < totalCount) {
			fetchTransactions(pubKey, currentPage + 1);
		}
	}, [
		isLoading,
		pubKey,
		currentPage,
		completedTxs.length,
		waitBroadcastedTxs.length,
		waitOtherSignTxs.length,
		waitSignedTxs.length,
		totalCount,
	]);

	const handleConfirmAction = async () => {
		if (!confirmAction) return;

		try {
			if (confirmAction.type === 'broadcast') {
				await finishMultiSigTransaction(confirmAction.transaction);
				Toast.show({
					type: 'success',
					text1: 'Success',
					text2: 'Transaction broadcasted successfully',
					position: 'top',
					visibilityTime: 2000,
				});
			} else {
				await withdrawMultiSigTransaction(confirmAction.transaction.unsigned_txid);
				Toast.show({
					type: 'success',
					text1: 'Success',
					text2: 'Transaction withdrawn successfully',
					position: 'top',
					visibilityTime: 2000,
				});
			}

			if (pubKey) {
				fetchTransactions(pubKey, 0);
			}
		} catch (error) {
			Toast.show({
				type: 'error',
				text1: 'Error',
				text2:
					error instanceof Error ? error.message : `Failed to ${confirmAction.type} transaction`,
				position: 'top',
				visibilityTime: 3000,
			});
		} finally {
			setConfirmModalVisible(false);
			setConfirmAction(null);
		}
	};

	const handleBroadcast = (transaction: MultiSigTransaction) => {
		setConfirmAction({ type: 'broadcast', transaction });
		setConfirmModalVisible(true);
	};

	const handleWithdraw = (transaction: MultiSigTransaction) => {
		setConfirmAction({ type: 'withdraw', transaction });
		setConfirmModalVisible(true);
	};

	const handleSign = async (transaction: MultiSigTransaction) => {
		setSelectedTransaction(transaction);
		setPasswordModalVisible(true);
	};

	const handlePasswordSubmit = async (password: string) => {
		try {
			setPasswordLoading(true);
			if (selectedTransaction) {
				await signMultiSigTransaction(selectedTransaction, password);
				Toast.show({
					type: 'success',
					text1: 'Success',
					text2: 'Transaction signed successfully',
					position: 'top',
					visibilityTime: 2000,
				});

				if (pubKey) {
					fetchTransactions(pubKey, 0);
				}
			}
			setPasswordModalVisible(false);
			setSelectedTransaction(null);
		} catch (error) {
			throw error;
		} finally {
			setPasswordLoading(false);
		}
	};

	const handleCopyAddress = async (address: string) => {
		await Clipboard.setStringAsync(address);
		Toast.show({
			type: 'success',
			text1: t('addressCopied'),
			position: 'top',
			visibilityTime: 2000,
		});
	};

	const handleCopyTxId = async (txid: string) => {
		await Clipboard.setStringAsync(txid);
		Toast.show({
			type: 'success',
			text1: t('txIdCopied'),
			position: 'top',
			visibilityTime: 2000,
		});
	};

	const renderTransaction = ({ item }) => {
		const renderAmount = () => {
			const amount = formatBalance(Number(item.balance * Math.pow(10, -6)));
			const suffix = item.ft_contract_id ? 'Token' : 'TBC';
			return `${amount} ${suffix}`;
		};

		if (activeTab === TabType.Completed) {
			return (
				<View style={styles.card}>
					<View style={styles.header}>
						<View style={styles.idRow}>
							<Text style={styles.label}>TxID: </Text>
							<TouchableOpacity onPress={() => handleCopyTxId(item.txid)} style={{ flex: 1 }}>
								<Text style={styles.value}>{formatContractId(item.txid,15)}</Text>
							</TouchableOpacity>
						</View>
					</View>
					<View style={styles.content}>
						<View style={styles.row}>
							<Text style={styles.label}>From: </Text>
							<TouchableOpacity
								onPress={() => handleCopyAddress(item.multi_sig_address)}
								style={{ flex: 1 }}
							>
								<Text style={styles.value}>{item.multi_sig_address}</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.row}>
							<Text style={styles.label}>To: </Text>
							<TouchableOpacity
								onPress={() => handleCopyAddress(item.json_info.receiver_addresses.join(', '))}
								style={{ flex: 1 }}
							>
								<Text style={styles.value}>{item.json_info.receiver_addresses.join(', ')}</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.row}>
							<Text style={styles.label}>Amount: </Text>
							<Text style={[styles.value, styles.amountText]}>{renderAmount()}</Text>
						</View>
					</View>
				</View>
			);
		}

		if (
			activeTab === TabType.WaitBroadcasted ||
			activeTab === TabType.WaitOtherSign ||
			activeTab === TabType.WaitSigned
		) {
			return (
				<View style={styles.card}>
					<TouchableOpacity style={styles.deleteButton} onPress={() => handleWithdraw(item)}>
						<MaterialIcons name="close" size={20} color="#333" />
					</TouchableOpacity>
					<View style={[styles.content, styles.contentWithDelete]}>
						<View style={styles.row}>
							<Text style={styles.label}>From: </Text>
							<TouchableOpacity
								onPress={() => handleCopyAddress(item.multi_sig_address)}
								style={{ flex: 1 }}
							>
								<Text style={styles.value}>{item.multi_sig_address}</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.row}>
							<Text style={styles.label}>To: </Text>
							<TouchableOpacity
								onPress={() => handleCopyAddress(item.json_info.receiver_addresses.join(', '))}
								style={{ flex: 1 }}
							>
								<Text style={styles.value}>{item.json_info.receiver_addresses.join(', ')}</Text>
							</TouchableOpacity>
						</View>
						<View style={styles.row}>
							<Text style={styles.label}>Amount: </Text>
							<Text style={[styles.value, styles.amountText]}>{renderAmount()}</Text>
						</View>
					</View>
					{activeTab === TabType.WaitBroadcasted && (
						<TouchableOpacity style={styles.broadcastButton} onPress={() => handleBroadcast(item)}>
							<Text style={styles.broadcastButtonText}>Broadcast</Text>
						</TouchableOpacity>
					)}
					{activeTab === TabType.WaitSigned && (
						<TouchableOpacity style={styles.signButton} onPress={() => handleSign(item)}>
							<Text style={styles.signButtonText}>Sign</Text>
						</TouchableOpacity>
					)}
				</View>
			);
		}

		return (
			<View style={styles.card}>
				<View style={styles.content}>
					<View style={styles.row}>
						<Text style={styles.label}>From: </Text>
						<TouchableOpacity
							onPress={() => handleCopyAddress(item.multi_sig_address)}
							style={{ flex: 1 }}
						>
							<Text style={styles.value}>{item.multi_sig_address}</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.row}>
						<Text style={styles.label}>To: </Text>
						<TouchableOpacity
							onPress={() => handleCopyAddress(item.json_info.receiver_addresses.join(', '))}
							style={{ flex: 1 }}
						>
							<Text style={styles.value}>{item.json_info.receiver_addresses.join(', ')}</Text>
						</TouchableOpacity>
					</View>
					<View style={styles.row}>
						<Text style={styles.label}>Amount: </Text>
						<Text style={[styles.value, styles.amountText]}>{renderAmount()}</Text>
					</View>
				</View>
			</View>
		);
	};

	const getActiveTransactions = () => {
		let transactions: MultiSigTransaction[] = [];
		switch (activeTab) {
			case TabType.Completed:
				transactions = completedTxs;
				break;
			case TabType.WaitBroadcasted:
				transactions = waitBroadcastedTxs;
				break;
			case TabType.WaitOtherSign:
				transactions = waitOtherSignTxs;
				break;
			case TabType.WaitSigned:
				transactions = waitSignedTxs;
				break;
			default:
				transactions = [];
		}

		if (searchText) {
			return transactions.filter((tx) => {
				if (tx.multi_sig_address.toLowerCase().includes(searchText.toLowerCase())) {
					return true;
				}
				if (tx.json_info?.receiver_addresses) {
					return tx.json_info.receiver_addresses.some((addr) =>
						addr.toLowerCase().includes(searchText.toLowerCase()),
					);
				}
				return false;
			});
		}

		return transactions;
	};

	return (
		<ScreenWrapper bg="#f5f5f5" disableTopPadding>
			<View style={styles.container}>
				<View style={styles.tabsContainer}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false}>
						<TouchableOpacity
							style={[styles.tab, activeTab === TabType.Completed && styles.activeTab]}
							onPress={() => setActiveTab(TabType.Completed)}
						>
							<Text
								style={[styles.tabText, activeTab === TabType.Completed && styles.activeTabText]}
							>
								{t('completed')}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.tab, activeTab === TabType.WaitBroadcasted && styles.activeTab]}
							onPress={() => setActiveTab(TabType.WaitBroadcasted)}
						>
							<Text
								style={[
									styles.tabText,
									activeTab === TabType.WaitBroadcasted && styles.activeTabText,
								]}
							>
								{t('waitBroadcast')}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.tab, activeTab === TabType.WaitOtherSign && styles.activeTab]}
							onPress={() => setActiveTab(TabType.WaitOtherSign)}
						>
							<Text
								style={[
									styles.tabText,
									activeTab === TabType.WaitOtherSign && styles.activeTabText,
								]}
							>
								{t('waitOtherSign')}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.tab, activeTab === TabType.WaitSigned && styles.activeTab]}
							onPress={() => setActiveTab(TabType.WaitSigned)}
						>
							<Text
								style={[styles.tabText, activeTab === TabType.WaitSigned && styles.activeTabText]}
							>
								{t('waitSigned')}
							</Text>
						</TouchableOpacity>
					</ScrollView>
				</View>

				<View style={styles.searchContainer}>
					<View style={styles.searchWrapper}>
						<MaterialIcons name="search" size={24} color="#666" style={styles.searchIcon} />
						<TextInput
							style={styles.searchInput}
							placeholder={t('searchTransactions')}
							value={searchText}
							onChangeText={setSearchText}
						/>
						{searchText.length > 0 && (
							<TouchableOpacity style={styles.clearButton} onPress={() => setSearchText('')}>
								<MaterialIcons name="close" size={20} color="#666" />
							</TouchableOpacity>
						)}
					</View>
					<TouchableOpacity
						style={styles.actionButton}
						onPress={() => router.push('/multiSigs/initiate-multiSig-transaction')}
					>
						<MaterialIcons name="add" size={24} color={theme.colors.primary} />
					</TouchableOpacity>
				</View>

				<FlatList
					data={getActiveTransactions()}
					renderItem={renderTransaction}
					keyExtractor={(item, index) => {
						const baseKey = item.txid || item.unsigned_txid || item.multi_sig_address;
						return `${activeTab}-${baseKey}-${index}`;
					}}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.5}
					style={styles.scrollView}
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.scrollContent}
					ListFooterComponent={
						isLoading ? (
							<ActivityIndicator style={styles.loader} color={theme.colors.primary} />
						) : null
					}
					ListEmptyComponent={
						!isLoading ? (
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>{t('noTransactionsFound')}</Text>
							</View>
						) : null
					}
				/>
			</View>

			<PasswordModal
				visible={passwordModalVisible}
				title={t('signTransaction')}
				message={t('enterPasswordToSign')}
				onSubmit={handlePasswordSubmit}
				onCancel={() => setPasswordModalVisible(false)}
				loading={passwordLoading}
			/>

			<ConfirmModal
				visible={confirmModalVisible}
				title={confirmAction?.type === 'broadcast' ? t('confirmBroadcast') : t('confirmWithdraw')}
				message={
					confirmAction?.type === 'broadcast'
						? t('confirmBroadcastMessage')
						: t('confirmWithdrawMessage')
				}
				onConfirm={handleConfirmAction}
				onCancel={() => {
					setConfirmModalVisible(false);
					setConfirmAction(null);
				}}
			/>
		</ScreenWrapper>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	tabsContainer: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
		backgroundColor: '#f5f5f5',
	},
	tab: {
		paddingVertical: hp(1.5),
		paddingHorizontal: wp(4),
		alignItems: 'center',
	},
	activeTab: {
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
	actionButton: {
		padding: 4,
	},
	clearButton: {
		position: 'absolute',
		right: wp(2),
		height: '100%',
		justifyContent: 'center',
		padding: wp(1),
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		paddingBottom: hp(2),
	},
	card: {
		backgroundColor: '#e8e8e8',
		borderRadius: 12,
		padding: wp(4),
		marginBottom: hp(2),
		marginHorizontal: wp(2),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	header: {
		marginBottom: hp(0.5),
	},
	idRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: hp(0.5),
	},
	content: {
		gap: hp(1.2),
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	label: {
		fontSize: hp(1.4),
		color: '#666',
		width: wp(15),
	},
	value: {
		fontSize: hp(1.4),
		color: '#333',
		flex: 1,
	},
	amountText: {
		color: theme.colors.primary,
		fontSize: hp(1.6),
	},
	copyButton: {
		padding: wp(1),
		marginLeft: wp(2),
	},
	loader: {
		marginVertical: hp(2),
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: hp(4),
	},
	emptyText: {
		fontSize: hp(1.8),
		color: '#999',
	},
	broadcastButton: {
		backgroundColor: theme.colors.primary,
		padding: wp(2),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(3),
		alignSelf: 'center',
		width: wp(60),
	},
	broadcastButtonText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '500',
	},
	signButton: {
		backgroundColor: theme.colors.primary,
		padding: wp(2),
		borderRadius: 8,
		alignItems: 'center',
		marginTop: hp(3),
		alignSelf: 'center',
		width: wp(60),
	},
	signButtonText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '500',
	},
	deleteButton: {
		position: 'absolute',
		top: wp(2),
		right: wp(2),
		padding: wp(1),
		zIndex: 1,
	},
	contentWithDelete: {
		marginTop: hp(3),
	},
});
