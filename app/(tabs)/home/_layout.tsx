import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';

export default function HomeLayout() {
	const { t } = useTranslation();

	return (
		<Stack>
			<Stack.Screen name="index" options={{ headerShown: false }} />
			<Stack.Screen
				name="token/token-history"
				options={{
					headerTitle: t('tokenHistory'),
					presentation: 'card',
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="send"
				options={{
					headerTitle: t('sendAssets'),
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="receive"
				options={{
					headerTitle: t('receiveAssets'),
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="history"
				options={{
					headerTitle: t('transactionHistory'),
					headerShown: true,
				}}
			/>
			<Stack.Screen
				name="token/token-transfer"
				options={{
					headerTitle: t('transferToken'),
					presentation: 'card',
					headerShown: true,
				}}
			/>
		</Stack>
	);
}