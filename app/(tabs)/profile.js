import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, StatusBar, Platform, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
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
  
  // 🟢 STATE PARA SA MGA SARILI MONG POSTS
  const [myPosts, setMyPosts] = useState([]);

  useEffect(() => {
    fetchProfileAndPosts();
  }, []);

  const fetchProfileAndPosts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const metadata = session.user.user_metadata;
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata?.full_name || 'User')}&background=00C853&color=fff&bold=true`;
      const fetchedUser = {
        name: metadata?.full_name || '', email: session.user.email, phone: metadata?.phone || '',
        address: metadata?.address || '', avatar: metadata?.avatar_url || defaultAvatar, 
        role: 'GreenSort Member', id: `GS-${session.user.id.substring(0, 6).toUpperCase()}`, stats: { submissions: 0, recycled: 0, projects: 0 }
      };
      setUser(fetchedUser); 
      setEditForm({ name: fetchedUser.name, phone: fetchedUser.phone, address: fetchedUser.address, avatar: fetchedUser.avatar });

      // 🟢 KUNIN ANG MGA POSTS MO
      const { data: postsData } = await supabase.from('posts').select('*').eq('user', fetchedUser.name).neq('status', 'archived').order('created_at', { ascending: false });
      if (postsData) setMyPosts(postsData);
    }
    setLoading(false);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.3 });
    if (!result.canceled) setEditForm({ ...editForm, avatar: result.assets[0].uri });
  };

  const handleSave = async () => {
    if (!editForm.name || !editForm.address || !editForm.phone) return Alert.alert("Missing Info", "Please fill in all fields.");
    setSaving(true);
    let finalAvatarUrl = editForm.avatar;

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
        await supabase.from('posts').update({ user: editForm.name, avatar: finalAvatarUrl }).eq('user', user.name);
        await supabase.from('comments').update({ user_name: editForm.name, avatar: finalAvatarUrl }).eq('user_name', user.name);
        await supabase.from('notifications').update({ actor_name: editForm.name, actor_avatar: finalAvatarUrl }).eq('actor_name', user.name);

        setUser({ ...user, name: editForm.name, phone: editForm.phone, address: editForm.address, avatar: finalAvatarUrl });
        setIsEditing(false);
        fetchProfileAndPosts(); // Refresh ang posts UI
        Alert.alert("Success", "Profile updated!");
    } else { Alert.alert("Error", error.message); }
    setSaving(false);
  };

  if (loading) return <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color="#00C853" /></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00C853" translucent={true} />
      
      {/* 🟢 HEADER (MAY SETTINGS ICON NA SA KANAN) */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <View style={styles.headerRow}>
            <View style={styles.headerSide}></View>
            <View style={styles.headerCenter}><Text style={styles.headerTitle}>Profile</Text></View>
            <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
                <TouchableOpacity onPress={() => router.push('/settings')} style={{padding: 5}}>
                    <Ionicons name="settings-sharp" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* INFO CARD */}
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
        </View>

        <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>Your Stats</Text>
            <View style={styles.statsRow}>
                <StatItem icon="trophy-outline" value={user.stats.submissions} label="Total Submission" />
                <StatItem icon="lightning-bolt-outline" value={`${user.stats.recycled} kg`} label="Kg Recycled" />
                <StatItem icon="star-outline" value={user.stats.projects} label="Upcycle Projects" />
            </View>
        </View>

        {/* 🟢 DITO NA NAKALAGAY YUNG MGA POSTS MO 🟢 */}
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10, marginBottom: 15 }}>My Posts</Text>
        
        {myPosts.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>You haven't posted anything yet.</Text>
        ) : (
            myPosts.map((post) => (
                <View key={post.id} style={styles.myPostCard}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                        <Image source={{ uri: post.avatar }} style={{width: 30, height: 30, borderRadius: 15, marginRight: 10}} />
                        <Text style={{fontWeight: 'bold', flex: 1}}>{post.user}</Text>
                        <Text style={{color: '#00C853', fontSize: 12, fontWeight: 'bold'}}>{post.type}</Text>
                    </View>
                    <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 5}}>{post.title}</Text>
                    <Text style={{color: '#666', fontSize: 13, marginBottom: 10}} numberOfLines={2}>{post.desc}</Text>
                    <Image source={{ uri: post.image }} style={{width: '100%', height: 150, borderRadius: 10, backgroundColor: '#eee'}} resizeMode="cover" />
                    <View style={{flexDirection: 'row', gap: 15, marginTop: 15}}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}><Ionicons name="heart" size={20} color="#FF1744" /><Text style={{color: '#666'}}>{post.likes}</Text></View>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}><Ionicons name="chatbubble" size={18} color="#666" /><Text style={{color: '#666'}}>{post.comments}</Text></View>
                    </View>
                </View>
            ))
        )}

        <View style={{height: 100}} />
      </ScrollView>
    </View>
  );
}

const StatItem = ({ icon, value, label }) => (
    <View style={styles.statItem}><View style={styles.iconCircle}><MaterialCommunityIcons name={icon} size={24} color="#00C853" /></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, 
  header: { backgroundColor: '#00C853', paddingBottom: 35, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }, headerSide: { width: 50, alignItems: 'flex-start' }, headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  content: { flex: 1, paddingHorizontal: 20 }, 
  idCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', marginTop: -25, marginBottom: 15, ...getSafeShadow() }, avatarWrapper: { position: 'relative', marginBottom: 10 }, avatarImage: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#eee', borderWidth: 3, borderColor: '#00C853' }, cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#2962FF', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white' }, name: { fontSize: 20, fontWeight: 'bold' }, role: { color: '#666', fontSize: 12 }, badge: { backgroundColor: '#00C853', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 }, badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  infoCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 15, ...getSafeShadow() }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }, cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' }, editText: { color: '#00C853', fontWeight: 'bold', fontSize: 14 }, saveText: { color: '#2962FF', fontWeight: 'bold', fontSize: 14 }, infoRow: { marginBottom: 15 }, label: { fontSize: 12, color: '#999', marginBottom: 4 }, value: { fontSize: 15, color: '#333', fontWeight: '500' }, inputField: { backgroundColor: '#F5F5F5', padding: 10, borderRadius: 8, fontSize: 15, color: '#333', borderWidth: 1, borderColor: '#eee' },
  statsCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 20, ...getSafeShadow() }, statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }, statItem: { alignItems: 'center', flex: 1 }, iconCircle: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 50, marginBottom: 5 }, statValue: { fontSize: 16, fontWeight: 'bold', color: '#00C853' }, statLabel: { fontSize: 10, color: '#666', textAlign: 'center' },
  myPostCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 15, ...getSafeShadow() }
});