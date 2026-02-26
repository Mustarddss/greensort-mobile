import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, StatusBar, Platform, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker'; 

import { supabase } from '../../lib/supabase';

const getSafeShadow = () => Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 3 } });

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [user, setUser] = useState({ name: 'Loading...', role: 'GreenSort Member', id: 'GS-USER', email: '', phone: '', address: '', avatar: null, stats: { submissions: 0, recycled: 0, projects: 0 } });
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', avatar: null });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const metadata = session.user.user_metadata;
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata?.full_name || 'User')}&background=00C853&color=fff&bold=true`;
        const fetchedUser = {
          name: metadata?.full_name || '', email: session.user.email, phone: metadata?.phone || '',
          address: metadata?.address || '', avatar: metadata?.avatar_url || defaultAvatar, 
          role: 'GreenSort Member', id: `GS-${session.user.id.substring(0, 6).toUpperCase()}`, stats: { submissions: 0, recycled: 0, projects: 0 }
        };
        setUser(fetchedUser); setEditForm({ name: fetchedUser.name, phone: fetchedUser.phone, address: fetchedUser.address, avatar: fetchedUser.avatar });
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.3 });
    if (!result.canceled) setEditForm({ ...editForm, avatar: result.assets[0].uri });
  };

  const handleSave = async () => {
    if (!editForm.name || !editForm.address || !editForm.phone) return Alert.alert("Missing Info", "Please fill in all fields.");
    setSaving(true);
    let finalAvatarUrl = editForm.avatar;

    // 🟢 TOTOONG UPLOAD NG PROFILE PICTURE SA SUPABASE
    if (editForm.avatar && !editForm.avatar.startsWith('http')) {
        try {
            const formData = new FormData();
            formData.append('file', { uri: editForm.avatar, name: `avatar_${Date.now()}.jpg`, type: 'image/jpeg' });
            const { data, error } = await supabase.storage.from('post_images').upload(`avatars/${Date.now()}.jpg`, formData);
            if (!error) {
                const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path);
                finalAvatarUrl = urlData.publicUrl;
            }
        } catch(e) { console.log("Upload error:", e); }
    }

    const { error } = await supabase.auth.updateUser({ data: { full_name: editForm.name, phone: editForm.phone, address: editForm.address, avatar_url: finalAvatarUrl } });

    if (!error) {
        // 🟢 MAGIC SYNC SA LAHAT NG PAST POSTS AT COMMENTS
        await supabase.from('posts').update({ user: editForm.name, avatar: finalAvatarUrl }).eq('user', user.name);
        await supabase.from('comments').update({ user_name: editForm.name, avatar: finalAvatarUrl }).eq('user_name', user.name);
        await supabase.from('notifications').update({ actor_name: editForm.name, actor_avatar: finalAvatarUrl }).eq('actor_name', user.name);

        setUser({ ...user, name: editForm.name, phone: editForm.phone, address: editForm.address, avatar: finalAvatarUrl });
        setIsEditing(false);
        Alert.alert("Success", "Profile updated! Your past posts have been synced.");
    } else { Alert.alert("Error", error.message); }
    setSaving(false);
  };

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [{ text: "Cancel", style: "cancel" }, { text: "Log Out", style: "destructive", onPress: async () => { await supabase.auth.signOut(); router.replace('/login'); } }]);
  };

  if (loading) return <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color="#00C853" /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00C853" translucent={true} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}><View style={styles.headerRow}><View style={styles.headerSide}><TouchableOpacity onPress={() => router.back()} style={{padding: 5}}><MaterialCommunityIcons name="arrow-left" size={28} color="white" /></TouchableOpacity></View><View style={styles.headerCenter}><Text style={styles.headerTitle}>Profile</Text><Text style={styles.headerSubtitle}>Your GreenSort account details</Text></View><View style={styles.headerSide} /></View></View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.idCard}>
            <TouchableOpacity onPress={isEditing ? pickImage : null} style={styles.avatarWrapper}>
                <Image source={{ uri: isEditing ? editForm.avatar : user.avatar }} style={styles.avatarImage} />
                {isEditing && <View style={styles.cameraIconBadge}><MaterialCommunityIcons name="camera" size={20} color="white" /></View>}
            </TouchableOpacity>
            <Text style={styles.name}>{isEditing ? editForm.name : user.name}</Text><Text style={styles.role}>{user.role}</Text><View style={styles.badge}><Text style={styles.badgeText}>{user.id}</Text></View>
        </View>

        <View style={styles.infoCard}>
            <View style={styles.cardHeader}><Text style={styles.cardTitle}>Contact Information</Text>{isEditing ? (<TouchableOpacity onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator size="small" color="#00C853" /> : <Text style={styles.saveText}>Save</Text>}</TouchableOpacity>) : (<TouchableOpacity onPress={() => setIsEditing(true)}><Text style={styles.editText}>Edit</Text></TouchableOpacity>)}</View>
            <View style={styles.infoRow}><Text style={styles.label}>Full Name</Text>{isEditing ? <TextInput style={styles.inputField} value={editForm.name} onChangeText={(t) => setEditForm({...editForm, name: t})} /> : <Text style={styles.value}>{user.name}</Text>}</View>
            <View style={styles.infoRow}><Text style={styles.label}>Phone Number</Text>{isEditing ? <TextInput style={styles.inputField} value={editForm.phone} keyboardType="phone-pad" onChangeText={(t) => setEditForm({...editForm, phone: t})} /> : <Text style={styles.value}>{user.phone || 'Not set'}</Text>}</View>
            <View style={styles.infoRow}><Text style={styles.label}>Address</Text>{isEditing ? <TextInput style={styles.inputField} value={editForm.address} onChangeText={(t) => setEditForm({...editForm, address: t})} /> : <Text style={styles.value}>{user.address}</Text>}</View>
            <View style={styles.infoRow}><Text style={styles.label}>Email Address (Read-only)</Text><Text style={[styles.value, {color: '#888'}]}>{user.email}</Text></View>
        </View>

        <View style={styles.actionArea}>
            <TouchableOpacity style={styles.applyButton} onPress={() => router.push('/register-location')}><Text style={styles.applyButtonText}>Apply as Drop-off Point</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.applyButton, {backgroundColor: '#607D8B'}]} onPress={() => router.push('/history')}><Text style={styles.applyButtonText}>Activity History</Text></TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutButtonText}>LOGOUT</Text></TouchableOpacity>
        </View>
        <View style={{height: 50}} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' }, header: { backgroundColor: '#00C853', paddingBottom: 35, paddingHorizontal: 15, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }, headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }, headerSide: { width: 50, alignItems: 'flex-start' }, headerCenter: { flex: 1, alignItems: 'center' }, headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' }, headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2, textAlign: 'center' }, content: { flex: 1, paddingHorizontal: 20 }, 
  idCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', marginTop: -25, marginBottom: 15, ...getSafeShadow() }, avatarWrapper: { position: 'relative', marginBottom: 10 }, avatarImage: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#eee', borderWidth: 3, borderColor: '#00C853' }, cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#2962FF', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white' }, name: { fontSize: 20, fontWeight: 'bold' }, role: { color: '#666', fontSize: 12 }, badge: { backgroundColor: '#00C853', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 }, badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  infoCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 15, ...getSafeShadow() }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }, cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' }, editText: { color: '#00C853', fontWeight: 'bold', fontSize: 14 }, saveText: { color: '#2962FF', fontWeight: 'bold', fontSize: 14 }, infoRow: { marginBottom: 15 }, label: { fontSize: 12, color: '#999', marginBottom: 4 }, value: { fontSize: 15, color: '#333', fontWeight: '500' }, inputField: { backgroundColor: '#F5F5F5', padding: 10, borderRadius: 8, fontSize: 15, color: '#333', borderWidth: 1, borderColor: '#eee' },
  actionArea: { gap: 15, marginBottom: 20, marginTop: 10 }, applyButton: { backgroundColor: '#2962FF', padding: 18, borderRadius: 12, alignItems: 'center', ...getSafeShadow() }, applyButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }, logoutButton: { backgroundColor: '#D50000', padding: 18, borderRadius: 12, alignItems: 'center', ...getSafeShadow() }, logoutButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});