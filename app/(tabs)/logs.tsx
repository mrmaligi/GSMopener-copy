import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { colors, spacing, borderRadius } from '../styles/theme';
import { StandardHeader } from '../components/StandardHeader';
import { useDevices } from '../contexts/DeviceContext';
import { useDataStore } from '../contexts/DataStoreContext';
import { LogEntry } from '../../utils/DataStore';

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { activeDevice } = useDevices();
  const { getDeviceLogs, clearDeviceLogs } = useDataStore();

  const loadLogs = useCallback(async () => {
    if (!activeDevice) return;
    
    try {
      const deviceLogs = await getDeviceLogs(activeDevice.id);
      setLogs(deviceLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ));
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }, [activeDevice, getDeviceLogs]);

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [loadLogs])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  }, [loadLogs]);

  const handleClearLogs = () => {
    if (!activeDevice) return;
    
    Alert.alert(
      'Clear Logs',
      `Are you sure you want to clear all logs for ${activeDevice.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive', 
          onPress: async () => {
            await clearDeviceLogs(activeDevice.id);
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

  const renderLogItem = ({ item }: { item: LogEntry }) => {
    // Determine icon and color based on category
    let icon = "document-text-outline";
    let iconColor = colors.text.secondary;
    let borderColor = colors.border;
    
    switch(item.category) {
      case 'relay':
        icon = item.action.toLowerCase().includes('open') ? "lock-open" : "lock-closed";
        iconColor = item.success ? colors.success : colors.error;
        borderColor = item.success ? colors.success : colors.error;
        break;
      case 'User Management':
        icon = "people";
        iconColor = colors.primary;
        borderColor = colors.primary;
        break;
      case 'Device Management':
        icon = "hardware-chip";
        iconColor = colors.warning;
        borderColor = colors.warning;
        break;
      default:
        icon = "information-circle";
    }

    return (
      <View style={[
        styles.logItem, 
        { borderLeftColor: borderColor }
      ]}>
        <View style={styles.logItemContent}>
          <View style={styles.logHeader}>
            <Text style={styles.logAction}>{item.action}</Text>
            <Text style={styles.logTime}>{formatDate(item.timestamp)}</Text>
          </View>
          {item.details && <Text style={styles.logDetails}>{item.details}</Text>}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StandardHeader title="Activity Logs" />
      
      {activeDevice && (
        <View style={styles.deviceBanner}>
          <Text style={styles.deviceInfoText}>
            Showing logs for: {activeDevice.name}
          </Text>
        </View>
      )}
      
      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        contentContainerStyle={styles.logList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name="list-outline" 
              size={64} 
              color={colors.text.disabled} 
            />
            <Text style={styles.emptyText}>No logs found</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
      {logs.length > 0 && (
        <View style={styles.footer}>
          <Button 
            title="Clear Logs" 
            onPress={handleClearLogs} 
            variant="secondary"
            icon="trash-outline"
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
  deviceBanner: {
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
    paddingBottom: 80, // Space for footer
  },
  logItem: {
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    padding: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.sm,
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
    fontSize: 15,
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
});
