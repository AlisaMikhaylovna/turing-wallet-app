import { theme } from '@/lib/theme';
import { AntDesign } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

interface BackButtonProps {
	router: any;
	size?: number;
}

export const BackButton = ({ router, size = 26 }: BackButtonProps) => {
	return (
		<Pressable onPress={() => router.back()} style={styles.button}>
			<AntDesign name="arrowleft" size={size} color={theme.colors.text} />
		</Pressable>
	);
};
const styles = StyleSheet.create({
	button: {
		alignSelf: 'flex-start',
		padding: 5,
		borderRadius: theme.radius.sm,
		backgroundColor: 'rgba(0,0,0,0.07)',
	},
});
