import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { addDevice } from '../utils/deviceStorage';
import { addLog } from '../utils/logging';
import { StandardHeader } from './components/StandardHeader';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, borderRadius } from './styles/theme';
import { useDevices } from './contexts/DeviceContext';

export default function AddDevicePage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [deviceName, setDeviceName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('1234'); // Default password
  const [deviceType, setDeviceType] = useState<'Connect4v' | 'Phonic4v'>(
    params.type === 'Phonic4v' ? 'Phonic4v' : 'Connect4v'
  );
  const [isLoading, setIsLoading] = useState(false);
  const { refreshDevices } = useDevices();

  // Show alert for Phonic4v if it was pre-selected
  useEffect(() => {
    if (params.type === 'Phonic4v') {
      Alert.alert(
        'Coming Soon',
        'Phonic4v support is coming soon. Currently, only Connect4v devices are supported.',
        [{ text: 'OK' }]
      );
    }
  }, [params.type]);

  const validateForm = () => {
    if (deviceType === 'Phonic4v') {
      Alert.alert(
        'Coming Soon',
        'Phonic4v support is coming soon. Currently, only Connect4v devices are supported.'
      );
      return false;
    }
    
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter a name for your device');
      return false;
    }
    
    if (!unitNumber.trim()) {
      Alert.alert('Error', 'Please enter the device phone number');
      return false;
    }
    
    if (!password.trim() || password.length !== 4 || !/^\d+$/.test(password)) {
      Alert.alert('Error', 'Password must be a 4-digit number');
      return false;
    }
    
    return true;
  };

  const handleAddDevice = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Add the new device
      const newDevice = await addDevice({
        name: deviceName,
        unitNumber,
        password,
        type: 'Connect4v', // Always Connect4v for now
        isActive: true,
        relaySettings: {
          accessControl: 'AUT',
          latchTime: '000'
        }
      });
      
      // Refresh devices to include the new one and update active device
      await refreshDevices();
      
      await addLog(
        'Device Management', 
        `Added new Connect4v device: ${deviceName}`, 
        true
      );
      
      Alert.alert(
        'Device Added',
        `${deviceName} has been added successfully!`,
        [
          { 
            text: 'Configure Now', 
            onPress: () => {
              router.push({
                pathname: '/setup',
                params: { deviceId: newDevice.id }
              });
            }
          },
          {
            text: 'Later',
            onPress: () => router.push('/devices')
          }
        ]
      );
    } catch (error) {
      console.error('Failed to add device:', error);
      Alert.alert('Error', 'Failed to add device. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StandardHeader title="Add New Device" showBack backTo="/devices" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title="Device Information" elevated>
          <TextInputField
            label="Device Name"
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="Enter a name (e.g., Home Gate, Office Door)"
            containerStyle={styles.inputContainer}
          />
          
          <TextInputField
            label="Device Phone Number"
            value={unitNumber}
            onChangeText={setUnitNumber}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            containerStyle={styles.inputContainer}
          />
          
          <TextInputField
            label="Device Password"
            value={password}
            onChangeText={(text) => {
              // Only allow digits and limit to 4 characters
              const filtered = text.replace(/[^0-9]/g, '').slice(0, 4);
              setPassword(filtered);
            }}
            placeholder="4-digit password (default: 1234)"
            keyboardType="number-pad"
            containerStyle={styles.inputContainer}
            maxLength={4}
            secureTextEntry
          />
          
          <Text style={styles.sectionLabel}>Device Type</Text>
          <View style={styles.deviceTypeContainer}>
            <TouchableOpacity
              style={[
                styles.deviceTypeButton,
                deviceType === 'Connect4v' && styles.selectedDeviceType
              ]}
              onPress={() => setDeviceType('Connect4v')}
            >
              <Ionicons 
                name="key-outline" 
                size={24} 
                color={deviceType === 'Connect4v' ? colors.primary : colors.text.secondary} 
              />
              <Text style={[
                styles.deviceTypeText, 
                deviceType === 'Connect4v' && styles.selectedDeviceTypeText
              ]}>
                Connect4v
              </Text>
              <Text style={styles.deviceTypeDescription}>GSM relay for gates and doors</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.deviceTypeButton,
                deviceType === 'Phonic4v' && styles.selectedDeviceType,
                styles.disabledDeviceType
              ]}
              onPress={() => {
                setDeviceType('Phonic4v');
                Alert.alert(
                  'Coming Soon',
                  'Phonic4v support is coming soon. Currently, only Connect4v devices are supported.'
                );
              }}
            >
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>COMING SOON</Text>
              </View>
              <Ionicons 
                name="mic-outline" 
                size={24} 
                color={deviceType === 'Phonic4v' ? colors.primary : colors.text.disabled} 
              />
              <Text style={[
                styles.deviceTypeText, 
                deviceType === 'Phonic4v' && styles.selectedDeviceTypeText,
                styles.disabledText
              ]}>
                Phonic4v
              </Text>
              <Text style={[styles.deviceTypeDescription, styles.disabledText]}>Voice control unit</Text>
            </TouchableOpacity>
          </View>
        </Card>
        
        <Button
          title="Add Device"
          onPress={handleAddDevice}
          loading={isLoading}
          style={styles.addButton}
          fullWidth
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  deviceTypeContainer: {
    flexDirection: 'column',
    marginBottom: spacing.md,
  },
  deviceTypeButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  selectedDeviceType: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  deviceTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  selectedDeviceTypeText: {
    color: colors.primary,
  },
  deviceTypeDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  addButton: {
    marginTop: spacing.md,
  },
  disabledDeviceType: {
    opacity: 0.7,
    position: 'relative',
    overflow: 'hidden',
  },
  disabledText: {
    color: colors.text.disabled,
  },
  comingSoonBadge: {
    position: 'absolute',
    top: 10,
    right: -30,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 2,
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
    width: 120,
    alignItems: 'center',
  },
  comingSoonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
