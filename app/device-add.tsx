import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from './components/StandardHeader';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { TextInputField } from './components/TextInputField';
import { colors, spacing, borderRadius } from './styles/theme';
import { useDevices } from './contexts/DeviceContext';
import { useDataStore } from './contexts/DataStoreContext';

// Define the component as a function expression (not arrow function) for better debugging
function AddDevicePage() {
  const router = useRouter();
  const { refreshDevices } = useDevices();
  const { addDevice, updateGlobalSettings } = useDataStore();
  const [deviceName, setDeviceName] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deviceType, setDeviceType] = useState<'Connect4v' | 'Phonic4v' | null>(null);
  const [step, setStep] = useState<'select-type' | 'device-info'>('select-type');

  const handleSelectDeviceType = (type: 'Connect4v' | 'Phonic4v') => {
    if (type === 'Phonic4v') {
      Alert.alert('Coming Soon', 'Support for Phonic4v devices is coming soon!');
      return;
    }
    
    setDeviceType(type);
    setStep('device-info');
  };

  const validateForm = () => {
    if (!deviceName.trim()) {
      Alert.alert('Error', 'Please enter a name for your device');
      return false;
    }
    
    if (!unitNumber.trim()) {
      Alert.alert('Error', 'Please enter the device phone number');
      return false;
    }
    
    return true;
  };

  const handleAddDevice = async () => {
    if (!validateForm() || !deviceType) return;
    
    setIsLoading(true);
    
    try {
      // Add the new device with all required fields properly initialized
      const newDevice = await addDevice({
        name: deviceName,
        unitNumber: unitNumber, // Use the entered phone number
        password: '1234', // Default password
        authorizedUsers: [],
        type: deviceType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        relaySettings: {
          accessControl: 'AUT',
          latchTime: '000'
        },
        isActive: true
      });

      // Set as active device
      await updateGlobalSettings({
        activeDeviceId: newDevice.id
      });
      
      // Refresh devices list
      await refreshDevices();
      
      // Navigate directly to step 1 with the new device ID
      router.push({
        pathname: '/step1',
        params: { deviceId: newDevice.id }
      });
    } catch (error) {
      console.error('Failed to add device:', error);
      Alert.alert('Error', 'Failed to add device. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderDeviceTypeSelection = () => (
    <View style={styles.container}>
      <StandardHeader title="Select Device Type" showBack backTo="/devices" />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.instructionText}>
          Please select the type of device you want to add:
        </Text>
        
        <TouchableOpacity 
          style={styles.deviceTypeCard} 
          onPress={() => handleSelectDeviceType('Connect4v')}
        >
          <Ionicons name="hardware-chip-outline" size={36} color={colors.primary} style={styles.deviceTypeIcon} />
          <View style={styles.deviceTypeInfo}>
            <Text style={styles.deviceTypeName}>Connect4v</Text>
            <Text style={styles.deviceTypeDescription}>
              GSM gate opener with relay control for gates, barriers, and garage doors
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.deviceTypeCard, styles.disabledCard]} 
          onPress={() => handleSelectDeviceType('Phonic4v')}
        >
          <Ionicons name="mic-outline" size={36} color={colors.text.secondary} style={styles.deviceTypeIcon} />
          <View style={styles.deviceTypeInfo}>
            <Text style={styles.deviceTypeName}>Phonic4v</Text>
            <Text style={styles.deviceTypeDescription}>
              Voice-activated GSM controller with advanced features
            </Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderDeviceInfoForm = () => (
    <View style={styles.container}>
      <StandardHeader 
        title={`Add New ${deviceType || ''} Device`} 
        showBack 
        onBackPress={() => setStep('select-type')} 
      />
      
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
        </Card>
        
        <Button
          title="Continue to Setup"
          onPress={handleAddDevice}
          loading={isLoading}
          style={styles.addButton}
          fullWidth
        />
      </ScrollView>
    </View>
  );

  // Render different UI based on current step
  return step === 'select-type' ? renderDeviceTypeSelection() : renderDeviceInfoForm();
}

// Define styles
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
  instructionText: {
    fontSize: 16,
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  deviceTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  disabledCard: {
    opacity: 0.7,
  },
  deviceTypeIcon: {
    marginRight: spacing.md,
  },
  deviceTypeInfo: {
    flex: 1,
  },
  deviceTypeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.text.primary,
  },
  deviceTypeDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  comingSoonBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  comingSoonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  addButton: {
    marginTop: spacing.md,
  },
});

// Make sure the component is properly exported as default
export default AddDevicePage;
