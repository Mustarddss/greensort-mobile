import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const getSafeShadow = () => Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    android: { elevation: 3 },
    web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
});

export default function Settings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleLogout = async () => {
        Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: async () => {
                await supabase.auth.signOut();
                // 🟢 FIX: Pupunta na ito sa Onboarding (Slide 5)
                router.replace({ pathname: '/onboarding', params: { skip: 'true' } });
            }}
        ]);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.replace('/profile')} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>Settings</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={styles.sectionTitle}>Account & Features</Text>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/saved-diy-posts')}>
                    <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}><MaterialCommunityIcons name="bookmark-multiple" size={20} color="#1976D2" /></View>
                    <Text style={styles.menuText}>Saved DIY Projects</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/archived-posts')}>
                    <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}><MaterialCommunityIcons name="shopping" size={20} color="#007C00" /></View>
                    <Text style={styles.menuText}>Sold & Traded Items</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/history')}>
                    <View style={[styles.menuIcon, { backgroundColor: '#FFF3E0' }]}><MaterialCommunityIcons name="history" size={20} color="#FF9800" /></View>
                    <Text style={styles.menuText}>Surrender History</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Legal & Security</Text>
                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/terms-conditions')}>
                    <View style={[styles.menuIcon, { backgroundColor: '#F3E5F5' }]}><MaterialCommunityIcons name="shield-check-outline" size={20} color="#7B1FA2" /></View>
                    <Text style={styles.menuText}>Terms & Conditions</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <View style={{ height: 40 }} />
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#D50000" style={{ marginRight: 10 }} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 20 }}>
                    <Text style={{ color: '#ccc', fontSize: 12 }}>GreenSort v1.0.0</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { backgroundColor: '#007C00', paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
    headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
    content: { padding: 20, paddingTop: 30 },
    sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#888', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 18, borderRadius: 16, marginBottom: 12, ...getSafeShadow() },
    menuIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuText: { flex: 1, fontSize: 16, color: '#333', fontWeight: '600' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#FFCDD2', padding: 18, borderRadius: 16, ...getSafeShadow() },
    logoutText: { color: '#D50000', fontWeight: 'bold', fontSize: 16 }
});