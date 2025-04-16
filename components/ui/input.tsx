import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
	StyleProp,
	StyleSheet,
	TextInput,
	TextInputProps,
	TouchableOpacity,
	View,
	ViewStyle,
} from 'react-native';

import { hp } from '@/lib/common';
import { theme } from '@/lib/theme';

interface InputProps extends TextInputProps {
	icon?: React.ReactNode;
	inputRef?: React.RefObject<TextInput>;
	containerStyle?: StyleProp<ViewStyle>;
	onChangeText?: (text: string) => void;
	value?: string;
}

export const Input = (props: InputProps) => {
	const handleClear = () => {
		props.onChangeText?.('');
	};

	return (
		<View style={[styles.container, props.containerStyle && props.containerStyle]}>
			{props.icon && props.icon}
			<TextInput
				style={styles.input}
				placeholderTextColor={theme.colors.textLight}
				ref={props.inputRef && props.inputRef}
				{...props}
			/>
			{props.value && props.value.length > 0 && (
				<TouchableOpacity style={styles.clearButton} onPress={handleClear}>
					<MaterialIcons name="clear" size={20} color="#999" />
				</TouchableOpacity>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		height: hp(7.2),
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 0.4,
		borderColor: theme.colors.text,
		borderRadius: theme.radius.xxl,
		borderCurve: 'continuous',
		paddingHorizontal: 18,
		gap: 12,
	},
	input: {
		flex: 1,
		color: theme.colors.text,
	},
	clearButton: {
		padding: 4,
	},
});
