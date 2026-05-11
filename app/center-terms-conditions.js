import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CenterTermsConditions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sections = [
    {
      title: '1. Center Account Responsibilities',
      text: 'The registered drop-off center is responsible for keeping its center name, contact number, operating days, and operating hours accurate and updated.'
    },
    {
      title: '2. Accepting Recyclable Materials',
      text: 'Centers must only accept recyclable materials listed in their approved program. Hazardous, illegal, or unsafe waste must not be accepted through GreenSort.'
    },
    {
      title: '3. Verification of Surrenders',
      text: 'Centers must carefully check the waste type, weight, cleanliness, and condition before marking a surrender as received or sending a receipt.'
    },
    {
      title: '4. Rewards and Availability',
      text: 'Centers are responsible for managing reward availability, stock, and claimed status. Rewards should only be marked available when the center can provide them.'
    },
    {
      title: '5. Receipts and Records',
      text: 'All completed transactions should generate accurate surrender history and receipt records for both the resident and the center.'
    },
    {
      title: '6. Fair Use and Conduct',
      text: 'Centers must treat all users fairly and should not manipulate weights, rewards, receipts, or surrender records.'
    },
    {
      title: '7. Account Review',
      text: 'GreenSort may review, suspend, or restrict a center account if reports, false transactions, or policy violations are detected.'
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" translucent={true} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
          <Text style={styles.headerTitle}>Center Terms</Text>
          <Text style={styles.headerSubtitle}>For GreenSort partner centers</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <MaterialCommunityIcons name="file-document-check-outline" size={34} color="#0066FF" />
          <Text style={styles.introTitle}>Terms & Conditions for Centers</Text>
          <Text style={styles.introText}>
            These terms apply to registered barangay, community, and organization drop-off centers using GreenSort.
          </Text>
        </View>

        {sections.map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionText}>{section.text}</Text>
          </View>
        ))}

        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            By continuing to use the GreenSort Center Dashboard, you agree to follow these center-specific terms.
          </Text>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 12
  },
  headerTitle: { color: 'white', fontSize: 21, fontWeight: '900' },
  headerSubtitle: { color: '#E3F2FD', fontSize: 12, marginTop: 2 },
  content: { padding: 20 },
  introCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
    elevation: 3
  },
  introTitle: { fontSize: 20, fontWeight: '900', color: '#1C1C1E', marginTop: 10, textAlign: 'center' },
  introText: { color: '#607D8B', fontSize: 13, textAlign: 'center', lineHeight: 20, marginTop: 8 },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA'
  },
  sectionTitle: { fontSize: 15, fontWeight: '900', color: '#0066FF', marginBottom: 6 },
  sectionText: { fontSize: 13, color: '#455A64', lineHeight: 20 },
  footerNote: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 15,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB'
  },
  footerText: { color: '#0D47A1', fontSize: 13, lineHeight: 20, fontWeight: '600', textAlign: 'center' }
});
