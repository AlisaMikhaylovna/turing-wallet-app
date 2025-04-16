import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';

interface MnemonicInputProps {
	value: string;
	onChangeText: (text: string) => void;
	editable?: boolean;
	onClearAll?: () => void;
}

export const MnemonicInput = ({ value, onChangeText, editable = true }: MnemonicInputProps) => {
	const [focusedIndex, setFocusedIndex] = useState<number>(-1);
	const inputRefs = useRef<TextInput[]>([]);

	const paddedWords = Array(12).fill('');

	value
		.split(' ')
		.filter((word) => word)
		.slice(0, 12)
		.forEach((word, i) => {
			paddedWords[i] = word;
		});

	const handleChangeText = (text: string, index: number) => {
		const newWords = [...paddedWords];

		if (text.includes(' ')) {
			const pastedWords = text.trim().split(/\s+/).slice(0, 12);
			pastedWords.forEach((word, i) => {
				if (i < 12) {
					newWords[i] = word;
				}
			});
		} else {
			newWords[index] = text;
		}

		onChangeText(newWords.filter((w) => w).join(' '));
	};

	const handleFocus = (index: number) => {
		setFocusedIndex(index);
	};

	const handleBlur = () => {
		setFocusedIndex(-1);
	};

	const handleClearWord = (index: number) => {
		const newWords = paddedWords.map((word, i) => (i === index ? '' : word));
		onChangeText(newWords.filter((word) => word).join(' '));
	};

	return (
		<View style={styles.gridContainer}>
			{paddedWords.map((_, index) => (
				<View
					key={index}
					style={[styles.wordContainer, focusedIndex === index && styles.focusedContainer]}
				>
					<Text style={styles.wordIndex}>{index + 1}</Text>
					<TextInput
						ref={(ref) => {
							if (ref) inputRefs.current[index] = ref;
						}}
						style={[styles.input, !editable && styles.disabledInput]}
						value={paddedWords[index]}
						onChangeText={(text) => handleChangeText(text, index)}
						onFocus={() => handleFocus(index)}
						onBlur={handleBlur}
						editable={editable}
						selectionColor={theme.colors.text}
					/>
				</View>
			))}
		</View>
	);
};

const styles = StyleSheet.create({
	gridContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: hp(1),
		justifyContent: 'space-between',
		paddingHorizontal: wp(1),
	},
	wordContainer: {
		width: '31%',
		height: hp(5.5),
		borderWidth: 0.4,
		borderColor: theme.colors.text,
		borderRadius: theme.radius.lg,
		borderCurve: 'continuous',
		paddingLeft: wp(2),
		paddingRight: wp(1),
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
	focusedContainer: {
		borderColor: theme.colors.primary,
		borderWidth: 1,
	},
	wordIndex: {
		fontSize: hp(1.8),
		color: theme.colors.text + '80',
		marginRight: wp(1),
		minWidth: wp(4),
		textAlign: 'right',
		lineHeight: hp(2.2),
		textAlignVertical: 'center',
		paddingTop: hp(0.1),
	},
	input: {
		flex: 1,
		fontSize: hp(1.8),
		color: theme.colors.text,
		padding: 0,
		marginLeft: 0,
		lineHeight: hp(2.2),
		textAlign: 'left',
		textAlignVertical: 'center',
		height: '100%',
	},
	disabledInput: {
		opacity: 0.5,
	},
	clearButton: {
		padding: wp(1),
		justifyContent: 'center',
		alignItems: 'center',
	},
});
