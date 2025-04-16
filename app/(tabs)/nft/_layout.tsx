import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function NFTLayout() {
	const { t } = useTranslation();
	
	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="collection/create-collection"
				options={{
					headerTitle: t('createCollection'),
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="collection/collection-detail"
				options={{
					headerTitle: t('collectionDetail'),
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="create-nft"
				options={{
					headerTitle: t('createNFT'),
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="nft-detail"
				options={{
					headerTitle: t('nftDetail'),
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="nft-history"
				options={{
					headerTitle: t('nftHistory'),
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="nft-transfer"
				options={{
					headerTitle: t('transferNFT'),
					headerShown: true,
				}}
			/>
		</Stack>
	);
}
