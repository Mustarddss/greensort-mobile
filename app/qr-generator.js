import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase'; 

export default function QRGenerator() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const insets = useSafeAreaInsets();
  
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🟢 PARAMS KUNG BANKED REDEMPTION ITO
  const isBankedRedemption = params.isBankedRedemption === 'true';
  const bankedKg = params.bankedKg || '0';
  const collectorEmail = params.collectorEmail || '';

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            // 🟢 FIXED: KINUKUHA NA ANG PROFILE DATA PARA ISAMA SA QR!
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

            const fullName = user.user_metadata?.full_name || 'GreenSort Resident';
            const targetReward = params.rewardName || 'None'; 
            const targetMaterial = params.materialType || 'Recyclables'; 
            const requiredKg = params.wasteQty || '0'; // 🟢 FIXED: SINASALO YUNG TARGET KG
            const rewardImg = params.rewardImage || ''; // 🟢 FIXED: SINASALO YUNG REWARD PHOTO

            // 🟢 ISAMA ANG BANKED DETAILS, ADDRESS, PIC, AT TARGET KG SA QR JSON DATA
            const qrContent = JSON.stringify({
                email: user.email,
                name: fullName,
                address: profile?.address || profile?.full_address || (profile?.barangay ? `${profile.barangay}, ${profile.city}` : 'Address not provided'),
                avatar: profile?.avatar_url || '',
                targetReward: isBankedRedemption ? "Redeem Banked Points" : targetReward, 
                targetMaterial: targetMaterial, 
                wasteQty: requiredKg, 
                rewardImage: rewardImg,
                isBankedRedemption: isBankedRedemption, 
                bankedKg: bankedKg, 
                collectorEmail: collectorEmail, 
                timestamp: new Date().toISOString(),
                type: isBankedRedemption ? "BANKED_REDEMPTION" : "EXCHANGE_REQUEST"
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
  }, [params.rewardName, params.materialType, params.wasteQty, isBankedRedemption]);

  return (
    <View style={styles.container}> 
      <StatusBar style="light" />

      {/* 🟢 EXACT HEADER UI FROM PIC 2 */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View>
              <Text style={styles.headerTitle}>Rewards Drop-off Centers</Text>
              <Text style={styles.headerSubtitle}>{isBankedRedemption ? 'Redeem Banked Points' : 'Your GreenSort QR Code'}</Text>
          </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.qrCard}>
            
            {/* 🟢 DASHED BORDER AROUND QR */}
            <View style={styles.qrBorder}>
                {loading ? (
                    <ActivityIndicator size="large" color="#007C00" />
                ) : (
                    <QRCode value={userData || "No Data"} size={220} color="black" backgroundColor="white" />
                )}
            </View>

            {/* 🟢 GREEN TEXT EXACTLY LIKE THE PICTURE */}
            {isBankedRedemption ? (
                <>
                    <Text style={styles.instructionText}>Present this QR code to the collector.</Text>
                    <Text style={[styles.instructionText, {fontSize: 12, marginTop: -15}]}>You are claiming your banked <Text style={{fontWeight:'bold'}}>{bankedKg}kg</Text> of <Text style={{fontWeight:'bold'}}>{params.materialType}</Text>.</Text>
                </>
            ) : (
                <Text style={styles.instructionText}>
                    Please present this QR code to the assigned official. Your recyclables will be weighed and verified before reward processing.
                </Text>
            )}

            {/* 🟢 BAGONG GUIDELINES PARA KAY RESIDENT (BANKED KG EXPLANATION) */}
            {!isBankedRedemption && (
                <View style={styles.guidelineBox}>
                    <View style={styles.guidelineHeader}>
                        <Ionicons name="information-circle" size={18} color="#007C00" />
                        <Text style={styles.guidelineTitle}>How it works</Text>
                    </View>
                    <Text style={styles.guidelineText}>
                        Once scanned by the center, your surrender details will be viewed for verification. 
                        If your recyclables <Text style={{fontWeight: 'bold'}}>do not meet the target weight</Text> required for the reward, 
                        the weighed amount will automatically be saved to your <Text style={{fontWeight: 'bold'}}>Banked Kg</Text>. 
                        You can accumulate this and claim your reward some other day!
                    </Text>
                </View>
            )}

            {/* 🟢 FLOATING GREEN SCAN ICON SA IBABA NG CARD */}
            <View style={styles.scanIconContainer}>
                <MaterialCommunityIcons name="qrcode-scan" size={32} color="white" />
            </View>

        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
      flex: 1, 
      backgroundColor: '#F5F7FA' 
  },
  header: { 
      backgroundColor: '#007C00', 
      paddingBottom: 30, 
      paddingHorizontal: 20, 
      borderBottomLeftRadius: 30, 
      borderBottomRightRadius: 30, 
      flexDirection: 'row', 
      alignItems: 'center',
      elevation: 5,
      zIndex: 10
  },
  backButton: { 
      marginRight: 15,
      padding: 5
  },
  headerTitle: { 
      color: 'white', 
      fontSize: 20, 
      fontWeight: 'bold' 
  },
  headerSubtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 12,
      marginTop: 2
  },
  scrollContent: {
      paddingTop: 30,
      paddingBottom: 60,
      alignItems: 'center'
  },
  qrCard: { 
      backgroundColor: 'white', 
      width: '88%', 
      borderRadius: 24, 
      padding: 25, 
      paddingBottom: 50, // Space for the floating button
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
      position: 'relative'
  },
  qrBorder: { 
      padding: 15, 
      backgroundColor: 'white', 
      borderRadius: 16, 
      borderWidth: 2, 
      borderColor: '#007C00', 
      borderStyle: 'dashed', 
      marginBottom: 25 
  },
  instructionText: { 
      textAlign: 'center', 
      color: '#007C00', 
      fontSize: 14, 
      fontWeight: '700', 
      marginBottom: 25, 
      lineHeight: 22,
      paddingHorizontal: 10 
  },
  guidelineBox: {
      backgroundColor: '#E8F5E9',
      padding: 15,
      borderRadius: 16,
      width: '100%',
      borderWidth: 1,
      borderColor: '#C8E6C9'
  },
  guidelineHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8
  },
  guidelineTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#007C00',
      marginLeft: 6
  },
  guidelineText: {
      fontSize: 12,
      color: '#3E5641',
      lineHeight: 18,
      textAlign: 'justify'
  },
  scanIconContainer: { 
      width: 70, 
      height: 70, 
      backgroundColor: '#007C00', 
      borderRadius: 35, 
      justifyContent: 'center', 
      alignItems: 'center', 
      position: 'absolute',
      bottom: -35, // Floats exactly on the border bottom
      shadowColor: '#007C00', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.4, 
      shadowRadius: 6, 
      elevation: 6 
  }
});