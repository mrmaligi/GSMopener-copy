import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { spacing, shadows, borderRadius } from '../styles/theme';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { getLogs, clearLogs } from '../utils/logger';

// Define the log entry type
export interface LogEntry {
  id: string;
  timestamp: number;
  action: string;
  details: string;
  success: boolean;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, isDarkMode } = useTheme();

  // Reload logs when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [])
  );

  const loadLogs = async () => {
    try {
      setRefreshing(true);
      const loadedLogs = await getLogs();
      // Sort logs by timestamp (newest first)
      setLogs(loadedLogs.sort((a, b) => b.timestamp - a.timestamp));
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading logs:', error);
      setRefreshing(false);
    }
  };

  const handleClearLogs = async () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            try {
              await clearLogs();
              setLogs([]);
              Alert.alert('Success', 'All logs have been cleared.');
            } catch (error) {
              console.error('Error clearing logs:', error);
              Alert.alert('Error', 'Failed to clear logs. Please try again.');
            }
          }
        },
      ]
    );
  };

  const onRefresh = useCallback(() => {
    loadLogs();
  }, []);

  const renderLogItem = ({ item }: { item: LogEntry }) => {
    const date = new Date(item.timestamp);
    const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    
    return (
      <View style={[styles.logItem, { backgroundColor: item.success ? colors.success + '20' : colors.error + '20' }]}>
        <View style={styles.logHeader}>
          <Text style={[styles.logTitle, { color: colors.text.primary }]}>{item.action}</Text>
          <Ionicons 
            name={item.success ? "checkmark-circle" : "close-circle"} 
            size={18} 
            color={item.success ? colors.success : colors.error} 
          />
        </View>
        <Text style={[styles.logDetails, { color: colors.text.secondary }]}>{item.details}</Text>
        <Text style={[styles.logTimestamp, { color: colors.text.secondary }]}>{formattedDate}</Text>
      </View>
    );
  };

  // Use dynamic styles based on theme
  const dynamicStyles = {
    container: {
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
    },
    text: {
      color: colors.text.primary,
    }
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <Text style={[styles.headerTitle, dynamicStyles.text]}>Logs</Text>
        {logs.length > 0 && (
          <TouchableOpacity onPress={handleClearLogs} style={styles.clearButton}>
            <Text style={{ color: colors.error }}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <Card elevated>
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color={colors.text.secondary} />
              <Text style={[styles.emptyStateText, { color: colors.text.primary }]}>
                No logs available yet
              </Text>
              <Text style={[styles.emptyStateSubText, { color: colors.text.secondary }]}>
                Actions like sending commands or changing settings will be logged here
              </Text>
            </View>
          </Card>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.sm,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  logItem: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.xs,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  logDetails: {
    fontSize: 14,
    marginBottom: 8,
  },
  logTimestamp: {
    fontSize: 12,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubText: {
    fontSize: 14,
    textAlign: 'center',
  }
});
