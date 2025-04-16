import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { theme } from '@/lib/theme';

interface LoadingProps {
	size?: 'large' | 'small';
	color?: string;
}

export const Loading = ({ size = 'large', color = theme.colors.primary }: LoadingProps) => {
	return (
		<View style={{ justifyContent: 'center', alignItems: 'center' }}>
			<ActivityIndicator size={size as 'large' | 'small'} color={color} />
		</View>
	);
};
