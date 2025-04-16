import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
	children: React.ReactNode;
	bg: string;
	disableTopPadding?: boolean;
}

export const ScreenWrapper = ({ children, bg, disableTopPadding = false }: ScreenWrapperProps) => {
	const { top } = useSafeAreaInsets();
	const paddingTop = disableTopPadding ? 0 : (top > 0 ? top : 20);

	return <View style={[styles.container, { paddingTop, backgroundColor: bg }]}>{children}</View>;
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		position: 'relative',
	},
});
