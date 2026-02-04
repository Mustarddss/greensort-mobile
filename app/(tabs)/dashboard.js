import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const GAP = 12; // Gap between grid items
const ITEM_WIDTH = (width - 40 - GAP) / 2; // Calculate exact width for 2 columns

export default function Dashboard() {
  const router = useRouter();

  // 🟢 1. INITIALIZE DATA (Fixed: Added recentTransactions to prevent crash)
  const [userData] = useState({
    name: 'Eco Warrior',  
    kgRecycled: 24.5,
    submissions: 12,
    upcycleProjects: 15,
    recentTransactions: [
        { id: 1, type: 'Plastic Bottles', date: 'Today, 10:30 AM', amount: '3kg' },
        { id: 2, type: 'Plastic Bottles', date: 'Today, 10:30 AM', amount: '3kg' },
        { id: 3, type: 'Plastic Bottles', date: 'Today, 10:30 AM', amount: '3kg' },
    ]
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00C853" />
      
      {/* 🟢 HEADER (Fixed Background) */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
            <View>
                <Text style={styles.appName}>GreenSort</Text>
                <Text style={styles.welcomeText}>Welcome back, {userData.name}!</Text>
            </View>
            {/* Faint Logo Icon */}
            <MaterialCommunityIcons name="recycle" size={50} color="rgba(255,255,255,0.2)" />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        
        {/* 1. ECO IMPACT */}
        <Text style={styles.sectionTitle}>Your Eco Impact</Text>
        <View style={styles.impactRow}>
            <ImpactCard 
                value={userData.kgRecycled} 
                unit="kg recycled" 
                icon="chart-line-variant" 
                color="#00C853" 
                bgColor="#E8F5E9" 
            />
            <ImpactCard 
                value={userData.submissions} 
                unit="submissions" 
                icon="target" 
                color="#2979FF" 
                bgColor="#E3F2FD" 
            />
            <ImpactCard 
                value={userData.upcycleProjects} 
                unit="upcycle projects" 
                icon="leaf" 
                color="#AA00FF" 
                bgColor="#F3E5F5" 
            />
        </View>

        {/* 2. QUICK ACTIONS (Perfect Grid Spacing) */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
            <ActionButton 
                color="#00C853" 
                icon="camera-outline" 
                label="Scan Waste" 
                onPress={() => router.push('/(tabs)/scan')} 
            />
            <ActionButton 
                color="#1976D2" 
                icon="book-open-page-variant" 
                label="Upcycling Projects" 
                onPress={() => router.push('/(tabs)/projects')} 
            />
            <ActionButton 
                color="#D500F9" 
                icon="history" 
                label="History" 
                onPress={() => router.push('/(tabs)/history')} 
            />
            <ActionButton 
                color="#EF6C00" 
                icon="trophy-outline" 
                label="Exchange" 
                onPress={() => router.push('/(tabs)/rewards')} 
            />
        </View>

        {/* 3. ECO TIP */}
        <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#FBC02D" />
                <Text style={styles.tipTitle}>Eco Tip of the Day</Text>
            </View>
            <Text style={styles.tipText}>
                Rinse and dry your recyclables before disposal. Clean materials are easier to process and more valuable!
            </Text>
        </View>

        {/* 4. TRANSACTIONS (Fixed: Added Safe Check ?.) */}
        <View style={styles.listContainer}>
            {userData.recentTransactions?.map((item) => (
                <View key={item.id} style={styles.transactionItem}>
                    <View>
                        <Text style={styles.transTitle}>{item.type}</Text>
                        <Text style={styles.transDate}>{item.date}</Text>
                    </View>
                    <Text style={styles.transAmount}>{item.amount}</Text>
                </View>
            ))}
        </View>

        <View style={{height: 100}} /> 
      </ScrollView>
    </View>
  );
}

// --- COMPONENTS ---

const ImpactCard = ({ value, unit, icon, color, bgColor }) => (
  <View style={styles.impactCard}>
    <View style={[styles.impactIconBg, { backgroundColor: bgColor }]}> 
      <MaterialCommunityIcons name={icon} size={24} color={color} />
    </View>
    <Text style={[styles.impactValue, { color: color }]}>{value}</Text>
    <Text style={styles.impactUnit}>{unit}</Text>
  </View>
);

const ActionButton = ({ color, icon, label, onPress }) => (
  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.9}>
    <MaterialCommunityIcons name={icon} size={28} color="white" />
    <Text style={styles.actionBtnText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F7FA' 
  },
  
  // HEADER
  header: {
    backgroundColor: '#00C853',
    paddingTop: 50, // Safe Area for StatusBar
    paddingBottom: 25,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    marginBottom: 10,
    elevation: 4, // Android Shadow
    shadowColor: '#000', // iOS Shadow
    shadowOpacity: 0.1,
    shadowOffset: {width: 0, height: 2},
  },
  headerContent: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  appName: { 
    color: 'white', 
    fontSize: 22, 
    fontWeight: '800', // Extra Bold
    letterSpacing: 0.5
  },
  welcomeText: { 
    color: 'rgba(255,255,255,0.9)', 
    fontSize: 13, 
    marginTop: 4,
    fontWeight: '500' 
  },

  // BODY
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

  sectionTitle: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#263238', 
    marginBottom: 12, 
    marginTop: 10 
  },

  // IMPACT CARDS
  impactRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  impactCard: { 
    backgroundColor: 'white', 
    width: (width - 55) / 3, // Divides space into 3 equal parts
    paddingVertical: 18, 
    borderRadius: 16, 
    alignItems: 'center', 
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2}
  },
  impactIconBg: { 
    padding: 10, 
    borderRadius: 12, 
    marginBottom: 10 
  },
  impactValue: { 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  impactUnit: { 
    fontSize: 10, 
    color: '#90A4AE', 
    textAlign: 'center', 
    marginTop: 2,
    fontWeight: '500'
  },

  // QUICK ACTIONS
  actionGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  actionBtn: { 
    width: ITEM_WIDTH, 
    height: 100, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: GAP, 
    elevation: 3,
    shadowColor: color => color, // Dynamic shadow color match
    shadowOpacity: 0.3,
    shadowOffset: {width: 0, height: 4}
  },
  actionBtnText: { 
    color: 'white', 
    fontWeight: '600', 
    fontSize: 13, 
    marginTop: 8 
  },

  // ECO TIP
  tipCard: { 
    backgroundColor: '#F1F8E9', // Light Green Background
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#DCEDC8' 
  },
  tipHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 6 
  },
  tipTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#33691E', 
    marginLeft: 8 
  },
  tipText: { 
    fontSize: 12, 
    color: '#558B2F', 
    lineHeight: 18 
  },

  // TRANSACTIONS
  listContainer: {
      backgroundColor: 'white',
      borderRadius: 16,
      overflow: 'hidden', // Ensures items respect border radius
      elevation: 1,
  },
  transactionItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F5F5F5' 
  },
  transTitle: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#37474F' 
  },
  transDate: { 
    fontSize: 11, 
    color: '#90A4AE', 
    marginTop: 4 
  },
  transAmount: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#00C853' 
  },
});