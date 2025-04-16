import { Stack } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

export default function SettingsLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				animation: 'slide_from_right',
			}}
		>
			<Stack.Screen
				name="address-book"
				options={{
					headerTitle: 'Address Book',
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
			<Stack.Screen
				name="information"
				options={{
					headerTitle: 'Information Management',
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
			<Stack.Screen
				name="export"
				options={{
					headerTitle: 'Export',
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
			<Stack.Screen
				name="account-management"
				options={{
					headerTitle: 'Account Management',
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
			<Stack.Screen
				name="system-settings"
				options={{
					headerTitle: 'System Settings',
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
			<Stack.Screen name="scan" options={{ headerShown: false }} />
			<Stack.Screen
				name="privacy-policy"
				options={{
					headerTitle: 'Privacy Policy',
					headerTitleStyle: styles.headerTitle,
					headerBackVisible: true,
				}}
			/>
			<Stack.Screen
				name="language"
				options={{
					headerTitle: 'Language',
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
