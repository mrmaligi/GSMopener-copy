import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { colors, spacing, borderRadius } from '../styles/theme';
import { getDeviceLogs, clearDeviceLogs } from '../../utils/logger';
import { StandardHeader } from '../components/StandardHeader';
import { useDevices } from '../contexts/DeviceContext';

interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  success: boolean;
  deviceId?: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { activeDevice } = useDevices();

  const loadLogs = async () => {
    // If activeDevice exists, get device-specific logs
    // otherwise fall back to all logs (legacy behavior)
    const fetchedLogs = await getDeviceLogs(activeDevice?.id);
    setLogs(fetchedLogs);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  };

  // Load logs when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [activeDevice]) // Reload logs when active device changes
  );

  // Initial load
  useEffect(() => {
    loadLogs();
  }, [activeDevice]); // Reload logs when active device changes

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Logs',
      activeDevice
        ? `Are you sure you want to clear all logs for ${activeDevice.name}?`
        : 'Are you sure you want to clear all logs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive', 
          onPress: async () => {
            // Clear logs for the active device (or all if no active device)
            await clearDeviceLogs(activeDevice?.id);
            setLogs([]);
          } 
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const renderLogItem = ({ item }: { item: LogEntry }) => (
    <Card style={[styles.logItem, { borderLeftColor: item.success ? colors.success : colors.error }]}>
      <View style={styles.logItemContent}>
        <View style={styles.logHeader}>
          <Text style={styles.logAction}>{item.action}</Text>
          <Text style={styles.logTime}>{formatDate(item.timestamp)}</Text>
        </View>
        <Text style={styles.logDetails}>{item.details}</Text>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <StandardHeader />
      
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceInfoText}>
          {activeDevice 
            ? `Logs for device: ${activeDevice.name} (${activeDevice.unitNumber})`
            : 'All logs (no device selected)'}
        </Text>
      </View>
      
      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.logList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.text.disabled} />
            <Text style={styles.emptyText}>No logs found</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      {logs.length > 0 && (
        <View style={styles.buttonContainer}>
          <Button 
            title="Clear Logs" 
            icon="trash-outline"
            onPress={handleClearLogs}
            variant="outline"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  deviceInfo: {
    backgroundColor: colors.surfaceVariant,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deviceInfoText: {
    color: colors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  logList: {
    padding: spacing.md,
  },
  logItem: {
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    padding: spacing.sm,
  },
  logItemContent: {
    marginLeft: spacing.xs,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  logAction: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  logTime: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  logDetails: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.disabled,
    marginTop: spacing.md,
  },
  buttonContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
