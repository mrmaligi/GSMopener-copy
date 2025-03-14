import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from './components/Header';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AuthorizedUsersList() {
  const [authorizedUsers, setAuthorizedUsers] = useState([]);
  const router = useRouter();

  const loadAuthorizedUsers = async () => {
    try {
      const savedUsers = await AsyncStorage.getItem('authorizedUsers');
      if (savedUsers) {
        setAuthorizedUsers(JSON.parse(savedUsers));
      }
    } catch (error) {
      console.error('Error loading authorized users', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadAuthorizedUsers();
    }, [])
  );

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
      <Header title="Authorized Users List" showBack backTo="/step3" />
      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Authorized Users Management</Text>
          <Text style={styles.infoText}>
            • Authorized numbers can dial the device to control the relay{'\n'}
            • Each user is stored in a position from 001-200{'\n'}
            • Access times can be set to restrict when users can operate the device
          </Text>
        </View>
        
        {authorizedUsers.length === 0 ? (
          <Text style={styles.noUserText}>No authorized users found.</Text>
        ) : (
          authorizedUsers.map((user, index) => (
            <View key={index} style={styles.userCard}>
              <View style={styles.userHeader}>
                <Text style={styles.userTitle}>{user.name || `User ${index + 1}`}</Text>
                <Text style={styles.userSerial}>#{user.serialNumber || user.id || (index + 1).toString().padStart(3, '0')}</Text>
              </View>
              
              <View style={styles.userDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{user.phoneNumber || user.phone || 'N/A'}</Text>
                </View>
                
                {(user.startTime && user.endTime) ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Access Period:</Text>
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
      
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => router.push('/step3')}
      >
        <Ionicons name="person-add-outline" size={20} color="white" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Add New User</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    padding: 16,
    paddingBottom: 80, // Add padding to avoid floating button overlap
  },
  noUserText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  userCard: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  userTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userDetail: {
    fontSize: 16,
    color: '#333',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userSerial: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  userDetails: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 16,
    color: '#555',
    width: 80,
  },
  detailValue: {
    fontSize: 16,
    flex: 1,
    color: '#333',
  },
  accessTimes: {
    flex: 1,
  },
  timeFormat: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
    marginTop: 2,
  },
});
