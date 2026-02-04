import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // 🟢 USER STATE
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    address: '',
    userId: 'GS-2026-0000',
    stats: {
        submissions: 0,
        recycled: 0,
        upcycled: 0
    }
  });

  // 🔄 1. FETCH DATA (Load on Start)
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
        // 👇 BACKEND READY: Dito mo papalitan ng 'supabase.from().select()' later
        const storedUser = await AsyncStorage.getItem('user');
        
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            // Merge with default data if missing
            setUserData({
                ...userData,
                ...parsedUser,
                // Mock Stats kung wala pa sa database
                stats: parsedUser.stats || { submissions: 12, recycled: 24.5, upcycled: 15 }
            });
        }
    } catch (error) {
        console.log("Error loading profile:", error);
    } finally {
        setLoading(false);
    }
  };

  // 💾 2. SAVE CHANGES
  const handleSave = async () => {
    setLoading(true);
    try {
        // 👇 BACKEND READY: Dito mo ilalagay ang 'supabase.from().update()' later
        
        // Simulating Server Update (Saving to Local Storage)
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        
        // Simulate Network Delay
        setTimeout(() => {
            setIsEditing(false);
            setLoading(false);
            Alert.alert("Success", "Profile updated successfully!");
        }, 1000);

    } catch (error) {
        setLoading(false);
        Alert.alert("Error", "Failed to update profile.");
    }
  };

  // 🚪 3. LOGOUT
  const handleLogout = async () => {
    Alert.alert(
        "Log Out",
        "Are you sure you want to log out?",
        [
            { text: "Cancel", style: "cancel" },
            { 
                text: "Log Out", 
                style: 'destructive',
                onPress: async () => {
                    await AsyncStorage.removeItem('user');
                    router.replace('/login');
                }
            }
        ]
    );
  };

  if (loading && !isEditing) {
      return (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <ActivityIndicator size="large" color="#00C853" />
        </View>
      );
  }

  return (
    <View style={{flex: 1, backgroundColor: '#F5F5F5'}}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* 🟢 HEADER */}
        <View style={styles.header}>
            <View style={styles.headerContent}>
                <TouchableOpacity onPress={() => router.back()} style={{position: 'absolute', left: 0}}>
                     <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>
            <Text style={styles.headerSubtitle}>Your GreenSort account details</Text>
        </View>

        <View style={styles.body}>

            {/* 👤 ID CARD */}
            <View style={styles.profileCard}>
                <View style={styles.avatarContainer}>
                    <MaterialCommunityIcons name="account" size={50} color="white" />
                </View>
                <Text style={styles.profileName}>{userData.fullName || 'User Name'}</Text>
                <Text style={styles.profileRole}>GreenSort Member</Text>
                
                <View style={styles.idBadge}>
                    <Text style={styles.idText}>User ID: {userData.id || 'GS-2026-0123'}</Text>
                </View>
            </View>

            {/* 📝 CONTACT INFO (EDITABLE) */}
            <View style={styles.infoCard}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>Contact Information</Text>
                    
                    {/* EDIT / SAVE BUTTON */}
                    <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
                        <Text style={styles.editBtn}>
                            {isEditing ? (loading ? "Saving..." : "Save") : "Edit"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* FIELDS */}
                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    {isEditing ? (
                        <TextInput 
                            style={styles.input} 
                            value={userData.fullName}
                            onChangeText={(text) => setUserData({...userData, fullName: text})}
                        />
                    ) : (
                        <Text style={styles.value}>{userData.fullName || 'N/A'}</Text>
                    )}
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <Text style={[styles.value, {color: '#888'}]}>{userData.email || 'N/A'}</Text> 
                    {/* Note: Email is usually read-only */}
                </View>

                <View style={styles.fieldGroup}>
                    <Text style={styles.label}>Address</Text>
                    {isEditing ? (
                        <TextInput 
                            style={[styles.input, {height: 60}]} 
                            multiline
                            value={userData.address}
                            onChangeText={(text) => setUserData({...userData, address: text})}
                        />
                    ) : (
                        <Text style={styles.value}>{userData.address || 'No address set'}</Text>
                    )}
                </View>
            </View>

            {/* 📊 STATS CARD */}
            <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>Your Stats</Text>
                
                <View style={styles.statsRow}>
                    {/* Stat 1 */}
                    <View style={styles.statItem}>
                        <View style={[styles.iconCircle, {backgroundColor: '#E8F5E9'}]}>
                            <FontAwesome5 name="trophy" size={20} color="#00C853" />
                        </View>
                        <Text style={styles.statNumber}>{userData.stats.submissions}</Text>
                        <Text style={styles.statLabel}>Total Submissions</Text>
                    </View>

                    {/* Stat 2 */}
                    <View style={styles.statItem}>
                        <View style={[styles.iconCircle, {backgroundColor: '#E0F2F1'}]}>
                            <MaterialCommunityIcons name="lightning-bolt" size={24} color="#00BFA5" />
                        </View>
                        <Text style={styles.statNumber}>{userData.stats.recycled}</Text>
                        <Text style={styles.statLabel}>Kg Recycled</Text>
                    </View>

                    {/* Stat 3 */}
                    <View style={styles.statItem}>
                        <View style={[styles.iconCircle, {backgroundColor: '#FFF3E0'}]}>
                            <MaterialCommunityIcons name="star" size={24} color="#FF9800" />
                        </View>
                        <Text style={styles.statNumber}>{userData.stats.upcycled}</Text>
                        <Text style={styles.statLabel}>Upcycle Projects</Text>
                    </View>
                </View>
            </View>

            {/* 🔴 LOGOUT BUTTON */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutText}>LOG OUT</Text>
            </TouchableOpacity>

        </View>
        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },

  // HEADER
  header: { backgroundColor: '#00C853', paddingTop: 60, paddingBottom: 40, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontSize: 13 },

  body: { padding: 20, marginTop: -30 },

  // PROFILE CARD
  profileCard: { backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 20 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#00C853', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 4, borderColor: '#E8F5E9' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  profileRole: { fontSize: 12, color: '#666', marginTop: 2, marginBottom: 15 },
  idBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15 },
  idText: { color: '#2E7D32', fontSize: 10, fontWeight: 'bold' },

  // INFO CARD
  infoCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 20, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  editBtn: { color: '#00C853', fontWeight: 'bold', fontSize: 14 },
  
  fieldGroup: { marginBottom: 15 },
  label: { fontSize: 11, color: '#888', marginBottom: 4 },
  value: { fontSize: 14, color: '#333', fontWeight: '500' },
  input: { backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 10, fontSize: 14, color: '#333' },

  // STATS CARD
  statsCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 25, elevation: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  statItem: { alignItems: 'center', flex: 1 },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#00C853' },
  statLabel: { fontSize: 10, color: '#666', textAlign: 'center', marginTop: 2 },

  // LOGOUT
  logoutBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: '#D32F2F', borderRadius: 25, paddingVertical: 15, alignItems: 'center' },
  logoutText: { color: '#D32F2F', fontWeight: 'bold', letterSpacing: 1 },
});