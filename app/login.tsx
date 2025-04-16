import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LoginCard } from '@/components/login-card';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';

const LoginPage = () => {
	const router = useRouter();
	const { t } = useTranslation();

	return (
		<ScreenWrapper bg={'#F0F2F5'}>
			<View style={styles.container}>
				<View style={styles.header}>
					<Text style={styles.title}>{t('createOrRestoreWallet')}</Text>
					<Text style={styles.subtitle}>{t('chooseOption')}</Text>
				</View>

				<View style={styles.cardsContainer}>
					<LoginCard
						title={t('createNewWallet')}
						description={t('createNewWalletDesc')}
						onPress={() => router.replace('/create')}
						style={styles.card}
					/>

					<LoginCard
						title={t('restoreWithMnemonic')}
						description={t('restoreWithMnemonicDesc')}
						onPress={() => router.replace('/restore')}
						style={styles.card}
					/>

					<LoginCard
						title={t('restoreWithPrivateKey')}
						description={t('restoreWithPrivateKeyDesc')}
						onPress={() => router.replace('/restore-by-priKey')}
						style={styles.card}
					/>
				</View>
			</View>
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: wp(5),
		paddingTop: hp(6),
	},
	header: {
		marginBottom: hp(3.5),
		paddingLeft: wp(2),
	},
	title: {
		fontSize: hp(3.1),
		fontWeight: '700',
		color: theme.colors.text,
		marginBottom: hp(1.5),
	},
	subtitle: {
		fontSize: hp(1.5),
		color: theme.colors.textLight,
	},
	cardsContainer: {
		paddingTop: hp(0),
	},
	card: {
		backgroundColor: '#E8EAED',
	},
});

export default LoginPage;
