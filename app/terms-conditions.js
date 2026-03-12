import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TermsConditions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sections = [
    {
      title: "Data Collection",
      icon: "database-import",
      content: "We collect information such as your Full Name, Address, and Phone Number to verify recycle transactions and facilitate reward distribution within your Barangay."
    },
    {
      title: "Use of Information",
      icon: "shield-check",
      content: "Your data is used solely for the GreenSort system's functions, including community feed interactions, chat communication, and tracking your environmental impact."
    },
    {
      title: "Data Security",
      icon: "lock",
      content: "GreenSort uses secure database technologies (Supabase) to protect your personal information from unauthorized access or disclosure."
    },
    {
      title: "User Responsibilities",
      icon: "account-edit",
      content: "Users are responsible for providing truthful information. Fake posts or misleading reports may lead to account suspension or forfeiture of points."
    },
    {
      title: "Your Rights",
      icon: "hand-heart",
      content: "Under the Data Privacy Act, you have the right to access, correct, or request the deletion of your personal data by contacting the Barangay Admin."
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      
      {/* 🟢 SOLID GREEN CURVED HEADER (Matching Dashboard Size) */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>Terms & Privacy</Text>
                <Text style={styles.headerSubtitle}>Legal Information</Text>
            </View>
            <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
            {/* 🟢 SOLID GREEN ICON */}
            <MaterialCommunityIcons name="shield-account-outline" size={40} color="#007C00" />
            <Text style={styles.introTitle}>Your Privacy Matters</Text>
            <Text style={styles.introText}>
                GreenSort is committed to protecting your personal data in compliance with the Data Privacy Act of 2012.
            </Text>
        </View>

        {sections.map((section, index) => (
            <View key={index} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                    <View style={styles.iconCircle}>
                        {/* 🟢 SOLID GREEN ICON */}
                        <MaterialCommunityIcons name={section.icon} size={20} color="#007C00" />
                    </View>
                    <Text style={styles.sectionTitleText}>{section.title}</Text>
                </View>
                <Text style={styles.sectionBodyText}>{section.content}</Text>
            </View>
        ))}

        <View style={styles.footerInfo}>
            <Text style={styles.footerText}>Last Updated: March 2026</Text>
            <Text style={styles.footerText}>Version 1.0.0</Text>
        </View>
        
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F8F5' }, 
  
  // 🟢 UPDATED TO SOLID #007C00 & MATCHING DASHBOARD RADIUS
  header: { 
    backgroundColor: '#007C00',
    paddingBottom: 25, 
    paddingHorizontal: 25, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30, 
    elevation: 8, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 10 
  }, 
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCenter: { alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  iconButton: { backgroundColor: 'rgba(255,255,255,0.25)', padding: 8, borderRadius: 14 },

  content: { flex: 1, paddingHorizontal: 20 },

  introCard: { backgroundColor: 'white', borderRadius: 24, padding: 25, alignItems: 'center', marginTop: 20, marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  introTitle: { fontSize: 20, fontWeight: '900', color: '#1A2E20', marginTop: 10 },
  introText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20 },

  sectionCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0FDF4', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  sectionTitleText: { fontSize: 16, fontWeight: '800', color: '#1A2E20' },
  sectionBodyText: { fontSize: 14, color: '#555', lineHeight: 22 },

  footerInfo: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  footerText: { fontSize: 11, color: '#A0AAB2', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }
});