import { useState, useEffect, useCallback, useRef } from 'react';
import { useDataStore } from '../contexts/DataStoreContext';

export interface StepCompletionOptions {
  stepKey: string;
  shouldCompleteOnMount?: boolean;
}

export function useStepCompletion({ stepKey, shouldCompleteOnMount = false }: StepCompletionOptions) {
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isCheckingStatus = useRef(false);
  const { 
    store, 
    updateGlobalSettings, 
    isLoading: storeLoading,
    refreshStore
  } = useDataStore();

  // Use useRef to store the current completed steps without triggering effects
  const completedStepsRef = useRef<string[]>([]);
  
  // Update the ref when store changes
  useEffect(() => {
    completedStepsRef.current = store.globalSettings.completedSteps;
  }, [store.globalSettings.completedSteps]);

  // Function to check completion status - with fixed dependencies
  const checkCompletionStatus = useCallback(async () => {
    if (storeLoading || isCheckingStatus.current) return;
    
    isCheckingStatus.current = true;
    setIsLoading(true);
    
    try {
      await refreshStore();
      const isStepCompleted = completedStepsRef.current.includes(stepKey);
      setIsCompleted(isStepCompleted);
    } catch (error) {
      console.error(`Failed to check status for step ${stepKey}:`, error);
    } finally {
      setIsLoading(false);
      isCheckingStatus.current = false;
    }
  }, [stepKey, storeLoading, refreshStore]);

  // Check completion status when dependencies change
  useEffect(() => {
    checkCompletionStatus();
  }, [checkCompletionStatus]);

  // Auto-mark as completed if requested
  useEffect(() => {
    if (shouldCompleteOnMount && !storeLoading && !isLoading && !isCompleted) {
      markStepCompleted();
    }
  }, [shouldCompleteOnMount, storeLoading, isLoading, isCompleted]);

  const markStepCompleted = async () => {
    // First refresh to ensure we have the latest data
    await refreshStore();
    
    try {
      // Prevent duplicates by checking again
      if (!store.globalSettings.completedSteps.includes(stepKey)) {
        console.log(`useStepCompletion: Marking step ${stepKey} as completed`);
        const updatedSteps = [...store.globalSettings.completedSteps, stepKey];
        
        await updateGlobalSettings({
          completedSteps: updatedSteps
        });
        
        // Refresh the store to update UI
        await refreshStore();
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
    isLoading: isLoading || storeLoading,
    markStepCompleted,
    resetStepCompletion,
    checkCompletionStatus // Export this for manual refreshes
  };
}

export default useStepCompletion;
