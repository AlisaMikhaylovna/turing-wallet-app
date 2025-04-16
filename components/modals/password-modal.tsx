import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
	ActivityIndicator,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Modal } from '@/components/ui/modal';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';

interface PasswordModalProps {
	visible: boolean;
	title: string;
	message?: string;
	onSubmit: (password: string) => Promise<void>;
	onCancel: () => void;
	loading?: boolean;
}

export const PasswordModal = ({
	visible,
	title,
	message,
	onSubmit,
	onCancel,
	loading = false,
}: PasswordModalProps) => {
	const { t } = useTranslation();
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | undefined>();

	const handleSubmit = async () => {
		if (!password) {
			setError(t('passwordRequired'));
			return;
		}

		try {
			await onSubmit(password);

			setPassword('');
			setError(undefined);
		} catch (err) {
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError(t('anErrorOccurred'));
			}
		}
	};

	const handleCancel = () => {
		setPassword('');
		setError(undefined);
		onCancel();
	};

	return (
		<Modal visible={visible} onClose={handleCancel}>
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				{message && <Text style={styles.message}>{message}</Text>}

				<View style={styles.inputWrapper}>
					<TextInput
						style={styles.input}
						value={password}
						onChangeText={(text) => {
							setPassword(text);
							if (error) setError(undefined);
						}}
						placeholder={t('enterYourPassword')}
						secureTextEntry
						autoFocus={visible}
					/>
					{password.length > 0 && (
						<TouchableOpacity
							style={styles.clearButton}
							onPress={() => {
								setPassword('');
								setError(undefined);
							}}
						>
							<MaterialIcons name="close" size={20} color="#666" />
						</TouchableOpacity>
					)}
				</View>

				{error && <Text style={styles.errorText}>{error}</Text>}

				<View style={styles.buttonContainer}>
					<TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
						<Text style={styles.cancelButtonText}>{t('cancel')}</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.confirmButton, loading && styles.buttonDisabled]}
						onPress={handleSubmit}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator size="small" color="#fff" />
						) : (
							<Text style={styles.confirmButtonText}>{t('confirm')}</Text>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		width: '100%',
	},
	title: {
		fontSize: hp(2),
		fontWeight: '600',
		marginBottom: hp(2),
		textAlign: 'center',
	},
	message: {
		fontSize: hp(1.6),
		color: '#666',
		textAlign: 'center',
		marginBottom: hp(2),
	},
	inputWrapper: {
		width: '100%',
		position: 'relative',
		marginBottom: hp(1),
	},
	input: {
		width: '100%',
		height: hp(5),
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingHorizontal: wp(3),
		paddingRight: wp(10),
		fontSize: hp(1.6),
		backgroundColor: '#f8f8f8',
	},
	errorText: {
		color: '#ff4444',
		fontSize: hp(1.4),
		marginBottom: hp(2),
		alignSelf: 'flex-start',
	},
	clearButton: {
		position: 'absolute',
		right: wp(2),
		height: hp(5),
		justifyContent: 'center',
		paddingHorizontal: wp(1),
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		width: '100%',
		marginTop: hp(1),
		gap: wp(3),
	},
	cancelButton: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		paddingVertical: hp(1.5),
		borderRadius: 8,
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	confirmButton: {
		flex: 1,
		backgroundColor: theme.colors.primary,
		paddingVertical: hp(1.5),
		borderRadius: 8,
		alignItems: 'center',
	},
	buttonDisabled: {
		opacity: 0.6,
	},
	cancelButtonText: {
		color: '#333',
		fontSize: hp(1.6),
		fontWeight: '500',
	},
	confirmButtonText: {
		color: '#fff',
		fontSize: hp(1.6),
		fontWeight: '500',
	},
});
