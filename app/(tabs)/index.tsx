import React from 'react';
import { Redirect } from 'expo-router';

// Simple redirect to the home tab
export default function TabsIndex() {
  return <Redirect href="/home" />;
}
