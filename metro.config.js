const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
	...require('node-libs-react-native'),
	crypto: require.resolve('crypto-browserify'),
	buffer: require.resolve('buffer'),
	process: require.resolve('process'),
	events: require.resolve('events'),
	'react-native-get-random-values': require.resolve('react-native-get-random-values'),
};

config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'cjs');
config.transformer.allowOptionalDependencies = true;

module.exports = config;
