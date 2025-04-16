import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAccount } from '@/hooks/useAccount';
import { hp } from '@/lib/common';
import { theme } from '@/lib/theme';

interface AvatarProps {
	address: string;
	onPress: () => void;
}

export const Avatar = ({ address, onPress }: AvatarProps) => {
	const { getCurrentAccountName } = useAccount();
	const username = getCurrentAccountName();

	const initial = useMemo(() => {
		if (username && username.trim().length > 0 && !username.trim().startsWith('Wallet')) {
			return username.trim()[0].toUpperCase();
		}

		const charCode = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
		const letterIndex = charCode % 26;
		return String.fromCharCode(65 + letterIndex);
	}, [address, username]);

	return (
		<TouchableOpacity onPress={onPress}>
			<View style={styles.container}>
				<Text style={styles.initial}>{initial}</Text>
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	container: {
		width: hp(4),
		height: hp(4),
		borderRadius: hp(2),
		backgroundColor: theme.colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
	},
	initial: {
		color: 'white',
		fontSize: hp(2),
		fontWeight: '600',
	},
});
