import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Switch, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { TextInputField } from '../components/TextInputField';
import { Button } from '../components/Button';
import { colors, spacing, shadows, borderRadius } from '../styles/theme';

export default function SettingsPage() {
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedUnitNumber = await AsyncStorage.getItem('unitNumber');
      const storedPassword = await AsyncStorage.getItem('password');
      const storedNotifications = await AsyncStorage.getItem('notificationsEnabled');
      const storedDarkMode = await AsyncStorage.getItem('darkMode');

      if (storedUnitNumber) setUnitNumber(storedUnitNumber);
      if (storedPassword) setPassword(storedPassword);
      if (storedNotifications) setNotificationsEnabled(storedNotifications === 'true');
      if (storedDarkMode) setDarkMode(storedDarkMode === 'true');
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveToLocalStorage = async () => {
    if (!unitNumber) {
      Alert.alert('Error', 'Please enter the GSM relay number');
      return;
    }

    if (!password || password.length !== 4) {
      Alert.alert('Error', 'Password must be 4 digits');
      return;
    }

    setIsSaving(true);

    try {
      await AsyncStorage.setItem('unitNumber', unitNumber);
      await AsyncStorage.setItem('password', password);
      await AsyncStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
      await AsyncStorage.setItem('darkMode', darkMode.toString());

      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Device Settings */}
        <Card title="Device Settings" elevated>
          <TextInputField
            label="GSM Relay Number"
            value={unitNumber}
            onChangeText={setUnitNumber}
            placeholder="Enter GSM relay number"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          
          <TextInputField
            label="Current Password"
            value={password}
            onChangeText={(text) => {
              // Only allow 4 digits
              const filtered = text.replace(/[^0-9]/g, '').slice(0, 4);
              setPassword(filtered);
            }}
            placeholder="4-digit password"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />

          <Button
            title="Save Settings"
            onPress={saveToLocalStorage}
            loading={isSaving}
            fullWidth
            style={styles.saveButton}
          />
        </Card>

        {/* App Preferences */}
        <Card title="App Preferences">
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceLabel}>Enable Notifications</Text>
              <Text style={styles.preferenceDescription}>
                Receive alerts when your gate is opened
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : notificationsEnabled ? colors.primary : '#F9FAFB'}
            />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceTextContainer}>
              <Text style={styles.preferenceLabel}>Dark Mode</Text>
              <Text style={styles.preferenceDescription}>
                Use dark theme for the app interface
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
              thumbColor={Platform.OS === 'ios' ? '#FFFFFF' : darkMode ? colors.primary : '#F9FAFB'}
            />
          </View>
        </Card>

        {/* Advanced Settings */}
        <Card title="Advanced Options">
          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => {
              /* Navigate to change password screen */
            }}
          >
            <View style={styles.navItemContent}>
              <Ionicons name="key-outline" size={22} color={colors.text.secondary} />
              <Text style={styles.navItemText}>Change GSM Relay Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.text.secondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.navItem} 
            onPress={() => {
              /* Navigate to device management */
            }}
          >
            <View style={styles.navItemContent}>
              <Ionicons name="options-outline" size={22} color={colors.text.secondary} />
              <Text style={styles.navItemText}>Advanced Device Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </Card>

        {/* About */}
        <Card title="About">
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
          
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Device ID</Text>
            <Text style={styles.aboutValue}>GSM-Opener-1</Text>
          </View>
        </Card>

        {/* Reset Button */}
        <Button
          title="Reset All Settings"
          variant="outline"
          onPress={() => {
            Alert.alert(
              'Reset Settings',
              'Are you sure you want to reset all settings? This cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Reset', 
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await AsyncStorage.clear();
                      setUnitNumber('');
                      setPassword('');
                      setNotificationsEnabled(false);
                      setDarkMode(false);
                      Alert.alert('Success', 'All settings have been reset');
                    } catch (error) {
                      console.error('Failed to reset settings:', error);
                      Alert.alert('Error', 'Failed to reset settings');
                    }
                  }
                },
              ]
            );
          }}
          style={styles.resetButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  saveButton: {
    marginTop: spacing.sm,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  preferenceTextContainer: {
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  preferenceDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  navItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navItemText: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  aboutLabel: {
    fontSize: 16,
    color: colors.text.primary,
  },
  aboutValue: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  resetButton: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
});
