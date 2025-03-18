import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from './components/StandardHeader';
import { useDevices, User } from './contexts/DeviceContext';
import { useTheme } from './contexts/ThemeContext';
import { colors, spacing, borderRadius } from './styles/theme';
import { mapIoniconName } from './utils/iconMapping';
import { useAuthorizedUsers } from './hooks/useAuthorizedUsers';

export default function AuthorizedUsersList() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useTheme();
  const { activeDevice } = useDevices();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  
  // Determine which device's users to load
  useEffect(() => {
    if (params.deviceId) {
      setDeviceId(String(params.deviceId));
    } else if (activeDevice) {
      setDeviceId(activeDevice.id);
    } else {
      setDeviceId(null);
    }
  }, [params.deviceId, activeDevice]);

  // Use the hook with the current device ID
  const { users: authorizedUsers, isLoading } = useAuthorizedUsers(deviceId || undefined);

  // Helper function to format date/time
  const formatAccessTime = (timeString) => {
    if (!timeString || timeString.length !== 10) return timeString;
    
    try {
      const year = `20${timeString.slice(0, 2)}`;
      const month = timeString.slice(2, 4);
      const day = timeString.slice(4, 6);
      const hour = timeString.slice(6, 8);
      const minute = timeString.slice(8, 10);
      
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      const monthName = months[parseInt(month) - 1] || month;
      
      return `${monthName} ${parseInt(day)}, ${year} ${hour}:${minute}`;
    } catch (error) {
      return timeString;
    }
  };

  return (
    <View style={styles.container}>
      <StandardHeader showBack backTo="/step3" title="Authorized Users" />
      
      <View style={styles.deviceBanner}>
        <Text style={styles.deviceInfo}>
          {activeDevice 
            ? `Device: ${activeDevice.name}`
            : 'No device selected'}
        </Text>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.infoCard}>
            <Ionicons name={mapIoniconName("information-circle-outline")} size={24} color={colors.primary} style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Authorized numbers can dial the device to control the relay. Each user is stored in a position from 001-200.
            </Text>
          </View>
          
          {authorizedUsers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name={mapIoniconName("person-outline")} size={60} color={colors.text.disabled} />
              <Text style={styles.emptyText}>No authorized users found</Text>
            </View>
          ) : (
            authorizedUsers.map((user, index) => (
              <View 
                key={`userlist_${deviceId}_${index}_${user.serialNumber || Math.random()}`}
                style={styles.userCard}
              >
                <View style={styles.userHeader}>
                  <Text style={styles.userName}>{user.name || `User ${index + 1}`}</Text>
                  <Text style={styles.userSerial}>#{user.serialNumber || (index + 1).toString().padStart(3, '0')}</Text>
                </View>
                
                <View style={styles.userDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone:</Text>
                    <Text style={styles.detailValue}>{user.phoneNumber || 'N/A'}</Text>
                  </View>
                  
                  {(user.startTime && user.endTime) ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Access:</Text>
                      <View style={styles.accessTimes}>
                        <Text style={styles.detailValue}>
                          {formatAccessTime(user.startTime)} - {formatAccessTime(user.endTime)}
                        </Text>
                        <Text style={styles.timeFormat}>
                          Format: {user.startTime} - {user.endTime}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Access:</Text>
                      <Text style={styles.detailValue}>Unlimited (No time restrictions)</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => router.push({
          pathname: '/step3',
          params: deviceId ? { deviceId } : {}
        })}
      >
        <Ionicons name={mapIoniconName("person-add-outline")} size={20} color="white" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Add New User</Text>
      </TouchableOpacity>
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
  deviceInfo: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: 80, // For floating button
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.text.secondary,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${colors.primary}10`,
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
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl * 2,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text.secondary,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
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
  userSerial: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  userDetails: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    width: 60,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
    color: colors.text.primary,
  },
  accessTimes: {
    flex: 1,
  },
  timeFormat: {
    fontSize: 12,
    color: colors.text.disabled,
    fontStyle: 'italic',
    marginTop: 2,
  },
  floatingButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: spacing.xs,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
