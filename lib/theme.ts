import { StyleSheet } from 'react-native';

export const theme = {
	colors: {
		primary: '#000000',
		primaryDark: '#000000',
		dark: '#3E3E3E',
		darkLight: '#E1E1E1',
		gray: '#e3e3e3',

		text: '#494949',
		textLight: '#7C7C7C',
		textDark: '#1D1D1D',

		rose: '#ef4444',
		roseLight: '#f87171',
	},
	fonts: {
		regular: 'OpenSans-Regular',
		medium: 'OpenSans-Medium',
		bold: 'OpenSans-Bold',
		semibold: 'OpenSans-SemiBold',
		extraBold: 'OpenSans-ExtraBold',
	},
	radius: {
		xs: 10,
		sm: 12,
		md: 14,
		lg: 16,
		xl: 18,
		xxl: 22,
	},
	textStyles: StyleSheet.create({
		body: {
			fontFamily: 'OpenSans-Regular',
			fontSize: 16,
		},
		heading: {
			fontFamily: 'OpenSans-Bold',
			fontSize: 24,
		},
	}),
};
