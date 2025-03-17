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
import { useDataStore } from '../contexts/DataStoreContext';
import { useFocusEffect } from '@react-navigation/native';

export default function HomePage() {
  const router = useRouter();
  const { devices, activeDevice, setActiveDeviceById, refreshDevices, isLoading } = useDevices();
  const { addDeviceLog, logSMSOperation, getDeviceLogs } = useDataStore();
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [lastAction, setLastAction] = useState<{ action: string; timestamp: Date } | null>(null);

  // Set unit number and password whenever active device changes
  useEffect(() => {
    if (activeDevice) {
      setUnitNumber(activeDevice.unitNumber);
      setPassword(activeDevice.password);
      
      // Load the most recent log for the active device
      fetchMostRecentLog(activeDevice.id);
    } else {
      // Fall back to legacy method if no active device
      loadLegacySettings();
    }
  }, [activeDevice]);
  
  // Fetch the most recent log whenever we focus the page or after actions
  useFocusEffect(
    React.useCallback(() => {
      if (activeDevice) {
        fetchMostRecentLog(activeDevice.id);
      }
    }, [activeDevice])
  );

  const fetchMostRecentLog = async (deviceId: string) => {
    try {
      // Get the latest logs for the device
      const logs = await getDeviceLogs(deviceId);
      
      // Sort by timestamp (newest first) and take the most recent one
      const sortedLogs = logs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      if (sortedLogs.length > 0) {
        const latest = sortedLogs[0];
        setLastAction({
          action: latest.action,
          timestamp: new Date(latest.timestamp)
        });
      }
    } catch (error) {
      console.error('Failed to fetch recent logs:', error);
    }
  };
  
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
    router.push('/device-add');
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
      
      // Use the enhanced logSMSOperation function for clearer logs
      if (activeDevice?.id) {
        await logSMSOperation(activeDevice.id, command);
        
        // Fetch the most recent log after sending a command to update the UI
        setTimeout(() => {
          fetchMostRecentLog(activeDevice.id);
        }, 500); // Small delay to allow the log to be saved
      } else {
        // Fallback to the old method
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
        
        // Update last action manually here since we don't fetch logs
        setLastAction({
          action: getActionName(command),
          timestamp: new Date(),
        });
      }
    } catch (error: any) {
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
        title="Gate Control"
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Active Device Card */}
        <Card title="Control Panel" elevated>
          {activeDevice ? (
            <>
              <Text style={styles.deviceName}>
                {activeDevice.name}
                <View style={styles.deviceActions}>
                  <TouchableOpacity 
                    onPress={() => router.push({
                      pathname: '/device-edit',
                      params: { deviceId: activeDevice.id }
                    })}
                    style={styles.deviceAction}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                  </TouchableOpacity>
                  {devices.length > 1 && (
                    <TouchableOpacity 
                      onPress={goToDeviceManagement}
                      style={styles.deviceAction}
                    >
                      <Ionicons name="swap-horizontal-outline" size={16} color={colors.text.secondary} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.devicePhone}> • {activeDevice.unitNumber}</Text>
              </Text>
              
              <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.actionButton} onPress={turnRelayOn}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
                    <Ionicons name="lock-open" size={28} color="white" />
                  </View>
                  <Text style={styles.actionText}>Open</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={turnRelayOff}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.error }]}>
                    <Ionicons name="lock-closed" size={28} color="white" />
                  </View>
                  <Text style={styles.actionText}>Close</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={checkStatus}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.warning }]}>
                    <Ionicons name="information-circle" size={28} color="white" />
                  </View>
                  <Text style={styles.actionText}>Status</Text>
                </TouchableOpacity>
              </View>
              
              {devices.length > 1 && (
                <View style={styles.otherDevicesSection}>
                  <Text style={styles.sectionLabel}>Other Devices:</Text>
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
            </>
          ) : (
            <View style={styles.emptyDeviceContainer}>
              <Text style={styles.emptyDeviceText}>Add your first device to get started</Text>
              <Button
                title="Device Management"
                variant="solid"
                onPress={() => router.push('/(tabs)/settings')}
                style={styles.emptyDeviceButton}
              />
            </View>
          )}
        </Card>

        {activeDevice && (
          <Card title="Recent Activity">
            <View style={styles.statusRow}>
              <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.statusValue}>
                {lastAction 
                  ? `${lastAction.action} at ${lastAction.timestamp.toLocaleTimeString()}`
                  : 'No recent activity'}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.viewLogsButton}
              onPress={() => router.push('/(tabs)/logs')}
            >
              <Text style={styles.viewLogsText}>View All Logs</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </Card>
        )}
        
        {activeDevice && (
          <Card title="Setup & Configuration">
            <TouchableOpacity 
              style={styles.setupButton}
              onPress={() => router.push('/(tabs)/setup')}
            >
              <Ionicons name="settings-outline" size={24} color={colors.primary} />
              <View style={styles.setupTextContainer}>
                <Text style={styles.setupTitle}>Device Configuration</Text>
                <Text style={styles.setupDescription}>
                  Manage users, change password and device settings
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.secondary} />
            </TouchableOpacity>
          </Card>
        )}
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
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  devicePhone: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  actionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  statusValue: {
    fontSize: 16,
    color: colors.text.secondary,
    marginLeft: 12,
    flex: 1,
  },
  otherDevicesSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: colors.text.secondary,
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
    paddingVertical: spacing.xl,
  },
  emptyDeviceText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyDeviceButton: {
    minWidth: 180,
  },
  viewLogsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  viewLogsText: {
    color: colors.primary,
    fontWeight: '500',
    marginRight: 4,
  },
  setupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  setupTextContainer: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  setupTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  setupDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  deviceActions: {
    flexDirection: 'row',
    marginLeft: spacing.sm,
  },
  deviceAction: {
    padding: 4,
    marginHorizontal: 2,
  },
});
