import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, StatusBar, Platform, TextInput, ActivityIndicator, Alert, RefreshControl, KeyboardAvoidingView, Modal } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router'; 
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker'; 

import { supabase } from '../../lib/supabase';

const getSafeShadow = () => Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 3 }, web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' } });

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams(); 
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false); 

  const [user, setUser] = useState({ name: 'Loading...', role: 'GreenSort Member', id: 'GS-USER', email: '', phone: '', address: '', avatar: null, stats: { submissions: 0, recycled: 0, projects: 0 } });
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', avatar: null });
  const [myPosts, setMyPosts] = useState([]);

  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [postForm, setPostForm] = useState({ type: 'For Sale', title: '', desc: '', price: '', lookingFor: '', location: '', imageUri: null });
  const [isUploadingPost, setIsUploadingPost] = useState(false);

  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedPostForOptions, setSelectedPostForOptions] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchProfileAndPosts();

      if (params.autoEditPost) {
          try {
              const post = JSON.parse(params.autoEditPost);
              setEditingPostId(post.id);
              setPostForm({
                  type: post.type || 'For Sale',
                  title: post.title,
                  desc: post.desc,
                  price: post.price ? post.price.replace('₱','').replace('Trade: ','') : '',
                  lookingFor: post.price && post.price.includes('Trade') ? post.price.replace('Trade: ','') : '',
                  location: post.location || '',
                  imageUri: post.image
              });
              setIsEditingPost(true);
              
              router.setParams({ autoEditPost: '' }); 
          } catch (e) {
              console.log("Error parsing autoEditPost", e);
          }
      }
    }, [params.autoEditPost]) 
  );

  const fetchProfileAndPosts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const metadata = session.user.user_metadata;
      const userEmail = session.user.email;
      const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata?.full_name || 'User')}&background=00C853&color=fff&bold=true`;

      let totalSubmissions = 0;
      let totalKg = 0;
      let totalProjects = 0;

      const { data: logs } = await supabase.from('surrender_logs').select('weight_kg').eq('resident_email', userEmail);
      if (logs) {
        totalSubmissions = logs.length;
        logs.forEach(log => { totalKg += Number(log.weight_kg) || 0; });
      }

      const { count: projectCount } = await supabase.from('saved_projects').select('*', { count: 'exact', head: true }).eq('user_email', userEmail).eq('is_done', true);
      totalProjects = projectCount || 0;

      const fetchedUser = {
        name: metadata?.full_name || '', email: userEmail, phone: metadata?.phone || '',
        address: metadata?.address || '', avatar: metadata?.avatar_url || defaultAvatar,
        role: 'GreenSort Member', id: `GS-${session.user.id.substring(0, 6).toUpperCase()}`,
        stats: { submissions: totalSubmissions, recycled: totalKg.toFixed(1), projects: totalProjects }
      };
      setUser(fetchedUser);
      setEditForm({ name: fetchedUser.name, phone: fetchedUser.phone, address: fetchedUser.address, avatar: fetchedUser.avatar });

      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user', fetchedUser.name)
        .order('created_at', { ascending: false });
        
      if (postsData) {
          const activePosts = postsData.filter(post => post.status !== 'sold' && post.status !== 'archived');
          setMyPosts(activePosts);
      }
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfileAndPosts();
    setRefreshing(false);
  };

  const handlePostOptions = (post) => {
    setSelectedPostForOptions(post);
    setOptionsModalVisible(true);
  };

  const handleEditAction = () => {
    const post = selectedPostForOptions;
    setOptionsModalVisible(false);
    setEditingPostId(post.id); 
    setPostForm({ 
        type: post.type || 'For Sale', 
        title: post.title, 
        desc: post.desc, 
        price: post.price ? post.price.replace('₱','').replace('Trade: ','') : '', 
        lookingFor: post.price && post.price.includes('Trade') ? post.price.replace('Trade: ','') : '', 
        location: post.location || '', 
        imageUri: post.image 
    }); 
    setIsEditingPost(true);
  };

  const handleSoldAction = async () => {
    const post = selectedPostForOptions;
    setOptionsModalVisible(false);
    
    Alert.alert("Mark as Sold/Traded", "Are you sure this item is no longer available?", [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: async () => {
          const { error } = await supabase.from('posts').update({ status: 'sold' }).eq('id', post.id); 
          if (error) {
              Alert.alert("Update Failed", "May error sa database: " + error.message);
              return;
          }
          fetchProfileAndPosts(); 
          Alert.alert("Success", "Item marked as sold/traded.");
      }}
    ]);
  };

  const handleDeleteAction = async () => {
    const post = selectedPostForOptions;
    setOptionsModalVisible(false);
    Alert.alert("Delete Post", "Are you sure you want to delete this permanently?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
          await supabase.from('posts').delete().eq('id', post.id); 
          fetchProfileAndPosts(); 
          Alert.alert("Deleted", "Post removed.");
      }}
    ]);
  };

  const handlePostImagePick = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.3 });
    if (!result.canceled) setPostForm({ ...postForm, imageUri: result.assets[0].uri });
  };

  const handlePostSubmit = async () => {
    if (!postForm.title || !postForm.desc || !postForm.location) return Alert.alert("Wait!", "Please fill in all details.");
    setIsUploadingPost(true);
    let uploadedImageUrl = postForm.imageUri; 

    if (postForm.imageUri && !postForm.imageUri.startsWith('http')) {
        try {
            const formData = new FormData();
            formData.append('file', { uri: postForm.imageUri, name: `img_${Date.now()}.jpg`, type: 'image/jpeg' });
            const { data, error } = await supabase.storage.from('post_images').upload(`public/${Date.now()}.jpg`, formData);
            if (!error) {
                const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path);
                uploadedImageUrl = urlData.publicUrl;
            }
        } catch(e) { console.log(e); }
    }

    const postData = {
        type: postForm.type, title: postForm.title, desc: postForm.desc,
        price: postForm.type === 'Free' ? 'Free' : postForm.type === 'Trade' ? `Trade: ${postForm.lookingFor}` : `₱${postForm.price}`,
        location: postForm.location, image: uploadedImageUrl
    };

    if (editingPostId) { 
        await supabase.from('posts').update(postData).eq('id', editingPostId); 
    } 
    
    setIsUploadingPost(false); 
    setEditingPostId(null); 
    setIsEditingPost(false);
    fetchProfileAndPosts(); 
    Alert.alert("Success", "Post updated successfully!");
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
        await supabase.from('messages').update({ sender_name: editForm.name }).eq('sender_name', user.name);
        await supabase.from('messages').update({ receiver_name: editForm.name }).eq('receiver_name', user.name);
        await supabase.from('notifications').update({ actor_name: editForm.name, actor_avatar: finalAvatarUrl }).eq('actor_name', user.name);
        await supabase.from('notifications').update({ owner_name: editForm.name }).eq('owner_name', user.name);

        setUser({ ...user, name: editForm.name, phone: editForm.phone, address: editForm.address, avatar: finalAvatarUrl });
        setIsEditing(false);
        fetchProfileAndPosts(); 
        Alert.alert("Success", "Profile updated successfully!");
    } else { Alert.alert("Error", error.message); }
    setSaving(false);
  };

  if (loading) return <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}><ActivityIndicator size="large" color="#00C853" /></View>;

  if (isEditingPost) {
    return (
      <View style={{flex: 1, backgroundColor: 'white'}}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        <View style={[styles.createHeader, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
          <TouchableOpacity onPress={() => {setIsEditingPost(false); setEditingPostId(null);}}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View>
            <Text style={styles.createHeaderTitle}>Edit Post</Text>
          </View>
          <View style={{width: 24}} />
        </View>
        
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{flex: 1}}>
          <ScrollView contentContainerStyle={styles.createContent}>
            <Text style={styles.postLabel}>Post Type</Text>
            <View style={styles.typeRow}>
              {['For Sale', 'Trade', 'Free'].map(type => (
                <TouchableOpacity key={type} style={[styles.typeBtn, postForm.type === type && styles.typeBtnActive, {borderColor: postForm.type === type ? '#007C00' : '#E0E0E0'}]} onPress={() => setPostForm({...postForm, type: type})}>
                  <Text style={[styles.typeBtnText, postForm.type === type && {color: '#007C00'}]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.postLabel}>Title</Text>
            <TextInput style={styles.postInput} placeholder="Title" value={postForm.title} onChangeText={(t) => setPostForm({...postForm, title: t})} />
            
            <Text style={styles.postLabel}>Description</Text>
            <TextInput style={[styles.postInput, {height: 80}]} placeholder="Desc" multiline value={postForm.desc} onChangeText={(t) => setPostForm({...postForm, desc: t})} />
            
            <Text style={styles.postLabel}>Location</Text>
            <TextInput style={styles.postInput} placeholder="Barangay, City" value={postForm.location} onChangeText={(t) => setPostForm({...postForm, location: t})} />
            
            {postForm.type === 'For Sale' && (
              <>
                <Text style={styles.postLabel}>Price *</Text>
                <View style={styles.inputIconWrap}>
                  <Text style={{color: '#999', marginRight: 5}}>₱</Text>
                  <TextInput style={{flex: 1}} placeholder="0.00" keyboardType="numeric" value={postForm.price} onChangeText={(t) => setPostForm({...postForm, price: t})}/>
                </View>
              </>
            )}
            
            {postForm.type === 'Trade' && (
              <>
                <Text style={styles.postLabel}>Looking For</Text>
                <TextInput style={styles.postInput} placeholder="e.g. Glass bottles..." value={postForm.lookingFor} onChangeText={(t) => setPostForm({...postForm, lookingFor: t})}/>
              </>
            )}
            
            <Text style={styles.postLabel}>Upload Photo</Text>
            <TouchableOpacity style={styles.imageUploadBox} onPress={handlePostImagePick}>
              {postForm.imageUri ? (
                <Image source={{ uri: postForm.imageUri }} style={{width: '100%', aspectRatio: 16/9, borderRadius: 12}} resizeMode="cover" />
              ) : (
                <MaterialCommunityIcons name="camera-plus" size={30} color="#999" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.submitBtn} onPress={handlePostSubmit} disabled={isUploadingPost}>
              {isUploadingPost ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{color: 'white', fontWeight: 'bold'}}>SAVE CHANGES</Text>
              )}
            </TouchableOpacity>
            <View style={{height: 100}} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <View style={styles.headerRow}>
            {/* 🟢 INAPPLY ANG styles.iconButton DITO PARA MAY GLASS BACKGROUND */}
            <View style={styles.headerSide}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
            </View>
            <View style={styles.headerCenter}><Text style={styles.headerTitle}>Profile</Text></View>
            
            {/* 🟢 INAPPLY DIN DITO SA SETTINGS BUTTON PARA PANTAY AT BALANCE */}
            <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
                <TouchableOpacity onPress={() => router.push('/settings')} style={styles.iconButton}>
                    <Ionicons name="settings-sharp" size={24} color="white" />
                </TouchableOpacity>
            </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007C00']} />}>
        <View style={styles.idCard}>
            <TouchableOpacity onPress={isEditing ? pickImage : null} style={styles.avatarWrapper}>
                <Image source={{ uri: isEditing ? editForm.avatar : user.avatar }} style={styles.avatarImage} />
                {isEditing && <View style={styles.cameraIconBadge}><MaterialCommunityIcons name="camera" size={20} color="white" /></View>}
            </TouchableOpacity>
            <Text style={styles.name}>{isEditing ? editForm.name : user.name}</Text><Text style={styles.role}>{user.role}</Text><View style={styles.badge}><Text style={styles.badgeText}>{user.id}</Text></View>
        </View>

        <View style={styles.infoCard}>
            <View style={styles.cardHeader}><Text style={styles.cardTitle}>Contact Information</Text>{isEditing ? (<TouchableOpacity onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator size="small" color="#007C00" /> : <Text style={styles.saveText}>Save</Text>}</TouchableOpacity>) : (<TouchableOpacity onPress={() => setIsEditing(true)}><Text style={styles.editText}>Edit</Text></TouchableOpacity>)}</View>
            <View style={styles.infoRow}><Text style={styles.label}>Full Name</Text>{isEditing ? <TextInput style={styles.inputField} value={editForm.name} onChangeText={(t) => setEditForm({...editForm, name: t})} /> : <Text style={styles.value}>{user.name}</Text>}</View>
            <View style={styles.infoRow}><Text style={styles.label}>Phone Number</Text>{isEditing ? <TextInput style={styles.inputField} value={editForm.phone} keyboardType="phone-pad" onChangeText={(t) => setEditForm({...editForm, phone: t})} /> : <Text style={styles.value}>{user.phone || 'Not set'}</Text>}</View>
            <View style={styles.infoRow}><Text style={styles.label}>Address</Text>{isEditing ? <TextInput style={styles.inputField} value={editForm.address} onChangeText={(t) => setEditForm({...editForm, address: t})} /> : <Text style={styles.value}>{user.address}</Text>}</View>
            <View style={styles.infoRow}><Text style={styles.label}>Email Address (Read-only)</Text><Text style={[styles.value, {color: '#888'}]}>{user.email}</Text></View>
        </View>

        <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>Your Stats</Text>
            <View style={styles.statsRow}>
                <StatItem icon="trophy-outline" value={user.stats.submissions} label="Total Submission" />
                <StatItem icon="lightning-bolt-outline" value={`${user.stats.recycled}kg`} label="Kg Recycled" />
                <StatItem icon="star-outline" value={user.stats.projects} label="Upcycle Projects" />
            </View>
        </View>

        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 10, marginBottom: 15 }}>My Posts</Text>
        
        {myPosts.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#999', marginTop: 20 }}>You haven't posted anything yet.</Text>
        ) : (
            myPosts.map((post) => (
                <View key={post.id} style={styles.myPostCard}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                        <Image source={{ uri: post.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.user || 'U')}&background=00C853&color=fff&bold=true` }} style={styles.avatarSmall} />
                        <Text style={{fontWeight: 'bold', flex: 1}}>{post.user}</Text>
                        <View style={{backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10}}>
                            <Text style={{color: '#007C00', fontSize: 10, fontWeight: 'bold'}}>{post.type}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handlePostOptions(post)} style={{padding: 5, marginLeft: 10}}>
                            <Ionicons name="ellipsis-vertical" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>
                    <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 5}}>{post.title}</Text>
                    <Text style={{color: '#666', fontSize: 13, marginBottom: 10}} numberOfLines={2}>{post.desc}</Text>
                    {post.image && <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />}
                    <View style={{flexDirection: 'row', gap: 15, marginTop: 15}}>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}><Ionicons name="heart" size={20} color="#FF1744" /><Text style={{color: '#666'}}>{post.likes || 0}</Text></View>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}><Ionicons name="chatbubble" size={18} color="#666" /><Text style={{color: '#666'}}>{post.comments || 0}</Text></View>
                    </View>
                </View>
            ))
        )}
        <View style={{height: 100}} />
      </ScrollView>

      {/* 🟢 MODAL: POST OPTIONS (DARK THEME) */}
      <Modal visible={optionsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setOptionsModalVisible(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.darkModalSheet}>
            
            <View style={{width: 40, height: 5, backgroundColor: '#555', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 20}} />
            
            <View style={styles.darkMenuContainer}>
              <TouchableOpacity style={styles.darkMenuItem} onPress={handleEditAction}>
                <Ionicons name="create-outline" size={22} color="#fff" style={{marginRight: 15}} />
                <Text style={styles.darkMenuText}>Edit Post</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.darkMenuItem} onPress={handleSoldAction}>
                <Ionicons name="checkmark-circle-outline" size={22} color="#007C00" style={{marginRight: 15}} />
                <Text style={[styles.darkMenuText, {color: '#007C00', fontWeight: 'bold'}]}>Mark as Sold/Traded</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.darkMenuItem, { borderBottomWidth: 0 }]} onPress={handleDeleteAction}>
                <Ionicons name="trash-outline" size={22} color="#FF3B30" style={{marginRight: 15}} />
                <Text style={[styles.darkMenuText, { color: '#FF3B30', fontWeight: 'bold' }]}>Delete Post</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.darkCancelBtn} onPress={() => setOptionsModalVisible(false)}>
              <Text style={{color: '#fff', fontWeight: 'bold'}}>Cancel</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const StatItem = ({ icon, value, label }) => (
    <View style={styles.statItem}><View style={styles.iconCircle}><MaterialCommunityIcons name={icon} size={24} color="#007C00" /></View><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, 
  header: { backgroundColor: '#007C00', paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, zIndex: 10, elevation: 5 }, 
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }, 
  headerSide: { width: 50, alignItems: 'flex-start' }, 
  headerCenter: { flex: 1, alignItems: 'center' }, 
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' }, 
  
  // 🟢 BAGONG STYLE PARA SA BACK AT SETTINGS BUTTONS
  iconButton: { backgroundColor: 'rgba(255,255,255,0.25)', padding: 8, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

  content: { flex: 1, paddingHorizontal: 20, zIndex: 1 }, 
  idCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, marginBottom: 15, ...getSafeShadow() }, 
  avatarWrapper: { position: 'relative', marginBottom: 10 }, avatarImage: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#eee', borderWidth: 3, borderColor: '#007C00' }, cameraIconBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#2962FF', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white' }, name: { fontSize: 20, fontWeight: 'bold' }, role: { color: '#666', fontSize: 12 }, badge: { backgroundColor: '#007C00', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 }, badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  infoCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 15, ...getSafeShadow() }, cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }, cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' }, editText: { color: '#007C00', fontWeight: 'bold', fontSize: 14 }, saveText: { color: '#2962FF', fontWeight: 'bold', fontSize: 14 }, infoRow: { marginBottom: 15 }, label: { fontSize: 12, color: '#999', marginBottom: 4 }, value: { fontSize: 15, color: '#333', fontWeight: '500' }, inputField: { backgroundColor: '#F5F5F5', padding: 10, borderRadius: 8, fontSize: 15, color: '#333', borderWidth: 1, borderColor: '#eee' },
  statsCard: { backgroundColor: 'white', borderRadius: 15, padding: 20, marginBottom: 20, ...getSafeShadow() }, statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 }, statItem: { alignItems: 'center', flex: 1 }, iconCircle: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 50, marginBottom: 5 }, statValue: { fontSize: 16, fontWeight: 'bold', color: '#007C00' }, statLabel: { fontSize: 10, color: '#666', textAlign: 'center' },
  myPostCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginBottom: 15, ...getSafeShadow() }, avatarSmall: { width: 34, height: 34, borderRadius: 17, marginRight: 10, backgroundColor: '#eee' }, postImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#f5f5f5' },
  createHeader: { paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' }, createHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' }, createContent: { padding: 20 }, postLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4, marginTop: 15 }, postInput: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#F0F0F0' }, inputIconWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: '#F0F0F0' }, typeRow: { flexDirection: 'row', gap: 10 }, typeBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center' }, typeBtnActive: { borderColor: '#007C00', backgroundColor: '#E8F5E9' }, typeBtnText: { fontSize: 12, fontWeight: '600', color: '#666' }, imageUploadBox: { width: '100%', aspectRatio: 16 / 9, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA', marginTop: 5 }, submitBtn: { padding: 15, borderRadius: 12, backgroundColor: '#007C00', alignItems: 'center', marginTop: 30 },

  darkModalSheet: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingBottom: 35, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 15 },
  darkMenuContainer: { backgroundColor: '#2C2C2E', borderRadius: 15, overflow: 'hidden', marginBottom: 15 },
  darkMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#3A3A3C' },
  darkMenuText: { fontSize: 16, color: '#fff' },
  darkCancelBtn: { padding: 18, backgroundColor: '#2C2C2E', borderRadius: 15, alignItems: 'center' }
});