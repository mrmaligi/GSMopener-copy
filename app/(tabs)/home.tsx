import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Platform, Linking, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing, shadows, borderRadius } from '../styles/theme';
import { addLog } from '../../utils/logging';
import { StandardHeader } from '../components/StandardHeader';
import { useRouter } from 'expo-router';
import { DeviceData } from '../../types/devices';
import { useDevices } from '../contexts/DeviceContext';

export default function HomePage() {
  const router = useRouter();
  const { devices, activeDevice, setActiveDeviceById, refreshDevices, isLoading } = useDevices();
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [lastAction, setLastAction] = useState<{ action: string; timestamp: Date } | null>(null);

  // Set unit number and password whenever active device changes
  useEffect(() => {
    if (activeDevice) {
      setUnitNumber(activeDevice.unitNumber);
      setPassword(activeDevice.password);
    } else {
      // Fall back to legacy method if no active device
      loadLegacySettings();
    }
  }, [activeDevice]);
  
  const loadLegacySettings = async () => {
    try {
      const storedUnitNumber = await AsyncStorage.getItem('unitNumber');
      const storedPassword = await AsyncStorage.getItem('password');

      if (storedUnitNumber) setUnitNumber(storedUnitNumber);
      if (storedPassword) setPassword(storedPassword);
    } catch (error) {
      console.error('Failed to load legacy settings:', error);
    }
  };
  
  const handleAddDevice = () => {
    Alert.alert(
      'Add New Device',
      'Select device type to add',
      [
        {
          text: 'Add Connect4v',
          onPress: () => handleAddConnect4v()
        },
        {
          text: 'Add Phonic4v (Coming Soon)',
          onPress: () => handleAddPhonic4v()
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };
  
  const handleAddConnect4v = () => {
    addLog('Device Management', 'Started adding new Connect4v device', true);
    router.push('/device-add');
  };
  
  const handleAddPhonic4v = () => {
    Alert.alert(
      'Coming Soon',
      'Phonic4v support is coming soon. Currently, only Connect4v devices are supported.'
    );
  };

  const handleSwitchDevice = async (device: DeviceData) => {
    try {
      await setActiveDeviceById(device.id);
      
      // Log the device switch action
      await addLog('Device Management', `Switched to device: ${device.name}`, true);
      
      Alert.alert('Device Activated', `${device.name} is now the active device`);
    } catch (error) {
      console.error('Failed to switch device:', error);
      Alert.alert('Error', 'Failed to switch device');
    }
  };

  const goToDeviceManagement = () => {
    router.push('/devices');
  };

  const sendSMS = async (command: string) => {
    if (!unitNumber || !password) {
      Alert.alert(
        'Missing Information',
        'Please set up your device number and password in settings first.',
        [{ text: 'OK' }]
      );
      await addLog('Home Action', 'Failed: Missing device number or password', false);
      return;
    }

    setIsSendingSms(true);

    try {
      const formattedUnitNumber = Platform.OS === 'ios' ? unitNumber.replace('+', '') : unitNumber;

      const smsUrl = Platform.select({
        ios: `sms:${formattedUnitNumber}&body=${encodeURIComponent(command)}`,
        android: `sms:${formattedUnitNumber}?body=${encodeURIComponent(command)}`,
        default: `sms:${formattedUnitNumber}?body=${encodeURIComponent(command)}`,
      });

      const supported = await Linking.canOpenURL(smsUrl);
      
      if (!supported) {
        Alert.alert(
          'Error',
          'SMS is not available on this device. Please ensure an SMS app is installed.',
          [{ text: 'OK' }]
        );
        await addLog('Home Action', 'Failed: SMS not available on device', false);
        return;
      }

      await Linking.openURL(smsUrl);
      
      // Use better action descriptions
      let actionName = "";
      let actionDetails = "";
      
      if (command.includes('CC')) {
        actionName = "Gate Open";
        actionDetails = "Opened gate/activated relay (ON)";
      } else if (command.includes('DD')) {
        actionName = "Gate Close";
        actionDetails = "Closed gate/deactivated relay (OFF)";
      } else if (command.includes('EE')) {
        actionName = "Status Check";
        actionDetails = "Requested device status";
      }
      
      await addLog(actionName, actionDetails, true);
      
      // Record last action
      setLastAction({
        action: getActionName(command),
        timestamp: new Date(),
      });
    } catch (error: any) { // Type as 'any' to handle error.message
      console.error('Failed to send SMS:', error);
      Alert.alert(
        'Error',
        'Failed to open SMS. Please try again.',
        [{ text: 'OK' }]
      );
      await addLog('Home Action', `Error: ${error.message || 'Unknown error'}`, false);
    } finally {
      setIsSendingSms(false);
    }
  };

  const getActionName = (command: string) => {
    if (command.includes('CC')) return 'Turn On Relay';
    if (command.includes('P')) return 'Change Password';
    if (command.includes('DD')) return 'Turn Off Relay';
    if (command.includes('EE')) return 'Check Status';
    return 'Command';
  };

  const turnRelayOn = () => sendSMS(`${password}CC`);
  const turnRelayOff = () => sendSMS(`${password}DD`);
  const checkStatus = () => sendSMS(`${password}EE`);

  return (
    <View style={styles.container}>
      <StandardHeader 
        rightAction={
          <TouchableOpacity onPress={handleAddDevice} style={styles.addButton}>
            <Ionicons name="add" size={28} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Active Device Card */}
        <Card title="Active Device" elevated>
          {activeDevice ? (
            <View style={styles.activeDeviceContainer}>
              <View style={styles.deviceHeader}>
                <Text style={styles.deviceName}>{activeDevice.name}</Text>
                <TouchableOpacity 
                  style={styles.manageButton} 
                  onPress={goToDeviceManagement}
                >
                  <Text style={styles.manageButtonText}>Manage</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.devicePhone}>
                <Ionicons name="call-outline" size={16} /> {activeDevice.unitNumber}
              </Text>
              
              {devices.length > 1 && (
                <View style={styles.otherDevicesSection}>
                  <Text style={styles.otherDevicesLabel}>Switch to:</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.devicesList}
                  >
                    {devices
                      .filter(device => device.id !== activeDevice.id)
                      .map(device => (
                        <TouchableOpacity
                          key={device.id}
                          style={styles.deviceChip}
                          onPress={() => handleSwitchDevice(device)}
                        >
                          <Text style={styles.deviceChipText}>{device.name}</Text>
                        </TouchableOpacity>
                      ))
                    }
                  </ScrollView>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyDeviceContainer}>
              <Text style={styles.emptyDeviceText}>No devices configured yet</Text>
              <Button
                title="Add Device"
                variant="solid"
                onPress={handleAddDevice}
                style={styles.emptyDeviceButton}
              />
            </View>
          )}
        </Card>

        {/* Quick Actions Card */}
        <Card title="Quick Actions" elevated>
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={turnRelayOn}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
                <Ionicons name="power" size={28} color="white" />
              </View>
              <Text style={styles.actionText}>Open Gate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={turnRelayOff}>
              <View style={[styles.iconContainer, { backgroundColor: colors.error }]}>
                <Ionicons name="close-circle" size={28} color="white" />
              </View>
              <Text style={styles.actionText}>Close Gate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={checkStatus}>
              <View style={[styles.iconContainer, { backgroundColor: colors.warning }]}>
                <Ionicons name="information-circle" size={28} color="white" />
              </View>
              <Text style={styles.actionText}>Check Status</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Status Card */}
        <Card title="Device Status" subtitle="Information about your GSM relay">
          <View style={styles.statusRow}>
            <Ionicons name="call" size={20} color={colors.text.secondary} />
            <Text style={styles.statusLabel}>Phone Number:</Text>
            <Text style={styles.statusValue}>{unitNumber || 'Not set'}</Text>
          </View>
          
          <View style={styles.statusRow}>
            <Ionicons name="time" size={20} color={colors.text.secondary} />
            <Text style={styles.statusLabel}>Last Action:</Text>
            <Text style={styles.statusValue}>
              {lastAction 
                ? `${lastAction.action} at ${lastAction.timestamp.toLocaleTimeString()}`
                : 'No recent activity'}
            </Text>
          </View>
        </Card>

        {/* Help Card */}
        <Card 
          title="Need Help?" 
          subtitle="Tap for support options"
          onPress={() => {}} // Would navigate to help screen
        >
          <Text style={styles.helpText}>
            If you're having trouble connecting to your GSM relay or need assistance with setup,
            tap here for troubleshooting guides and support options.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  addButton: {
    padding: 8,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...shadows.sm,
  },
  actionText: {
    fontSize: 14,
    color: colors.text.primary,
    marginTop: 4,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 8,
    width: 120,
  },
  statusValue: {
    fontSize: 16,
    color: colors.text.secondary,
    flex: 1,
  },
  helpText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  activeDeviceContainer: {
    paddingVertical: spacing.sm,
  },
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  devicePhone: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  manageButton: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.pill,
  },
  manageButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  otherDevicesSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  otherDevicesLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  devicesList: {
    flexDirection: 'row',
  },
  deviceChip: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deviceChipText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyDeviceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyDeviceText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  emptyDeviceButton: {
    minWidth: 150,
  },
});
