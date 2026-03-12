import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect } from 'expo-router'; 
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
// 🟢 IMPORT LINEAR GRADIENT
import { LinearGradient } from 'expo-linear-gradient';

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

  const [userData, setUserData] = useState({ name: 'Loading...', kgRecycled: 0, submissions: 0, upcycleProjects: 0, points: 45, avatar: null });
  const [form, setForm] = useState({ type: 'For Sale', title: '', desc: '', category: '', price: '', lookingFor: '', location: '', imageUri: null });
  
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null); 
  const [commentOptionsModalVisible, setCommentOptionsModalVisible] = useState(false);
  const [selectedCommentForOptions, setSelectedCommentForOptions] = useState(null);
  const [commentReportModalVisible, setCommentReportModalVisible] = useState(false);
  const [commentReportStep, setCommentReportStep] = useState(0);
  
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [postToReport, setPostToReport] = useState(null);
  const [reportStep, setReportStep] = useState(0); 

  const [optionsModalVisible, setOptionsModalVisible] = useState(false); 
  const [selectedPostForOptions, setSelectedPostForOptions] = useState(null);

  const reportReasons = [
    "Spam or misleading",
    "Harassment or bullying",
    "Scam or fraud",
    "Inappropriate content",
    "Hate speech or symbols"
  ];

  useEffect(() => { 
    const msgChannel = supabase.channel('dashboard-unread-msgs').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { fetchUserSessionAndData(); }).subscribe();
    return () => { supabase.removeChannel(msgChannel); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserSessionAndData();
    }, [])
  );

  const fetchUserSessionAndData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const fullName = session.user.user_metadata?.full_name || 'GreenSort Member';
      setUserData({
        name: fullName, kgRecycled: 0, submissions: 0, upcycleProjects: 0, points: 45, 
        avatar: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=00C853&color=fff&bold=true`
      });
      const { count: notifCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('owner_name', fullName).eq('is_read', false);
      setUnreadNotifs(notifCount || 0);
      const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_name', fullName).eq('is_read', false);
      setUnreadMessages(msgCount || 0);
    } else { router.replace('/login'); }
    fetchPosts();
  };

  const fetchPosts = async () => {
    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (data) {
        const activePosts = data.filter(post => post.status !== 'archived' && post.status !== 'sold');
        setPosts(activePosts);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true); await fetchUserSessionAndData(); setRefreshing(false);
  }, []);

  const handlePostOptions = (post) => {
    setSelectedPostForOptions(post);
    setOptionsModalVisible(true);
  };

  const handleEditAction = () => {
    const post = selectedPostForOptions;
    setOptionsModalVisible(false);
    setEditingPostId(post.id); 
    setForm({ type: post.type, title: post.title, desc: post.desc, category: 'Other', price: post.price.replace('₱','').replace('Trade: ',''), lookingFor: post.price.includes('Trade') ? post.price.replace('Trade: ','') : '', location: post.location, imageUri: post.image }); 
    setIsCreating(true);
  };

  const handleSoldAction = async () => {
    const post = selectedPostForOptions;
    setOptionsModalVisible(false);
    Alert.alert("Mark as Sold/Traded", "Are you sure this item is no longer available?", [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: async () => {
          const { error } = await supabase.from('posts').update({ status: 'sold' }).eq('id', post.id); 
          if (error) return Alert.alert("Update Failed", "Error: " + error.message);
          fetchPosts(); Alert.alert("Success", "Item marked as sold/traded.");
      }}
    ]);
  };

  const handleDeleteAction = async () => {
    const post = selectedPostForOptions;
    setOptionsModalVisible(false);
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => {
          await supabase.from('posts').delete().eq('id', post.id); 
          fetchPosts(); Alert.alert("Deleted", "Post removed.");
      }}
    ]);
  };

  const handleCommentOptions = (comment) => {
    setSelectedCommentForOptions(comment);
    setCommentOptionsModalVisible(true);
  };

  const handleEditCommentAction = () => {
    setCommentOptionsModalVisible(false);
    setEditingCommentId(selectedCommentForOptions.id);
    setNewComment(selectedCommentForOptions.text); 
    setReplyingTo(null); 
  };

  const handleDeleteCommentAction = async () => {
    setCommentOptionsModalVisible(false);
    Alert.alert("Delete Comment", "Are you sure you want to delete this?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: 'destructive', onPress: async () => {
            await supabase.from('comments').update({ 
                text: '[This comment has been deleted]', 
                is_deleted: true 
            }).eq('id', selectedCommentForOptions.id);
            openPostDetails(selectedPost); 
        }}
    ]);
  };

  const handleReportCommentAction = () => {
    setCommentOptionsModalVisible(false);
    setCommentReportStep(0);
    setCommentReportModalVisible(true);
  };

  const submitCommentReport = (reason) => {
    Alert.alert("Report Submitted", `Thank you for reporting this comment for: "${reason}". Our admins will review it.`);
    setCommentReportModalVisible(false);
    setCommentReportStep(0);
  };

  const handleOtherPostOptions = (post) => {
    setPostToReport(post);
    setReportStep(0); 
    setReportModalVisible(true);
  };

  const submitReport = (reason) => {
    Alert.alert("Report Submitted", `Thank you for reporting this post for: "${reason}". Our admins will review it shortly.`);
    setReportModalVisible(false);
    setPostToReport(null);
    setReportStep(0);
  };

  const handleImagePick = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 0.3 });
    if (!result.canceled) setForm({ ...form, imageUri: result.assets[0].uri });
  };

  const handlePostSubmit = async () => {
    if (!form.imageUri) return Alert.alert("Photo Required", "Please upload a photo for your post.");
    if (!form.title || !form.desc || !form.location) return Alert.alert("Wait!", "Please fill in all general details (Title, Desc, Location).");
    if (form.type === 'For Sale' && (!form.price || form.price.trim() === '')) return Alert.alert("Wait!", "Please enter a price for your item.");
    if (form.type === 'Trade' && (!form.lookingFor || form.lookingFor.trim() === '')) return Alert.alert("Wait!", "Please specify what you are looking for to trade.");

    setIsUploading(true);
    let uploadedImageUrl = form.imageUri; 
    if (form.imageUri && !form.imageUri.startsWith('http')) {
        try {
            const formData = new FormData(); formData.append('file', { uri: form.imageUri, name: `img_${Date.now()}.jpg`, type: 'image/jpeg' });
            const { data, error } = await supabase.storage.from('post_images').upload(`public/${Date.now()}.jpg`, formData);
            if (!error) { const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path); uploadedImageUrl = urlData.publicUrl; }
        } catch(e) { console.log(e); }
    }
    const postData = { user: userData.name, avatar: userData.avatar, type: form.type, title: form.title, desc: form.desc, price: form.type === 'Free' ? 'Free' : form.type === 'Trade' ? `Trade: ${form.lookingFor}` : `₱${form.price}`, location: form.location, image: uploadedImageUrl };
    if (editingPostId) { await supabase.from('posts').update(postData).eq('id', editingPostId); } 
    else { await supabase.from('posts').insert([{ ...postData, likes: 0, comments: 0, liked_by: [] }]); }
    setIsUploading(false); setEditingPostId(null); setIsCreating(false);
    setForm({ type: 'For Sale', title: '', desc: '', category: '', price: '', lookingFor: '', location: '', imageUri: null });
    fetchPosts(); Alert.alert("Success", editingPostId ? "Post updated!" : "Post uploaded!");
  };

  const handleLike = async (post) => {
    const hasLiked = post.liked_by && post.liked_by.includes(userData.name);
    let newLikedBy = post.liked_by ? [...post.liked_by] : []; let newLikes = post.likes || 0;
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
    if (comment.is_deleted) return; 
    const hasLiked = comment.liked_by && comment.liked_by.includes(userData.name);
    let newLikedBy = comment.liked_by ? [...comment.liked_by] : []; let newLikes = comment.likes || 0;
    if (hasLiked) { newLikedBy = newLikedBy.filter(name => name !== userData.name); newLikes = Math.max(0, newLikes - 1); } 
    else { newLikedBy.push(userData.name); newLikes += 1; }
    await supabase.from('comments').update({ likes: newLikes, liked_by: newLikedBy }).eq('id', comment.id);
    openPostDetails(selectedPost); 
  };

  const handleContact = async (post) => {
    if (post.user === userData.name) return Alert.alert("Oops!", "You can't contact yourself.");
    const safeAvatar = userData.avatar || 'https://ui-avatars.com/api/?name=User&background=00C853&color=fff';
    await supabase.from('notifications').insert([{ owner_name: post.user, actor_name: userData.name, actor_avatar: safeAvatar, action: 'wants to contact you about', post_title: post.title }]);
    router.push({ pathname: '/chat', params: { chatUser: post.user, postTitle: post.title } });
  };

  const openPostDetails = async (post) => {
    setSelectedPost(post);
    const { data } = await supabase.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
    setPostComments(data || []);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (editingCommentId) {
        await supabase.from('comments').update({ text: newComment, is_edited: true }).eq('id', editingCommentId);
        setNewComment(''); setEditingCommentId(null); openPostDetails(selectedPost); return;
    }
    const commentData = { post_id: selectedPost.id, user_name: userData.name, avatar: userData.avatar, text: newComment, parent_id: replyingTo ? replyingTo.id : null, is_edited: false, is_deleted: false };
    await supabase.from('comments').insert([commentData]);
    await supabase.from('posts').update({ comments: (selectedPost.comments || 0) + 1 }).eq('id', selectedPost.id);
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
      <View style={{ flex: 1, backgroundColor: '#007C00' }}>
        <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
        
        <KeyboardAvoidingView style={{flex: 1, backgroundColor: '#F5F7FA'}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={[styles.subHeader, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
                <View style={styles.subHeaderRow}>
                    <TouchableOpacity onPress={() => {setSelectedPost(null); setReplyingTo(null); setEditingCommentId(null); setNewComment('');}} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={{alignItems: 'center'}}>
                        <Text style={styles.subHeaderTitle}>Comments</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
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
                              <Image source={{ uri: comment.avatar }} style={[styles.commentAvatar, comment.is_deleted && {opacity: 0.5}]} />
                                <View style={{flex: 1}}>
                                  <View style={[styles.commentBubble, comment.is_deleted && {backgroundColor: '#e0e0e0'}]}>
                                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                          <Text style={[styles.commentUser, comment.is_deleted && {color: '#999'}]}>{comment.user_name}</Text>
                                          {!comment.is_deleted && (
                                              <TouchableOpacity onPress={() => handleCommentOptions(comment)} style={{paddingHorizontal: 5}}>
                                                  <Ionicons name="ellipsis-horizontal" size={16} color="#999" />
                                              </TouchableOpacity>
                                          )}
                                      </View>
                                      <Text style={[styles.commentText, comment.is_deleted && {fontStyle: 'italic', color: '#999'}]}>{comment.text}</Text>
                                  </View>
                                  
                                  {!comment.is_deleted && (
                                      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5, paddingLeft: 10, gap: 15}}>
                                          <Text style={styles.commentTime}>{formatTime(comment.created_at)} {comment.is_edited && <Text style={{fontStyle: 'italic'}}>(edited)</Text>}</Text>
                                          <TouchableOpacity onPress={() => setReplyingTo({id: comment.id, name: comment.user_name})}><Text style={{fontSize: 11, color: '#007C00', fontWeight: 'bold', marginRight: 15}}>Reply</Text></TouchableOpacity>
                                          <TouchableOpacity onPress={() => handleCommentLike(comment)} style={{flexDirection: 'row', alignItems: 'center', gap: 4}}><MaterialCommunityIcons name={comment.liked_by?.includes(userData.name) ? "heart" : "heart-outline"} size={14} color={comment.liked_by?.includes(userData.name) ? "#FF1744" : "#666"} /><Text style={{fontSize: 12, color: comment.liked_by?.includes(userData.name) ? '#FF1744' : '#666'}}>{comment.likes || 0}</Text></TouchableOpacity>
                                      </View>
                                  )}
                                  {comment.is_deleted && (
                                      <View style={{marginTop: 5, paddingLeft: 10}}><Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text></View>
                                  )}
                                </View>
                            </View>

                            {getReplies(comment.id).map(reply => (
                                <View key={reply.id} style={{flexDirection: 'row', marginTop: 10, marginLeft: 45, borderLeftWidth: 2, borderLeftColor: '#eee', paddingLeft: 10}}>
                                    <Image source={{ uri: reply.avatar }} style={[styles.replyAvatar, reply.is_deleted && {opacity: 0.5}]} />
                                    <View style={{flex: 1}}>
                                      <View style={[styles.commentBubble, {backgroundColor: '#f9f9f9', padding: 10}, reply.is_deleted && {backgroundColor: '#e0e0e0'}]}>
                                          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                              <Text style={[styles.commentUser, reply.is_deleted && {color: '#999'}]}>{reply.user_name}</Text>
                                              {!reply.is_deleted && (
                                                  <TouchableOpacity onPress={() => handleCommentOptions(reply)} style={{paddingHorizontal: 5}}>
                                                      <Ionicons name="ellipsis-horizontal" size={16} color="#999" />
                                                  </TouchableOpacity>
                                              )}
                                          </View>
                                          <Text style={[styles.commentText, reply.is_deleted && {fontStyle: 'italic', color: '#999'}]}>{reply.text}</Text>
                                      </View>
                                      
                                      {!reply.is_deleted && (
                                          <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5, paddingLeft: 10, gap: 15}}>
                                              <Text style={styles.commentTime}>{formatTime(reply.created_at)} {reply.is_edited && <Text style={{fontStyle: 'italic'}}>(edited)</Text>}</Text>
                                              <TouchableOpacity onPress={() => handleCommentLike(reply)} style={{flexDirection: 'row', alignItems: 'center', gap: 4}}><MaterialCommunityIcons name={reply.liked_by?.includes(userData.name) ? "heart" : "heart-outline"} size={14} color={reply.liked_by?.includes(userData.name) ? "#FF1744" : "#666"} /><Text style={{fontSize: 12, color: reply.liked_by?.includes(userData.name) ? '#FF1744' : '#666'}}>{reply.likes || 0}</Text></TouchableOpacity>
                                          </View>
                                      )}
                                      {reply.is_deleted && (
                                          <View style={{marginTop: 5, paddingLeft: 10}}><Text style={styles.commentTime}>{formatTime(reply.created_at)}</Text></View>
                                      )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>
            <View style={{backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee'}}>
                {replyingTo && (<View style={styles.statusBanner}><Text style={{fontSize: 12, color: '#007C00'}}>Replying to <Text style={{fontWeight: 'bold'}}>@{replyingTo.name}</Text></Text><TouchableOpacity onPress={() => setReplyingTo(null)}><MaterialCommunityIcons name="close" size={16} color="#666" /></TouchableOpacity></View>)}
                {editingCommentId && (<View style={[styles.statusBanner, {backgroundColor: '#FFF3E0'}]}><Text style={{fontSize: 12, color: '#EF6C00'}}>Editing comment...</Text><TouchableOpacity onPress={() => {setEditingCommentId(null); setNewComment('');}}><MaterialCommunityIcons name="close" size={16} color="#666" /></TouchableOpacity></View>)}
                
                <View style={[styles.footerInput, {borderTopWidth: 0}]}><TextInput placeholder={editingCommentId ? "Edit your comment..." : replyingTo ? "Write a reply..." : "Write a comment..."} style={styles.inputField} value={newComment} onChangeText={setNewComment} /><TouchableOpacity style={styles.sendBtn} onPress={handleAddComment}><Ionicons name={editingCommentId ? "checkmark" : "send"} size={20} color="white" /></TouchableOpacity></View>
            </View>

            <Modal visible={commentOptionsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCommentOptionsModalVisible(false)}>
              <TouchableOpacity style={{flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setCommentOptionsModalVisible(false)}>
                <TouchableOpacity activeOpacity={1} style={styles.darkModalSheet}>
                  <View style={{width: 40, height: 5, backgroundColor: '#555', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 20}} />
                  <View style={styles.darkMenuContainer}>
                      {selectedCommentForOptions?.user_name === userData.name ? (
                          <>
                              <TouchableOpacity style={styles.darkMenuItem} onPress={handleEditCommentAction}>
                                  <Ionicons name="pencil" size={22} color="#fff" style={{marginRight: 15}} />
                                  <Text style={styles.darkMenuText}>Edit Comment</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={[styles.darkMenuItem, { borderBottomWidth: 0 }]} onPress={handleDeleteCommentAction}>
                                  <Ionicons name="trash-outline" size={22} color="#FF3B30" style={{marginRight: 15}} />
                                  <Text style={[styles.darkMenuText, { color: '#FF3B30', fontWeight: 'bold' }]}>Delete Comment</Text>
                              </TouchableOpacity>
                          </>
                      ) : (
                          <TouchableOpacity style={[styles.darkMenuItem, { borderBottomWidth: 0 }]} onPress={handleReportCommentAction}>
                              <Ionicons name="warning-outline" size={22} color="#FF3B30" style={{marginRight: 15}} />
                              <Text style={[styles.darkMenuText, { color: '#FF3B30', fontWeight: 'bold' }]}>Report Comment</Text>
                          </TouchableOpacity>
                      )}
                  </View>
                  <TouchableOpacity style={styles.darkCancelBtn} onPress={() => setCommentOptionsModalVisible(false)}><Text style={{color: '#fff', fontWeight: 'bold'}}>Cancel</Text></TouchableOpacity>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>

            <Modal visible={commentReportModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCommentReportModalVisible(false)}>
              <TouchableOpacity style={{flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setCommentReportModalVisible(false)}>
                <TouchableOpacity activeOpacity={1} style={styles.darkModalSheet}>
                  <View style={{width: 40, height: 5, backgroundColor: '#555', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 20}} />
                  {commentReportStep === 0 ? (
                    <View style={styles.darkMenuContainer}>
                        <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', padding: 18}} onPress={() => setCommentReportStep(1)}>
                            <Ionicons name="warning-outline" size={22} color="#FF3B30" style={{marginRight: 15}} />
                            <Text style={{fontSize: 16, color: '#FF3B30', fontWeight: 'bold'}}>Report this comment</Text>
                        </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{marginBottom: 15}}>
                        <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>Why report this comment?</Text>
                        {reportReasons.map((reason, index) => (
                            <TouchableOpacity key={index} style={styles.darkMenuItem} onPress={() => submitCommentReport(reason)}>
                                <Text style={styles.darkMenuText}>{reason}</Text>
                                <Ionicons name="chevron-forward" size={20} color="#555" />
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 15}]} onPress={() => setCommentReportStep(0)}>
                            <Text style={{color: '#fff', fontWeight: 'bold'}}>Back</Text>
                        </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>

        </KeyboardAvoidingView>
      </View>
    );
  }

  if (isCreating) {
      return (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
          
          <View style={[styles.subHeader, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
              <View style={styles.subHeaderRow}>
                  <TouchableOpacity onPress={() => {setIsCreating(false); setEditingPostId(null);}} style={styles.backButton}>
                      <Ionicons name="arrow-back" size={24} color="white" />
                  </TouchableOpacity>
                  <View style={{alignItems: 'center'}}>
                      <Text style={styles.subHeaderTitle}>{editingPostId ? 'Edit Post' : 'Create Post'}</Text>
                  </View>
                  <View style={{ width: 40 }} />
              </View>
          </View>

          <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <ScrollView contentContainerStyle={styles.createContent}>
              <Text style={styles.label}>Post Type</Text>
              <View style={styles.typeRow}>{['For Sale', 'Trade', 'Free'].map(type => (<TouchableOpacity key={type} style={[styles.typeBtn, form.type === type && styles.typeBtnActive, {borderColor: form.type === type ? '#007C00' : '#E0E0E0'}]} onPress={() => setForm({...form, type: type})}><Text style={[styles.typeBtnText, form.type === type && {color: '#007C00'}]}>{type}</Text></TouchableOpacity>))}</View>
              <Text style={styles.label}>Title</Text><TextInput style={styles.input} placeholder="Title" value={form.title} onChangeText={(t) => setForm({...form, title: t})} />
              <Text style={styles.label}>Description</Text><TextInput style={[styles.input, {height: 80}]} placeholder="Desc" multiline value={form.desc} onChangeText={(t) => setForm({...form, desc: t})} />
              <Text style={styles.label}>Location</Text><TextInput style={styles.input} placeholder="Barangay, City" value={form.location} onChangeText={(t) => setForm({...form, location: t})} />
              {form.type === 'For Sale' && (<><Text style={styles.label}>Price *</Text><View style={styles.inputIconWrap}><Text style={{color: '#999', marginRight: 5}}>₱</Text><TextInput style={{flex: 1}} placeholder="0.00" keyboardType="numeric" value={form.price} onChangeText={(t) => setForm({...form, price: t})}/></View></>)}
              {form.type === 'Trade' && (<><Text style={styles.label}>Looking For *</Text><TextInput style={styles.input} placeholder="e.g. Glass bottles..." value={form.lookingFor} onChangeText={(t) => setForm({...form, lookingFor: t})}/></>)}
              <Text style={styles.label}>Upload Photo</Text><TouchableOpacity style={styles.imageUploadBox} onPress={handleImagePick}>{form.imageUri ? (<Image source={{ uri: form.imageUri }} style={{width: '100%', aspectRatio: 16/9, borderRadius: 12}} resizeMode="cover" />) : (<MaterialCommunityIcons name="camera-plus" size={30} color="#999" />)}</TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handlePostSubmit} disabled={isUploading}>{isUploading ? (<ActivityIndicator color="white" />) : (<Text style={{color: 'white', fontWeight: 'bold'}}>{editingPostId ? 'SAVE CHANGES' : 'POST NOW'}</Text>)}</TouchableOpacity>
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
        <View style={styles.headerContent}>
            <View>
              <Text style={styles.appName}>GreenSort</Text>
              <Text style={styles.welcomeText}>Welcome back, {userData.name}!</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                <TouchableOpacity style={styles.topMessageBtn} onPress={() => { setUnreadNotifs(0); router.push('/notifications'); }}>
                    <Ionicons name="notifications" size={24} color="white" />
                    {unreadNotifs > 0 && (<View style={styles.badgeDot}><Text style={styles.badgeDotText}>{unreadNotifs > 99 ? '99+' : unreadNotifs}</Text></View>)}
                </TouchableOpacity>
                <TouchableOpacity style={styles.topMessageBtn} onPress={() => { setUnreadMessages(0); router.push('/messages'); }}>
                    <Ionicons name="chatbubble-ellipses" size={24} color="white" />
                    {unreadMessages > 0 && (<View style={styles.badgeDot}><Text style={styles.badgeDotText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text></View>)}
                </TouchableOpacity>
            </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        
        <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#FBC02D" />
                <Text style={styles.tipTitle}>Eco Tip of the Day</Text>
            </View>
            <Text style={styles.tipText}>Rinse and dry your recyclables before disposal.</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginBottom: 10, marginTop: 5 }]}>Eco Impact</Text>
        
        {/* 🟢 LINEAR GRADIENT FOR REWARD POINTS BANNER */}
        <LinearGradient
            colors={['#007C00', '#004d00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pointsBanner}
        >
            <View style={styles.pointsTitleWrap}>
                <MaterialCommunityIcons name="star-four-points-circle" size={28} color="#FFD54F" />
                <Text style={styles.pointsTitle}>Reward Points</Text>
            </View>
            <Text style={styles.pointsValue}>{userData.points} <Text style={{fontSize: 14, fontWeight: 'normal'}}>PTS</Text></Text>
        </LinearGradient>

        <View style={styles.impactRow}>
            <ImpactCard value={userData.kgRecycled} unit="kg recycled" icon="chart-line-variant" color="#007C00" bgColor="#E8F5E9" />
            <ImpactCard value={userData.submissions} unit="submissions" icon="target" color="#2979FF" bgColor="#E3F2FD" />
            <ImpactCard value={userData.upcycleProjects} unit="projects" icon="leaf" color="#AA00FF" bgColor="#F3E5F5" />
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Community Feed</Text><TouchableOpacity style={styles.addPostBtn} onPress={() => setIsCreating(true)}><MaterialCommunityIcons name="plus" size={20} color="white" /></TouchableOpacity></View>
        <View style={styles.searchContainer}><Ionicons name="search" size={20} color="#3f3e3e" style={{marginLeft: 10}} /><TextInput style={styles.searchInput} placeholder="Search posts..." placeholderTextColor="#999" value={searchQuery} onChangeText={setSearchQuery} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>{['All', 'For Sale', 'Trade', 'Free'].map((filter) => (<TouchableOpacity key={filter} style={[styles.filterPill, activeFilter === filter && styles.activePill]} onPress={() => setActiveFilter(filter)}><Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text></TouchableOpacity>))}</ScrollView>

        {filteredPosts.length === 0 ? (<Text style={{textAlign: 'center', marginTop: 50, color: '#999'}}>No posts found.</Text>) : (
            filteredPosts.map((post) => {
                const isOwner = post.user === userData.name;
                return (
                    <View key={post.id} style={[styles.postCard, isOwner && styles.myPostCardBorder]}>
                        <View style={styles.postHeader}>
                            <Image source={{ uri: post.avatar }} style={styles.postAvatar} />
                            <View style={{flex: 1, marginLeft: 10}}>
                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                    <Text style={styles.postUser}>{post.user}</Text>
                                    {isOwner && (
                                        <View style={styles.meBadge}>
                                            <Text style={styles.meBadgeText}>YOU</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.postTime}>{formatTime(post.created_at)}</Text>
                            </View>
                            <View style={[styles.typeBadge, {backgroundColor: '#E8F5E9'}]}><Text style={{color: '#007C00', fontSize: 10, fontWeight: 'bold'}}>{post.type}</Text></View>
                            <TouchableOpacity onPress={() => isOwner ? handlePostOptions(post) : handleOtherPostOptions(post)} style={{padding: 5, marginLeft: 10}}><Ionicons name="ellipsis-vertical" size={20} color="#999" /></TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => openPostDetails(post)}><Text style={styles.postTitle}>{post.title}</Text><Text style={styles.postDesc} numberOfLines={2}>{post.desc}</Text><Image source={{ uri: post.image }} style={styles.postImage} /></TouchableOpacity>
                        <View style={styles.postFooter}>
                            <View style={{flexDirection: 'row', gap: 15}}>
                                <TouchableOpacity style={styles.iconRow} onPress={() => handleLike(post)}><Ionicons name={post.liked_by?.includes(userData.name) ? "heart" : "heart-outline"} size={24} color={post.liked_by?.includes(userData.name) ? "#FF1744" : "#666"} /><Text style={styles.iconText}>{post.likes}</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.iconRow} onPress={() => openPostDetails(post)}><Ionicons name="chatbubble-outline" size={22} color="#666" /><Text style={styles.iconText}>{post.comments}</Text></TouchableOpacity>
                            </View>
                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                                <Text style={styles.postPrice}>{post.price}</Text>
                                {!isOwner && (
                                  <TouchableOpacity style={styles.contactBtn} onPress={() => handleContact(post)}>
                                    <Text style={styles.contactText}>Contact</Text>
                                  </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                );
            })
        )}
        <View style={{height: 100}} /> 
      </ScrollView>

      {/* POST OPTIONS MODALS */}
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

      <Modal visible={reportModalVisible} animationType="slide" transparent={true} onRequestClose={() => setReportModalVisible(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setReportModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.darkModalSheet}>
            <View style={{width: 40, height: 5, backgroundColor: '#555', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 20}} />
            {reportStep === 0 ? (
              <View style={styles.darkMenuContainer}><TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', padding: 18}} onPress={() => setReportStep(1)}><Ionicons name="warning-outline" size={22} color="#FF3B30" style={{marginRight: 15}} /><Text style={{fontSize: 16, color: '#FF3B30', fontWeight: 'bold'}}>Report</Text></TouchableOpacity></View>
            ) : (
              <View style={{marginBottom: 15}}><Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>Why report this post?</Text>{reportReasons.map((reason, index) => (<TouchableOpacity key={index} style={styles.darkMenuItem} onPress={() => submitReport(reason)}><Text style={styles.darkMenuText}>{reason}</Text><Ionicons name="chevron-forward" size={20} color="#555" /></TouchableOpacity>))}<TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 15}]} onPress={() => setReportStep(0)}><Text style={{color: '#fff', fontWeight: 'bold'}}>Back</Text></TouchableOpacity></View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const ImpactCard = ({ value, unit, icon, color, bgColor }) => (<View style={styles.impactCard}><View style={[styles.impactIconBg, { backgroundColor: bgColor }]}><MaterialCommunityIcons name={icon} size={24} color={color} /></View><Text style={[styles.impactValue, { color: color }]}>{value}</Text><Text style={styles.impactUnit}>{unit}</Text></View>);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, 
  header: { backgroundColor: '#007C00', paddingBottom: 25, paddingHorizontal: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, elevation: 4 }, 
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, appName: { color: 'white', fontSize: 24, fontWeight: '800' }, welcomeText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 }, 
  subHeader: { backgroundColor: '#007C00', paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5, zIndex: 10 },
  subHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  subHeaderTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
  scrollView: { flex: 1 }, scrollContent: { paddingHorizontal: 20, paddingTop: 10 }, tipCard: { backgroundColor: '#FFF3E0', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FFE0B2' }, tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 }, tipTitle: { fontSize: 14, fontWeight: 'bold', color: '#EF6C00', marginLeft: 8 }, tipText: { fontSize: 12, color: '#E65100', lineHeight: 18 }, 
  
  // 🟢 NA-UPDATE ANG POINTS BANNER STYLES DAHIL GINAGAMITAN NA NG LINEAR GRADIENT
  pointsBanner: { borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, elevation: 3 }, 
  
  pointsTitleWrap: { flexDirection: 'row', alignItems: 'center' }, pointsTitle: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }, pointsValue: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  impactRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, gap: 10 }, impactCard: { flex: 1, backgroundColor: 'white', paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 2 }, impactIconBg: { padding: 10, borderRadius: 12, marginBottom: 10 }, impactValue: { fontSize: 18, fontWeight: 'bold' }, impactUnit: { fontSize: 10, color: '#90A4AE', textAlign: 'center', marginTop: 2 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 10 }, sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#263238' }, searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, marginBottom: 15, paddingHorizontal: 10, borderWidth: 1, borderColor: '#eee' }, searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: '#333' }, 
  topMessageBtn: { justifyContent: 'center', alignItems: 'center', position: 'relative' }, badgeDot: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF1744', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, minWidth: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'white' }, badgeDotText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  addPostBtn: { backgroundColor: '#007C00', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2 }, filterPill: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: 'white', borderRadius: 20, marginRight: 10, elevation: 1, borderWidth: 1, borderColor: '#eee' }, activePill: { backgroundColor: '#263238', borderColor: '#263238' }, filterText: { fontSize: 13, color: '#666', fontWeight: '600' }, activeFilterText: { color: 'white' }, 
  postCard: { backgroundColor: 'white', borderRadius: 16, padding: 15, marginBottom: 15, elevation: 2 }, 
  myPostCardBorder: { backgroundColor: '#F1F8E9', borderWidth: 1, borderColor: '#C8E6C9' },
  meBadge: { backgroundColor: '#007C00', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  meBadgeText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, postAvatar: { width: 40, height: 40, borderRadius: 20 }, postUser: { fontWeight: 'bold', fontSize: 14, color: '#333' }, postTime: { fontSize: 11, color: '#999' }, typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }, postTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 }, postDesc: { fontSize: 13, color: '#666', marginBottom: 10 }, postImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 15, resizeMode: 'cover', backgroundColor: '#f0f0f0' }, postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, iconRow: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 5 }, iconText: { fontSize: 14, color: '#666' }, postPrice: { fontSize: 16, fontWeight: 'bold', color: '#007C00' }, contactBtn: { backgroundColor: '#007C00', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }, contactText: { color: 'white', fontWeight: 'bold', fontSize: 12 }, detailImage: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#eee' }, detailContent: { padding: 20 }, commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 }, replyAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 }, commentBubble: { flex: 1, backgroundColor: '#F5F7FA', padding: 12, borderRadius: 12 }, commentUser: { fontWeight: 'bold', fontSize: 13, marginBottom: 2 }, commentText: { fontSize: 13, color: '#444' }, commentTime: { fontSize: 10, color: '#999' }, footerInput: { padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', alignItems: 'flex-end', gap: 10 }, statusBanner: { backgroundColor: '#E8F5E9', padding: 8, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, inputField: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100 }, sendBtn: { width: 40, height: 40, backgroundColor: '#007C00', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 2 }, createContent: { padding: 20 }, label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4, marginTop: 15 }, input: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#F0F0F0' }, inputIconWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: '#F0F0F0' }, typeRow: { flexDirection: 'row', gap: 10 }, typeBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center', borderColor: '#E0E0E0' }, typeBtnActive: { borderColor: '#007C00', backgroundColor: '#E8F5E9' }, typeBtnText: { fontSize: 12, fontWeight: '600', color: '#666' }, imageUploadBox: { width: '100%', aspectRatio: 16 / 9, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA', marginTop: 15 }, submitBtn: { padding: 15, borderRadius: 12, backgroundColor: '#007C00', alignItems: 'center', marginTop: 30 },
  darkModalSheet: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingBottom: 35, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 15 }, darkMenuContainer: { backgroundColor: '#2C2C2E', borderRadius: 15, overflow: 'hidden', marginBottom: 15 }, darkMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#3A3A3C' }, darkMenuText: { fontSize: 16, color: '#fff' }, darkCancelBtn: { padding: 18, backgroundColor: '#2C2C2E', borderRadius: 15, alignItems: 'center' }
});