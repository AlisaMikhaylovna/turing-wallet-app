import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { AccountType } from '@/types';

export default function ScanPage() {
	const { t } = useTranslation();
	const router = useRouter();
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const [scanned, setScanned] = useState(false);
	const { getCurrentAccountType } = useAccount();

	useEffect(() => {
		(async () => {
			const { status } = await BarCodeScanner.requestPermissionsAsync();
			setHasPermission(status === 'granted');
		})();
	}, []);

	const areAccountTypesCompatible = (
		senderType: AccountType,
		receiverType: AccountType,
	): boolean => {
		if (
			(senderType === AccountType.TBC || senderType === AccountType.TAPROOT_LEGACY) &&
			(receiverType === AccountType.TBC || receiverType === AccountType.TAPROOT_LEGACY)
		) {
			return true;
		}

		if (
			(senderType === AccountType.TAPROOT || senderType === AccountType.LEGACY) &&
			(receiverType === AccountType.TAPROOT || receiverType === AccountType.LEGACY)
		) {
			return true;
		}

		return false;
	};

	const handleBarCodeScanned = ({ type, data }) => {
		if (scanned) return;
		setScanned(true);

		try {
			let parsedData;
			try {
				parsedData = JSON.parse(data);
			} catch (e) {
				if (isValidAddress(data)) {
					router.replace({
						pathname: '/(tabs)/home/send',
						params: { scannedAddress: data },
					});
					return;
				} else {
					throw new Error('Invalid QR code format');
				}
			}

			if (!parsedData.address || !parsedData.type) {
				throw new Error('Invalid QR code data');
			}

			if (!isValidAddress(parsedData.address)) {
				throw new Error('Invalid address format');
			}

			const currentAccountType = getCurrentAccountType();
			if (!areAccountTypesCompatible(currentAccountType, parsedData.type)) {
				Toast.show({
					type: 'error',
					text1: t('incompatibleAccountType'),
					position: 'top',
					visibilityTime: 3000,
				});
				setScanned(false);
				return;
			}

			router.replace({
				pathname: '/(tabs)/home/send',
				params: { scannedAddress: parsedData.address },
			});
		} catch (error) {
			//console.error('Error processing QR code:', error);
			Toast.show({
				type: 'error',
				text1: t('invalidQRCode'),
				position: 'top',
				visibilityTime: 2000,
			});
			setScanned(false);
		}
	};

	const isValidAddress = (address: string): boolean => {
		return /^[a-zA-Z0-9]{30,}$/.test(address);
	};

	const handleClose = () => {
		router.back();
	};

	const pickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (status !== 'granted') {
			Toast.show({
				type: 'error',
				text1: t('galleryPermissionDenied'),
				position: 'top',
				visibilityTime: 2000,
			});
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: false,
			quality: 1,
		});

		if (!result.canceled && result.assets && result.assets.length > 0) {
			try {
				const scannedResults = await BarCodeScanner.scanFromURLAsync(result.assets[0].uri);

				if (scannedResults.length > 0) {
					const { data } = scannedResults[0];
					handleBarCodeScanned({ type: 'QR', data });
				} else {
					Toast.show({
						type: 'error',
						text1: t('noQRCodeFound'),
						position: 'top',
						visibilityTime: 2000,
					});
				}
			} catch (error) {
				//console.error('Error scanning image:', error);
				Toast.show({
					type: 'error',
					text1: t('failedToScanImage'),
					position: 'top',
					visibilityTime: 2000,
				});
			}
		}
	};

	if (hasPermission === null) {
		return (
			<ScreenWrapper bg="black">
				<View style={styles.container}>
					<Text style={styles.text}>{t('requestingCameraPermission')}</Text>
				</View>
			</ScreenWrapper>
		);
	}

	if (hasPermission === false) {
		return (
			<ScreenWrapper bg="black">
				<View style={styles.container}>
					<Text style={styles.text}>{t('noCameraPermission')}</Text>
					<TouchableOpacity style={styles.button} onPress={handleClose}>
						<Text style={styles.buttonText}>{t('close')}</Text>
					</TouchableOpacity>
				</View>
			</ScreenWrapper>
		);
	}

	return (
		<ScreenWrapper bg="black" disableTopPadding>
			<View style={styles.container}>
				<BarCodeScanner
					onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
					style={StyleSheet.absoluteFillObject}
					barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
				/>

				<View style={styles.overlay}>
					<View style={styles.scanAreaContainer}>
						<View style={styles.scanArea} />
						<Text style={styles.scanText}>{t('alignQRCodeWithinFrame')}</Text>
					</View>
				</View>

				<View style={styles.header}>
					<TouchableOpacity style={styles.closeButton} onPress={handleClose}>
						<MaterialIcons name="close" size={24} color="white" />
					</TouchableOpacity>

					<TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
						<Ionicons name="images-outline" size={24} color="white" />
					</TouchableOpacity>
				</View>

				{scanned && (
					<View style={styles.footer}>
						<TouchableOpacity style={styles.button} onPress={() => setScanned(false)}>
							<Text style={styles.buttonText}>{t('scanAgain')}</Text>
						</TouchableOpacity>
					</View>
				)}

				<Toast />
			</View>
		</ScreenWrapper>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'black',
	},
	text: {
		color: 'white',
		fontSize: hp(2),
		textAlign: 'center',
	},
	overlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'rgba(0,0,0,0.3)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	scanAreaContainer: {
		alignItems: 'center',
	},
	scanArea: {
		width: wp(80),
		height: wp(80),
		borderWidth: 2,
		borderColor: theme.colors.primary,
		backgroundColor: 'transparent',
	},
	scanText: {
		color: 'white',
		fontSize: hp(1.8),
		marginTop: hp(2),
		textAlign: 'center',
		maxWidth: wp(80),
	},
	header: {
		position: 'absolute',
		top: hp(3),
		left: 0,
		right: 0,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: wp(4),
	},
	closeButton: {
		padding: wp(2),
	},
	galleryButton: {
		padding: wp(2),
	},
	footer: {
		position: 'absolute',
		bottom: hp(5),
		left: 0,
		right: 0,
		alignItems: 'center',
	},
	button: {
		backgroundColor: theme.colors.primary,
		paddingVertical: hp(1.5),
		paddingHorizontal: wp(4),
		borderRadius: theme.radius.md,
	},
	buttonText: {
		color: 'white',
		fontSize: hp(1.8),
		fontWeight: '500',
	},
});
