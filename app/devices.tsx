import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { DeviceData } from '../types/devices';
import { deleteDevice } from '../utils/deviceStorage';
import { StandardHeader } from './components/StandardHeader';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { colors, spacing, borderRadius } from './styles/theme';
import { addLog } from '../utils/logging';
import { useDevices } from './contexts/DeviceContext';
import { useDataStore } from './contexts/DataStoreContext';
import DeviceManager from '../utils/DeviceManager';

export default function DevicesPage() {
  const router = useRouter();
  const { devices, activeDevice, setActiveDeviceById, refreshDevices } = useDevices();
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectDevice = async (deviceId: string) => {
    try {
      await setActiveDeviceById(deviceId);
      
      const device = devices.find(d => d.id === deviceId);
      if (device) {
        await addLog('Device Management', `Switched to device: ${device.name}`, true);
      }
      
      Alert.alert('Success', 'Active device changed successfully');
    } catch (error) {
      console.error('Failed to change active device:', error);
      Alert.alert('Error', 'Failed to change active device');
    }
  };

  const handleEditDevice = (device: DeviceData) => {
    router.push({
      pathname: '/device-edit',
      params: { deviceId: device.id }
    });
  };

  const handleDeleteDevice = (device: DeviceData) => {
    // Use our DeviceManager utility for consistent handling
    DeviceManager.confirmDeviceDeletion(
      device.id,
      device.name,
      device.isActive,
      async (deviceId) => {
        try {
          setIsLoading(true);
          console.log(`Devices: Deleting device ${deviceId}`);
          
          const success = await deleteDevice(deviceId);
          
          if (success) {
            // If successful, add a log entry
            await addLog('Device Management', `Deleted device: ${device.name}`, true);
            
            // Refresh the devices list
            await refreshDevices();
            
            Alert.alert('Success', 'Device deleted successfully');
          } else {
            throw new Error('Failed to delete device');
          }
        } catch (error) {
          console.error('Failed to delete device:', error);
          Alert.alert('Error', `Failed to delete device: ${error.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const navigateToAddDevice = () => {
    router.push('/device-add');
  };

  return (
    <View style={styles.container}>
      <StandardHeader 
        title="Manage Devices" 
        showBack 
        rightAction={{
          icon: "add",
          onPress: navigateToAddDevice
        }}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            Manage your Connect4v and Phonic4v devices. The active device will be used for all operations.
          </Text>
        </View>

        {devices.length === 0 ? (
          <Card title="No Devices Found">
            <Text style={styles.emptyText}>
              You haven't added any devices yet. Add your first device to get started.
            </Text>
            <Button 
              title="Add Your First Device" 
              variant="solid" 
              onPress={navigateToAddDevice} 
              style={styles.addButton}
              icon="add-circle-outline"
              fullWidth
            />
          </Card>
        ) : (
          <>
            {devices.map(device => (
              <Card key={device.id} title={device.name} elevated={device.id === activeDevice?.id}>
                <View style={styles.deviceInfo}>
                  <View style={styles.deviceDetails}>
                    <Text style={styles.deviceType}>
                      <Ionicons 
                        name={device.type === 'Connect4v' ? 'key-outline' : 'mic-outline'} 
                        size={16} 
                      /> 
                      {device.type}
                    </Text>
                    <Text style={styles.devicePhone}>
                      <Ionicons name="call-outline" size={16} /> {device.unitNumber}
                    </Text>
                  </View>
                  
                  <View style={styles.deviceActions}>
                    {device.id === activeDevice?.id ? (
                      <View style={styles.activeIndicator}>
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                        <Text style={styles.activeText}>Active</Text>
                      </View>
                    ) : (
                      <Button 
                        title="Set Active" 
                        variant="outline" 
                        onPress={() => handleSelectDevice(device.id)}
                        small
                      />
                    )}
                  </View>
                </View>
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity 
                    style={styles.iconButton} 
                    onPress={() => handleEditDevice(device)}
                  >
                    <Ionicons name="create-outline" size={24} color={colors.primary} />
                    <Text style={styles.iconButtonText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => handleDeleteDevice(device)}
                  >
                    <Ionicons name="trash-outline" size={24} color={colors.error} />
                    <Text style={[styles.iconButtonText, { color: colors.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
            
            <Button
              title="Add Another Device" 
              variant="solid"
              onPress={navigateToAddDevice}
              style={styles.addNewButton}
              icon="add-circle-outline"
              fullWidth
            />
          </>
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
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: `${colors.primary}15`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  addButton: {
    marginTop: spacing.md,
  },
  deviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  deviceDetails: {
    flex: 1,
  },
  deviceType: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  devicePhone: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  deviceActions: {
    marginLeft: spacing.md,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeText: {
    marginLeft: 4,
    color: colors.success,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  iconButton: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  iconButtonText: {
    fontSize: 12,
    color: colors.text.primary,
    marginTop: 4,
  },
  addNewButton: {
    marginTop: spacing.md,
  },
});
