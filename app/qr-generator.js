import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function QRGenerator() {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Kukunin natin ang user info para ilagay sa QR Code
  useEffect(() => {
    const getUser = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem('user');
        const user = jsonValue != null ? JSON.parse(jsonValue) : { id: 'GUEST', fullName: 'Guest User' };
        
        // Ito ang laman ng QR Code (JSON string)
        // Pwede mong dagdagan ng ibang info kung kailangan
        const qrContent = JSON.stringify({
            userId: user.id,
            name: user.fullName,
            email: user.email,
            timestamp: new Date().toISOString(),
            type: "EXCHANGE_REQUEST"
        });
        
        setUserData(qrContent);
        setLoading(false);
      } catch (e) {
        console.error("Error reading user data", e);
        setLoading(false);
      }
    };
    getUser();
  }, []);

  return (
    <View style={{flex: 1, backgroundColor: '#FFF8E1'}}> 
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* 🟠 HEADER (Gradient Orange) */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Rewards Drop-off Centers</Text>
        </View>

        <View style={styles.cardContainer}>
            {/* 🔳 QR CODE BOX */}
            <View style={styles.qrCard}>
                <View style={styles.qrBorder}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6D00" />
                    ) : (
                        <QRCode 
                            value={userData || "No Data"} 
                            size={200} 
                            color="black" 
                            backgroundColor="white" 
                        />
                    )}
                </View>

                {/* 📝 INSTRUCTIONS */}
                <Text style={styles.instructionText}>
                    Please present this QR code to the assigned official.
                </Text>
                <Text style={styles.subInstructionText}>
                    Your recyclables will be weighed and verified before reward processing.
                </Text>

                {/* 🟩 SCAN BUTTON (Icon sa baba gaya ng design) */}
                <View style={styles.scanIconContainer}>
                    <MaterialCommunityIcons name="line-scan" size={30} color="white" />
                </View>
            </View>
        </View>

        {/* BOTTOM NAV (Optional: Kung gusto mo gayahin yung nasa screenshot na may tabs sa baba) */}
        {/* Note: Sa Expo Router, separate component ang tabs, pero pwede nating gayahin ang look for display purposes lang dito */}
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFF8E1' }, // Cream background
  
  // HEADER
  header: { 
      backgroundColor: '#FF6D00', // Orange
      paddingTop: 60, 
      paddingBottom: 50, 
      paddingHorizontal: 20, 
      borderBottomLeftRadius: 30, 
      borderBottomRightRadius: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
  },
  backButton: { position: 'absolute', left: 20, top: 60, zIndex: 10 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  // CARD
  cardContainer: { alignItems: 'center', marginTop: -30 }, // Overlap effect
  qrCard: { 
      backgroundColor: '#FFF8E1', // Match bg color based on design or White
      width: '85%',
      borderRadius: 20,
      padding: 30,
      alignItems: 'center',
      // Dashed Border Logic is tricky in RN, we use a simple view or image bg for simplicity
      // Or we can simulate dashed border with a library. For now, we keep it clean.
  },

  // QR BOX STYLE
  qrBorder: {
      padding: 15,
      backgroundColor: 'white',
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#5D4037', // Brownish border like screenshot
      borderStyle: 'dashed', // Dashed border
      marginBottom: 30
  },

  // TEXT
  instructionText: { 
      textAlign: 'center', 
      color: '#BF360C', // Dark Orange/Brown text
      fontSize: 14, 
      fontWeight: '600',
      marginBottom: 10,
      paddingHorizontal: 10
  },
  subInstructionText: {
      textAlign: 'center', 
      color: '#BF360C', 
      fontSize: 12,
      opacity: 0.8,
      marginBottom: 30,
      lineHeight: 18,
      paddingHorizontal: 10
  },

  // GREEN ICON BUTTON
  scanIconContainer: {
      width: 60,
      height: 60,
      backgroundColor: '#00C853', // Green
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      marginBottom: 20
  }
});