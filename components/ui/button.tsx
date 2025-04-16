import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { hp } from '@/lib/common';
import { theme } from '@/lib/theme';

interface ButtonProps {
	buttonStyle?: StyleProp<ViewStyle>;
	textStyle?: StyleProp<TextStyle>;
	title?: string;
	onPress?: () => void;
	loading?: boolean;
	hasShadow?: boolean;
	disabled?: boolean;
	style?: StyleProp<ViewStyle>;
}

export const Button = ({
	buttonStyle,
	textStyle,
	title = '',
	onPress = () => {},
	loading = false,
	hasShadow = true,
	disabled = false,
	style,
}: ButtonProps) => {
	const shadowStyle = {
		shadowColor: theme.colors.dark,
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4,
	};
	
	const isDisabled = loading || disabled;
	
	return (
		<Pressable 
			onPress={onPress} 
			style={[
				styles.button, 
				buttonStyle, 
				hasShadow && shadowStyle,
				isDisabled && styles.buttonDisabled,
				style
			]}
			disabled={isDisabled}
		>
			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator color="white" size="small" />
					<Text style={[styles.text, textStyle]}>{title}</Text>
				</View>
			) : (
				<Text style={[styles.text, textStyle]}>{title}</Text>
			)}
		</Pressable>
	);
};

const styles = StyleSheet.create({
	button: {
		backgroundColor: theme.colors.primary,
		height: hp(6.6),
		justifyContent: 'center',
		alignItems: 'center',
		borderCurve: 'continuous',
		borderRadius: theme.radius.xl,
	},
	buttonDisabled: {
		opacity: 0.7,
		backgroundColor: '#999',
	},
	text: {
		fontSize: hp(2.5),
		color: 'white',
		fontWeight: '700',
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
	},
});
