import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	ActivityIndicator,
	TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';

export default function PrivacyPolicyPage() {
	const { t } = useTranslation();
	const navigation = useNavigation();
	const [loading, setLoading] = useState(true);
	const [showFullPolicy, setShowFullPolicy] = useState(false);

	useLayoutEffect(() => {
		navigation.setOptions({
			headerTitle: t('privacyPolicy')
		});
	}, [navigation, t]);

	useEffect(() => {
		const timer = setTimeout(() => {
			setLoading(false);
		}, 1000);

		return () => clearTimeout(timer);
	}, []);

	const toggleFullPolicy = () => {
		setShowFullPolicy(!showFullPolicy);
	};

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.content}
				contentContainerStyle={styles.contentContainer}
				showsVerticalScrollIndicator={false}
			>
				{loading ? (
					<ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
				) : (
					<>
						<Text style={styles.title}>{t('privacyPolicyTitle')}</Text>

						<Text style={styles.paragraph}>
							{t('privacyPolicyIntro')}
						</Text>

						<Text style={styles.sectionTitle}>{t('informationWeCollect')}</Text>
						<Text style={styles.paragraph}>
							{t('informationWeCollectDesc')}
						</Text>
						<Text style={styles.bulletPoint}>{t('deviceInfoBullet')}</Text>
						<Text style={styles.bulletPoint}>{t('usageDataBullet')}</Text>
						<Text style={styles.bulletPoint}>
							{t('supportInfoBullet')}
						</Text>

						<Text style={styles.sectionTitle}>{t('howWeUseYourInformation')}</Text>
						<Text style={styles.paragraph}>{t('howWeUseIntro')}</Text>
						<Text style={styles.bulletPoint}>{t('provideServicesBullet')}</Text>
						<Text style={styles.bulletPoint}>{t('respondRequestsBullet')}</Text>
						<Text style={styles.bulletPoint}>{t('monitorUsageBullet')}</Text>
						<Text style={styles.bulletPoint}>
							{t('protectAgainstFraudBullet')}
						</Text>

						<Text style={styles.sectionTitle}>{t('dataSecurityTitle')}</Text>
						<Text style={styles.paragraph}>
							{t('dataSecurityDesc')}
						</Text>

						<Text style={styles.sectionTitle}>{t('yourRights')}</Text>
						<Text style={styles.paragraph}>
							{t('yourRightsDesc')}
						</Text>

						<Text style={styles.sectionTitle}>{t('changesToThisPolicy')}</Text>
						<Text style={styles.paragraph}>
							{t('changesToThisPolicyDesc')}
						</Text>

						<TouchableOpacity onPress={toggleFullPolicy} style={styles.linkButton}>
							<Text style={styles.linkText}>
								{showFullPolicy ? t('showSummary') : t('viewFullPrivacyPolicy')}
							</Text>
							<MaterialIcons
								name={showFullPolicy ? 'expand-less' : 'expand-more'}
								size={16}
								color={theme.colors.primary}
							/>
						</TouchableOpacity>

						{showFullPolicy && (
							<View style={styles.fullPolicyContainer}>
								<Text style={styles.sectionTitle}>{t('fullPrivacyPolicy')}</Text>

								<Text style={styles.sectionSubtitle}>1. {t('introduction')}</Text>
								<Text style={styles.paragraph}>
									{t('fullIntroductionDesc')}
								</Text>

								<Text style={styles.sectionSubtitle}>2. {t('theDataWeCollectAboutYou')}</Text>
								<Text style={styles.paragraph}>
									{t('personalDataDefinition')}
								</Text>
								<Text style={styles.paragraph}>
									{t('dataTypesWeCollect')}
								</Text>
								<Text style={styles.bulletPoint}>
									{t('identityDataBullet')}
								</Text>
								<Text style={styles.bulletPoint}>
									{t('technicalDataBullet')}
								</Text>
								<Text style={styles.bulletPoint}>
									{t('usageDataDetailBullet')}
								</Text>

								<Text style={styles.sectionSubtitle}>3. {t('howWeUseYourPersonalData')}</Text>
								<Text style={styles.paragraph}>
									{t('legalBasisForProcessing')}
								</Text>
								<Text style={styles.bulletPoint}>
									{t('contractPerformanceBullet')}
								</Text>
								<Text style={styles.bulletPoint}>
									{t('legitimateInterestsBullet')}
								</Text>
								<Text style={styles.bulletPoint}>
									{t('legalObligationBullet')}
								</Text>

								<Text style={styles.sectionSubtitle}>4. {t('dataSecurityDetails')}</Text>
								<Text style={styles.paragraph}>
									{t('dataSecurityMeasures')}
								</Text>

								<Text style={styles.sectionSubtitle}>5. {t('yourLegalRights')}</Text>
								<Text style={styles.paragraph}>
									{t('yourLegalRightsIntro')}
								</Text>
								<Text style={styles.bulletPoint}>{t('rightToAccessBullet')}</Text>
								<Text style={styles.bulletPoint}>{t('rightToCorrectionBullet')}</Text>
								<Text style={styles.bulletPoint}>{t('rightToErasureBullet')}</Text>
								<Text style={styles.bulletPoint}>
									{t('rightToObjectBullet')}
								</Text>
								<Text style={styles.bulletPoint}>
									{t('rightToRestrictBullet')}
								</Text>
								<Text style={styles.bulletPoint}>{t('rightToTransferBullet')}</Text>
								<Text style={styles.bulletPoint}>{t('rightToWithdrawConsentBullet')}</Text>

								<Text style={styles.sectionSubtitle}>6. {t('contactUs')}</Text>
								<Text style={styles.paragraph}>
									{t('contactUsDesc')}
								</Text>
							</View>
						)}
					</>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	content: {
		flex: 1,
	},
	contentContainer: {
		padding: wp(4),
		paddingBottom: hp(6),
	},
	loader: {
		marginTop: hp(10),
	},
	title: {
		fontSize: hp(2.4),
		fontWeight: 'bold',
		marginBottom: hp(3),
		color: '#333',
		textAlign: 'center',
	},
	sectionTitle: {
		fontSize: hp(2),
		fontWeight: '600',
		marginTop: hp(2.5),
		marginBottom: hp(1.5),
		color: '#333',
	},
	sectionSubtitle: {
		fontSize: hp(1.8),
		fontWeight: '600',
		marginTop: hp(2),
		marginBottom: hp(1),
		color: '#333',
	},
	paragraph: {
		fontSize: hp(1.8),
		lineHeight: hp(2.6),
		color: '#444',
		marginBottom: hp(1.5),
	},
	bulletPoint: {
		fontSize: hp(1.8),
		lineHeight: hp(2.6),
		color: '#444',
		marginLeft: wp(4),
		marginBottom: hp(1),
	},
	linkButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: hp(3),
		marginBottom: hp(2),
		padding: hp(1.5),
		backgroundColor: '#f0f0f0',
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e0e0e0',
	},
	linkText: {
		fontSize: hp(1.8),
		color: theme.colors.primary,
		fontWeight: '500',
		marginRight: wp(1),
	},
	fullPolicyContainer: {
		marginTop: hp(2),
		paddingTop: hp(2),
		borderTopWidth: 1,
		borderTopColor: '#e0e0e0',
	},
});
