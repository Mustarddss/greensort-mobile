import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;

export default function PostDetails() {
  const { postId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [userData, setUserData] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      fetchUser();
      fetchPost();
    }, [postId])
  );

  const fetchUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      const fullName =
        session.user.user_metadata?.full_name || 'GreenSort Member';

      setUserData({
        name: fullName,
        avatar:
          session.user.user_metadata?.avatar_url ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            fullName
          )}&background=00C853&color=fff&bold=true`,
      });
    }
  };

  const fetchPost = async () => {
    try {
      setLoading(true);

      if (!postId) {
        Alert.alert('Post not found', 'Missing post ID.');
        router.back();
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (error || !data) {
        Alert.alert('Post not found', 'This post may have been deleted.');
        router.back();
        return;
      }

      setPost(data);

      const { data: commentsData } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', data.id)
        .order('created_at', { ascending: true });

      setComments(commentsData || []);
    } catch (e) {
      Alert.alert('Error', 'Failed to load post.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const diffMins = Math.floor(
      (new Date() - new Date(dateString)) / 60000
    );

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const cleanPostDescription = (desc = '') => {
    const index = String(desc).toLowerCase().indexOf('photo captions:');
    if (index === -1) return desc;
    return desc.substring(0, index).trim();
  };

  const extractPhotoCaptions = (desc = '') => {
    const lines = String(desc).split('\n');
    const startIndex = lines.findIndex(
      (line) => line.trim().toLowerCase() === 'photo captions:'
    );

    if (startIndex === -1) return [];

    return lines.slice(startIndex + 1).map((line) => {
      const match = line.match(/^Photo\s+(\d+):\s*(.*)$/i);
      return match ? match[2].trim() : '';
    });
  };

  const handleLike = async () => {
    if (!userData || !post) return;

    const hasLiked = post.liked_by?.includes(userData.name);

    let updatedLikes = post.likes || 0;
    let updatedLikedBy = post.liked_by ? [...post.liked_by] : [];

    if (hasLiked) {
      updatedLikes = Math.max(0, updatedLikes - 1);
      updatedLikedBy = updatedLikedBy.filter(
        (name) => name !== userData.name
      );
    } else {
      updatedLikes += 1;
      updatedLikedBy.push(userData.name);
    }

    setPost({
      ...post,
      likes: updatedLikes,
      liked_by: updatedLikedBy,
    });

    await supabase
      .from('posts')
      .update({
        likes: updatedLikes,
        liked_by: updatedLikedBy,
      })
      .eq('id', post.id);
  };

  const addComment = async () => {
    if (!newComment.trim() || !post || !userData) return;

    const payload = {
      post_id: post.id,
      user_name: userData.name,
      avatar: userData.avatar,
      text: newComment.trim(),
      is_deleted: false,
      is_edited: false,
      likes: 0,
      liked_by: [],
    };

    const { error } = await supabase.from('comments').insert([payload]);

    if (error) {
      Alert.alert('Error', 'Failed to add comment.');
      return;
    }

    await supabase
      .from('posts')
      .update({
        comments: (post.comments || 0) + 1,
      })
      .eq('id', post.id);

    setNewComment('');
    fetchPost();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007C00" />
        <Text style={styles.loadingText}>Opening post...</Text>
      </View>
    );
  }

  if (!post) return null;

  const images = post.image ? post.image.split(',').filter(Boolean) : [];
  const captions = extractPhotoCaptions(post.desc || '');
  const description = cleanPostDescription(post.desc || '');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" />

      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, 20) + 10,
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Community Post</Text>

        <View style={{ width: 42 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(
                e.nativeEvent.contentOffset.x /
                  e.nativeEvent.layoutMeasurement.width
              );
              setActiveImageIndex(slide);
            }}
            scrollEventThrottle={16}
          >
            {images.length > 0 ? (
              images.map((img, index) => (
                <View key={index} style={styles.imageWrap}>
                  <Image source={{ uri: img }} style={styles.image} />

                  {captions[index] ? (
                    <View style={styles.captionOverlay}>
                      <Text style={styles.captionText}>{captions[index]}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <View style={styles.noImageBox}>
                <MaterialCommunityIcons
                  name="image-off-outline"
                  size={45}
                  color="#B0BEC5"
                />
                <Text style={styles.noImageText}>No image available</Text>
              </View>
            )}
          </ScrollView>

          {images.length > 1 ? (
            <View style={styles.dotsContainer}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    activeImageIndex === index && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.content}>
            <View style={styles.userRow}>
              <Image source={{ uri: post.avatar }} style={styles.avatar} />

              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{post.user}</Text>
                <Text style={styles.timeText}>{formatTime(post.created_at)}</Text>
              </View>
            </View>

            <Text style={styles.title}>{post.title}</Text>

            <View style={styles.priceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.price}>
                  {String(post.price || '').replace('Market Value: ', '')}
                </Text>
                <Text style={styles.likeSubText}>
                  {post.likes || 0} people liked this
                </Text>
              </View>

              <TouchableOpacity onPress={handleLike}>
                <Ionicons
                  name={
                    post.liked_by?.includes(userData?.name)
                      ? 'heart'
                      : 'heart-outline'
                  }
                  size={34}
                  color={
                    post.liked_by?.includes(userData?.name)
                      ? '#FF1744'
                      : '#777'
                  }
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{description}</Text>

            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="tag-outline"
                  size={22}
                  color="#8E8E93"
                  style={{ marginRight: 12 }}
                />
                <View>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{post.type}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="map-marker-outline"
                  size={22}
                  color="#8E8E93"
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{post.location}</Text>
                </View>
              </View>

              {post.latitude && post.longitude ? (
                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: Number(post.latitude),
                      longitude: Number(post.longitude),
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  >
                    <Marker
                      coordinate={{
                        latitude: Number(post.latitude),
                        longitude: Number(post.longitude),
                      }}
                    />
                  </MapView>
                </View>
              ) : null}
            </View>

            <Text style={styles.commentTitle}>
              Comments ({comments.length})
            </Text>

            {comments.length === 0 ? (
              <Text style={styles.emptyComment}>No comments yet.</Text>
            ) : null}

            {comments.map((comment) => (
              <View key={comment.id} style={styles.commentCard}>
                <Image
                  source={{ uri: comment.avatar }}
                  style={styles.commentAvatar}
                />

                <View style={styles.commentBubble}>
                  <Text style={styles.commentUser}>{comment.user_name}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.commentInputWrap}>
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Write a comment..."
            placeholderTextColor="#999"
            style={styles.commentInput}
            multiline
          />

          <TouchableOpacity style={styles.sendBtn} onPress={addComment}>
            <Ionicons name="send" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 10,
    color: '#607D8B',
    fontWeight: '700',
  },

  header: {
    backgroundColor: '#007C00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
  },

  imageWrap: {
    width: screenWidth,
    height: 350,
    backgroundColor: '#F7F7F7',
  },

  image: {
    width: screenWidth,
    height: 350,
    resizeMode: 'contain',
  },

  noImageBox: {
    width: screenWidth,
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },

  noImageText: {
    color: '#90A4AE',
    marginTop: 8,
  },

  captionOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 14,
  },

  captionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginHorizontal: 3,
  },

  activeDot: {
    backgroundColor: '#007C00',
    width: 16,
  },

  content: {
    padding: 20,
    paddingBottom: 30,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#eee',
  },

  userName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111',
  },

  timeText: {
    fontSize: 12,
    color: '#888',
    marginTop: 3,
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111',
    marginBottom: 14,
    lineHeight: 31,
  },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },

  price: {
    fontSize: 28,
    fontWeight: '900',
    color: '#007C00',
  },

  likeSubText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111',
    marginBottom: 8,
  },

  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    marginBottom: 22,
  },

  detailsBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
    paddingVertical: 18,
    marginBottom: 26,
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  detailLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 3,
  },

  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 21,
  },

  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },

  map: {
    width: '100%',
    height: '100%',
  },

  commentTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
    color: '#111',
  },

  emptyComment: {
    color: '#8E8E93',
    marginBottom: 16,
  },

  commentCard: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  commentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
    backgroundColor: '#eee',
  },

  commentBubble: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },

  commentUser: {
    fontWeight: '900',
    marginBottom: 4,
    color: '#111',
    fontSize: 13,
  },

  commentText: {
    color: '#333',
    lineHeight: 20,
    fontSize: 14,
  },

  commentInputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: 'white',
  },

  commentInput: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 11,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },

  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#007C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
});