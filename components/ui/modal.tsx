import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Modal as RNModal, StyleSheet, TouchableOpacity, View } from 'react-native';

import { wp } from '@/lib/common';

interface ModalProps {
	visible: boolean;
	onClose: () => void;
	children: React.ReactNode;
}

export const Modal = ({ visible, onClose, children }: ModalProps) => {
	if (!visible) return null;
	
	return (
		<RNModal 
			visible={visible} 
			transparent 
			animationType="fade" 
			onRequestClose={onClose}
		>
			<View style={styles.overlay}>
				<TouchableOpacity 
					style={styles.overlayTouch} 
					activeOpacity={1} 
					onPress={onClose}
				>
					<View 
						style={styles.content} 
						onStartShouldSetResponder={() => true}
					>
						<TouchableOpacity style={styles.closeButton} onPress={onClose}>
							<MaterialIcons name="close" size={24} color="#666" />
						</TouchableOpacity>
						{children}
					</View>
				</TouchableOpacity>
			</View>
		</RNModal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	overlayTouch: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	content: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: wp(5),
		width: wp(80),
		maxWidth: 400,
		position: 'relative',
	},
	closeButton: {
		position: 'absolute',
		right: wp(2),
		top: wp(2),
		padding: wp(1),
		zIndex: 1,
	},
});
