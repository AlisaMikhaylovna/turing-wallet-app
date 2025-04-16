import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import resources from '@/locales';

const languageDetector = {
	type: 'languageDetector' as const,
	async: true,
	detect: async (callback: (lng: string) => void) => {
		try {
			const language = await AsyncStorage.getItem('user-language');
			if (language) {
				return callback(language);
			}
			return callback(I18nManager.getConstants().localeIdentifier?.split('_')[0] || 'en');
		} catch (error) {
			callback('en');
		}
	},
	init: () => {},
	cacheUserLanguage: async (language: string) => {
		try {
			await AsyncStorage.setItem('user-language', language);
		} catch (error) {
		}
	},
};

(i18n as any)
	.use(languageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: 'en',
		compatibilityJSON: 'v3',
		interpolation: {
			escapeValue: false,
		},
		react: {
			useSuspense: false,
		},
	});

export default i18n;
