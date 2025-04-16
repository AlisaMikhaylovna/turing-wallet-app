import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, TouchableWithoutFeedback } from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { hp, wp } from '@/lib/common';
import { formatBalance, formatContractId } from '@/lib/util';
import type { FT } from '@/utils/sqlite';

interface OwnedTokenCardProps {
	token: FT;
	onHistoryPress: (token: FT) => void;
	onTransferPress: (token: FT) => void;
	onDeletePress: (token: FT) => void;
	onLongPress: (token: FT) => void;
}

export const OwnedTokenCard = ({
	token,
	onHistoryPress,
	onTransferPress,
	onDeletePress,
	onLongPress,
}: OwnedTokenCardProps) => {
	const { t } = useTranslation();

	const handleCopyId = async () => {
		await Clipboard.setStringAsync(token.id);
		Toast.show({
			type: 'success',
			text1: t('contractAddressCopied'),
		});
	};

	return (
		<TouchableWithoutFeedback onLongPress={() => onLongPress(token)}>
			<View style={[styles.card, token.is_pin && styles.pinnedCard]}>
				<View style={styles.topContent}>
					<View style={styles.leftContent}>
						<Text style={styles.title}>{token.name}</Text>
						<View style={styles.actions}>
							<TouchableOpacity style={styles.actionButton} onPress={() => onHistoryPress(token)}>
								<MaterialIcons name="history" size={22} color="#666" />
							</TouchableOpacity>
							<TouchableOpacity style={styles.actionButton} onPress={() => onTransferPress(token)}>
								<MaterialIcons name="send" size={22} color="#666" />
							</TouchableOpacity>
							<TouchableOpacity style={styles.actionButton} onPress={() => onDeletePress(token)}>
								<MaterialIcons name="visibility-off" size={22} color="#666" />
							</TouchableOpacity>
						</View>
					</View>
					<View style={styles.rightContent}>
						<Text style={styles.amount}>{formatBalance(token.amount * 1e-6)}</Text>
						<View style={styles.valueContainer}>
							<TouchableOpacity onPress={handleCopyId} style={{ alignSelf: 'center' }}>
								<Text style={styles.contractId}>{formatContractId(token.id)}</Text>
							</TouchableOpacity>
							
						</View>
						<Text style={styles.symbol}>
							{t('symbol')}: {token.symbol}
						</Text>
					</View>
				</View>
			</View>
		</TouchableWithoutFeedback>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#f5f5f5',
		padding: wp(3),
		marginBottom: hp(0.5),
		width: '100%',
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
		marginTop: hp(0.5),
		position: 'relative',
	},
	pinnedCard: {
		backgroundColor: '#f0f8ff',
	},
	topContent: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	leftContent: {
		flex: 1,
		marginRight: wp(3),
	},
	title: {
		fontSize: hp(2.2),
		fontWeight: '600',
		marginBottom: hp(1.5),
	},
	actions: {
		flexDirection: 'row',
		gap: wp(1),
	},
	rightContent: {
		alignItems: 'flex-end',
		gap: hp(1.2),
	},
	valueContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	contractId: {
		fontSize: hp(1.3),
		color: '#666',
	},
	copyButton: {
		padding: wp(1),
		marginLeft: wp(2),
	},
	amount: {
		fontSize: hp(1.8),
		fontWeight: '500',
	},
	symbol: {
		fontSize: hp(1.3),
		color: '#666',
	},
	actionButton: {
		padding: wp(1),
	},
});