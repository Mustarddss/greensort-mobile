import React, { useState, useEffect } from 'react';
// 🟢 IDINAGDAG KO NA YUNG 'Platform' DITO SA IMPORT
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, Alert, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function SavedDIYPosts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null); 
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchSavedPosts();
  }, []);

  const fetchSavedPosts = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }
      
      const userName = session.user.user_metadata?.full_name;
      setCurrentUser(userName);

      const { data: savedRecords, error: savedError } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_email', userName);

      if (savedError) throw savedError;

      if (!savedRecords || savedRecords.length === 0) {
        setSavedPosts([]);
        setLoading(false);
        return;
      }

      const postIds = savedRecords.map(record => record.post_id);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .in('id', postIds)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      setSavedPosts(postsData || []);
    } catch (error) {
      console.log("Error fetching saved posts:", error.message);
      Alert.alert("Error", "Could not load your saved projects.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (postId, postTitle) => {
    Alert.alert(
      "Remove Project",
      `Are you sure you want to remove "${postTitle}" from your saved list?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('saved_posts')
                .delete()
                .eq('user_email', currentUser)
                .eq('post_id', postId);

              if (error) throw error;
              
              setSavedPosts(prev => prev.filter(post => post.id !== postId));
              
              if (selectedPost && selectedPost.id === postId) {
                setSelectedPost(null);
              }
              
            } catch (err) {
              Alert.alert("Error", "Could not remove post. Please try again.");
            }
          }
        }
      ]
    );
  };

  const formatTime = (dateString) => {
    const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
    if (diffMins < 1) return 'Just now'; 
    if (diffMins < 60) return `${diffMins}m ago`; 
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`; 
    return `${Math.floor(diffMins / 1440)}d ago`; 
  };

  // ==========================================
  // VIEW 2: DETAILED VIEW NG PROJECT
  // ==========================================
  if (selectedPost) {
    const postImagesArray = selectedPost.image ? selectedPost.image.split(',') : [];
    const firstImageUrl = postImagesArray[0];

    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
        
        <View style={[styles.subHeader, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 15, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, zIndex: 10 }]}>
            <View style={styles.subHeaderRow}>
                <TouchableOpacity onPress={() => setSelectedPost(null)} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={{alignItems: 'center'}}>
                    <Text style={styles.subHeaderTitle}>Project Details</Text>
                </View>
                <TouchableOpacity style={styles.backButton} onPress={() => handleUnsave(selectedPost.id, selectedPost.title)}>
                    <Ionicons name="bookmark" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
            <View style={{position: 'relative', width: '100%', height: 350, backgroundColor: '#eee'}}>
                {firstImageUrl ? (
                    <Image source={{ uri: firstImageUrl }} style={{width: '100%', height: '100%', resizeMode: 'cover'}} />
                ) : (
                    <View style={{width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center'}}>
                        <MaterialCommunityIcons name="image-off-outline" size={50} color="#ccc" />
                        <Text style={{color: '#999', marginTop: 10}}>No Image</Text>
                    </View>
                )}
                <View style={{position: 'absolute', top: 15, left: 15, backgroundColor: '#00A86B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, elevation: 3}}>
                    <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>{selectedPost.type || 'DIY Project'}</Text>
                </View>
            </View>

            <View style={{padding: 20}}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}}>
                    <Image source={{ uri: selectedPost.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPost.user)}&background=007C00&color=fff` }} style={{width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#f0f0f0'}} />
                    <View style={{flex: 1}}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginRight: 5}}>{selectedPost.user}</Text>
                            <MaterialCommunityIcons name="check-decagram" size={18} color="#007AFF" />
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                            <MaterialCommunityIcons name="clock-time-four-outline" size={12} color="#8E8E93" style={{marginRight: 4}}/>
                            <Text style={{fontSize: 13, color: '#8E8E93'}}>{formatTime(selectedPost.created_at)}</Text>
                        </View>
                    </View>
                </View>

                <Text style={{fontSize: 24, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 15, lineHeight: 32}}>{selectedPost.title}</Text>

                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25}}>
                    <View style={{flex: 1, paddingRight: 10}}>
                        <Text style={{fontSize: 12, color: '#00A86B', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1}}>Market Value:</Text>
                        <Text style={{fontSize: 28, fontWeight: 'bold', color: '#00A86B'}}>{selectedPost.price?.replace('Market Value: ', '') || '₱0.00'}</Text>
                        <Text style={{fontSize: 14, color: '#8E8E93', marginTop: 2}}>{selectedPost.likes || 0} people liked this</Text>
                    </View>
                </View>

                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 10}}>Description</Text>
                <Text style={{fontSize: 15, color: '#3C3C43', lineHeight: 24, marginBottom: 30}}>{selectedPost.desc || 'No description provided.'}</Text>

                <View style={{borderTopWidth: 1, borderTopColor: '#E5E5EA', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', paddingVertical: 20, marginBottom: 25}}>
                    <View style={{flexDirection: 'row', marginBottom: 20}}>
                        <View style={{marginRight: 15, marginTop: 2}}><MaterialCommunityIcons name="tag-outline" size={24} color="#8E8E93" /></View>
                        <View>
                            <Text style={{fontSize: 13, color: '#8E8E93', marginBottom: 4}}>Category</Text>
                            <Text style={{fontSize: 16, fontWeight: '600', color: '#1C1C1E'}}>{selectedPost.type || 'DIY Project'}</Text>
                        </View>
                    </View>

                    <View style={{flexDirection: 'row'}}>
                        <View style={{marginRight: 15, marginTop: 2}}><MaterialCommunityIcons name="map-marker-outline" size={24} color="#8E8E93" /></View>
                        <View style={{flex: 1}}>
                            <Text style={{fontSize: 13, color: '#8E8E93', marginBottom: 4}}>Location</Text>
                            <Text style={{fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 5}}>{selectedPost.location || 'Location not specified'}</Text>
                        </View>
                    </View>
                </View>

                <View style={{flexDirection: 'row', gap: 20}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                        <Ionicons name="heart" size={20} color="#FF1744" />
                        <Text style={{fontSize: 14, color: '#333', fontWeight: '500'}}>{selectedPost.likes || 0} Likes</Text>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}>
                        <Ionicons name="chatbubble" size={18} color="#007AFF" />
                        <Text style={{fontSize: 14, color: '#333', fontWeight: '500'}}>{selectedPost.comments || 0} Comments</Text>
                    </View>
                </View>

            </View>
        </ScrollView>
      </View>
    );
  }

  // ==========================================
  // VIEW 1: LIST VIEW NG MGA SAVED PROJECTS
  // ==========================================
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
          <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={{alignItems: 'center'}}>
                  <Text style={styles.headerTitle}>Saved DIY Projects</Text>
              </View>
              <View style={{ width: 40 }} />
          </View>
      </View>

      {loading ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <ActivityIndicator size="large" color="#007C00" />
            <Text style={{marginTop: 10, color: '#666'}}>Loading saved projects...</Text>
        </View>
      ) : savedPosts.length === 0 ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20}}>
            <MaterialCommunityIcons name="bookmark-remove-outline" size={60} color="#ccc" />
            <Text style={{fontSize: 18, fontWeight: 'bold', color: '#666', marginTop: 15}}>No Saved Projects Yet</Text>
            <Text style={{fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8}}>Go to the Community Feed and save some inspiring DIY upcycling projects!</Text>
        </View>
      ) : (
        <FlatList
          data={savedPosts}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.menuItem} onPress={() => setSelectedPost(item)}>
                <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
                    <MaterialCommunityIcons name="leaf" size={20} color="#007C00" />
                </View>
                <View style={{flex: 1, marginRight: 10}}>
                    <Text style={styles.menuText} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.menuSubtext} numberOfLines={1}>By {item.user}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, 
  
  header: { backgroundColor: '#007C00', paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
  
  subHeader: { backgroundColor: '#007C00', paddingHorizontal: 20 },
  subHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  subHeaderTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  listContent: { padding: 20, paddingTop: 20 }, 
  menuItem: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: 'white', 
      padding: 18, 
      borderRadius: 16, 
      marginBottom: 12, 
      ...Platform.select({ 
          ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, 
          android: { elevation: 3 } 
      }) 
  }, 
  menuIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 }, 
  menuText: { fontSize: 16, color: '#333', fontWeight: 'bold', marginBottom: 2 }, 
  menuSubtext: { fontSize: 12, color: '#888' },
});