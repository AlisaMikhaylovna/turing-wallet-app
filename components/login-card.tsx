import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, StyleProp, ViewStyle } from 'react-native';

import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';

interface LoginCardProps {
	title: string;
	description: string;
	onPress: () => void;
	style?: StyleProp<ViewStyle>;
}

export const LoginCard = ({ title, description, onPress, style }: LoginCardProps) => {
	return (
		<TouchableOpacity 
			style={[styles.card, style]} 
			onPress={onPress} 
			activeOpacity={0.7}
		>
			<View style={styles.content}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.description}>{description}</Text>
			</View>
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: 'white',
		borderRadius: theme.radius.lg,
		marginBottom: hp(2),
		padding: wp(5),
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	content: {
		gap: hp(1),
	},
	title: {
		fontSize: hp(2.2),
		fontWeight: '600',
		color: theme.colors.text,
	},
	description: {
		fontSize: hp(1.5),
		color: theme.colors.textLight,
		lineHeight: hp(2.2),
	},
});
