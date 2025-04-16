import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet } from 'react-native';

import { theme } from '@/lib/theme';

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				tabBarStyle: styles.tabBar,
				tabBarActiveTintColor: theme.colors.primary,
				tabBarInactiveTintColor: theme.colors.textLight,
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name="home"
				options={{
					title: 'Home',
					tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
				}}
			/>
			<Tabs.Screen
				name="nft"
				options={{
					title: 'NFT',
					tabBarIcon: ({ color, size }) => (
						<MaterialIcons name="diamond" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="dapp"
				options={{
					title: 'DApp',
					tabBarIcon: ({ color, size }) => <MaterialIcons name="apps" size={size} color={color} />,
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	tabBar: {
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
		height: 60,
		paddingBottom: 5,
	},
});
