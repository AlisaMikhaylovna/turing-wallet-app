import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import { Modal } from '@/components/ui/modal';
import { hp, wp } from '@/lib/common';
import { theme } from '@/lib/theme';
import { restoreNFT } from '@/utils/sqlite';

interface RestoreNFTModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RestoreNFTModal = ({
  visible,
  onClose,
  onSuccess,
}: RestoreNFTModalProps) => {
  const { t } = useTranslation();
  const [nftId, setNftId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setNftId('');
    setError('');
  };

  const validateForm = () => {
    if (!nftId.trim()) {
      setError(t('nftIdCannotBeEmpty'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await restoreNFT(nftId.trim());
      Toast.show({
        type: 'success',
        text1: t('success'),
        text2: t('nftRestoredSuccessfully'),
      });
      onSuccess();
      onClose();
    } catch (error) {
      //console.error('Failed to restore NFT:', error);
      Toast.show({
        type: 'error',
        text1: t('error'),
        text2: error instanceof Error ? error.message : t('failedToRestoreNFT'),
      });
      setError(t('failedToRestoreNFT'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>{t('restoreNFT')}</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('nftId')}</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={nftId}
            onChangeText={(text) => {
              setNftId(text);
              setError('');
            }}
            placeholder={t('enterNFTIdToRestore')}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>{t('restore')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: hp(2),
    fontWeight: '600',
    marginBottom: hp(2),
  },
  formGroup: {
    width: '100%',
    marginBottom: hp(2),
  },
  label: {
    fontSize: hp(1.6),
    marginBottom: hp(0.5),
    color: '#333',
  },
  input: {
    width: '100%',
    height: hp(5),
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: wp(3),
    fontSize: hp(1.6),
  },
  inputError: {
    borderColor: '#e53935',
  },
  errorText: {
    color: '#e53935',
    fontSize: hp(1.4),
    marginTop: hp(0.5),
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: 8,
    alignItems: 'center',
    marginTop: hp(1),
    width: '100%',
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: hp(1.6),
    fontWeight: '500',
  },
}); 