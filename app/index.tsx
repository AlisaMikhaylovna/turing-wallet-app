import { Image } from 'expo-image';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { useAccount } from '@/hooks/useAccount';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';

Image.prefetch(require('@/assets/images/welcome.png'));

const { width } = Dimensions.get('window');
const ANIMATION_DURATION = 1200;
const AUTO_NAVIGATE_DELAY = 3000;
const TEXT_ANIMATION_DELAY = 300;

const WelcomePage = () => {
	const router = useRouter();
	const navigation = useNavigation();
	const { t } = useTranslation();
	const [imageLoaded, setImageLoaded] = useState(false);
	const imageOpacity = new Animated.Value(0);
	const imageScale = new Animated.Value(0.9);
	const textOpacity = new Animated.Value(0);
	const textTranslateY = new Animated.Value(15);

	const { getCurrentAccountAddress } = useAccount();

	useLayoutEffect(() => {
		navigation.setOptions({
			headerShown: false,
		});
	}, [navigation]);

	useEffect(() => {
		const loadingTimeout = setTimeout(() => {
			if (!imageLoaded) {
				setImageLoaded(true);
			}
		}, 1000);

		return () => clearTimeout(loadingTimeout);
	}, []);

	const handleImageLoad = () => {
		setImageLoaded(true);
	};

	useEffect(() => {
		if (imageLoaded) {
			Animated.parallel([
				Animated.timing(imageOpacity, {
					toValue: 1,
					duration: ANIMATION_DURATION,
					easing: Easing.bezier(0.25, 0.1, 0.25, 1),
					useNativeDriver: true,
				}),
				Animated.timing(imageScale, {
					toValue: 1,
					duration: ANIMATION_DURATION,
					easing: Easing.bezier(0.25, 0.1, 0.25, 1),
					useNativeDriver: true,
				}),
			]).start();

			setTimeout(() => {
				Animated.parallel([
					Animated.timing(textOpacity, {
						toValue: 1,
						duration: ANIMATION_DURATION,
						easing: Easing.bezier(0.25, 0.1, 0.25, 1),
						useNativeDriver: true,
					}),
					Animated.timing(textTranslateY, {
						toValue: 0,
						duration: ANIMATION_DURATION,
						easing: Easing.bezier(0, 0, 0.2, 1),
						useNativeDriver: true,
					}),
				]).start();
			}, TEXT_ANIMATION_DELAY);
		}
	}, [imageLoaded]);

	useEffect(() => {
		const timer = setTimeout(() => {
			try {
				const address = getCurrentAccountAddress();
				if (address) {
					router.replace('/(tabs)/home');
				} else {
					router.replace('/login');
				}
			} catch (error) {
				//console.error('Navigation error:', error);
				router.replace('/login');
			}
		}, AUTO_NAVIGATE_DELAY);

		return () => clearTimeout(timer);
	}, []);

	return (
		<ScreenWrapper bg={'white'}>
			<View style={styles.container}>
				<View style={styles.contentContainer}>
					<Animated.View
						style={[
							styles.imageContainer,
							{
								opacity: imageOpacity,
								transform: [{ scale: imageScale }],
							},
						]}
					>
						<Image
							source={require('@/assets/images/welcome.png')}
							style={styles.image}
							contentFit="contain"
							onLoad={handleImageLoad}
							priority="high"
							cachePolicy="memory-disk"
						/>
					</Animated.View>

					<Animated.View
						style={[
							styles.textContainer,
							{
								opacity: textOpacity,
								transform: [{ translateY: textTranslateY }],
							},
						]}
					>
						<Text style={styles.title}>{t('welcome')}</Text>
						<Text style={styles.punchline}>
							{t('welcomePunchline')}
						</Text>
					</Animated.View>
				</View>
			</View>
		</ScreenWrapper>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: 'white',
		paddingHorizontal: wp(5),
	},
	contentContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingBottom: hp(8),
	},
	imageContainer: {
		width: width * 0.8,
		aspectRatio: 1,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: -hp(5),
	},
	image: {
		width: '100%',
		height: '100%',
	},
	fallbackContainer: {
		position: 'absolute',
		justifyContent: 'center',
		alignItems: 'center',
		width: width * 0.8,
		height: width * 0.8,
	},
	fallbackImage: {
		width: width * 0.5,
		height: width * 0.5,
		backgroundColor: '#f0f0f0',
		borderRadius: 20,
	},
	textContainer: {
		gap: 15,
		marginTop: hp(8),
		alignItems: 'center',
	},
	title: {
		color: theme.colors.text,
		fontSize: hp(4),
		textAlign: 'center',
		fontWeight: '800',
	},
	punchline: {
		textAlign: 'center',
		paddingHorizontal: wp(10),
		fontSize: hp(1.7),
		color: theme.colors.text,
	},
});

export default WelcomePage;
