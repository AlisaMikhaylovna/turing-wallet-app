import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Share, Platform, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import ViewShot from 'react-native-view-shot';

import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { AccountType } from '@/types';

interface QRCodeRef {
	toDataURL: (callback: (dataURL: string) => void) => void;
}

export default function ReceivePage() {
	const { t } = useTranslation();
	const qrRef = useRef<QRCodeRef | null>(null);
	const contentRef = useRef<any>(null);
	const [isSharing, setIsSharing] = useState(false);

	const { getCurrentAccountAddress, getCurrentAccountType } = useAccount();

	const address = getCurrentAccountAddress();
	const accountType = getCurrentAccountType();

	const qrCodeData = JSON.stringify({
		address,
		type: accountType,
	});

	const getAccountTypeLabel = () => {
		switch (accountType) {
			case AccountType.TBC:
				return t('tbcLegacy');
			case AccountType.TAPROOT:
				return t('btcTaproot');
			case AccountType.TAPROOT_LEGACY:
				return t('tbcTaprootLegacy');
			case AccountType.LEGACY:
				return t('btcLegacy');
			default:
				return '';
		}
	};

	const handleCopyAddress = async () => {
		if (address) {
			await Clipboard.setStringAsync(address);
			Toast.show({
				type: 'success',
				text1: t('addressCopied'),
				position: 'top',
				visibilityTime: 2000,
			});
		}
	};

	const handleSharePage = async () => {
		if (!contentRef.current || isSharing) return;

		setIsSharing(true);

		try {
			const uri = await contentRef.current.capture();

			const fileInfo = await FileSystem.getInfoAsync(uri);
			if (!fileInfo.exists) {
				throw new Error('Screenshot file does not exist');
			}

			const tempFile = `${FileSystem.cacheDirectory}wallet-address-${Date.now()}.png`;
			await FileSystem.copyAsync({
				from: uri,
				to: tempFile,
			});

			if (Platform.OS === 'android') {
				if (await Sharing.isAvailableAsync()) {
					await Sharing.shareAsync(tempFile, {
						dialogTitle: t('shareAddress'),
						mimeType: 'image/png',
						UTI: 'public.png',
					});
				} else {
					await Share.share(
						{
							title: t('shareAddress'),
							message: `${t('myAddress')}: ${address}`,
						},
						{
							dialogTitle: t('shareAddress'),
						},
					);
				}
			} else {
				await Share.share(
					{
						title: t('shareAddress'),
						message: `${t('myAddress')}: ${address}`,
						url: tempFile,
					},
					{
						dialogTitle: t('shareAddress'),
						subject: t('shareAddress'),
					},
				);
			}
		} catch (error: any) {
			Toast.show({
				type: 'error',
				text1: t('shareError'),
				position: 'top',
				visibilityTime: 2000,
			});
		} finally {
			setIsSharing(false);
		}
	};

	return (
		<ScreenWrapper bg="#e0e0e0" disableTopPadding>
			<View style={styles.container}>
				<ViewShot ref={contentRef} options={{ format: 'png', quality: 1.0 }} style={styles.content}>
					<View style={styles.cardContainer}>
						<Text style={styles.scanTitle}>{t('scanToTransferToMe')}</Text>
						<View style={styles.qrContainer}>
							{address ? (
								<QRCode
									value={qrCodeData}
									size={wp(65)}
									backgroundColor="white"
									color="black"
									getRef={(ref: QRCodeRef) => (qrRef.current = ref)}
									ecl="H"
								/>
							) : (
								<View style={styles.qrPlaceholder} />
							)}
						</View>

						<View style={styles.addressContainer}>
							<Text style={styles.addressLabel}>{t('recipientAddress')}</Text>
							<Text style={styles.addressText} selectable>
								{address}
							</Text>

							<View style={styles.buttonContainer}>
								<TouchableOpacity style={styles.actionButton} onPress={handleCopyAddress}>
									<Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
									<Text style={styles.buttonText}>{t('copy')}</Text>
								</TouchableOpacity>

								<TouchableOpacity
									style={styles.actionButton}
									onPress={handleSharePage}
									disabled={isSharing}
								>
									<Ionicons name="share-outline" size={18} color={theme.colors.primary} />
									<Text style={styles.buttonText}>{t('share')}</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</ViewShot>
			</View>
		</ScreenWrapper>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000',
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'flex-start',
		paddingHorizontal: wp(4),
		paddingTop: hp(10),
		backgroundColor: '#000',
	},
	cardContainer: {
		backgroundColor: '#d0d0d0',
		borderRadius: 16,
		padding: wp(5),
		width: '90%',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
	},
	qrContainer: {
		alignItems: 'center',
		marginBottom: hp(3),
		padding: wp(2),
		borderRadius: 10,
		backgroundColor: 'white',
	},
	qrPlaceholder: {
		width: wp(65),
		height: wp(65),
		backgroundColor: '#f0f0f0',
		borderRadius: 8,
	},
	addressContainer: {
		width: '100%',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#c0c0c0',
		paddingTop: hp(2),
	},
	addressLabel: {
		fontSize: hp(1.5),
		fontWeight: '500',
		marginBottom: hp(0.8),
		color: '#666',
	},
	addressText: {
		fontSize: hp(1.5),
		color: '#000',
		marginBottom: hp(1.5),
		textAlign: 'center',
		paddingHorizontal: wp(1),
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		width: '100%',
		marginTop: hp(0.5),
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'white',
		paddingVertical: hp(0.8),
		paddingHorizontal: wp(3),
		borderRadius: 6,
		borderWidth: 1,
		borderColor: theme.colors.primary,
		minWidth: wp(28),
	},
	buttonText: {
		color: theme.colors.primary,
		fontSize: hp(1.5),
		fontWeight: '500',
		marginLeft: wp(1.5),
	},
	scanTitle: {
		fontSize: hp(2),
		fontWeight: '600',
		color: '#333',
		marginBottom: hp(2),
		textAlign: 'center',
	},
});
