import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, Image, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker'; 

import { supabase } from '../../lib/supabase'; 

const { width } = Dimensions.get('window');
const CATEGORIES = ['Cardboard', 'Plastic', 'Glass', 'Metal', 'Paper', 'Electronics', 'Textiles', 'Other'];

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [posts, setPosts] = useState([]); 
  const [selectedPost, setSelectedPost] = useState(null); 
  const [postComments, setPostComments] = useState([]); 
  
  const [isCreating, setIsCreating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isUploading, setIsUploading] = useState(false); 
  const [refreshing, setRefreshing] = useState(false); 

  // 🟢 USER DATA AT STATS
  const [userData, setUserData] = useState({ name: 'Loading...', kgRecycled: 0, submissions: 0, upcycleProjects: 0, avatar: null });
  const [form, setForm] = useState({ type: 'For Sale', title: '', desc: '', category: '', price: '', lookingFor: '', location: '', imageUri: null });
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchUserSession();
    fetchPosts();
  }, []);

  const fetchUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const fullName = session.user.user_metadata?.full_name || 'GreenSort Member';
      setUserData({
        name: fullName,
        kgRecycled: 0, submissions: 0, upcycleProjects: 0,
        avatar: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=00C853&color=fff&bold=true`
      });
    } else {
      router.replace('/login');
    }
  };

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPosts();
    await fetchUserSession();
    setRefreshing(false);
  }, []);

  const handleImagePick = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.3 });
    if (!result.canceled) setForm({ ...form, imageUri: result.assets[0].uri });
  };

  const handlePostSubmit = async () => {
    if (!form.title || !form.desc || !form.location || !form.category) return Alert.alert("Wait!", "Please fill in all details.");
    
    setIsUploading(true);
    let uploadedImageUrl = 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=500'; 

    if (form.imageUri) {
        try {
            const formData = new FormData();
            formData.append('file', { uri: form.imageUri, name: `img_${Date.now()}.jpg`, type: 'image/jpeg' });
            const { data, error } = await supabase.storage.from('post_images').upload(`public/${Date.now()}.jpg`, formData);
            if (!error) {
                const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path);
                uploadedImageUrl = urlData.publicUrl;
            }
        } catch(e) { console.log(e); }
    }

    const newPost = {
        user: userData.name, avatar: userData.avatar, type: form.type, title: form.title, desc: form.desc,
        price: form.type === 'Free' ? 'Free' : form.type === 'Trade' ? `Trade: ${form.lookingFor}` : `₱${form.price}`,
        location: form.location, image: uploadedImageUrl, likes: 0, comments: 0
    };

    const { error } = await supabase.from('posts').insert([newPost]);
    setIsUploading(false);

    if (!error) {
        fetchPosts(); 
        setIsCreating(false);
        setForm({ type: 'For Sale', title: '', desc: '', category: '', price: '', lookingFor: '', location: '', imageUri: null });
        Alert.alert("Success", "Post uploaded!");
    }
  };

  const handleLike = async (post) => {
    const newLikes = post.likes + 1;
    await supabase.from('posts').update({ likes: newLikes }).eq('id', post.id);
    if (post.user !== userData.name) {
      await supabase.from('notifications').insert([{ owner_name: post.user, actor_name: userData.name, actor_avatar: userData.avatar, action: 'liked', post_title: post.title }]);
    }
    fetchPosts(); 
  };

  const handleContact = async (post) => {
    if (post.user === userData.name) return Alert.alert("Oops!", "You can't contact yourself.");
    Alert.alert("Contact Sent", `We notified ${post.user} that you are interested!`);
    await supabase.from('notifications').insert([{ owner_name: post.user, actor_name: userData.name, actor_avatar: userData.avatar, action: 'wants to contact you about', post_title: post.title }]);
  };

  const openPostDetails = async (post) => {
    setSelectedPost(post);
    const { data } = await supabase.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
    setPostComments(data || []);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const commentData = { post_id: selectedPost.id, user_name: userData.name, avatar: userData.avatar, text: newComment };
    await supabase.from('comments').insert([commentData]);
    await supabase.from('posts').update({ comments: selectedPost.comments + 1 }).eq('id', selectedPost.id);
    
    if (selectedPost.user !== userData.name) {
      await supabase.from('notifications').insert([{ owner_name: selectedPost.user, actor_name: userData.name, actor_avatar: userData.avatar, action: 'commented on', post_title: selectedPost.title }]);
    }

    setNewComment('');
    openPostDetails(selectedPost); 
    fetchPosts(); 
  };

  const formatTime = (dateString) => {
      const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
      if (diffMins < 1) return 'Just now'; if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`; return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const filteredPosts = posts.filter(post => activeFilter === 'All' ? true : post.type === activeFilter);

  // --- RENDER: COMMENTS / DETAILS ---
  if (selectedPost) {
    return (
      <KeyboardAvoidingView style={{flex: 1, backgroundColor: 'white'}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <StatusBar barStyle="dark-content" backgroundColor="white" translucent={true} />
          <View style={[styles.createHeader, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
              <TouchableOpacity onPress={() => setSelectedPost(null)}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
              <Text style={styles.createHeaderTitle}>Comments</Text>
              <View style={{width: 24}} />
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
              <Image source={{ uri: selectedPost.image }} style={styles.detailImage} />
              <View style={styles.detailContent}>
                  <Text style={styles.postTitle}>{selectedPost.title}</Text>
                  <Text style={styles.postDesc}>{selectedPost.desc}</Text>
                  
                  <Text style={[styles.label, {marginTop: 20}]}>All Comments</Text>
                  {postComments.length === 0 ? <Text style={{color: '#999', marginTop: 10}}>No comments yet. Be the first!</Text> : null}
                  
                  {postComments.map((comment) => (
                      <View key={comment.id} style={styles.commentItem}>
                          <Image source={{ uri: comment.avatar }} style={styles.commentAvatar} />
                          <View style={styles.commentBubble}>
                              <Text style={styles.commentUser}>{comment.user_name}</Text>
                              <Text style={styles.commentText}>{comment.text}</Text>
                              <Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text>
                          </View>
                      </View>
                  ))}
              </View>
          </ScrollView>
          
          <View style={styles.footerInput}>
              <TextInput placeholder="Write a comment..." style={styles.inputField} value={newComment} onChangeText={setNewComment} />
              <TouchableOpacity style={styles.sendBtn} onPress={handleAddComment}>
                  <Ionicons name="send" size={20} color="white" />
              </TouchableOpacity>
          </View>
      </KeyboardAvoidingView>
    );
  }

  // --- RENDER: CREATE FORM ---
  if (isCreating) {
      return (
        <View style={{flex: 1, backgroundColor: 'white'}}>
            <StatusBar barStyle="dark-content" backgroundColor="white" />
            <View style={[styles.createHeader, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
                <TouchableOpacity onPress={() => setIsCreating(false)}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
                <View><Text style={styles.createHeaderTitle}>Create Post</Text></View>
                <View style={{width: 24}} /> 
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{flex: 1}}>
                <ScrollView contentContainerStyle={styles.createContent}>
                    <Text style={styles.label}>Post Type</Text>
                    <View style={styles.typeRow}>
                        {['For Sale', 'Trade', 'Free'].map(type => (
                            <TouchableOpacity key={type} style={[styles.typeBtn, form.type === type && styles.typeBtnActive, {borderColor: form.type === type ? '#00C853' : '#E0E0E0'}]} onPress={() => setForm({...form, type: type})}>
                                <Text style={[styles.typeBtnText, form.type === type && {color: '#00C853'}]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    
                    <Text style={styles.label}>Category</Text>
                    <TouchableOpacity style={styles.dropdownBtn} onPress={() => setIsCategoryOpen(!isCategoryOpen)}>
                        <Text style={{flex: 1, color: form.category ? '#333' : '#999'}}>{form.category || 'Select a category'}</Text>
                        <MaterialCommunityIcons name={isCategoryOpen ? "chevron-up" : "chevron-down"} size={20} color="#666" />
                    </TouchableOpacity>
                    {isCategoryOpen && (
                        <View style={styles.dropdownList}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity key={cat} style={styles.dropdownItem} onPress={() => { setForm({...form, category: cat}); setIsCategoryOpen(false); }}>
                                    <Text style={styles.dropdownItemText}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <Text style={styles.label}>Title</Text><TextInput style={styles.input} placeholder="Title" value={form.title} onChangeText={(t) => setForm({...form, title: t})} />
                    <Text style={styles.label}>Description</Text><TextInput style={[styles.input, {height: 80}]} placeholder="Desc" multiline value={form.desc} onChangeText={(t) => setForm({...form, desc: t})} />
                    <Text style={styles.label}>Location</Text><TextInput style={styles.input} placeholder="Barangay, City" value={form.location} onChangeText={(t) => setForm({...form, location: t})} />
                    
                    {form.type === 'For Sale' && (
                        <><Text style={styles.label}>Price *</Text><View style={styles.inputIconWrap}><Text style={{color: '#999', marginRight: 5}}>₱</Text><TextInput style={{flex: 1}} placeholder="0.00" keyboardType="numeric" value={form.price} onChangeText={(t) => setForm({...form, price: t})}/></View></>
                    )}
                    {form.type === 'Trade' && (
                        <><Text style={styles.label}>Looking For</Text><TextInput style={styles.input} placeholder="e.g. Glass bottles..." value={form.lookingFor} onChangeText={(t) => setForm({...form, lookingFor: t})}/></>
                    )}
                    
                    <Text style={styles.label}>Upload Photo</Text>
                    <TouchableOpacity style={styles.imageUploadBox} onPress={handleImagePick}>
                        {form.imageUri ? <Image source={{ uri: form.imageUri }} style={{width: '100%', height: '100%', borderRadius: 12}} resizeMode="cover" /> : <MaterialCommunityIcons name="camera-plus" size={30} color="#999" />}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.submitBtn} onPress={handlePostSubmit} disabled={isUploading}>
                        {isUploading ? <ActivityIndicator color="white" /> : <Text style={{color: 'white', fontWeight: 'bold'}}>POST NOW</Text>}
                    </TouchableOpacity>
                    <View style={{height: 100}} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
      );
  }

  // --- RENDER: MAIN DASHBOARD ---
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00C853" translucent={true} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <View style={styles.headerContent}>
            <View><Text style={styles.appName}>GreenSort</Text><Text style={styles.welcomeText}>Welcome back, {userData.name}!</Text></View>
            <Image source={{ uri: userData.avatar }} style={{width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'white'}} />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        
        {/* 🟢 ECO TIP 🟢 */}
        <View style={styles.tipCard}>
            <View style={styles.tipHeader}><MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#FBC02D" /><Text style={styles.tipTitle}>Eco Tip of the Day</Text></View>
            <Text style={styles.tipText}>Rinse and dry your recyclables before disposal.</Text>
        </View>

        {/* 🟢 ECO IMPACT 🟢 */}
        <View style={styles.impactRow}>
            <ImpactCard value={userData.kgRecycled} unit="kg recycled" icon="chart-line-variant" color="#00C853" bgColor="#E8F5E9" />
            <ImpactCard value={userData.submissions} unit="submissions" icon="target" color="#2979FF" bgColor="#E3F2FD" />
            <ImpactCard value={userData.upcycleProjects} unit="projects" icon="leaf" color="#AA00FF" bgColor="#F3E5F5" />
        </View>

        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Community Feed</Text>
            
            {/* 🟢 BUTTONS GROUP (Bell + Post) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {/* NOTIFICATION BELL */}
                <TouchableOpacity style={styles.notifIconBtn} onPress={() => router.push('/notifications')}>
                    <Ionicons name="notifications-outline" size={22} color="#333" />
                </TouchableOpacity>

                {/* ADD POST BUTTON */}
                <TouchableOpacity style={styles.addPostBtn} onPress={() => setIsCreating(true)}>
                    <MaterialCommunityIcons name="plus" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
            {['All', 'For Sale', 'Trade', 'Free'].map((filter) => (
                <TouchableOpacity key={filter} style={[styles.filterPill, activeFilter === filter && styles.activePill]} onPress={() => setActiveFilter(filter)}>
                    <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>

        {filteredPosts.length === 0 ? (
            <Text style={{textAlign: 'center', marginTop: 50, color: '#999'}}>No posts yet. Be the first!</Text>
        ) : (
            filteredPosts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                    <View style={styles.postHeader}>
                        <Image source={{ uri: post.avatar }} style={styles.postAvatar} />
                        <View style={{flex: 1, marginLeft: 10}}><Text style={styles.postUser}>{post.user}</Text><Text style={styles.postTime}>{formatTime(post.created_at)}</Text></View>
                        <View style={[styles.typeBadge, {backgroundColor: '#E8F5E9'}]}><Text style={{color: '#00C853', fontSize: 10, fontWeight: 'bold'}}>{post.type}</Text></View>
                    </View>
                    
                    <TouchableOpacity onPress={() => openPostDetails(post)}>
                        <Text style={styles.postTitle}>{post.title}</Text>
                        <Text style={styles.postDesc} numberOfLines={2}>{post.desc}</Text>
                        <Image source={{ uri: post.image }} style={styles.postImage} />
                    </TouchableOpacity>

                    <View style={styles.postFooter}>
                        <View style={{flexDirection: 'row', gap: 15}}>
                            <TouchableOpacity style={styles.iconRow} onPress={() => handleLike(post)}>
                                <Ionicons name="heart-outline" size={24} color="#666" />
                                <Text style={styles.iconText}>{post.likes}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconRow} onPress={() => openPostDetails(post)}>
                                <Ionicons name="chatbubble-outline" size={22} color="#666" />
                                <Text style={styles.iconText}>{post.comments}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                            <Text style={styles.postPrice}>{post.price}</Text>
                            <TouchableOpacity style={styles.contactBtn} onPress={() => handleContact(post)}>
                                <Text style={styles.contactText}>Contact</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ))
        )}
        <View style={{height: 100}} /> 
      </ScrollView>
    </View>
  );
}

// 🟢 COMPONENT NG ECO IMPACT
const ImpactCard = ({ value, unit, icon, color, bgColor }) => (
  <View style={styles.impactCard}>
    <View style={[styles.impactIconBg, { backgroundColor: bgColor }]}> 
      <MaterialCommunityIcons name={icon} size={24} color={color} />
    </View>
    <Text style={[styles.impactValue, { color: color }]}>{value}</Text>
    <Text style={styles.impactUnit}>{unit}</Text>
  </View>
);

const getThemeColor = (type) => {
    switch(type) { case 'For Sale': return '#2979FF'; case 'Trade': return '#AA00FF'; case 'Free': return '#00C853'; default: return '#666'; }
};
const getThemeBg = (type) => {
    switch(type) { case 'For Sale': return '#E3F2FD'; case 'Trade': return '#F3E5F5'; case 'Free': return '#E8F5E9'; default: return '#eee'; }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#00C853', paddingBottom: 25, paddingHorizontal: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 4 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appName: { color: 'white', fontSize: 24, fontWeight: '800' }, welcomeText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },
  scrollView: { flex: 1 }, scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  
  tipCard: { backgroundColor: '#FFF3E0', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FFE0B2' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tipTitle: { fontSize: 14, fontWeight: 'bold', color: '#EF6C00', marginLeft: 8 },
  tipText: { fontSize: 12, color: '#E65100', lineHeight: 18 },
  impactRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  impactCard: { backgroundColor: 'white', width: (width - 55) / 3, paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 2 },
  impactIconBg: { padding: 10, borderRadius: 12, marginBottom: 10 },
  impactValue: { fontSize: 18, fontWeight: 'bold' },
  impactUnit: { fontSize: 10, color: '#90A4AE', textAlign: 'center', marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#263238' },
  
  // 🟢 DAGDAG STYLE PARA SA BELL ICON
  notifIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#eee' },
  addPostBtn: { backgroundColor: '#00C853', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  
  filterPill: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: 'white', borderRadius: 20, marginRight: 10, elevation: 1, borderWidth: 1, borderColor: '#eee' },
  activePill: { backgroundColor: '#263238', borderColor: '#263238' },
  filterText: { fontSize: 13, color: '#666', fontWeight: '600' },
  activeFilterText: { color: 'white' },

  postCard: { backgroundColor: 'white', borderRadius: 16, padding: 15, marginBottom: 15, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postUser: { fontWeight: 'bold', fontSize: 14, color: '#333' }, postTime: { fontSize: 11, color: '#999' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }, postTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  postDesc: { fontSize: 13, color: '#666', marginBottom: 10 }, postImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 15, resizeMode: 'cover' },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 5 }, iconText: { fontSize: 14, color: '#666' },
  postPrice: { fontSize: 16, fontWeight: 'bold', color: '#00C853' }, 
  contactBtn: { backgroundColor: '#00C853', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }, contactText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  
  detailImage: { width: '100%', height: 250, backgroundColor: '#eee' }, detailContent: { padding: 20 },
  commentItem: { flexDirection: 'row', marginBottom: 15, marginTop: 10 }, commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  commentBubble: { flex: 1, backgroundColor: '#F5F7FA', padding: 12, borderRadius: 12 }, commentUser: { fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  commentText: { fontSize: 13, color: '#444' }, commentTime: { fontSize: 10, color: '#999', marginTop: 5 },
  footerInput: { padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  inputField: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, backgroundColor: '#00C853', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  
  createHeader: { paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  createHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' }, createContent: { padding: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4, marginTop: 15 }, input: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#F0F0F0' },
  inputIconWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#F0F0F0', justifyContent: 'space-between' },
  dropdownList: { backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginTop: 5, padding: 5, elevation: 3, zIndex: 10 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F5F7FA' }, dropdownItemText: { fontSize: 14, color: '#333' },
  typeRow: { flexDirection: 'row', gap: 10 }, typeBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center' }, typeBtnText: { fontSize: 12, fontWeight: '600', color: '#666' },
  imageUploadBox: { height: 120, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA', marginTop: 5 },
  submitBtn: { padding: 15, borderRadius: 12, backgroundColor: '#00C853', alignItems: 'center', marginTop: 30 },
});