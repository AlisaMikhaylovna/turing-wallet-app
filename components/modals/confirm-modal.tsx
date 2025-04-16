import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Modal } from '@/components/ui/modal';
import { hp, wp } from '@/lib/common';

interface ConfirmModalProps {
	visible: boolean;
	title: string;
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export const ConfirmModal = ({
	visible,
	title,
	message,
	onConfirm,
	onCancel,
}: ConfirmModalProps) => {
	const { t } = useTranslation();
	
	return (
		<Modal visible={visible} onClose={onCancel}>
			<View style={styles.container}>
				<Text style={styles.title}>{title}</Text>
				<Text style={styles.message}>{message}</Text>
				<View style={styles.buttonContainer}>
					<TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
						<Text style={[styles.buttonText, styles.cancelText]}>{t('cancel')}</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={onConfirm}>
						<Text style={[styles.buttonText, styles.confirmText]}>{t('confirm')}</Text>
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		padding: wp(4),
	},
	title: {
		fontSize: hp(2),
		fontWeight: '600',
		marginBottom: hp(2),
	},
	message: {
		fontSize: hp(1.6),
		color: '#666',
		textAlign: 'center',
		marginBottom: hp(3),
	},
	buttonContainer: {
		flexDirection: 'row',
		gap: wp(3),
	},
	button: {
		paddingHorizontal: wp(6),
		paddingVertical: hp(1),
		borderRadius: 8,
		minWidth: wp(20),
		alignItems: 'center',
	},
	cancelButton: {
		backgroundColor: '#f5f5f5',
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	confirmButton: {
		backgroundColor: '#ff4444',
	},
	buttonText: {
		fontSize: hp(1.6),
		fontWeight: '500',
	},
	cancelText: {
		color: '#333',
	},
	confirmText: {
		color: '#fff',
	},
});
