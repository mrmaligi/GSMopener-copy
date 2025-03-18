import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '../components/Button';
import { TextInputField } from '../components/TextInputField';
import { useDataStore } from '../contexts/DataStoreContext';
import { sendSMSCommand } from '../../utils/smsUtils';
import { safeExecute } from '../../utils/errorUtils';
import { colors, spacing } from '../styles/theme';

const SafeSMSExample = () => {
  // State management with consistent structure
  const [unitNumber, setUnitNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the unified data store
  const { store } = useDataStore();
  
  // Get the active device - memoize to prevent unnecessary re-renders
  const activeDevice = store.devices.find(
    d => d.id === store.globalSettings.activeDeviceId
  );
  
  // Load data when component mounts or active device changes
  // Use useCallback to prevent the function from being recreated on every render
  const loadDeviceData = useCallback(async () => {
    if (!activeDevice) return;
    
    await safeExecute(
      async () => {
        setUnitNumber(activeDevice.unitNumber);
        setPassword(activeDevice.password);
      },
      {
        setLoading,
        logAction: 'Load Device Data',
        showAlert: false
      }
    );
  }, [activeDevice]);
  
  // Only run effect when loadDeviceData changes (which depends on activeDevice)
  useEffect(() => {
    loadDeviceData();
  }, [loadDeviceData]);
  
  // SMS command handlers
  const handleOpenGate = async () => {
    if (!activeDevice) return;
    
    await sendSMSCommand({
      phoneNumber: unitNumber,
      command: `${password}CC`,
      deviceId: activeDevice.id,
      setLoading
    });
  };
  
  const handleCloseGate = async () => {
    if (!activeDevice) return;
    
    await sendSMSCommand({
      phoneNumber: unitNumber,
      command: `${password}DD`,
      deviceId: activeDevice.id,
      setLoading
    });
  };
  
  const handleCheckStatus = async () => {
    if (!activeDevice) return;
    
    await sendSMSCommand({
      phoneNumber: unitNumber,
      command: `${password}EE`,
      deviceId: activeDevice.id,
      setLoading
    });
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Control Device: {activeDevice ? activeDevice.name : 'No device selected'}
      </Text>
      
      <View style={styles.buttonGroup}>
        <Button
          title="Open Gate"
          onPress={handleOpenGate}
          loading={isLoading}
          disabled={!unitNumber || !password}
          icon="lock-open-outline"
          style={styles.button}
        />
        
        <Button
          title="Close Gate"
          onPress={handleCloseGate}
          loading={isLoading}
          disabled={!unitNumber || !password}
          icon="lock-closed-outline"
          style={styles.button}
        />
        
        <Button
          title="Check Status"
          onPress={handleCheckStatus}
          loading={isLoading}
          disabled={!unitNumber || !password}
          variant="secondary"
          icon="information-circle-outline"
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.text.primary,
  },
  buttonGroup: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  button: {
    marginVertical: spacing.xs,
  },
});

export default SafeSMSExample;
