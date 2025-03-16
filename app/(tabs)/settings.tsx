import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, Platform, Alert, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { spacing, shadows, borderRadius } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { addLog } from '../utils/logger';
import { StandardHeader } from '../components/StandardHeader';

export default function SettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Use theme context
  const { isDarkMode, setDarkMode, colors } = useTheme();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedNotifications = await AsyncStorage.getItem('notificationsEnabled');
      if (storedNotifications) setNotificationsEnabled(storedNotifications === 'true');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveNotificationSetting = async (value) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem('notificationsEnabled', value.toString());
    } catch (error) {
      console.error('Failed to save notification setting:', error);
    }
  };

  const createBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // Get all keys from AsyncStorage
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Get all data from AsyncStorage
      const allData = await AsyncStorage.multiGet(allKeys);
      
      // Convert data to JSON string with nice formatting
      const backupData = JSON.stringify(Object.fromEntries(allData), null, 2);
      
      // Create a temporary file with the backup data
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `gsm-opener-backup-${timestamp}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, backupData);
      
      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        // Share the backup file
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save GSM Opener Backup',
          UTI: 'public.json' // For iOS
        });
        
        await addLog('Backup', 'App data backup created and shared as JSON file', true);
      } else {
        // Fallback if file sharing isn't available
        const shareResult = await Share.share({
          message: backupData,
          title: 'GSM Opener Backup Data'
        });
        
        if (shareResult.action === Share.sharedAction) {
          await addLog('Backup', 'App data backup created and shared as text', true);
        }
      }
      
      Alert.alert('Success', 'Backup created successfully!');
    } catch (error) {
      console.error('Failed to create backup:', error);
      await addLog('Backup', `Error creating backup: ${error.message}`, false);
      Alert.alert('Error', 'Failed to create backup: ' + error.message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const pickBackupFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });
      
      if (result.canceled) {
        return;
      }
      
      // On newer expo-document-picker versions
      const fileUri = result.assets?.[0]?.uri || result.uri;
      
      // Now read the file
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      Alert.alert(
        'Restore Backup',
        'Do you want to restore data from this backup file? This will overwrite all current app data.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Restore', onPress: () => restoreFromBackup(fileContent) }
        ]
      );
    } catch (error) {
      console.error('Error picking file:', error);
      await addLog('Restore', `Error picking backup file: ${error.message}`, false);
      Alert.alert('Error', 'Could not read backup file: ' + error.message);
    }
  };
  
  const restoreFromBackup = async (backupJson) => {
    setIsRestoring(true);
    try {
      let backupData;
      
      try {
        backupData = JSON.parse(backupJson);
      } catch (error) {
        throw new Error('Invalid backup file format. Please provide a valid JSON file.');
      }
      
      // Clear all existing data first
      await AsyncStorage.clear();
      
      // Restore all data from backup
      for (const [key, value] of Object.entries(backupData)) {
        await AsyncStorage.setItem(key, value.toString());
      }
      
      await addLog('Restore', 'App data restored from backup file', true);
      Alert.alert('Success', 'Data restored successfully! The app will now reload settings.', [
        { text: 'OK', onPress: loadSettings }
      ]);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      await addLog('Restore', `Error restoring backup: ${error.message}`, false);
      Alert.alert('Error', 'Failed to restore backup: ' + error.message);
    } finally {
      setIsRestoring(false);
    }
  };

  // Use dynamic styles based on theme
  const dynamicStyles = {
    container: {
      backgroundColor: colors.background,
    }
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StandardHeader />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* App Preferences */}
        <Card title="App Preferences">
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceTextContainer}>
              <Text style={[styles.preferenceLabel, dynamicStyles.text]}>Enable Notifications</Text>
              <Text style={[styles.preferenceDescription, { color: colors.text.secondary }]}>
                Receive alerts when gate is opened
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={saveNotificationSetting}
              trackColor={{ false: '#E5E7EB', true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isDarkMode ? colors.primary : '#F9FAFB'}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceTextContainer}>
              <Text style={[styles.preferenceLabel, dynamicStyles.text]}>Dark Mode</Text>
              <Text style={[styles.preferenceDescription, { color: colors.text.secondary }]}>
                Use dark color theme
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E5E7EB', true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : isDarkMode ? colors.primary : '#F9FAFB'}
            />
          </View>
        </Card>

        {/* Backup & Restore Section */}
        <Card title="Data Management">
          <Text style={[styles.backupDescription, { color: colors.text.secondary }]}>
            Create a backup of all app data as a JSON file that you can save and use later to restore your settings if needed.
          </Text>
          <View style={styles.buttonContainer}>
            <Button
              title="Create Backup File"
              onPress={() => {
                Alert.alert(
                  'Create Backup',
                  'This will create a JSON backup file with all your app data. Continue?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Create Backup', onPress: createBackup }
                  ]
                );
              }}
              loading={isCreatingBackup}
              style={styles.actionButton}
            />
            
            <Button
              title="Restore from JSON File"
              onPress={pickBackupFile}
              loading={isRestoring}
              variant="outline"
              style={styles.actionButton}
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  preferenceTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
  },
  backupDescription: {
    fontSize: 14,
    marginBottom: spacing.md,
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.sm,
  }
});
