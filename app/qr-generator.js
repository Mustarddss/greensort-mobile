import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; // 🟢 ADDED PARAMS
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../lib/supabase'; 

export default function QRGenerator() {
  const router = useRouter();
  const params = useLocalSearchParams(); // 🟢 KUKUNIN ANG PINASANG REWARD
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            const fullName = user.user_metadata?.full_name || 'GreenSort Resident';
            const targetReward = params.rewardName || 'None'; // 🟢 KINUHA ANG REWARD NAME
            
            // 🟢 KASAMA NA ANG REWARD NAME SA QR DATA!
            const qrContent = JSON.stringify({
                email: user.email,
                name: fullName,
                targetReward: targetReward, 
                timestamp: new Date().toISOString(),
                type: "EXCHANGE_REQUEST"
            });
            
            setUserData(qrContent);
        } else {
            setUserData(JSON.stringify({ error: "Not logged in" }));
        }
      } catch (e) {
        console.error("Error reading user data", e);
      } finally {
        setLoading(false);
      }
    };
    getUser();
  }, [params.rewardName]);

  return (
    <View style={{flex: 1, backgroundColor: '#FFF8E1'}}> 
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Rewards Drop-off Centers</Text>
        </View>

        <View style={styles.cardContainer}>
            <View style={styles.qrCard}>
                <View style={styles.qrBorder}>
                    {loading ? (
                        <ActivityIndicator size="large" color="#FF6D00" />
                    ) : (
                        <QRCode value={userData || "No Data"} size={200} color="black" backgroundColor="white" />
                    )}
                </View>

                <Text style={styles.instructionText}>Please present this QR code to the assigned official.</Text>
                <Text style={styles.subInstructionText}>Your recyclables will be weighed and verified before reward processing.</Text>

                <View style={styles.scanIconContainer}>
                    <MaterialCommunityIcons name="qrcode-scan" size={26} color="white" />
                </View>
            </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#FFF8E1' }, 
  header: { backgroundColor: '#FF6D00', paddingTop: 60, paddingBottom: 50, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  backButton: { position: 'absolute', left: 20, top: 60, zIndex: 10 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cardContainer: { alignItems: 'center', marginTop: -30 }, 
  qrCard: { backgroundColor: '#FFF8E1', width: '85%', borderRadius: 20, padding: 30, alignItems: 'center' },
  qrBorder: { padding: 15, backgroundColor: 'white', borderRadius: 10, borderWidth: 2, borderColor: '#5D4037', borderStyle: 'dashed', marginBottom: 30 },
  instructionText: { textAlign: 'center', color: '#BF360C', fontSize: 14, fontWeight: '600', marginBottom: 10, paddingHorizontal: 10 },
  subInstructionText: { textAlign: 'center', color: '#BF360C', fontSize: 12, opacity: 0.8, marginBottom: 30, lineHeight: 18, paddingHorizontal: 10 },
  scanIconContainer: { width: 60, height: 60, backgroundColor: '#007C00', borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, marginBottom: 20 }
});