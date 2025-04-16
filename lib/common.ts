import { Dimensions } from 'react-native';

const { width: deviceWidth, height: deviceHeight } = Dimensions.get('window');

export const wp = (percentage: number) => {
	return (percentage * deviceWidth) / 100;
};
export const hp = (percentage: number) => {
	return (percentage * deviceHeight) / 100;
};
