import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, StatusBar, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase'; 

export default function CollectorDashboard() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  
  const [shopDetails, setShopDetails] = useState({
    id: null, name: 'Loading...', location: 'Loading...', days: 'Mon-Sun', hours: '8:00 AM - 5:00 PM', phone: ''
  });

  const [isSettingsVisible, setSettingsVisible] = useState(false);
  const [editForm, setEditForm] = useState({ phone: '', location: '', days: '', hours: '' });
  const [isSaving, setIsSaving] = useState(false);

  // 🟢 DYNAMIC DATA STATES
  const [stats, setStats] = useState({ todaySurrenders: 0, todayWeight: '0kg', monthSurrenders: 0 });
  const [recentSurrenders, setRecentSurrenders] = useState([]);

  useEffect(() => {
    fetchCollectorData();
  }, []);

  const fetchCollectorData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        setUserEmail(user.email);
        const { data, error } = await supabase
            .from('dropoff_applications')
            .select('*')
            .eq('user_email', user.email)
            .single();

        if (data && !error) {
            setShopDetails({
                id: data.id,
                name: data.program_name || 'My Drop-off Center',
                location: data.exact_location || `${data.barangay}, ${data.city}`,
                days: data.operating_days || 'Mon-Sun',
                hours: data.operating_hours || '8:00 AM - 5:00 PM',
                phone: data.contact_number || ''
            });
            setIsOnline(data.is_online !== false); 
        }
        
        // 🟢 KUNIN ANG MGA RECENT SURRENDERS AT STATS GAMIT ANG TAMANG TABLE
        await fetchSurrendersAndStats(user.email);
    }
    setIsLoading(false);
  };

  const fetchSurrendersAndStats = async (email) => {
    try {
      // 1. KUNIN ANG TOP 10 RECENT SURRENDERS SA surrender_logs
      const { data: recentData } = await supabase
          .from('surrender_logs') 
          .select('*')
          .eq('collector_email', email)
          .order('created_at', { ascending: false })
          .limit(10);

      if (recentData) {
          const formatted = recentData.map(item => ({
              id: item.id,
              name: item.resident_name || 'Walk-in User', 
              time: formatTime(item.created_at),
              item: item.waste_type || 'Recyclables', 
              weight: `${item.weight_kg || 0}kg`, 
              status: 'Received' // Walang status column ang surrender_logs kaya naka-default ito
          }));
          setRecentSurrenders(formatted);
      }

      // 2. I-CALCULATE ANG TODAY'S SUMMARY
      const startOfToday = new Date();
      startOfToday.setHours(0,0,0,0);
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0,0,0,0);

      const { data: monthData } = await supabase
          .from('surrender_logs') 
          .select('weight_kg, created_at')
          .eq('collector_email', email)
          .gte('created_at', startOfMonth.toISOString());

      if (monthData) {
          const monthSurrenders = monthData.length;
          let todaySurrenders = 0;
          let todayTotalWeight = 0;

          monthData.forEach(s => {
              const sDate = new Date(s.created_at);
              if (sDate >= startOfToday) {
                  todaySurrenders++;
                  todayTotalWeight += Number(s.weight_kg || 0);
              }
          });

          setStats({
              todaySurrenders,
              todayWeight: `${todayTotalWeight.toFixed(1)}kg`,
              monthSurrenders
          });
      }
    } catch (error) {
        console.log("Error fetching stats: ", error);
    }
  };

  // HELPER FUNCTION PARA SA ORAS
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleToggleOnline = async (value) => {
    setIsOnline(value);
    if (shopDetails.id) {
        await supabase.from('dropoff_applications').update({ is_online: value }).eq('id', shopDetails.id);
    }
  };

  const openSettings = () => {
    setEditForm({ phone: shopDetails.phone, location: shopDetails.location, days: shopDetails.days, hours: shopDetails.hours });
    setSettingsVisible(true);
  };

  const saveSettings = async () => {
    if (!shopDetails.id) return;
    setIsSaving(true);
    const { error } = await supabase.from('dropoff_applications').update({
        contact_number: editForm.phone,
        exact_location: editForm.location,
        operating_days: editForm.days,
        operating_hours: editForm.hours
    }).eq('id', shopDetails.id);

    setIsSaving(false);
    if (error) {
        Alert.alert("Error", error.message);
    } else {
        setShopDetails({ ...shopDetails, phone: editForm.phone, location: editForm.location, days: editForm.days, hours: editForm.hours });
        setSettingsVisible(false);
        Alert.alert("Success", "Settings updated!");
    }
  };

  if (isLoading) {
      return <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color="#0066FF" /></View>;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />

      {/* 🔵 HEADER CARD */}
      <View style={styles.headerCard}>
        <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.push('/dashboard')}><MaterialCommunityIcons name="home-variant" size={28} color="white" /></TouchableOpacity>
            <View style={styles.badge}><Text style={styles.badgeText}>Collector Mode</Text></View>
            <TouchableOpacity onPress={openSettings}><MaterialCommunityIcons name="cog" size={28} color="white" /></TouchableOpacity>
        </View>

        <View style={styles.shopInfo}>
            <View style={styles.shopIconBg}><MaterialCommunityIcons name="store" size={30} color="#0066FF" /></View>
            <View style={{flex: 1}}>
                <Text style={styles.shopName} numberOfLines={1}>{shopDetails.name}</Text>
                <View style={styles.row}><MaterialCommunityIcons name="map-marker" size={14} color="#E3F2FD" /><Text style={styles.shopSub} numberOfLines={1}>{shopDetails.location}</Text></View>
                <View style={styles.row}><MaterialCommunityIcons name="calendar-clock" size={14} color="#E3F2FD" /><Text style={styles.shopSub}>{shopDetails.days} | {shopDetails.hours}</Text></View>
            </View>
        </View>

        <View style={styles.statusCard}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={[styles.dot, {backgroundColor: isOnline ? '#00C853' : '#aaa'}]} />
                <View>
                    <Text style={styles.statusTitle}>{isOnline ? 'Online' : 'Offline'}</Text>
                    <Text style={styles.statusSub}>{isOnline ? 'Accepting surrenders' : 'Currently unavailable'}</Text>
                </View>
            </View>
            <Switch value={isOnline} onValueChange={handleToggleOnline} trackColor={{ false: "#767577", true: "#81b0ff" }} thumbColor={isOnline ? "#fff" : "#f4f3f4"} />
        </View>
      </View>

      {/* 🟢 MAIN ACTIONS */}
      <View style={styles.body}>
        <TouchableOpacity style={styles.processBtn} activeOpacity={0.8} onPress={() => router.push('/process-surrender')}>
            <MaterialCommunityIcons name="cube-send" size={24} color="white" style={{marginRight: 10}} />
            <Text style={styles.processBtnText}>Process New Surrender</Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/digital-logbook')}>
                <MaterialCommunityIcons name="book-open-page-variant" size={20} color="white" style={{marginRight: 5}} />
                <Text style={styles.actionBtnText}>View Logbook</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#2979FF'}]} onPress={() => router.push('/manage-rewards')}>
                <MaterialCommunityIcons name="gift-outline" size={20} color="white" style={{marginRight: 5}} />
                <Text style={styles.actionBtnText}>Rewards Offer</Text>
            </TouchableOpacity>
        </View>

        {/* RECENT SURRENDERS */}
        <View style={styles.listContainer}>
            <View style={styles.listHeader}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}><MaterialCommunityIcons name="clock-outline" size={20} color="#333" /><Text style={styles.listTitle}> Recent Surrenders</Text></View>
                <TouchableOpacity onPress={() => router.push('/digital-logbook')}><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
            </View>
            <ScrollView style={{height: 250}} showsVerticalScrollIndicator={false}>
                {/* 🟢 DYNAMIC LIST */}
                {recentSurrenders.length === 0 ? (
                    <Text style={{textAlign: 'center', marginTop: 50, color: '#999'}}>No recent surrenders yet.</Text>
                ) : (
                    recentSurrenders.map((item) => (
                        <View key={item.id} style={styles.itemRow}>
                            <View><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemTime}>{item.time}</Text><Text style={styles.itemType}>{item.item}</Text></View>
                            <View style={{alignItems: 'flex-end'}}><Text style={styles.itemWeight}>{item.weight}</Text><View style={styles.tag}><Text style={styles.tagText}>{item.status}</Text></View></View>
                        </View>
                    ))
                )}
            </ScrollView>
        </View>
      </View>

      {/* FOOTER SUMMARY */}
      <View style={styles.footerCard}>
        <View style={styles.footerHeader}><Text style={styles.footerTitle}>Today's Summary</Text></View>
        <View style={styles.footerRow}>
            <View style={styles.footerItem}><Text style={styles.footerValue}>{stats.todaySurrenders}</Text><Text style={styles.footerLabel}>Surrenders</Text></View>
            <View style={[styles.footerItem, {borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)'}]}><Text style={styles.footerValue}>{stats.todayWeight}</Text><Text style={styles.footerLabel}>Total Weight</Text></View>
            <View style={styles.footerItem}><Text style={styles.footerValue}>{stats.monthSurrenders}</Text><Text style={styles.footerLabel}>Total This Month</Text></View>
        </View>
      </View>

      {/* ⚙️ SETTINGS MODAL */}
      <Modal visible={isSettingsVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}><Text style={styles.modalTitle}>Center Settings</Text><TouchableOpacity onPress={() => setSettingsVisible(false)}><MaterialCommunityIcons name="close" size={24} color="#333" /></TouchableOpacity></View>
                        
                        <Text style={styles.label}>Contact Number</Text>
                        <TextInput style={styles.input} value={editForm.phone} onChangeText={(t) => setEditForm({...editForm, phone: t})} keyboardType="phone-pad" />

                        <Text style={styles.label}>Exact Location</Text>
                        <TextInput style={[styles.input, {height: 60}]} multiline value={editForm.location} onChangeText={(t) => setEditForm({...editForm, location: t})} />

                        <Text style={styles.label}>Operating Days (e.g. Mon-Sat)</Text>
                        <TextInput style={styles.input} value={editForm.days} onChangeText={(t) => setEditForm({...editForm, days: t})} />

                        <Text style={styles.label}>Operating Hours (e.g. 8am-5pm)</Text>
                        <TextInput style={styles.input} value={editForm.hours} onChangeText={(t) => setEditForm({...editForm, hours: t})} />

                        <TouchableOpacity style={styles.saveBtn} onPress={saveSettings} disabled={isSaving}>
                            {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  headerCard: { backgroundColor: '#0066FF', paddingTop: 50, paddingBottom: 60, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  badge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  shopInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  shopIconBg: { width: 50, height: 50, backgroundColor: 'white', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  shopName: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  shopSub: { color: '#E3F2FD', fontSize: 12, marginLeft: 4, marginRight: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusCard: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusTitle: { color: 'white', fontWeight: 'bold' },
  statusSub: { color: '#E3F2FD', fontSize: 11 },
  body: { paddingHorizontal: 20, marginTop: -40 },
  processBtn: { backgroundColor: '#00C853', borderRadius: 12, paddingVertical: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 5, marginBottom: 15 },
  processBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  actionBtn: { flex: 1, backgroundColor: '#2962FF', paddingVertical: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  actionBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  listContainer: { backgroundColor: 'white', borderRadius: 15, padding: 15, elevation: 2, height: 320 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  listTitle: { fontWeight: 'bold', fontSize: 14 },
  viewAll: { color: '#2962FF', fontSize: 12, fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  itemName: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  itemTime: { fontSize: 11, color: '#888' },
  itemType: { fontSize: 12, color: '#555', marginTop: 2 },
  itemWeight: { fontSize: 16, fontWeight: 'bold', color: '#2962FF', textAlign: 'right' },
  tag: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  tagText: { color: '#2E7D32', fontSize: 10, fontWeight: 'bold' },
  footerCard: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#0066FF', borderRadius: 20, padding: 20, elevation: 10 },
  footerHeader: { marginBottom: 10 },
  footerTitle: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  footerItem: { flex: 1, alignItems: 'center' },
  footerValue: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  footerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'center' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 5, marginTop: 15 },
  input: { backgroundColor: '#F5F7FA', padding: 12, borderRadius: 10, fontSize: 15, borderWidth: 1, borderColor: '#eee' },
  saveBtn: { backgroundColor: '#00C853', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 30, marginBottom: 20 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});