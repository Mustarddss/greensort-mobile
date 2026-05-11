import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);
  const [targetRoute, setTargetRoute] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // May naka-login! Tingnan natin ang role
        const userRole = session.user.user_metadata?.role;

        if (userRole === 'center') {
          // 🟢 DITO ANG FIX: Pinalitan natin ng '/collector-dashboard' base sa screenshot mo!
          setTargetRoute('/collector-dashboard'); 
        } else {
          // Resident ito, punta sa tabs
          setTargetRoute('/(tabs)/dashboard');
        }
      } else {
        // Walang naka-login, punta sa onboarding
        setTargetRoute('/onboarding');
      }
      
      setIsChecking(false);
    };

    checkSession();
  }, []);

  // 1. Habang nagche-check sa Supabase, maglo-loading muna
  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' }}>
        <ActivityIndicator size="large" color="#007C00" />
      </View>
    );
  }

  // 2. Kapag alam na kung saan pupunta, gamitin ang <Redirect /> (Mas safe ito sa Expo Router)
  if (targetRoute) {
    return <Redirect href={targetRoute} />;
  }

  return null;
}