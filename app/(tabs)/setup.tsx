import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from '../components/StandardHeader';
import { Card } from '../components/Card';
import { colors, spacing, shadows, borderRadius } from '../styles/theme';
import { useDevices } from '../contexts/DeviceContext';

type SetupStep = {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
};

export default function SetupPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { activeDevice } = useDevices();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Load completed steps on mount or when active device changes
  useEffect(() => {
    loadData();
  }, [activeDevice]);

  const loadData = async () => {
    try {
      const savedCompletedSteps = await AsyncStorage.getItem('completedSteps');
      if (savedCompletedSteps) setCompletedSteps(JSON.parse(savedCompletedSteps));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const markStepComplete = async (stepId: string) => {
    try {
      if (!completedSteps.includes(stepId)) {
        const newCompletedSteps = [...completedSteps, stepId];
        setCompletedSteps(newCompletedSteps);
        await AsyncStorage.setItem('completedSteps', JSON.stringify(newCompletedSteps));
      }
    } catch (error) {
      console.error('Error saving completed step:', error);
    }
  };

  const setupSteps: SetupStep[] = [
    {
      id: 'step1',
      title: 'Initial Configuration',
      description: 'Set up your GSM opener device',
      icon: 'settings-outline',
      route: '/step1'
    },
    {
      id: 'step2',
      title: 'Change Password',
      description: 'Update default device password',
      icon: 'key-outline',
      route: '/step2'
    },
    {
      id: 'step3',
      title: 'User Management',
      description: 'Add authorized phone numbers',
      icon: 'people-outline',
      route: '/step3'
    },
    {
      id: 'step4',
      title: 'Relay Settings',
      description: 'Configure relay behavior',
      icon: 'options-outline',
      route: '/step4'
    },
  ];

  const navigateToStep = (step: SetupStep) => {
    if (!activeDevice && step.id !== 'step1') {
      Alert.alert(
        'Setup Required',
        'Please complete the initial setup first to configure your device.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    router.push({
      pathname: step.route,
      params: activeDevice ? { deviceId: activeDevice.id } : {}
    });
  };

  return (
    <View style={styles.container}>
      <StandardHeader />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title="Device Configuration" subtitle="Follow these steps to set up your GSM relay" elevated>
          <View style={styles.setupStatus}>
            <View style={styles.deviceInfoContainer}>
              <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
              <Text style={styles.deviceInfoLabel}>Device:</Text>
              <Text style={styles.deviceInfoValue}>
                {activeDevice ? activeDevice.name : 'Not configured'}
              </Text>
            </View>
            
            {activeDevice && (
              <View style={styles.deviceInfoContainer}>
                <Ionicons name="call-outline" size={24} color={colors.primary} />
                <Text style={styles.deviceInfoLabel}>Number:</Text>
                <Text style={styles.deviceInfoValue}>{activeDevice.unitNumber}</Text>
              </View>
            )}
          </View>
        </Card>
        
        {setupSteps.map((step, index) => (
          <TouchableOpacity 
            key={step.id}
            onPress={() => navigateToStep(step)}
            style={styles.stepContainer}
          >
            <Card style={styles.stepCard}>
              <View style={styles.stepContent}>
                <View style={styles.stepIconContainer}>
                  <Ionicons 
                    name={step.icon as any}
                    size={24} 
                    color={colors.primary}
                  />
                </View>
                
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
                
                <View style={styles.stepIndicator}>
                  {completedSteps.includes(step.id) ? (
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  ) : (
                    <Ionicons name="chevron-forward" size={24} color={colors.text.secondary} />
                  )}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
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
  setupStatus: {
    marginVertical: spacing.sm,
  },
  deviceInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  deviceInfoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
    marginLeft: spacing.sm,
    marginRight: spacing.xs,
  },
  deviceInfoValue: {
    fontSize: 16,
    color: colors.text.secondary,
    flex: 1,
  },
  stepContainer: {
    marginBottom: spacing.sm,
  },
  stepCard: {
    padding: spacing.sm,
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 2,
  },
  stepIndicator: {
    marginLeft: spacing.sm,
  },
});