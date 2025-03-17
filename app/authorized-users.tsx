import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StandardHeader } from './components/StandardHeader';
import { Card } from './components/Card';
import { Button } from './components/Button';
import { colors, spacing, borderRadius } from './styles/theme';
import { useDevices } from './contexts/DeviceContext';
import { useDataStore } from './contexts/DataStoreContext';
import { useAuthorizedUsers } from './hooks/useAuthorizedUsers';
import { DeviceData } from '../types/devices';
import { mapIoniconName } from './utils/iconMapping';

export default function AuthorizedUsersPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeDevice } = useDevices();
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { users, loadUsers } = useAuthorizedUsers(deviceId);
  const { 
    getDeviceById, 
    deauthorizeUserForDevice, 
    deleteUser,
    addDeviceLog,
    logSMSOperation
  } = useDataStore();

  // Load data based on deviceId from params or active device
  useEffect(() => {
    let currentDeviceId: string | undefined = undefined;
    
    if (params.deviceId) {
      currentDeviceId = String(params.deviceId);
      loadDeviceById(currentDeviceId);
    } else if (activeDevice) {
      currentDeviceId = activeDevice.id;
      setDevice(activeDevice);
      setUnitNumber(activeDevice.unitNumber);
      setPassword(activeDevice.password);
    }
    
    setDeviceId(currentDeviceId);
  }, [params.deviceId, activeDevice]);

  const loadDeviceById = async (deviceId: string) => {
    try {
      const foundDevice = getDeviceById(deviceId);
      
      if (foundDevice) {
        setDevice(foundDevice);
        setUnitNumber(foundDevice.unitNumber);
        setPassword(foundDevice.password);
      }
    } catch (error) {
      console.error('Failed to load device:', error);
    }
  };

  // Load users when deviceId changes
  useEffect(() => {
    if (deviceId) {
      setIsLoading(true);
      loadUsers().finally(() => setIsLoading(false));
    }
  }, [deviceId]);

  // After any user operation that changes the user list, make sure to refresh the parent component
  const deleteUserById = async (userId: string) => {
    if (!deviceId) return;
    
    try {
      setIsDeleting(true);
      
      // Find user to get serial number before deleting
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      // Confirm deletion
      Alert.alert(
        "Delete User",
        `Are you sure you want to delete ${user.name || 'this user'}?\n\nThis will remove the user from the device. Phone: ${user.phoneNumber}`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: async () => {
              try {
                // Send command to delete user from device
                const command = `${password}A${user.serialNumber}##`;
                await sendSMS(command);
                
                // Remove user from device's authorized list
                await deauthorizeUserForDevice(deviceId, userId);
                
                // Delete user from DataStore if not used by other devices
                await deleteUser(userId);
                
                // Refresh the list
                const updatedUsers = await loadUsers();
                
                // Log the action
                await addDeviceLog(deviceId, 'User Management', `Deleted user: ${user.name}`, true);
                
                Alert.alert('Success', 'User deleted successfully');
              } catch (error) {
                console.error('Failed to delete user:', error);
                Alert.alert('Error', 'Failed to delete user');
              } finally {
                setIsDeleting(false);
              }
            } 
          }
        ]
      );
    } catch (error) {
      console.error('Failed to prepare user deletion:', error);
      Alert.alert('Error', 'Failed to prepare user deletion');
      setIsDeleting(false);
    }
  };

  const sendSMS = async (command: string) => {
    if (!unitNumber) {
      Alert.alert('Error', 'Device phone number not available');
      return;
    }

    try {
      // Use the enhanced logSMSOperation function for consistent logging
      if (deviceId) {
        await logSMSOperation(deviceId, command);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      Alert.alert('Error', 'Failed to send command');
      return false;
    }
  };

  const addNewUser = () => {
    router.back(); // Go back to step3 which has the add user form
  };

  return (
    <View style={styles.container}>
      <StandardHeader 
        title="Authorized Users" 
        showBack 
        rightAction={{
          icon: "add-circle-outline",
          onPress: addNewUser
        }}
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {device && (
          <View style={styles.deviceInfoContainer}>
            <Ionicons name="hardware-chip" size={20} color={colors.primary} />
            <Text style={styles.deviceName}>{device.name}</Text>
          </View>
        )}
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : users.length === 0 ? (
          <Card title="No Authorized Users">
            <Text style={styles.emptyText}>
              No authorized users have been added yet. Add your first user to allow them to control this device.
            </Text>
            <Button 
              title="Add First User" 
              onPress={addNewUser}
              icon={<Ionicons name="person-add-outline" size={20} color="white" />}
              style={styles.addButton}
              fullWidth
            />
          </Card>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              {users.length} Authorized {users.length === 1 ? 'User' : 'Users'}
            </Text>
            
            {users.map((user, index) => (
              <Card key={`user_${user.id || index}`} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <Text style={styles.userName}>{user.name || 'Unnamed User'}</Text>
                  <View style={styles.userSerialContainer}>
                    <Text style={styles.userSerial}>#{user.serialNumber}</Text>
                  </View>
                </View>
                
                <View style={styles.userDetails}>
                  <View style={styles.userDetailRow}>
                    <Ionicons name="call-outline" size={18} color={colors.text.secondary} style={styles.userDetailIcon} />
                    <Text style={styles.userDetailText}>{user.phoneNumber}</Text>
                  </View>
                  
                  {user.startTime && user.endTime && (
                    <View style={styles.userDetailRow}>
                      <Ionicons name="time-outline" size={18} color={colors.text.secondary} style={styles.userDetailIcon} />
                      <Text style={styles.userDetailText}>
                        Access period: {user.startTime} to {user.endTime}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.userActionContainer}>
                  <TouchableOpacity 
                    style={styles.userDeleteButton}
                    onPress={() => deleteUserById(user.id)}
                    disabled={isDeleting}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                    <Text style={styles.userDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
            
            <Button 
              title="Add Another User" 
              onPress={addNewUser}
              icon={<Ionicons name="person-add-outline" size={20} color="white" />}
              style={styles.addMoreButton}
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
    paddingBottom: spacing.xxl,
  },
  deviceInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  loadingContainer: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.text.secondary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text.secondary,
    marginVertical: spacing.lg,
    lineHeight: 22,
  },
  userCard: {
    marginBottom: spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  userSerialContainer: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userSerial: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  userDetails: {
    marginBottom: spacing.md,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userDetailIcon: {
    marginRight: spacing.sm,
  },
  userDetailText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  userActionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  userDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
  },
  userDeleteText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  addButton: {
    marginVertical: spacing.md,
  },
  addMoreButton: {
    marginTop: spacing.md, 
    marginBottom: spacing.xl,
  },
});