import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { hp, wp } from '@/lib/common';

export default function LanguageSettingsPage() {
  const { t, i18n } = useTranslation();
  
  const languages = [
    { code: 'en', name: t('english') },
    { code: 'zh', name: t('chinese') },
  ];

  const handleLanguageChange = async (languageCode: string) => {
    await i18n.changeLanguage(languageCode);
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.listContainer}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={styles.languageItem}
              onPress={() => handleLanguageChange(lang.code)}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>{lang.name}</Text>
                {i18n.language === lang.code && (
                  <MaterialIcons name="check" size={24} color="#4CAF50" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  listContainer: {
    backgroundColor: '#f5f5f5',
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  languageInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageName: {
    fontSize: hp(1.8),
    fontWeight: '500',
    color: '#333',
  },
}); 