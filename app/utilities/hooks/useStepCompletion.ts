import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDataStore } from '../../contexts/DataStoreContext';

export interface StepCompletionOptions {
  stepKey: string;
  shouldCompleteOnMount?: boolean;
}

export function useStepCompletion({ stepKey, shouldCompleteOnMount = false }: StepCompletionOptions) {
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { store, updateGlobalSettings } = useDataStore();

  useEffect(() => {
    loadCompletionStatus();
  }, []);

  useEffect(() => {
    if (shouldCompleteOnMount) {
      markStepCompleted();
    }
  }, [shouldCompleteOnMount]);

  const loadCompletionStatus = async () => {
    setIsLoading(true);
    try {
      const isStepCompleted = store.globalSettings.completedSteps.includes(stepKey);
      setIsCompleted(isStepCompleted);
    } catch (error) {
      console.error(`Failed to check completion status for step ${stepKey}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const markStepCompleted = async () => {
    try {
      if (!isCompleted) {
        const updatedSteps = [...store.globalSettings.completedSteps];
        if (!updatedSteps.includes(stepKey)) {
          updatedSteps.push(stepKey);
        }
        
        await updateGlobalSettings({
          completedSteps: updatedSteps
        });
        
        setIsCompleted(true);
      }
    } catch (error) {
      console.error(`Failed to mark step ${stepKey} as completed:`, error);
    }
  };

  const resetStepCompletion = async () => {
    try {
      if (isCompleted) {
        const updatedSteps = store.globalSettings.completedSteps.filter(step => step !== stepKey);
        
        await updateGlobalSettings({
          completedSteps: updatedSteps
        });
        
        setIsCompleted(false);
      }
    } catch (error) {
      console.error(`Failed to reset completion for step ${stepKey}:`, error);
    }
  };

  return {
    isCompleted,
    isLoading,
    markStepCompleted,
    resetStepCompletion
  };
}

// Make sure to export it as default
export default useStepCompletion;
