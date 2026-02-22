import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, 
  StatusBar, Image, TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// 🗄️ MOCK DATABASE (Backend Ready Structure)
const INITIAL_POSTS = [
  {
    id: 1,
    user: 'Sarah Miller',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100',
    time: '2h ago',
    type: 'For Sale',
    title: 'Clean Cardboard Boxes - 20 pieces',
    desc: 'Moving boxes in perfect condition. Great for recycling or reuse. All boxes are clean, dry, and flat-packed for easy transportation.',
    price: '$15.00',
    location: 'Downtown, 2.3 km',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=500',
    likes: 12,
    isLiked: false, 
    comments: 5,
    commentList: [
        { user: 'Mike Johnson', text: 'Are these still available?', time: '1h ago', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100' }
    ]
  },
  {
    id: 2,
    user: 'Alex Chen',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100',
    time: '5h ago',
    type: 'Free',
    title: 'Glass Jars (Assorted Sizes)',
    desc: 'Around 30 glass jars, cleaned and de-labeled. Good for jams or organization.',
    price: 'Free',
    location: 'Westside, 5 km',
    image: 'https://images.unsplash.com/photo-1605373307521-72921966ba47?q=80&w=500',
    likes: 8,
    isLiked: false,
    comments: 2,
    commentList: []
  }
];

const CATEGORIES = ['Cardboard', 'Plastic', 'Glass', 'Metal', 'Paper', 'Electronics', 'Textiles', 'Other'];

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // 🟢 GLOBAL STATE
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [selectedPost, setSelectedPost] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  // 🟢 USER DATA
  const [userData] = useState({
    name: 'Eco Warrior',  
    kgRecycled: 24.5,
    submissions: 12,
    upcycleProjects: 15,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100'
  });

  // 📝 CREATE FORM STATE
  const [form, setForm] = useState({
      type: 'For Sale',
      title: '',
      desc: '',
      category: '',
      price: '',
      lookingFor: '',
      location: '',
      imageUri: null 
  });
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [newComment, setNewComment] = useState('');

  // --- LOGIC HANDLERS ---

  const filteredPosts = posts.filter(post => {
      if (activeFilter === 'All') return true;
      return post.type === activeFilter;
  });

  const handleToggleLike = (postId) => {
      setPosts(currentPosts => 
          currentPosts.map(post => {
              if (post.id === postId) {
                  const newLikedState = !post.isLiked;
                  return {
                      ...post,
                      isLiked: newLikedState,
                      likes: newLikedState ? post.likes + 1 : post.likes - 1
                  };
              }
              return post;
          })
      );
      if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(prev => ({
              ...prev,
              isLiked: !prev.isLiked,
              likes: !prev.isLiked ? prev.likes + 1 : prev.likes - 1
          }));
      }
  };

  const handleAddComment = () => {
      if (!newComment.trim() || !selectedPost) return;
      
      const commentObj = {
          user: userData.name,
          text: newComment,
          time: 'Just now',
          avatar: userData.avatar
      };

      const updatedPosts = posts.map(post => {
          if (post.id === selectedPost.id) {
              const updatedPost = {
                  ...post,
                  comments: post.comments + 1,
                  commentList: [...post.commentList, commentObj]
              };
              setSelectedPost(updatedPost);
              return updatedPost;
          }
          return post;
      });

      setPosts(updatedPosts);
      setNewComment('');
  };

  const handleImagePick = () => {
      Alert.alert(
          "Select Photo",
          "Choose a source for your photo",
          [
              { text: "Cancel", style: "cancel" },
              { text: "Camera", onPress: () => setForm({ ...form, imageUri: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?q=80&w=500' }) },
              { text: "Gallery", onPress: () => setForm({ ...form, imageUri: 'https://images.unsplash.com/photo-1604187351573-1a26c591a762?q=80&w=500' }) }
          ]
      );
  };

  const handlePostSubmit = () => {
      if (!form.title || !form.desc || !form.location || !form.category) {
          Alert.alert("Missing Fields", "Please fill in all required fields.");
          return;
      }

      const newPost = {
          id: Date.now(),
          user: userData.name,
          avatar: userData.avatar,
          time: 'Just Now',
          type: form.type,
          title: form.title,
          desc: form.desc,
          price: form.type === 'Free' ? 'Free' : form.type === 'Trade' ? `Trade: ${form.lookingFor || 'Any'}` : `$${form.price}`,
          location: form.location,
          image: form.imageUri || 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=500', 
          likes: 0,
          isLiked: false,
          comments: 0,
          commentList: []
      };

      setPosts([newPost, ...posts]);
      setIsCreating(false);
      setForm({ type: 'For Sale', title: '', desc: '', category: '', price: '', lookingFor: '', location: '', imageUri: null });
  };

  // --- RENDER: CREATE POST FORM ---
  if (isCreating) {
      return (
        <View style={{flex: 1, backgroundColor: 'white'}}>
            <StatusBar barStyle="dark-content" backgroundColor="white" />
            <View style={styles.createHeader}>
                <TouchableOpacity onPress={() => setIsCreating(false)}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.createHeaderTitle}>Create Post</Text>
                    <Text style={styles.createHeaderSub}>Share what you want to trade or sell</Text>
                </View>
                <View style={{width: 24}} /> 
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{flex: 1}}>
                <ScrollView contentContainerStyle={styles.createContent} showsVerticalScrollIndicator={false}>
                    
                    <Text style={styles.label}>Post Type *</Text>
                    <View style={styles.typeRow}>
                        {['For Sale', 'Trade', 'Free'].map(type => (
                            <TouchableOpacity 
                                key={type}
                                style={[styles.typeBtn, form.type === type && styles.typeBtnActive, {borderColor: form.type === type ? getThemeColor(type) : '#E0E0E0'}]}
                                onPress={() => setForm({...form, type: type})}
                            >
                                <MaterialCommunityIcons 
                                    name={type === 'For Sale' ? "currency-usd" : type === 'Trade' ? "swap-horizontal" : "gift-outline"} 
                                    size={24} 
                                    color={form.type === type ? getThemeColor(type) : getThemeColor(type)} 
                                />
                                <Text style={[styles.typeBtnText, form.type === type && {color: getThemeColor(type)}]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Title *</Text>
                    <TextInput 
                        style={styles.input} placeholder="Enter post title" 
                        value={form.title} onChangeText={(text) => setForm({...form, title: text})}
                    />

                    <Text style={styles.label}>Description *</Text>
                    <Text style={styles.helperText}>Describe your item, condition, and any other relevant details...</Text>
                    <TextInput 
                        style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
                        placeholder="Type details here..." multiline 
                        value={form.desc} onChangeText={(text) => setForm({...form, desc: text})}
                    />

                    <Text style={styles.label}>Category *</Text>
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

                    {form.type === 'For Sale' && (
                        <>
                            <Text style={styles.label}>Price *</Text>
                            <View style={styles.inputIconWrap}><Text style={{color: '#999', marginRight: 5}}>$</Text>
                                <TextInput style={{flex: 1}} placeholder="0.00" keyboardType="numeric" value={form.price} onChangeText={(text) => setForm({...form, price: text})}/>
                            </View>
                        </>
                    )}
                    {form.type === 'Trade' && (
                        <>
                            <Text style={styles.label}>Looking For</Text>
                            <TextInput style={styles.input} placeholder="e.g. Glass bottles, Metal cans..." value={form.lookingFor} onChangeText={(text) => setForm({...form, lookingFor: text})}/>
                        </>
                    )}

                    <Text style={styles.label}>Location *</Text>
                    <View style={styles.inputIconWrap}>
                        <Ionicons name="location-outline" size={18} color="#999" style={{marginRight: 5}} />
                        <TextInput style={{flex: 1}} placeholder="e.g., Downtown, Midtown..." value={form.location} onChangeText={(text) => setForm({...form, location: text})}/>
                    </View>

                    <Text style={styles.label}>Images (Optional)</Text>
                    <Text style={styles.helperText}>Add up to 5 photos.</Text>
                    <TouchableOpacity style={styles.imageUploadBox} onPress={handleImagePick}>
                        {form.imageUri ? (
                            <Image source={{ uri: form.imageUri }} style={{width: '100%', height: '100%', borderRadius: 12}} resizeMode="cover" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="camera-plus-outline" size={30} color="#999" />
                                <Text style={{color: '#999', fontSize: 12, marginTop: 5}}>Add Photo</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={styles.formActions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsCreating(false)}><Text style={{color: '#333', fontWeight: '600'}}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.submitBtn} onPress={handlePostSubmit}><Text style={{color: 'white', fontWeight: 'bold'}}>Post to Community</Text></TouchableOpacity>
                    </View>
                    <View style={{height: 100}} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
      );
  }

  // 📖 RENDER POST DETAIL VIEW
  if (selectedPost) {
      return (
        <KeyboardAvoidingView 
            style={{flex: 1, backgroundColor: 'white'}} 
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <StatusBar barStyle="dark-content" backgroundColor="white" />
            <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => setSelectedPost(null)}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View style={{flexDirection: 'row', gap: 15}}>
                    <Ionicons name="share-social-outline" size={24} color="#333" />
                    <Ionicons name="ellipsis-vertical" size={24} color="#333" />
                </View>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 80}}>
                <Image source={{ uri: selectedPost.image }} style={styles.detailImage} />
                <View style={styles.detailContent}>
                    <View style={styles.detailUserRow}>
                        <Image source={{ uri: selectedPost.avatar }} style={styles.detailAvatar} />
                        <View>
                            <Text style={styles.detailUserName}>{selectedPost.user}</Text>
                            <Text style={styles.detailTime}>{selectedPost.time}</Text>
                        </View>
                        <TouchableOpacity style={styles.followBtn}><Text style={styles.followText}>Follow</Text></TouchableOpacity>
                    </View>
                    
                    <Text style={styles.detailTitle}>{selectedPost.title}</Text>
                    <Text style={[styles.detailPrice, {color: getThemeColor(selectedPost.type)}]}>{selectedPost.price}</Text>
                    
                    <Text style={styles.sectionLabel}>Description</Text>
                    <Text style={styles.detailDesc}>{selectedPost.desc}</Text>
                    
                    <View style={styles.locationTag}>
                        <Ionicons name="location-outline" size={16} color="#666" />
                        <Text style={styles.locationText}>{selectedPost.location}</Text>
                    </View>

                    <View style={styles.interactionRow}>
                        <TouchableOpacity style={styles.iconRow} onPress={() => handleToggleLike(selectedPost.id)}>
                             <Ionicons name={selectedPost.isLiked ? "heart" : "heart-outline"} size={24} color={selectedPost.isLiked ? "#FF1744" : "#666"} />
                             <Text style={[styles.iconText, selectedPost.isLiked && {color: '#FF1744'}]}>{selectedPost.likes} Likes</Text>
                        </TouchableOpacity>
                        <View style={styles.iconRow}>
                            <Ionicons name="chatbubble-outline" size={22} color="#666" />
                            <Text style={styles.iconText}>{selectedPost.comments} Comments</Text>
                        </View>
                    </View>

                    <Text style={[styles.sectionLabel, {marginTop: 20}]}>Comments</Text>
                    {selectedPost.commentList.map((comment, index) => (
                        <View key={index} style={styles.commentItem}>
                            <Image source={{ uri: comment.avatar }} style={styles.commentAvatar} />
                            <View style={styles.commentContent}>
                                <Text style={styles.commentUser}>{comment.user}</Text>
                                <Text style={styles.commentText}>{comment.text}</Text>
                                <Text style={styles.commentTime}>{comment.time}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
            
            <View style={styles.footerInput}>
                <TextInput 
                    placeholder="Write a comment..." 
                    style={styles.inputField} 
                    value={newComment}
                    onChangeText={setNewComment}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={handleAddComment}>
                    <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
      );
  }

  // 🏠 MAIN DASHBOARD VIEW
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00C853" />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <View style={styles.headerContent}>
            <View>
                <Text style={styles.appName}>GreenSort</Text>
                <Text style={styles.welcomeText}>Welcome back, {userData.name}!</Text>
            </View>
            <MaterialCommunityIcons name="recycle" size={50} color="rgba(255,255,255,0.2)" />
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 1. ECO TIP */}
        <View style={styles.tipCard}>
            <View style={styles.tipHeader}>
                <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#FBC02D" />
                <Text style={styles.tipTitle}>Eco Tip of the Day</Text>
            </View>
            <Text style={styles.tipText}>Rinse and dry your recyclables before disposal.</Text>
        </View>

        {/* 2. IMPACT STATS */}
        <View style={styles.impactRow}>
            <ImpactCard value={userData.kgRecycled} unit="kg recycled" icon="chart-line-variant" color="#00C853" bgColor="#E8F5E9" />
            <ImpactCard value={userData.submissions} unit="submissions" icon="target" color="#2979FF" bgColor="#E3F2FD" />
            <ImpactCard value={userData.upcycleProjects} unit="projects" icon="leaf" color="#AA00FF" bgColor="#F3E5F5" />
        </View>

        {/* 3. COMMUNITY SECTION */}
        <View style={styles.communitySection}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Community Trade</Text>
                <TouchableOpacity style={styles.addPostBtn} onPress={() => setIsCreating(true)}>
                    <MaterialCommunityIcons name="plus" size={20} color="white" />
                </TouchableOpacity>
            </View>

            {/* Stats Banner */}
            <View style={styles.communityBanner}>
                <View style={styles.statItem}><Text style={styles.statVal}>247</Text><Text style={styles.statLabel}>Active</Text></View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}><Text style={styles.statVal}>1.2k</Text><Text style={styles.statLabel}>Members</Text></View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}><Text style={styles.statVal}>82%</Text><Text style={styles.statLabel}>Success</Text></View>
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
                {['All', 'For Sale', 'Trade', 'Free'].map((filter) => (
                    <TouchableOpacity key={filter} style={[styles.filterPill, activeFilter === filter && styles.activePill]} onPress={() => setActiveFilter(filter)}>
                        <Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* FEED ITEMS */}
            {filteredPosts.map((post) => (
                <View key={post.id} style={styles.postCard}>
                    <View style={styles.postHeader}>
                        <Image source={{ uri: post.avatar }} style={styles.postAvatar} />
                        <View style={{flex: 1, marginLeft: 10}}>
                            <Text style={styles.postUser}>{post.user}</Text>
                            <Text style={styles.postTime}>{post.time}</Text>
                        </View>
                        <View style={[styles.typeBadge, {backgroundColor: getThemeBg(post.type)}]}>
                            <Text style={[styles.typeText, {color: getThemeColor(post.type)}]}>{post.type}</Text>
                        </View>
                    </View>

                    <TouchableOpacity onPress={() => setSelectedPost(post)}>
                        <Text style={styles.postTitle}>{post.title}</Text>
                        <Text style={styles.postDesc} numberOfLines={2}>{post.desc}</Text>
                        <Image source={{ uri: post.image }} style={styles.postImage} />
                    </TouchableOpacity>

                    <View style={styles.postFooter}>
                        <View style={{flexDirection: 'row', gap: 15}}>
                            <TouchableOpacity style={styles.iconRow} onPress={() => handleToggleLike(post.id)}>
                                <Ionicons name={post.isLiked ? "heart" : "heart-outline"} size={20} color={post.isLiked ? "#FF1744" : "#666"} />
                                <Text style={[styles.iconText, post.isLiked && {color: '#FF1744'}]}>{post.likes}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.iconRow} onPress={() => setSelectedPost(post)}>
                                <Ionicons name="chatbubble-outline" size={20} color="#666" />
                                <Text style={styles.iconText}>{post.comments}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
                            <Text style={[styles.postPrice, {color: getThemeColor(post.type)}]}>{post.price}</Text>
                            <TouchableOpacity style={styles.contactBtn} onPress={() => setSelectedPost(post)}>
                                <Text style={styles.contactText}>Contact</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            ))}
        </View>
        <View style={{height: 100}} /> 
      </ScrollView>
    </View>
  );
}

// 🟢 RESTORED COMPONENT (This fixes the ReferenceError!)
const ImpactCard = 
({ value, unit, icon, color, bgColor }) => (
  <View style={styles.impactCard}>
    <View style={[styles.impactIconBg,
       { backgroundColor: bgColor }]}> 
      <MaterialCommunityIcons 
      name={icon} size={24} color={color} />
    </View>
    <Text style={[styles.impactValue, { color: color }]}>{value}</Text>
    <Text style={styles.impactUnit}>{unit}</Text>
  </View>
);

// --- HELPER FUNCTIONS ---
const getThemeColor = (type) => {
    switch(type) {
        case 'For Sale': return '#2979FF';
        case 'Trade': return '#AA00FF';
        case 'Free': return '#00C853';
        default: return '#666';
    }
};
const getThemeBg = (type) => {
    switch(type) {
        case 'For Sale': return '#E3F2FD';
        case 'Trade': return '#F3E5F5';
        case 'Free': return '#E8F5E9';
        default: return '#eee';
    }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  
  header: { backgroundColor: '#00C853', paddingTop: 50, paddingBottom: 25, paddingHorizontal: 25, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, marginBottom: 10, elevation: 4 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appName: { color: 'white', fontSize: 22, fontWeight: '800' },
  welcomeText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },

  // CREATE POST STYLES
  createHeader: { padding: 20, paddingTop: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  createHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  createHeaderSub: { fontSize: 12, color: '#666', textAlign: 'center' },
  createContent: { padding: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4, marginTop: 20 },
  helperText: { fontSize: 12, color: '#888', marginBottom: 8 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  typeBtnActive: { backgroundColor: '#fff', borderWidth: 2 },
  typeBtnText: { marginTop: 5, fontSize: 12, fontWeight: '600', color: '#666' },
  input: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 15, fontSize: 14, borderWidth: 1, borderColor: '#F0F0F0' },
  inputIconWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#F0F0F0', justifyContent: 'space-between' },
  dropdownList: { backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginTop: 5, padding: 5, elevation: 3, zIndex: 10 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F5F7FA' },
  dropdownItemText: { fontSize: 14, color: '#333' },

  imageUploadBox: { height: 120, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA', marginTop: 5 },
  formActions: { flexDirection: 'row', gap: 15, marginTop: 30 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  submitBtn: { flex: 2, padding: 15, borderRadius: 12, backgroundColor: '#009688', alignItems: 'center' },

  // DASHBOARD STYLES
  tipCard: { backgroundColor: '#FFF3E0', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FFE0B2' },
  tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tipTitle: { fontSize: 14, fontWeight: 'bold', color: '#EF6C00', marginLeft: 8 },
  tipText: { fontSize: 12, color: '#E65100', lineHeight: 18 },

  impactRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  impactCard: { backgroundColor: 'white', width: (width - 55) / 3, paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 2 },
  impactIconBg: { padding: 10, borderRadius: 12, marginBottom: 10 },
  impactValue: { fontSize: 18, fontWeight: 'bold' },
  impactUnit: { fontSize: 10, color: '#90A4AE', textAlign: 'center', marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#263238' },
  addPostBtn: { backgroundColor: '#00C853', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  
  communityBanner: { backgroundColor: '#009688', borderRadius: 15, padding: 20, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statItem: { alignItems: 'center', flex: 1 },
  statVal: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 10 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', height: '100%' },

  filterPill: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: 'white', borderRadius: 20, marginRight: 10, elevation: 1, borderWidth: 1, borderColor: '#eee' },
  activePill: { backgroundColor: '#263238', borderColor: '#263238' },
  filterText: { fontSize: 13, color: '#666', fontWeight: '600' },
  activeFilterText: { color: 'white' },

  postCard: { backgroundColor: 'white', borderRadius: 16, padding: 15, marginBottom: 15, elevation: 2 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  postAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee' },
  postUser: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  postTime: { fontSize: 11, color: '#999' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  typeText: { fontSize: 10, fontWeight: 'bold' },
  postTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  postDesc: { fontSize: 13, color: '#666', marginBottom: 10, lineHeight: 18 },
  postImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 15, backgroundColor: '#f0f0f0', resizeMode: 'cover' },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 5 },
  iconText: { fontSize: 12, color: '#666' },
  postPrice: { fontSize: 16, fontWeight: 'bold' },
  contactBtn: { backgroundColor: '#00C853', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  contactText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  // DETAIL VIEW STYLES
  detailHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    paddingTop: 50, 
    alignItems: 'center' 
},
  detailImage: { width: '100%', height: 250, backgroundColor: '#eee' },
  detailContent: { padding: 20 },
  detailUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  detailAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  detailUserName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  detailTime: { fontSize: 12, color: '#888' },
  followBtn: { marginLeft: 'auto', borderWidth: 1, borderColor: '#00C853', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  followText: { fontSize: 12, fontWeight: '600', color: '#00C853' },
  detailTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  detailPrice: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  detailDesc: { fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 20 },
  locationTag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'white', alignSelf: 'flex-start', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  locationText: { fontSize: 12, color: '#666' },
  interactionRow: { flexDirection: 'row', gap: 20, marginVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f0f0f0', paddingVertical: 10 },
  commentItem: { flexDirection: 'row', marginBottom: 15, marginTop: 10 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  commentContent: { flex: 1, backgroundColor: '#F5F7FA', padding: 10, borderRadius: 12 },
  commentUser: { fontWeight: 'bold', fontSize: 13, marginBottom: 2 },
  commentText: { fontSize: 13, color: '#444' },
  commentTime: { fontSize: 10, color: '#999', marginTop: 5 },
  footerInput: { padding: 15, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  inputField: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, backgroundColor: '#00C853', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
});