import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl,
  TouchableOpacity,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { getLogs, clearLogs, LogEntry } from '../../utils/logging';
import { colors } from '../styles/theme';
import { StandardHeader } from '../components/StandardHeader';

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async () => {
    const fetchedLogs = await getLogs();
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
    }, [])
  );

  // Initial load
  useEffect(() => {
    loadLogs();
  }, []);

  const handleClearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive', 
          onPress: async () => {
            await clearLogs();
            setLogs([]);
          } 
        }
      ]
    );
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get appropriate icon for different actions
  const getActionIcon = (action: string): {name: string; color: string} => {
    if (action.includes('Gate Open')) return {name: 'unlock-outline', color: colors.success};
    if (action.includes('Gate Close')) return {name: 'lock-closed-outline', color: colors.primary};
    if (action.includes('Password Change')) return {name: 'key-outline', color: colors.warning};
    if (action.includes('User Management')) return {name: 'people-outline', color: colors.info};
    if (action.includes('Admin Registration')) return {name: 'person-add-outline', color: '#9c27b0'};
    if (action.includes('Access Control')) return {name: 'shield-outline', color: '#3f51b5'};
    if (action.includes('Relay Timing')) return {name: 'timer-outline', color: '#ff9800'};
    if (action.includes('Status Check')) return {name: 'help-circle-outline', color: '#009688'};
    if (action.includes('Initial Setup')) return {name: 'construct-outline', color: colors.secondary};
    return {name: 'information-outline', color: colors.primary};
  };

  const getStatusLabel = (item: LogEntry) => {
    if (!item.success) return "Failed";
    
    if (item.action.includes('Gate Open')) return "Gate Opened";
    if (item.action.includes('Gate Close')) return "Gate Closed";
    if (item.action.includes('Password Change')) return "Password Updated";
    if (item.action.includes('User Management')) {
      if (item.details.includes('Added')) return "User Added";
      if (item.details.includes('Removed')) return "User Removed";
      return "Updated";
    }
    if (item.action.includes('Admin Registration')) return "Registered";
    if (item.action.includes('Access Control')) return "Mode Changed";
    if (item.action.includes('Relay Timing')) return "Timing Set";
    if (item.action.includes('Status Check')) return "Status Requested";
    
    return "Success";
  };

  const renderLogItem = ({ item }: { item: LogEntry }) => {
    const icon = getActionIcon(item.action);
    const statusLabel = getStatusLabel(item);
    
    return (
      <View style={[styles.logItem, item.success ? styles.successLog : styles.errorLog]}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon.name} size={24} color={icon.color} />
        </View>
        
        <View style={styles.logContent}>
          <View style={styles.logHeader}>
            <Text style={styles.logAction}>{item.action}</Text>
            <Text 
              style={[
                styles.logStatus, 
                {
                  backgroundColor: item.success ? `${colors.success}30` : `${colors.danger}30`,
                  color: item.success ? colors.success : colors.danger
                }
              ]}
            >
              {statusLabel}
            </Text>
          </View>
          
          <Text style={styles.logDetails}>{item.details}</Text>
          
          <View style={styles.logFooter}>
            <Text style={styles.logTime}>{formatDate(item.timestamp)}</Text>
            {item.user && <Text style={styles.logUser}>by {item.user}</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <StandardHeader 
        rightAction={
          logs.length > 0 ? (
            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={handleClearLogs}
            >
              <Ionicons name="trash-outline" size={24} color={colors.danger} />
            </TouchableOpacity>
          ) : null
        }
      />
      
      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={colors.gray} />
          <Text style={styles.emptyText}>No activity recorded yet</Text>
          <Text style={styles.emptySubText}>
            Commands sent to your GSM relay device will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  clearButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  logItem: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  successLog: {
    borderLeftWidth: 0,
  },
  errorLog: {
    borderLeftWidth: 0,
  },
  iconContainer: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  logContent: {
    flex: 1,
    padding: 12,
    paddingLeft: 0,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logAction: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  logStatus: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  logDetails: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTime: {
    color: '#888',
    fontSize: 12,
  },
  logUser: {
    color: '#888',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  }
});
