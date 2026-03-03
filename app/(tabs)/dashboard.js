import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, StatusBar, Image, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker'; 
import { supabase } from '../../lib/supabase'; 

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [posts, setPosts] = useState([]); 
  const [selectedPost, setSelectedPost] = useState(null); 
  const [postComments, setPostComments] = useState([]); 
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [activeFilter, setActiveFilter] = useState('All');
  const [isUploading, setIsUploading] = useState(false); 
  const [refreshing, setRefreshing] = useState(false); 

  const [userData, setUserData] = useState({ name: 'Loading...', kgRecycled: 0, submissions: 0, upcycleProjects: 0, avatar: null });
  const [form, setForm] = useState({ type: 'For Sale', title: '', desc: '', category: '', price: '', lookingFor: '', location: '', imageUri: null });
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isProfileMenuVisible, setProfileMenuVisible] = useState(false);
  
  // 🟢 STATE PARA SA NOTIFICATION BADGE
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => { fetchUserSessionAndData(); }, []);

  const fetchUserSessionAndData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const fullName = session.user.user_metadata?.full_name || 'GreenSort Member';
      setUserData({
        name: fullName, kgRecycled: 0, submissions: 0, upcycleProjects: 0,
        avatar: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=00C853&color=fff&bold=true`
      });

      // 🟢 KUNIN ANG BILANG NG UNREAD NOTIFICATIONS
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('owner_name', fullName).eq('is_read', false);
      setUnreadNotifs(count || 0);
    } else { router.replace('/login'); }
    fetchPosts();
  };

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*').neq('status', 'archived').order('created_at', { ascending: false });
    if (data) setPosts(data);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchUserSessionAndData(); setRefreshing(false);
  }, []);

  const handlePostOptions = (post) => {
    Alert.alert("Post Options", "What do you want to do with this post?", [
        { text: "Edit", onPress: () => { setEditingPostId(post.id); setForm({ type: post.type, title: post.title, desc: post.desc, category: 'Other', price: post.price.replace('₱','').replace('Trade: ',''), lookingFor: post.price.includes('Trade') ? post.price.replace('Trade: ','') : '', location: post.location, imageUri: post.image }); setIsCreating(true); }},
        { text: "Archive", onPress: async () => { await supabase.from('posts').update({ status: 'archived' }).eq('id', post.id); fetchPosts(); Alert.alert("Archived", "Post hidden from feed."); }},
        { text: "Delete", style: 'destructive', onPress: async () => { await supabase.from('posts').delete().eq('id', post.id); fetchPosts(); Alert.alert("Deleted", "Post has been removed permanently."); }},
        { text: "Cancel", style: 'cancel' }
    ]);
  };

  const handleImagePick = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.3 });
    if (!result.canceled) setForm({ ...form, imageUri: result.assets[0].uri });
  };

  const handlePostSubmit = async () => {
    if (!form.title || !form.desc || !form.location) return Alert.alert("Wait!", "Please fill in all details.");
    setIsUploading(true);
    let uploadedImageUrl = form.imageUri; 

    if (form.imageUri && !form.imageUri.startsWith('http')) {
        try {
            const formData = new FormData();
            formData.append('file', { uri: form.imageUri, name: `img_${Date.now()}.jpg`, type: 'image/jpeg' });
            const { data, error } = await supabase.storage.from('post_images').upload(`public/${Date.now()}.jpg`, formData);
            if (!error) {
                const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path);
                uploadedImageUrl = urlData.publicUrl;
            }
        } catch(e) { console.log(e); }
    } else if (!form.imageUri) {
        uploadedImageUrl = 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=500';
    }

    const postData = {
        user: userData.name, avatar: userData.avatar, type: form.type, title: form.title, desc: form.desc,
        price: form.type === 'Free' ? 'Free' : form.type === 'Trade' ? `Trade: ${form.lookingFor}` : `₱${form.price}`,
        location: form.location, image: uploadedImageUrl
    };

    if (editingPostId) { await supabase.from('posts').update(postData).eq('id', editingPostId); } 
    else { await supabase.from('posts').insert([{ ...postData, likes: 0, comments: 0 }]); }
    
    setIsUploading(false); setEditingPostId(null); setIsCreating(false);
    setForm({ type: 'For Sale', title: '', desc: '', category: '', price: '', lookingFor: '', location: '', imageUri: null });
    fetchPosts(); Alert.alert("Success", editingPostId ? "Post updated!" : "Post uploaded!");
  };

  const handleLike = async (post) => {
    const hasLiked = post.liked_by && post.liked_by.includes(userData.name);
    let newLikedBy = post.liked_by ? [...post.liked_by] : [];
    let newLikes = post.likes || 0;

    if (hasLiked) { newLikedBy = newLikedBy.filter(name => name !== userData.name); newLikes = Math.max(0, newLikes - 1); } 
    else { newLikedBy.push(userData.name); newLikes += 1; }

    setPosts(posts.map(p => p.id === post.id ? { ...p, likes: newLikes, liked_by: newLikedBy } : p));
    await supabase.from('posts').update({ likes: newLikes, liked_by: newLikedBy }).eq('id', post.id);

    if (!hasLiked && post.user !== userData.name) {
      const safeAvatar = userData.avatar || 'https://ui-avatars.com/api/?name=User&background=00C853&color=fff';
      await supabase.from('notifications').insert([{ owner_name: post.user, actor_name: userData.name, actor_avatar: safeAvatar, action: 'liked', post_title: post.title }]);
    }
  };

  const handleCommentLike = async (comment) => {
    const hasLiked = comment.liked_by && comment.liked_by.includes(userData.name);
    let newLikedBy = comment.liked_by ? [...comment.liked_by] : [];
    let newLikes = comment.likes || 0;
    if (hasLiked) { newLikedBy = newLikedBy.filter(name => name !== userData.name); newLikes = Math.max(0, newLikes - 1); } 
    else { newLikedBy.push(userData.name); newLikes += 1; }
    await supabase.from('comments').update({ likes: newLikes, liked_by: newLikedBy }).eq('id', comment.id);
    openPostDetails(selectedPost); 
  };

  const handleContact = async (post) => {
    if (post.user === userData.name) return Alert.alert("Oops!", "You can't contact yourself.");
    const safeAvatar = userData.avatar || 'https://ui-avatars.com/api/?name=User&background=00C853&color=fff';
    await supabase.from('notifications').insert([{ owner_name: post.user, actor_name: userData.name, actor_avatar: safeAvatar, action: 'wants to contact you about', post_title: post.title }]);
    router.push({ pathname: '/chat', params: { chatUser: post.user } });
  };

  const openPostDetails = async (post) => {
    setSelectedPost(post);
    const { data } = await supabase.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
    setPostComments(data || []);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const commentData = { post_id: selectedPost.id, user_name: userData.name, avatar: userData.avatar, text: newComment, parent_id: replyingTo ? replyingTo.id : null };
    await supabase.from('comments').insert([commentData]);
    await supabase.from('posts').update({ comments: selectedPost.comments + 1 }).eq('id', selectedPost.id);
    const targetUser = replyingTo ? replyingTo.name : selectedPost.user;
    if (targetUser !== userData.name) {
      const safeAvatar = userData.avatar || 'https://ui-avatars.com/api/?name=User&background=00C853&color=fff';
      await supabase.from('notifications').insert([{ owner_name: targetUser, actor_name: userData.name, actor_avatar: safeAvatar, action: replyingTo ? 'replied to your comment on' : 'commented on', post_title: selectedPost.title }]);
    }
    setNewComment(''); setReplyingTo(null); openPostDetails(selectedPost); fetchPosts(); 
  };

  const filteredPosts = posts.filter(post => {
      const matchFilter = activeFilter === 'All' ? true : post.type === activeFilter;
      const matchSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || post.desc.toLowerCase().includes(searchQuery.toLowerCase()) || post.user.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
  });

  const formatTime = (dateString) => {
      const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
      if (diffMins < 1) return 'Just now'; if (diffMins < 60) return `${diffMins}m ago`;
      if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`; return `${Math.floor(diffMins / 1440)}d ago`;
  };

  if (selectedPost) {
    const mainComments = postComments.filter(c => !c.parent_id);
    const getReplies = (parentId) => postComments.filter(c => c.parent_id === parentId);
    return (
      <KeyboardAvoidingView style={{flex: 1, backgroundColor: 'white'}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <StatusBar barStyle="dark-content" backgroundColor="white" translucent={true} />
          <View style={[styles.createHeader, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
              <TouchableOpacity onPress={() => {setSelectedPost(null); setReplyingTo(null);}}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.createHeaderTitle}>Comments</Text>
              <View style={{width: 24}} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}}>
              <Image source={{ uri: selectedPost.image }} style={styles.detailImage} />
              <View style={styles.detailContent}>
                  <Text style={styles.postTitle}>{selectedPost.title}</Text>
                  <Text style={styles.postDesc}>{selectedPost.desc}</Text>
                  <Text style={[styles.label, {marginTop: 20}]}>All Comments ({selectedPost.comments})</Text>
                  {mainComments.length === 0 ? <Text style={{color: '#999', marginTop: 10}}>No comments yet. Be the first!</Text> : null}
                  {mainComments.map((comment) => (
                      <View key={comment.id} style={{marginBottom: 15, marginTop: 10}}>
                          <View style={{flexDirection: 'row'}}>
                            <Image source={{ uri: comment.avatar }} style={styles.commentAvatar} />
                              <View style={{flex: 1}}>
                                <View style={styles.commentBubble}>
                                  <Text style={styles.commentUser}>{comment.user_name}</Text>
                                  <Text style={styles.commentText}>{comment.text}</Text>
                                </View>
                                  <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5, paddingLeft: 10, gap: 15}}>
                                      <Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text>
                                      <TouchableOpacity onPress={() => setReplyingTo({id: comment.id, name: comment.user_name})}><Text style={{fontSize: 11, color: '#00C853', fontWeight: 'bold', marginRight: 15}}>Reply</Text></TouchableOpacity>
                                      <TouchableOpacity onPress={() => handleCommentLike(comment)} style={{flexDirection: 'row', alignItems: 'center', gap: 4}}><MaterialCommunityIcons name={comment.liked_by?.includes(userData.name) ? "heart" : "heart-outline"} size={14} color={comment.liked_by?.includes(userData.name) ? "#FF1744" : "#666"} /><Text style={{fontSize: 12, color: comment.liked_by?.includes(userData.name) ? '#FF1744' : '#666'}}>{comment.likes || 0}</Text></TouchableOpacity>
                                  </View>
                              </View>
                          </View>
                          {getReplies(comment.id).map(reply => (
                              <View key={reply.id} style={{flexDirection: 'row', marginTop: 10, marginLeft: 45, borderLeftWidth: 2, borderLeftColor: '#eee', paddingLeft: 10}}>
                                  <Image source={{ uri: reply.avatar }} style={{width: 28, height: 28, borderRadius: 14, marginRight: 8}} />
                                  <View style={{flex: 1}}>
                                    <View style={[styles.commentBubble, {backgroundColor: '#f9f9f9', padding: 10}]}>
                                      <Text style={styles.commentUser}>{reply.user_name}</Text>
                                      <Text style={styles.commentText}>{reply.text}</Text>
                                    </View>
                                      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5, paddingLeft: 10, gap: 15}}>
                                          <Text style={styles.commentTime}>{formatTime(reply.created_at)}</Text>
                                          <TouchableOpacity onPress={() => handleCommentLike(reply)} style={{flexDirection: 'row', alignItems: 'center', gap: 4}}><MaterialCommunityIcons name={reply.liked_by?.includes(userData.name) ? "heart" : "heart-outline"} size={14} color={reply.liked_by?.includes(userData.name) ? "#FF1744" : "#666"} /><Text style={{fontSize: 12, color: reply.liked_by?.includes(userData.name) ? '#FF1744' : '#666'}}>{reply.likes || 0}</Text></TouchableOpacity>
                                      </View>
                                  </View>
                              </View>
                          ))}
                      </View>
                  ))}
              </View>
          </ScrollView>
          <View style={{backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee'}}>
              {replyingTo && (<View style={{backgroundColor: '#E8F5E9', padding: 8, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between'}}><Text style={{fontSize: 12, color: '#00C853'}}>Replying to <Text style={{fontWeight: 'bold'}}>@{replyingTo.name}</Text></Text><TouchableOpacity onPress={() => setReplyingTo(null)}><MaterialCommunityIcons name="close" size={16} color="#666" /></TouchableOpacity></View>)}
              <View style={[styles.footerInput, {borderTopWidth: 0}]}>
                <TextInput placeholder={replyingTo ? "Write a reply..." : "Write a comment..."} style={styles.inputField} value={newComment} onChangeText={setNewComment} />
                <TouchableOpacity style={styles.sendBtn} onPress={handleAddComment}>
                  <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
              </View>
          </View>
      </KeyboardAvoidingView>
    );
  }

  // 🟢 DITO KO INAYOS YUNG ERROR (TINANGGAL ANG LIGAW NA SPACES)
  if (isCreating) {
      return (
        <View style={{flex: 1, backgroundColor: 'white'}}>
          <StatusBar barStyle="dark-content" backgroundColor="white" />
          <View style={[styles.createHeader, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
            <TouchableOpacity onPress={() => {setIsCreating(false); setEditingPostId(null);}}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <View>
              <Text style={styles.createHeaderTitle}>{editingPostId ? 'Edit Post' : 'Create Post'}</Text>
            </View>
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
              
              <Text style={styles.label}>Title</Text>
              <TextInput style={styles.input} placeholder="Title" value={form.title} onChangeText={(t) => setForm({...form, title: t})} />
              
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, {height: 80}]} placeholder="Desc" multiline value={form.desc} onChangeText={(t) => setForm({...form, desc: t})} />
              
              <Text style={styles.label}>Location</Text>
              <TextInput style={styles.input} placeholder="Barangay, City" value={form.location} onChangeText={(t) => setForm({...form, location: t})} />
              
              {form.type === 'For Sale' && (
                <>
                  <Text style={styles.label}>Price *</Text>
                  <View style={styles.inputIconWrap}>
                    <Text style={{color: '#999', marginRight: 5}}>₱</Text>
                    <TextInput style={{flex: 1}} placeholder="0.00" keyboardType="numeric" value={form.price} onChangeText={(t) => setForm({...form, price: t})}/>
                  </View>
                </>
              )}
              
              {form.type === 'Trade' && (
                <>
                  <Text style={styles.label}>Looking For</Text>
                  <TextInput style={styles.input} placeholder="e.g. Glass bottles..." value={form.lookingFor} onChangeText={(t) => setForm({...form, lookingFor: t})}/>
                </>
              )}
              
              <Text style={styles.label}>Upload Photo</Text>
              <TouchableOpacity style={styles.imageUploadBox} onPress={handleImagePick}>
                {form.imageUri ? (
                  <Image source={{ uri: form.imageUri }} style={{width: '100%', aspectRatio: 16/9, borderRadius: 12}} resizeMode="cover" />
                ) : (
                  <MaterialCommunityIcons name="camera-plus" size={30} color="#999" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.submitBtn} onPress={handlePostSubmit} disabled={isUploading}>
                {isUploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{color: 'white', fontWeight: 'bold'}}>{editingPostId ? 'SAVE CHANGES' : 'POST NOW'}</Text>
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
      <StatusBar barStyle="light-content" backgroundColor="#00C853" translucent={true} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <View style={styles.headerContent}>
            <View><Text style={styles.appName}>GreenSort</Text><Text style={styles.welcomeText}>Welcome back, {userData.name}!</Text></View>
            <TouchableOpacity onPress={() => setProfileMenuVisible(true)}>
                <Image source={{ uri: userData.avatar }} style={{width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'white'}} />
            </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.tipCard}><View style={styles.tipHeader}><MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#FBC02D" /><Text style={styles.tipTitle}>Eco Tip of the Day</Text></View><Text style={styles.tipText}>Rinse and dry your recyclables before disposal.</Text></View>
        <Text style={[styles.sectionTitle, { marginBottom: 10, marginTop: 5 }]}>Eco Impact</Text>
        <View style={styles.impactRow}>
            <ImpactCard value={userData.kgRecycled} unit="kg recycled" icon="chart-line-variant" color="#00C853" bgColor="#E8F5E9" />
            <ImpactCard value={userData.submissions} unit="submissions" icon="target" color="#2979FF" bgColor="#E3F2FD" />
            <ImpactCard value={userData.upcycleProjects} unit="projects" icon="leaf" color="#AA00FF" bgColor="#F3E5F5" />
        </View>

        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Community Feed</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                
                {/* 🟢 NOTIFICATION ICON NA MAY RED BADGE 🟢 */}
                <TouchableOpacity style={styles.notifIconBtn} onPress={() => { setUnreadNotifs(0); router.push('/notifications'); }}>
                    <Ionicons name="notifications-outline" size={22} color="#333" />
                    {unreadNotifs > 0 && (
                        <View style={styles.badgeDot}>
                            <Text style={styles.badgeDotText}>{unreadNotifs > 99 ? '99+' : unreadNotifs}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.addPostBtn} onPress={() => setIsCreating(true)}>
                  <MaterialCommunityIcons name="plus" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
        
        <View style={styles.searchContainer}><Ionicons name="search" size={20} color="#3f3e3e" style={{marginLeft: 10}} /><TextInput style={styles.searchInput} placeholder="Search posts, items, or users..." value={searchQuery} onChangeText={setSearchQuery} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
          {['All', 'For Sale', 'Trade', 'Free'].map((filter) => (
            <TouchableOpacity key={filter} style={[styles.filterPill, activeFilter === filter && styles.activePill]} onPress={() => setActiveFilter(filter)}>
              <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {filteredPosts.length === 0 ? (<Text style={{textAlign: 'center', marginTop: 50, color: '#999'}}>No posts found.</Text>) : (
            filteredPosts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                    <View style={styles.postHeader}><Image source={{ uri: post.avatar }} style={styles.postAvatar} /><View style={{flex: 1, marginLeft: 10}}><Text style={styles.postUser}>{post.user}</Text><Text style={styles.postTime}>{formatTime(post.created_at)}</Text></View><View style={[styles.typeBadge, {backgroundColor: '#E8F5E9'}]}><Text style={{color: '#00C853', fontSize: 10, fontWeight: 'bold'}}>{post.type}</Text></View>{post.user === userData.name && (<TouchableOpacity onPress={() => handlePostOptions(post)} style={{padding: 5, marginLeft: 10}}><Ionicons name="ellipsis-vertical" size={20} color="#999" /></TouchableOpacity>)}</View>
                    <TouchableOpacity onPress={() => openPostDetails(post)}><Text style={styles.postTitle}>{post.title}</Text><Text style={styles.postDesc} numberOfLines={2}>{post.desc}</Text><Image source={{ uri: post.image }} style={styles.postImage} /></TouchableOpacity>
                    <View style={styles.postFooter}><View style={{flexDirection: 'row', gap: 15}}><TouchableOpacity style={styles.iconRow} onPress={() => handleLike(post)}><Ionicons name={post.liked_by?.includes(userData.name) ? "heart" : "heart-outline"} size={24} color={post.liked_by?.includes(userData.name) ? "#FF1744" : "#666"} /><Text style={styles.iconText}>{post.likes}</Text></TouchableOpacity><TouchableOpacity style={styles.iconRow} onPress={() => openPostDetails(post)}><Ionicons name="chatbubble-outline" size={22} color="#666" /><Text style={styles.iconText}>{post.comments}</Text></TouchableOpacity></View><View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}><Text style={styles.postPrice}>{post.price}</Text><TouchableOpacity style={styles.contactBtn} onPress={() => handleContact(post)}><Text style={styles.contactText}>Contact</Text></TouchableOpacity></View></View>
                </View>
            ))
        )}
        <View style={{height: 100}} /> 
      </ScrollView>

      <Modal visible={isProfileMenuVisible} animationType="slide" transparent={true} onRequestClose={() => setProfileMenuVisible(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setProfileMenuVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={{backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, minHeight: 300}}>
            <View style={{width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 5, alignSelf: 'center', marginBottom: 20}} />
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', padding: 15, borderRadius: 16, marginBottom: 20}} onPress={() => { setProfileMenuVisible(false); router.push('/profile'); }}>
              <Image source={{ uri: userData.avatar }} style={{width: 60, height: 60, borderRadius: 30, marginRight: 15}} />
              <View style={{flex: 1}}><Text style={{fontSize: 18, fontWeight: 'bold', color: '#333'}}>{userData.name}</Text><Text style={{fontSize: 13, color: '#666', marginTop: 2}}>See your profile</Text></View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee'}} onPress={() => { setProfileMenuVisible(false); router.push('/settings'); }}>
              <View style={{width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 15}}><Ionicons name="settings" size={20} color="#00C853" /></View>
              <Text style={{fontSize: 16, fontWeight: '500', color: '#333'}}>Settings & Privacy</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const ImpactCard = ({ value, unit, icon, color, bgColor }) => (<View style={styles.impactCard}><View style={[styles.impactIconBg, { backgroundColor: bgColor }]}><MaterialCommunityIcons name={icon} size={24} color={color} /></View><Text style={[styles.impactValue, { color: color }]}>{value}</Text><Text style={styles.impactUnit}>{unit}</Text></View>);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, header: { backgroundColor: '#00C853', paddingBottom: 25, paddingHorizontal: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 4 }, headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, appName: { color: 'white', fontSize: 24, fontWeight: '800' }, welcomeText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 }, scrollView: { flex: 1 }, scrollContent: { paddingHorizontal: 20, paddingTop: 10 }, tipCard: { backgroundColor: '#FFF3E0', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FFE0B2' }, tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 }, tipTitle: { fontSize: 14, fontWeight: 'bold', color: '#EF6C00', marginLeft: 8 }, tipText: { fontSize: 12, color: '#E65100', lineHeight: 18 }, impactRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, gap: 10 }, impactCard: { flex: 1, backgroundColor: 'white', paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 2 }, impactIconBg: { padding: 10, borderRadius: 12, marginBottom: 10 }, impactValue: { fontSize: 18, fontWeight: 'bold' }, impactUnit: { fontSize: 10, color: '#90A4AE', textAlign: 'center', marginTop: 2 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 10 }, sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#263238' }, searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, marginBottom: 15, paddingHorizontal: 10, borderWidth: 1, borderColor: '#eee' }, searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: '#333' }, 
  
  // 🔴 DESIGN PARA SA RED BADGE 🔴
  notifIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#eee', position: 'relative' }, 
  badgeDot: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF1744', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, minWidth: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'white' },
  badgeDotText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  addPostBtn: { backgroundColor: '#00C853', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2 }, filterPill: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: 'white', borderRadius: 20, marginRight: 10, elevation: 1, borderWidth: 1, borderColor: '#eee' }, activePill: { backgroundColor: '#263238', borderColor: '#263238' }, filterText: { fontSize: 13, color: '#666', fontWeight: '600' }, activeFilterText: { color: 'white' }, postCard: { backgroundColor: 'white', borderRadius: 16, padding: 15, marginBottom: 15, elevation: 2 }, postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, postAvatar: { width: 40, height: 40, borderRadius: 20 }, postUser: { fontWeight: 'bold', fontSize: 14, color: '#333' }, postTime: { fontSize: 11, color: '#999' }, typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }, postTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 }, postDesc: { fontSize: 13, color: '#666', marginBottom: 10 }, postImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 15, resizeMode: 'cover', backgroundColor: '#f0f0f0' }, postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, iconRow: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 5 }, iconText: { fontSize: 14, color: '#666' }, postPrice: { fontSize: 16, fontWeight: 'bold', color: '#00C853' }, contactBtn: { backgroundColor: '#00C853', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }, contactText: { color: 'white', fontWeight: 'bold', fontSize: 12 }, detailImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#eee' }, detailContent: { padding: 20 }, commentItem: { flexDirection: 'row', marginBottom: 15, marginTop: 10 }, commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 }, commentBubble: { flex: 1, backgroundColor: '#F5F7FA', padding: 12, borderRadius: 12 }, commentUser: { fontWeight: 'bold', fontSize: 13, marginBottom: 2 }, commentText: { fontSize: 13, color: '#444' }, commentTime: { fontSize: 10, color: '#999' }, footerInput: { padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', alignItems: 'flex-end', gap: 10 }, inputField: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100 }, sendBtn: { width: 40, height: 40, backgroundColor: '#00C853', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 2 }, createHeader: { paddingHorizontal: 20, paddingBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' }, createHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' }, createContent: { padding: 20 }, label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4, marginTop: 15 }, input: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#F0F0F0' }, inputIconWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: '#F0F0F0' }, dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#F0F0F0', justifyContent: 'space-between' }, dropdownList: { backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginTop: 5, padding: 5, elevation: 3, zIndex: 10 }, dropdownItem: { paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F5F7FA' }, dropdownItemText: { fontSize: 14, color: '#333' }, typeRow: { flexDirection: 'row', gap: 10 }, typeBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center' }, typeBtnText: { fontSize: 12, fontWeight: '600', color: '#666' }, imageUploadBox: { width: '100%', aspectRatio: 16 / 9, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA', marginTop: 5 }, submitBtn: { padding: 15, borderRadius: 12, backgroundColor: '#00C853', alignItems: 'center', marginTop: 30 }
});