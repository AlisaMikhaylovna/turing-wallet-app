import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { hp, wp } from '@/lib/common';
import { formatContractId, formatDate } from '@/lib/util';
import type { NFTHistory } from '@/utils/sqlite';

interface NFTHistoryCardProps {
	history: NFTHistory;
}

export const NFTHistoryCard: React.FC<NFTHistoryCardProps> = ({ history }) => {
	const { t } = useTranslation();

	const handleCopyId = async () => {
		await Clipboard.setStringAsync(history.id);
		Toast.show({
			type: 'success',
			text1: t('transactionIdCopied'),
		});
	};

	const handleCopyAddress = async (address: string, type: string) => {
		await Clipboard.setStringAsync(address);
		Toast.show({
			type: 'success',
			text1: `${type} ${t('addressCopied')}`,
		});
	};

	return (
		<View style={styles.card}>
			<View style={styles.header}>
				<View style={styles.idRow}>
					<Text style={styles.label}>{t('txId')}: </Text>
					<TouchableOpacity onPress={handleCopyId} style={{ flex: 1 }}>
						<Text style={styles.value}>{formatContractId(history.id, 15)}</Text>
					</TouchableOpacity>
				</View>
				<Text style={styles.timestamp}>{formatDate(history.timestamp)}</Text>
			</View>
			<View style={styles.content}>
				<View style={styles.row}>
					<Text style={styles.label}>{t('from')}: </Text>
					<TouchableOpacity
						style={{ flex: 1, alignSelf: 'center' }}
						onPress={() => handleCopyAddress(history.send_address, t('sender'))}
					>
						<Text style={styles.value}>{history.send_address}</Text>
					</TouchableOpacity>
				</View>
				<View style={styles.row}>
					<Text style={styles.label}>{t('to')}: </Text>
					<TouchableOpacity
						style={{ flex: 1, alignSelf: 'center' }}
						onPress={() => handleCopyAddress(history.receive_address, t('receiver'))}
					>
						<Text style={styles.value}>{history.receive_address}</Text>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#f0f0f0',
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
		marginBottom: hp(2),
	},
	idRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: hp(0.5),
	},
	copyButton: {
		padding: wp(1),
		marginLeft: wp(2),
	},
	timestamp: {
		fontSize: hp(1.4),
		color: '#666',
	},
	content: {
		gap: hp(1),
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
});
