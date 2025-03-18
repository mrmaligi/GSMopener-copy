import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDevices, User } from '../contexts/DeviceContext';

export const useAuthorizedUsers = (deviceId?: string) => {
  const { activeDevice, getAuthorizedUsers, saveAuthorizedUsers } = useDevices();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store the effective device ID in state to ensure it's tracked for changes
  const [effectiveDeviceId, setEffectiveDeviceId] = useState<string | undefined>(deviceId || activeDevice?.id);
  
  // Update effective device ID when props change
  useEffect(() => {
    const newEffectiveId = deviceId || activeDevice?.id;
    if (newEffectiveId !== effectiveDeviceId) {
      setEffectiveDeviceId(newEffectiveId);
    }
  }, [deviceId, activeDevice]);

  const loadUsers = useCallback(async () => {
    if (!getAuthorizedUsers) {
      setError('getAuthorizedUsers function is not available');
      setIsLoading(false);
      return;
    }
    
    // If no device ID is available, don't try to load users
    if (!effectiveDeviceId) {
      setUsers([]);
      setIsLoading(false);
      setError("No device selected");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      // Always use the effective device ID to load users
      const deviceUsers = await getAuthorizedUsers(effectiveDeviceId);
      setUsers(deviceUsers || []);
    } catch (error) {
      console.error(`Failed to load users for device ${effectiveDeviceId}:`, error);
      setError('Failed to load users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveDeviceId, getAuthorizedUsers]);

  const saveUsers = useCallback(async (updatedUsers: User[]) => {
    if (!saveAuthorizedUsers) {
      setError('saveAuthorizedUsers function is not available');
      return false;
    }
    
    // If no device ID is available, don't save users
    if (!effectiveDeviceId) {
      setError("No device selected");
      return false;
    }
    
    try {
      // Always use the effective device ID to save users
      await saveAuthorizedUsers(updatedUsers, effectiveDeviceId);
      
      // Update local state
      setUsers(updatedUsers);
      return true;
    } catch (error) {
      console.error(`Failed to save users for device ${effectiveDeviceId}:`, error);
      setError('Failed to save users');
      return false;
    }
  }, [effectiveDeviceId, saveAuthorizedUsers]);

  // Load users whenever the effective device ID changes
  useEffect(() => {
    if (effectiveDeviceId) {
      loadUsers();
    }
  }, [effectiveDeviceId, loadUsers]);

  return {
    users,
    setUsers,
    isLoading,
    error,
    loadUsers,
    deviceId: effectiveDeviceId,
    saveUsers
  };
};

export default useAuthorizedUsers;
