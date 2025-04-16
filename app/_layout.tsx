import {
	OpenSans_400Regular,
	OpenSans_500Medium,
	OpenSans_600SemiBold,
	OpenSans_700Bold,
	OpenSans_800ExtraBold,
} from '@expo-google-fonts/open-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { theme } from '@/lib/theme';
import { initDatabase } from '@/utils/sqlite';
import '@/lib/i18n';

SplashScreen.preventAutoHideAsync();

const toastConfig = {
	success: (props: any) => (
		<BaseToast
			{...props}
			style={{
				borderLeftColor: '#4CAF50',
				borderLeftWidth: 6,
				borderRadius: 8,
				backgroundColor: 'white',
				marginHorizontal: 16,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 4,
				elevation: 3,
			}}
			contentContainerStyle={{ paddingHorizontal: 15 }}
			text1Style={{
				fontSize: 16,
				fontWeight: '600',
				fontFamily: 'OpenSans-SemiBold',
			}}
			text2Style={{
				fontSize: 14,
				fontFamily: 'OpenSans-Regular',
				color: theme.colors.text,
			}}
		/>
	),

	error: (props: any) => (
		<ErrorToast
			{...props}
			style={{
				borderLeftColor: theme.colors.rose,
				borderLeftWidth: 6,
				borderRadius: 8,
				backgroundColor: 'white',
				marginHorizontal: 16,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 4,
				elevation: 3,
			}}
			contentContainerStyle={{ paddingHorizontal: 15 }}
			text1Style={{
				fontSize: 16,
				fontWeight: '600',
				fontFamily: 'OpenSans-SemiBold',
			}}
			text2Style={{
				fontSize: 14,
				fontFamily: 'OpenSans-Regular',
				color: theme.colors.text,
			}}
		/>
	),

	info: (props: any) => (
		<BaseToast
			{...props}
			style={{
				borderLeftColor: '#2196F3',
				borderLeftWidth: 6,
				borderRadius: 8,
				backgroundColor: 'white',
				marginHorizontal: 16,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 4,
				elevation: 3,
			}}
			contentContainerStyle={{ paddingHorizontal: 15 }}
			text1Style={{
				fontSize: 16,
				fontWeight: '600',
				fontFamily: 'OpenSans-SemiBold',
			}}
			text2Style={{
				fontSize: 14,
				fontFamily: 'OpenSans-Regular',
				color: theme.colors.text,
			}}
		/>
	),
};

export default function RootLayout() {
	const [fontsLoaded] = useFonts({
		'OpenSans-Regular': OpenSans_400Regular,
		'OpenSans-Medium': OpenSans_500Medium,
		'OpenSans-SemiBold': OpenSans_600SemiBold,
		'OpenSans-Bold': OpenSans_700Bold,
		'OpenSans-ExtraBold': OpenSans_800ExtraBold,
	});

	useEffect(() => {
		const timeout = setTimeout(() => {
			SplashScreen.hideAsync();
		}, 3000);

		if (fontsLoaded) {
			clearTimeout(timeout);
			SplashScreen.hideAsync();
		}

		return () => clearTimeout(timeout);
	}, [fontsLoaded]);

	if (!fontsLoaded) {
		return null;
	}

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<SQLiteProvider databaseName="wallet.db" onInit={initDatabase}>
					<StatusBar style="dark" />
					<Stack
						screenOptions={{
							gestureEnabled: true,
							gestureDirection: 'horizontal',
							animation: 'slide_from_right',
							headerShown: true,
							contentStyle: {
								flex: 1,
								backgroundColor: 'white',
							},
							headerTitleStyle: {
								fontSize: 18,
								fontWeight: '600',
							},
						}}
					>
						<Stack.Screen name="index" options={{ headerShown: false }} />
						<Stack.Screen name="login" options={{ headerShown: false }} />
						<Stack.Screen name="dapp/webview" options={{ headerShown: false }} />
						<Stack.Screen
							name="create"
							options={{
								headerShown: false,
								gestureEnabled: true,
							}}
						/>
						<Stack.Screen name="restore" options={{ headerShown: false }} />
						<Stack.Screen name="restore-by-priKey" options={{ headerShown: false }} />
						<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
						<Stack.Screen name="settings" options={{ headerShown: false }} />
						<Stack.Screen name="multiSigs" options={{ headerShown: false }} />
					</Stack>
					<Toast config={toastConfig} position="top" topOffset={60} visibilityTime={3000} />
				</SQLiteProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
