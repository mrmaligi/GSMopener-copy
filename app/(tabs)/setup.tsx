import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { StandardHeader } from '../components/StandardHeader';
import { Card } from '../components/Card';
import { colors, spacing, borderRadius } from '../styles/theme';
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
  const { activeDevice } = useDevices();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const setupSteps: SetupStep[] = [
    {
      id: 'step1',
      title: 'Basic Configuration',
      description: 'Set device phone number and admin access',
      icon: 'call-outline',
      route: '/step1',
    },
    {
      id: 'step2',
      title: 'Change Password',
      description: 'Update your device password',
      icon: 'key-outline',
      route: '/step2',
    },
    {
      id: 'step3',
      title: 'Manage Users',
      description: 'Add or remove authorized users',
      icon: 'people-outline',
      route: '/step3', 
    },
    {
      id: 'step4',
      title: 'Device Settings',
      description: 'Configure access control and relay timing',
      icon: 'settings-outline',
      route: '/step4',
    },
  ];

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

  const navigateToStep = (step: SetupStep) => {
    const route = step.route + (activeDevice ? `?deviceId=${activeDevice.id}` : '');
    router.push(route);
  };

  return (
    <View style={styles.container}>
      <StandardHeader title="Setup & Configuration" />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Card title="Setup Process" elevated>
          <Text style={styles.setupDesc}>
            Follow these steps to configure your device.
          </Text>
          
          {activeDevice && (
            <View style={styles.deviceInfoContainer}>
              <Ionicons name="hardware-chip" size={20} color={colors.primary} />
              <Text style={styles.deviceName}>{activeDevice.name}</Text>
            </View>
          )}
          
          <View style={styles.stepsContainer}>
            {setupSteps.map((step, index) => (
              <TouchableOpacity 
                key={step.id}
                onPress={() => navigateToStep(step)}
                style={styles.stepButton}
              >
                <View style={[
                  styles.stepIconContainer,
                  (completedSteps.includes(step.id) && step.id !== 'step1' && step.id !== 'step4') && styles.completedStepIcon
                ]}>
                  <Ionicons 
                    name={(completedSteps.includes(step.id) && step.id !== 'step1' && step.id !== 'step4') ? "checkmark" : step.icon as any}
                    size={22} 
                    color={(completedSteps.includes(step.id) && step.id !== 'step1' && step.id !== 'step4') ? colors.text.inverse : colors.primary}
                  />
                </View>
                
                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
                
                <View style={[
                  styles.stepNumber,
                  (completedSteps.includes(step.id) && step.id !== 'step1' && step.id !== 'step4') && styles.completedStepNumber
                ]}>
                  <Text style={[
                    styles.stepNumberText,
                    (completedSteps.includes(step.id) && step.id !== 'step1' && step.id !== 'step4') && styles.completedStepNumberText
                  ]}>
                    {(completedSteps.includes(step.id) && step.id !== 'step1' && step.id !== 'step4') ? "✓" : (index + 1)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
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
  setupDesc: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 20,
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
  stepsContainer: {
    marginTop: spacing.sm,
  },
  stepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  completedStepIcon: {
    backgroundColor: colors.success,
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
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedStepNumber: {
    backgroundColor: colors.success,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  completedStepNumberText: {
    color: colors.text.inverse,
  },
});