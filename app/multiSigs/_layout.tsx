import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function MultiSigssLayout() {
	const { t } = useTranslation();
	
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				animation: 'slide_from_right',
			}}
		>
			<Stack.Screen
				name="create-multiSig-wallet"
				options={{
					headerTitle: t('createMultiSigWallet'),
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
			<Stack.Screen
				name="multiSig-transactions"
				options={{
					headerTitle: t('multiSigTransactions'),
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
			<Stack.Screen
				name="initiate-multiSig-transaction"
				options={{
					headerTitle: t('initiateMultiSigTransaction'),
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
		</Stack>
	);
}

const styles = StyleSheet.create({
	headerTitle: {
		fontSize: 18,
		fontWeight: '600',
	},
});
