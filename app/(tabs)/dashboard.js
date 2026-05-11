import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useNavigation } from '@react-navigation/native'; 
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import BankedKgModal from '../BankedKgModal';

const screenWidth = Dimensions.get('window').width;

export default function Dashboard() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams(); 
  const insets = useSafeAreaInsets();

  const feedScrollRef = useRef(null);
  const lastFeedScrollY = useRef(0);
  const [restoreFeedScrollY, setRestoreFeedScrollY] = useState(null);
  
  const [posts, setPosts] = useState([]); 
  const [selectedPost, setSelectedPost] = useState(null); 
  const [postComments, setPostComments] = useState([]); 
  const [activeImageIndex, setActiveImageIndex] = useState(0); 
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null); 
  const [searchQuery, setSearchQuery] = useState(''); 
  const [activeFilter, setActiveFilter] = useState('All');
  const [isUploading, setIsUploading] = useState(false); 
  const [refreshing, setRefreshing] = useState(false); 

  const [isModerating, setIsModerating] = useState(false);

  const [userData, setUserData] = useState({ name: 'Loading...', kgRecycled: 0, submissions: 0, upcycleProjects: 0, bankedPoints: 0, avatar: null });
  const [form, setForm] = useState({ type: 'For Sale', title: '', desc: '', category: '', price: '', lookingFor: '', location: '', latitude: null, longitude: null, imageUris: [] });
  const [showDIYShowcaseOption, setShowDIYShowcaseOption] = useState(false);
  const [imageCaptions, setImageCaptions] = useState([]);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [tempLocation, setTempLocation] = useState({
    latitude: 14.3262,
    longitude: 120.9386,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  });
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (params.autoCreatePost === 'true') {
      const incomingImage = params.postImage ? [params.postImage] : [];

      setSelectedPost(null);
      setEditingPostId(null);
      setShowDIYShowcaseOption(false);
      setImageCaptions(incomingImage.map(() => ''));

      setForm({
        type: params.postType || 'For Sale',
        title: params.postTitle || '',
        desc: params.postDesc || '',
        category: '',
        price: params.postPrice || '',
        lookingFor: '',
        location: '',
        latitude: null,
        longitude: null,
        imageUris: incomingImage
      });

      setIsCreating(true);

      router.setParams({
        autoCreatePost: '',
        fromUpcycle: '',
        postType: '',
        postTitle: '',
        postDesc: '',
        postPrice: '',
        postImage: ''
      });
    }
  }, [params.autoCreatePost]);

  
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

  const [isBankedModalVisible, setBankedModalVisible] = useState(false);
  const [bankedDetails, setBankedDetails] = useState([]);

  const [selectedMainReason, setSelectedMainReason] = useState(null);
  const [selectedReportReason, setSelectedReportReason] = useState(null); 
  const [selectedMainCommentReason, setSelectedMainCommentReason] = useState(null);
  const [selectedCommentSubReason, setSelectedCommentSubReason] = useState(null);
  const [reportAdditionalInfo, setReportAdditionalInfo] = useState(''); 

  const reportReasons = [
    { title: "Spam or misleading", desc: "Repeated posts, fake information, or misleading titles.", subCategories: [{ title: "Repeated posting", desc: "Posting the exact same item multiple times." }, { title: "Fake information", desc: "Details or photos do not match the actual item." }, { title: "Misleading title/tags", desc: "Clickbait or using incorrect categories to get views." }] },
    { title: "Scam or fraud", desc: "Attempting to deceive others for money or personal information.", subCategories: [{ title: "Asking for money upfront", desc: "Demanding payment before meetup or delivery." }, { title: "Suspicious links", desc: "Phishing links or directing outside the app safely." }, { title: "Fake profile", desc: "Impersonating someone else or a fake business." }] },
    { title: "Inappropriate content", desc: "Offensive language, nudity, or disturbing imagery.", subCategories: [{ title: "Offensive language", desc: "Cursing, slurs, or hate speech." }, { title: "Nudity or sexual content", desc: "Inappropriate images or text." }, { title: "Graphic imagery", desc: "Violent or disturbing pictures." }] },
    { title: "Not related to recycling/eco", desc: "Posts that have nothing to do with environmental efforts.", subCategories: [{ title: "Selling commercial goods", desc: "Selling brand new, non-eco products for pure profit." }, { title: "Unrelated services", desc: "Advertising irrelevant businesses or services." }, { title: "General off-topic", desc: "Content that has nothing to do with waste, trading, or upcycling." }] },
    { title: "Hazardous or dangerous materials", desc: "Trading or selling toxic chemicals or illegal items.", subCategories: [{ title: "Toxic chemicals", desc: "Paints, unsealed batteries, or industrial toxins." }, { title: "Medical/Biohazardous waste", desc: "Used syringes, spoiled food, or bodily fluids." }, { title: "Illegal items", desc: "Weapons, explosives, or prohibited substances." }] },
    { title: "Fake or unrealistic price/trade", desc: "Trolling with absurd prices or fake trade requests.", subCategories: [{ title: "Troll pricing", desc: "Setting absurd prices (e.g. ₱999,999 for a plastic bottle)." }, { title: "Unrealistic trade demands", desc: "Demanding high-value items for literal trash." }, { title: "Bait and switch", desc: "Changing the price or item when contacted privately." }] },
    { title: "Harassment or bullying", desc: "Targeting, insulting, or threatening other members.", subCategories: [{ title: "Insulting behavior", desc: "Name-calling or derogatory remarks towards a user." }, { title: "Doxing", desc: "Sharing someone's private information or address publicly." }, { title: "Threatening", desc: "Any form of physical or emotional threat." }] }
  ];

  const formatDetailedAddress = (address, latitude, longitude) => {
    if (!address) {
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }

    const parts = [
      address.name,
      address.streetNumber,
      address.street,
      address.district,
      address.subregion,
      address.city,
      address.region,
      address.postalCode
    ];

    const cleanedParts = parts
      .filter(Boolean)
      .map(part => String(part).trim())
      .filter((part, index, arr) => part.length > 0 && arr.indexOf(part) === index);

    const detailedAddress = cleanedParts.join(', ');

    if (detailedAddress && detailedAddress.length > 0) {
      return detailedAddress;
    }

    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  };

  const getLocalLocationSuggestions = (query) => {
    const search = String(query || '').toLowerCase().trim();

    const places = [
      { title: 'SM City Dasmariñas', address: 'SM City Dasmariñas, Governor’s Drive, Dasmariñas, Cavite, Philippines', latitude: 14.3019, longitude: 120.9571 },
      { title: 'SM City Trece Martires', address: 'SM City Trece Martires, Governor’s Drive, Trece Martires City, Cavite, Philippines', latitude: 14.2806, longitude: 120.8664 },
      { title: 'SM City General Trias', address: 'SM City General Trias, Governor Ferrer Drive, General Trias, Cavite, Philippines', latitude: 14.3869, longitude: 120.8813 },
      { title: 'SM City Molino', address: 'SM City Molino, Molino Road, Bacoor, Cavite, Philippines', latitude: 14.3838, longitude: 120.9762 },
      { title: 'SM City Bacoor', address: 'SM City Bacoor, Aguinaldo Highway, Bacoor, Cavite, Philippines', latitude: 14.4447, longitude: 120.9501 },
      { title: 'SM North EDSA', address: 'SM North EDSA, Epifanio de los Santos Avenue, Quezon City, Metro Manila, Philippines', latitude: 14.6561, longitude: 121.0290 },
      { title: 'SM Fairview', address: 'SM Fairview, Regalado Highway, Novaliches, Quezon City, Metro Manila, Philippines', latitude: 14.7345, longitude: 121.0596 },
      { title: 'SM Mall of Asia', address: 'SM Mall of Asia, Seaside Boulevard, Pasay City, Metro Manila, Philippines', latitude: 14.5352, longitude: 120.9822 },
      { title: 'Robinsons Place Dasmariñas', address: 'Robinsons Place Dasmariñas, Aguinaldo Highway, Dasmariñas, Cavite, Philippines', latitude: 14.3291, longitude: 120.9367 },
      { title: 'WalterMart Dasmariñas', address: 'WalterMart Dasmariñas, Aguinaldo Highway, Dasmariñas, Cavite, Philippines', latitude: 14.3298, longitude: 120.9407 },
      { title: 'De La Salle Medical and Health Sciences Institute', address: 'DLSMHSI, Dasmariñas, Cavite, Philippines', latitude: 14.3296, longitude: 120.9419 },
      { title: 'National University Dasmariñas', address: 'NU Dasmariñas, SM City Dasmariñas Complex, Dasmariñas, Cavite, Philippines', latitude: 14.3019, longitude: 120.9571 },
      { title: 'General Trias City Hall', address: 'General Trias City Hall, General Trias, Cavite, Philippines', latitude: 14.3868, longitude: 120.8816 },
      { title: 'Dasmariñas City Hall', address: 'Dasmariñas City Hall, Dasmariñas, Cavite, Philippines', latitude: 14.3294, longitude: 120.9367 },
      { title: 'Silang Municipal Hall', address: 'Silang Municipal Hall, Silang, Cavite, Philippines', latitude: 14.2158, longitude: 120.9715 }
    ];

    if (!search) return [];

    return places
      .filter(place =>
        place.title.toLowerCase().includes(search) ||
        place.address.toLowerCase().includes(search)
      )
      .slice(0, 6)
      .map((place, index) => ({
        id: `local-${index}-${place.latitude}-${place.longitude}`,
        ...place
      }));
  };

  const buildLocationSearchQueries = (queryText) => {
    const query = String(queryText || '').trim();
    const lower = query.toLowerCase();

    if (!query) return [];

    const alreadyHasPhilippines = lower.includes('philippines');
    const alreadyHasCavite = lower.includes('cavite');
    const alreadyHasCity =
      lower.includes('general trias') ||
      lower.includes('dasmarinas') ||
      lower.includes('dasmariñas') ||
      lower.includes('silang') ||
      lower.includes('imus') ||
      lower.includes('bacoor') ||
      lower.includes('trece') ||
      lower.includes('tagaytay');

    const queries = [query];

    if (!alreadyHasPhilippines) {
      queries.push(`${query}, Philippines`);
    }

    if (!alreadyHasCavite && !alreadyHasCity) {
      queries.push(`${query}, Cavite, Philippines`);
    }

    if (alreadyHasCavite && !alreadyHasPhilippines) {
      queries.push(`${query}, Philippines`);
    }

    return [...new Set(queries)];
  };

  useEffect(() => { 
    const uniqueTopic = `dashboard-changes-${Date.now()}`;
    const msgChannel = supabase.channel(uniqueTopic)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { fetchUserSessionAndData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => { fetchUserSessionAndData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banked_materials' }, () => { fetchUserSessionAndData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surrender_logs' }, () => { fetchUserSessionAndData(); })
      .subscribe();

    const uniquePresenceTopic = `app-presence-${Date.now()}`;
    const presenceChannel = supabase.channel(uniquePresenceTopic);
    
    const setupPresence = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            presenceChannel
                .on('presence', { event: 'sync' }, () => {})
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
                    }
                });
        }
    };
    setupPresence();

    return () => { 
        supabase.removeChannel(msgChannel); 
        supabase.removeChannel(presenceChannel); 
    };
  }, []);

  useFocusEffect(useCallback(() => { fetchUserSessionAndData(); }, [params.openPostTitle]));

  useEffect(() => {
    const parent = navigation.getParent?.();

    if (!parent) return;

    parent.setOptions({
      tabBarStyle: isCreating
        ? { display: 'none' }
        : {
            height: 65,
            paddingBottom: 8,
            paddingTop: 6,
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#E0E0E0'
          }
    });
  }, [isCreating, navigation]);

  useEffect(() => {
    if (!isCreating) return;

    const typedLocation = String(form.location || '').trim();

    if (typedLocation.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchTypedLocation(typedLocation, false, false);
    }, 700);

    return () => clearTimeout(timer);
  }, [form.location, isCreating]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (selectedPost || restoreFeedScrollY === null) return;

    const timer = setTimeout(() => {
      feedScrollRef.current?.scrollTo({
        y: restoreFeedScrollY,
        animated: false
      });

      setRestoreFeedScrollY(null);
    }, 80);

    return () => clearTimeout(timer);
  }, [selectedPost, restoreFeedScrollY]);

  const fetchUserSessionAndData = async (isRefresh = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const fullName = session.user.user_metadata?.full_name || 'GreenSort Member';
      const userEmail = session.user.email;
      let totalKg = 0; let totalSubmissions = 0; let bankedKg = 0; let bankedGroup = {}; let totalUpcycleProjects = 0;

      try { await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('email', userEmail); } catch (err) {}

      try {
          const { data: logs, error: logsError } = await supabase.from('surrender_logs').select('*').eq('resident_email', userEmail);
          if (logs && !logsError) {
              totalSubmissions = logs.length;
              logs.forEach(log => {
                  totalKg += Number(log.weight_kg) || 0;
              });
          }

          // 🟢 Count completed upcycle projects for Eco Impact
          const { count: completedProjectsCount, error: projectsCountError } = await supabase
              .from('saved_projects')
              .select('*', { count: 'exact', head: true })
              .eq('user_email', userEmail)
              .eq('is_done', true);

          if (!projectsCountError) {
              totalUpcycleProjects = completedProjectsCount || 0;
          }

          const { data: bankedData, error: bankedError } = await supabase.from('banked_materials').select('*').eq('resident_email', userEmail);
          
          if (bankedData && !bankedError) {
              bankedData.forEach(bankItem => {
                  const weight = Number(bankItem.kg_amount) || 0;
                  bankedKg += weight; 
                  
                  const cEmail = bankItem.center_email; 
                  const wType = bankItem.material_type || 'Others';
                  
                  if (!bankedGroup[cEmail]) bankedGroup[cEmail] = {};
                  if (!bankedGroup[cEmail][wType]) bankedGroup[cEmail][wType] = 0;
                  bankedGroup[cEmail][wType] += weight; 
              });

              const finalBankedList = [];
              for (const email of Object.keys(bankedGroup)) {
                  const { data: center } = await supabase.from('dropoff_applications').select('program_name, barangay').eq('user_email', email).single();
                  const locName = center ? (center.program_name || `Brgy. ${center.barangay}`) : 'GreenSort Center';
                  const materialsArr = Object.keys(bankedGroup[email]).map(type => ({ type: type, kg: bankedGroup[email][type] }));
                  finalBankedList.push({ email: email, location: locName, materials: materialsArr });
              }
              setBankedDetails(finalBankedList);
          }
      } catch (err) {}

      setUserData({ name: fullName, kgRecycled: totalKg.toFixed(1), submissions: totalSubmissions, upcycleProjects: totalUpcycleProjects, bankedPoints: bankedKg.toFixed(1), avatar: session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=00C853&color=fff&bold=true` });

      const { count: notifCount } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('owner_name', fullName).eq('is_read', false);
      setUnreadNotifs(notifCount || 0);
      const { count: msgCount } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('receiver_name', fullName).eq('is_read', false);
      setUnreadMessages(msgCount || 0);
    } else { if (!isRefresh) { router.replace('/login'); } }
    
    fetchPosts();
  };

  const fetchPosts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserName = session?.user?.user_metadata?.full_name || 'GreenSort Member';

    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
    if (data) {
        const activePosts = data.filter(post => post.status !== 'archived' && post.status !== 'sold' && (post.status !== 'flagged' || post.user === currentUserName));
        setPosts(activePosts);
        
        if (params.openPostTitle) {
            const targetPost = activePosts.find(p => p.title === params.openPostTitle);
            if (targetPost) { openPostDetails(targetPost); router.setParams({ openPostTitle: '' }); }
        }
    }
  };

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchUserSessionAndData(true); setRefreshing(false); }, []);
  const handlePostOptions = (post) => { setSelectedPostForOptions(post); setOptionsModalVisible(true); };

  const handleEditAction = () => {
    const post = selectedPostForOptions;
    const existingImages = post.image ? post.image.split(',') : [];
    setOptionsModalVisible(false);
    setEditingPostId(post.id);
    setShowDIYShowcaseOption(post.type === 'DIY Showcase');
    setImageCaptions(existingImages.map(() => ''));
    setForm({ type: post.type, title: post.title, desc: post.desc, category: 'Other', price: post.price.replace('₱','').replace('Trade: ','').replace('Market Value: ','').replace('₱',''), lookingFor: post.price.includes('Trade') ? post.price.replace('Trade: ','') : '', location: post.location, latitude: post.latitude, longitude: post.longitude, imageUris: existingImages });
    setIsCreating(true);
  };

  const handleSoldAction = async () => {
    const post = selectedPostForOptions; setOptionsModalVisible(false);
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
    const post = selectedPostForOptions; setOptionsModalVisible(false);
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: 'destructive', onPress: async () => { await supabase.from('posts').delete().eq('id', post.id); fetchPosts(); Alert.alert("Deleted", "Post removed."); }}
    ]);
  };

  const handleImagePick = async () => {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'We need access to your gallery!'); return; }
        
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 5 - form.imageUris.length, allowsEditing: false, quality: 0.8, base64: true });
        if (!result.canceled && result.assets) {
            let validUris = [];
            for (let i = 0; i < result.assets.length; i++) {
                const asset = result.assets[i];
                const fileSizeInMB = (asset.base64 ? asset.base64.length * 0.75 : 0) / (1024 * 1024);
                if (fileSizeInMB > 250) { Alert.alert("File Too Large", `An image exceeds 250MB and was skipped.`); } 
                else { validUris.push(asset.uri); }
            }
            setForm(prev => { const combined = [...prev.imageUris, ...validUris]; const capped = combined.slice(0, 5); setImageCaptions(prevCaps => [...prevCaps, ...validUris.map(() => '')].slice(0, 5)); return { ...prev, imageUris: capped }; });
        }
    } catch (error) { Alert.alert("Error", "Could not open gallery."); }
  };

  const removeImage = (indexToRemove) => { setForm(prev => ({ ...prev, imageUris: prev.imageUris.filter((_, index) => index !== indexToRemove) })); setImageCaptions(prev => prev.filter((_, index) => index !== indexToRemove)); };

  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setForm(prev => ({ ...prev, latitude, longitude }));
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        let geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode.length > 0) {
            const locationName = formatDetailedAddress(geocode[0], latitude, longitude);
            if (locationName) setForm(prev => ({ ...prev, location: locationName }));
        }
    } catch (error) {}
  };

  const openLocationPicker = () => {
    Keyboard.dismiss();
    setTempLocation({
      latitude: form.latitude || 14.3262,
      longitude: form.longitude || 120.9386,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03
    });
    setLocationSearch(form.location || '');
    setLocationPickerVisible(true);
  };

  const handleLocationPickerPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    setTempLocation(prev => ({
      ...prev,
      latitude,
      longitude
    }));

    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (geocode.length > 0) {
        const locationName = formatDetailedAddress(geocode[0], latitude, longitude);

        if (locationName) {
          setLocationSearch(locationName);
        }
      }
    } catch (error) {}
  };

  const useCurrentLocationForPost = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow location access to use your current location.');
        return;
      }

      const current = await Location.getCurrentPositionAsync({});
      const latitude = current.coords.latitude;
      const longitude = current.coords.longitude;

      setTempLocation({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      });

      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });

        if (geocode.length > 0) {
          const address = geocode[0];
          const locationName = [
            address.name,
            address.street,
            address.district || address.subregion,
            address.city || address.region
          ].filter(Boolean).join(', ');

          if (locationName) {
            setLocationSearch(locationName);
          }
        }
      } catch (error) {}
    } catch (error) {
      Alert.alert('Location Error', 'Could not get your current location.');
    }
  };

  const confirmPickedLocation = () => {
    setForm(prev => ({
      ...prev,
      location: locationSearch || `${tempLocation.latitude.toFixed(6)}, ${tempLocation.longitude.toFixed(6)}`,
      latitude: tempLocation.latitude,
      longitude: tempLocation.longitude
    }));

    setLocationPickerVisible(false);
  };

  const searchTypedLocation = async (queryText = form.location, shouldPinFirst = true, showAlert = true) => {
    if (shouldPinFirst) Keyboard.dismiss();

    const query = String(queryText || '').trim();

    if (!query) {
      if (showAlert) {
        Alert.alert('Enter Location', 'Please type a location first.');
      }
      return;
    }

    try {
      setIsSearchingLocation(true);

      const localMatches = getLocalLocationSuggestions(query);

      if (localMatches.length > 0) {
        setLocationSuggestions(localMatches);

        if (shouldPinFirst) {
          selectLocationSuggestion(localMatches[0], false);
        }

        return;
      }

      const searchQueries = buildLocationSearchQueries(query);

      let results = [];

      for (const q of searchQueries) {
        try {
          const found = await Location.geocodeAsync(q);
          if (found && found.length > 0) {
            results = found;
            break;
          }
        } catch (error) {}
      }

      if (!results || results.length === 0) {
        if (showAlert) {
          Alert.alert('Location not found', 'Try adding more details like street, barangay, city, or landmark.');
        }
        setLocationSuggestions([]);
        return;
      }

      const suggestions = [];

      for (let i = 0; i < Math.min(results.length, 5); i++) {
        const item = results[i];

        try {
          const reverse = await Location.reverseGeocodeAsync({
            latitude: item.latitude,
            longitude: item.longitude
          });

          const detailedName = reverse.length > 0
            ? formatDetailedAddress(reverse[0], item.latitude, item.longitude)
            : `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`;

          suggestions.push({
            id: `${item.latitude}-${item.longitude}-${i}`,
            title: detailedName.split(',')[0] || query,
            address: detailedName,
            latitude: item.latitude,
            longitude: item.longitude
          });
        } catch (error) {
          suggestions.push({
            id: `${item.latitude}-${item.longitude}-${i}`,
            title: query,
            address: `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`,
            latitude: item.latitude,
            longitude: item.longitude
          });
        }
      }

      setLocationSuggestions(suggestions);

      if (suggestions.length > 0 && shouldPinFirst) {
        selectLocationSuggestion(suggestions[0], true);
      }
    } catch (error) {
      if (showAlert) {
        Alert.alert('Search Failed', 'Could not search that location. Please try again.');
      }
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const selectLocationSuggestion = (place, clearList = true) => {
    Keyboard.dismiss();

    setForm(prev => ({
      ...prev,
      location: place.address,
      latitude: place.latitude,
      longitude: place.longitude
    }));

    setTempLocation({
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01
    });

    setLocationSearch(place.address);

    if (clearList) {
      setLocationSuggestions([]);
    }
  };

  const handlePostSubmit = async () => {
    Keyboard.dismiss();

    if (form.imageUris.length === 0) return Alert.alert("Photo Required", "Please upload at least one photo for your post.");
    if (!form.title || !form.desc || !form.location) return Alert.alert("Wait!", "Please fill in all general details (Title, Desc, Location).");
    if (!form.latitude || !form.longitude) {
      await searchTypedLocation(form.location, true, false);
      return Alert.alert("Location Pin Required", "Please review the map pin, then tap POST NOW again.");
    }
    if (form.type === 'For Sale' && (!form.price || form.price.trim() === '')) return Alert.alert("Wait!", "Please enter a price for your item.");
    if (form.type === 'Trade' && (!form.lookingFor || form.lookingFor.trim() === '')) return Alert.alert("Wait!", "Please specify what you are looking for to trade.");
    
    setIsModerating(true); let aiStatus = 'active'; let aiReason = '';

    const moderationPrompt = `You are a STRICT AI moderator for an eco-friendly recycling community app.
    Analyze this user post:
    Title: "${form.title}"
    Description: "${form.desc}"
    Type: "${form.type}"
    Price/Trade: "${form.price || form.lookingFor}"

    Rules for flagging (Flag if ANY of these are true):
    1. Contains offensive, toxic, or inappropriate language.
    2. Is a scam or spam.
    3. Is completely unrelated to recycling, upcycling, eco-friendly living, or trading pre-loved/waste items.
    4. Contains gibberish.
    5. Mismatch between Type and Content.
    6. If it's a trade post but doesn't specify what they're looking for, or if it's for sale but doesn't have a price.
    7. Contains unrealistic prices (e.g. ₱999,999 for a plastic bottle) or trade requests (e.g. asking for a car in exchange for recyclables).
    8. The description, item name, and pictures don't match. Example: title says "Plastic Bottles" but the description is about "Old Clothes" and the picture is a broken chair or random unrelated photo.
    9. if free food is being offered, it must be clearly stated in the title or description to avoid confusion and potential safety issues.
    

    Respond strictly in pure JSON format:
    {
      "isApproved": true or false,
      "reason": "If false, explain why in 1 short sentence. If true, leave empty."
    }`;

    try {
        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}` }, body: JSON.stringify({ model: 'gpt-5.4', messages: [{ role: 'user', content: moderationPrompt }], temperature: 0.3, max_completion_tokens: 150 }) });
        const aiData = await aiRes.json();
        if (aiData.choices && aiData.choices.length > 0) { const content = aiData.choices[0].message.content; const jsonMatch = content.match(/\{[\s\S]*\}/); if (jsonMatch) { const modResult = JSON.parse(jsonMatch[0]); if (!modResult.isApproved) { aiStatus = 'flagged'; aiReason = modResult.reason; } } }
    } catch (e) { }

    setIsModerating(false); setIsUploading(true);
    let uploadedImageUrls = [];
    for (let i = 0; i < form.imageUris.length; i++) {
        const uri = form.imageUris[i];
        if (uri.startsWith('http')) { uploadedImageUrls.push(uri); } else {
            try { const formData = new FormData(); formData.append('file', { uri: uri, name: `img_${Date.now()}_${i}.jpg`, type: 'image/jpeg' }); const { data, error } = await supabase.storage.from('post_images').upload(`public/${Date.now()}_${i}.jpg`, formData); if (!error) { const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path); uploadedImageUrls.push(urlData.publicUrl); } } catch(e) { }
        }
    }
    const imagesToSave = uploadedImageUrls.join(',');
    
    let finalPriceDisplay = '';
    if (form.type === 'Free') finalPriceDisplay = 'Free';
    else if (form.type === 'Trade') finalPriceDisplay = `Trade: ${form.lookingFor}`;
    else finalPriceDisplay = `₱${form.price}`;

    const captionText = imageCaptions
      .map((caption, index) => caption?.trim() ? `Photo ${index + 1}: ${caption.trim()}` : '')
      .filter(Boolean)
      .join('\n');

    const finalDesc = captionText ? `${form.desc}\n\nPhoto Captions:\n${captionText}` : form.desc;

    const postData = { user: userData.name, avatar: userData.avatar, type: form.type, title: form.title, desc: finalDesc, price: finalPriceDisplay, location: form.location, latitude: form.latitude, longitude: form.longitude, image: imagesToSave, status: aiStatus, ai_reason: aiReason };
    let dbError = null;

    if (editingPostId) { const { error } = await supabase.from('posts').update(postData).eq('id', editingPostId); dbError = error; } 
    else { const { error } = await supabase.from('posts').insert([{ ...postData, likes: 0, comments: 0, liked_by: [] }]); dbError = error; }
    
    setIsUploading(false);
    if (dbError) { Alert.alert("Database Error 🛑", dbError.message); return; }
    setEditingPostId(null); setIsCreating(false); setShowDIYShowcaseOption(false); setImageCaptions([]); setForm({ type: 'For Sale', title: '', desc: '', category: '', price: '', lookingFor: '', location: '', latitude: null, longitude: null, imageUris: [] }); fetchPosts(); 

    if (aiStatus === 'flagged') { Alert.alert("Post Flagged Detected ⚠️", `Your post was hidden due to: ${aiReason}. You can appeal this from your feed.`); } 
    else { Alert.alert("Success", editingPostId ? "Post updated!" : "Post uploaded!"); }
  };

  const handleAppeal = async (post) => {
      Alert.alert("Submit Appeal", "Do you want an Admin to manually review this post?", [
          { text: "Cancel", style: "cancel" }, { text: "Yes, Appeal", onPress: async () => { const { error } = await supabase.from('appeals').insert([{ post_id: post.id, user_name: userData.name, reason: post.ai_reason }]); if (!error) { Alert.alert("Appeal Sent", "Our team will review your post shortly. If approved, it will be restored to the public feed."); } else { Alert.alert("Error", "Failed to send appeal. Please try again."); } }}
      ]);
  };

  const handleLike = async (post) => {
    const hasLiked = post.liked_by && post.liked_by.includes(userData.name);
    let newLikedBy = post.liked_by ? [...post.liked_by] : [];
    let newLikes = post.likes || 0;

    if (hasLiked) {
      newLikedBy = newLikedBy.filter(name => name !== userData.name);
      newLikes = Math.max(0, newLikes - 1);
    } else {
      newLikedBy.push(userData.name);
      newLikes += 1;

      if (post.user !== userData.name) {
        await supabase.from('notifications').insert([{
          owner_name: post.user,
          actor_name: userData.name,
          actor_avatar: userData.avatar,
          action: 'liked',
          post_title: post.title,
          is_read: false
        }]);
      }
    }

    const updatedPost = {
      ...post,
      likes: newLikes,
      liked_by: newLikedBy
    };

    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === post.id ? { ...p, likes: newLikes, liked_by: newLikedBy } : p
      )
    );

    if (selectedPost && selectedPost.id === post.id) {
      setSelectedPost(updatedPost);
    }

    await supabase
      .from('posts')
      .update({
        likes: newLikes,
        liked_by: newLikedBy
      })
      .eq('id', post.id);
  };

  const handleCommentLike = async (comment) => {
    if (comment.is_deleted) return;
    const hasLiked = comment.liked_by && comment.liked_by.includes(userData.name);
    let newLikedBy = comment.liked_by ? [...comment.liked_by] : []; let newLikes = comment.likes || 0;
    if (hasLiked) { newLikedBy = newLikedBy.filter(name => name !== userData.name); newLikes = Math.max(0, newLikes - 1); } else { newLikedBy.push(userData.name); newLikes += 1; }
    await supabase.from('comments').update({ likes: newLikes, liked_by: newLikedBy }).eq('id', comment.id); openPostDetails(selectedPost); 
  };

  const handleContact = async (post) => {
    if (post.user === userData.name) return Alert.alert("Oops!", "You can't contact yourself.");
    
    try { 
        await supabase.from('notifications').insert([{ 
            owner_name: post.user, 
            actor_name: userData.name, 
            actor_avatar: userData.avatar, 
            action: 'wants to contact you about', 
            post_title: post.title || 'an item', 
            is_read: false 
        }]); 
    } catch (e) { }
    
    try {
        const { data: existing } = await supabase.from('messages')
            .select('id')
            .eq('sender_name', userData.name)
            .eq('receiver_name', post.user)
            .like('text', '%|||INQUIRY|||%')
            .like('text', `%${post.title}%`)
            .limit(1);

        if (!existing || existing.length === 0) {
            const contextObj = {
                title: post.title,
                type: post.type || 'Item',
                desc: post.desc || '',
                price: post.price || '',
                location: post.location || '',
                image: post.image ? post.image.split(',')[0] : ''
            };
            
            const autoPayload = `|||INQUIRY|||${JSON.stringify(contextObj)}`;
            
            await supabase.from('messages').insert([{ 
                sender_name: userData.name, 
                receiver_name: post.user, 
                text: autoPayload,
                is_read: false 
            }]);
        }
    } catch (err) {
        console.log("Auto-send error:", err);
    }

    router.push({ 
        pathname: '/chat', 
        params: { chatUser: post.user } 
    });
  };

  const handleSavePost = async (post) => {
    try {
        const { data: existing } = await supabase.from('saved_posts').select('*').eq('user_email', userData.name).eq('post_id', post.id);
        if (existing && existing.length > 0) { Alert.alert("Already Saved", "You have already saved this DIY project."); return; }
        const { error } = await supabase.from('saved_posts').insert([{ user_email: userData.name, post_id: post.id, post_title: post.title }]);
        if (error) throw error;
        Alert.alert("Post Saved! 📌", "You can view this project later in your Profile/Settings tab.");
    } catch(e) { Alert.alert("Error Saving", e.message); }
  };

  const openPostDetails = async (post) => {
    if (post.status === 'flagged') { return Alert.alert("Cannot Open", "This post is currently hidden from the public. Please wait for an admin to review your appeal."); }
    setSelectedPost(post); setActiveImageIndex(0); 
    const { data } = await supabase.from('comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true }); setPostComments(data || []);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    if (editingCommentId) { await supabase.from('comments').update({ text: newComment, is_edited: true }).eq('id', editingCommentId); setNewComment(''); setEditingCommentId(null); openPostDetails(selectedPost); return; }
    const commentData = { post_id: selectedPost.id, user_name: userData.name, avatar: userData.avatar, text: newComment, parent_id: replyingTo ? replyingTo.id : null, is_edited: false, is_deleted: false };
    await supabase.from('comments').insert([commentData]); await supabase.from('posts').update({ comments: (selectedPost.comments || 0) + 1 }).eq('id', selectedPost.id);
    if (selectedPost.user !== userData.name && !replyingTo) { await supabase.from('notifications').insert([{ owner_name: selectedPost.user, actor_name: userData.name, actor_avatar: userData.avatar, action: 'commented on', post_title: selectedPost.title, is_read: false }]); }
    if (replyingTo && replyingTo.name !== userData.name) { await supabase.from('notifications').insert([{ owner_name: replyingTo.name, actor_name: userData.name, actor_avatar: userData.avatar, action: 'replied to your comment on', post_title: selectedPost.title, is_read: false }]); }
    setNewComment(''); setReplyingTo(null); openPostDetails(selectedPost); fetchPosts(); 
  };

  const handleOtherPostOptions = (post) => { setPostToReport(post); setReportStep(0); setReportAdditionalInfo(''); setReportModalVisible(true); };
  const submitReport = async (baseReason) => {
    const fullReasonString = reportAdditionalInfo.trim() ? `${baseReason} - Details: ${reportAdditionalInfo}` : baseReason;
    try { const { error } = await supabase.from('post_reports').insert([{ post_id: postToReport.id, reporter_email: userData.name, reason: fullReasonString, status: 'Pending' }]); if (error) throw error; if (postToReport.user !== userData.name) { await supabase.from('notifications').insert([{ owner_name: postToReport.user, actor_name: 'GreenSort Admin', actor_avatar: 'https://cdn-icons-png.flaticon.com/512/1892/1892747.png', action: 'reported', post_title: postToReport.title, is_read: false }]); } Alert.alert("Report Submitted", `Thank you for reporting. Our admins will review it shortly.`); } catch (error) { Alert.alert("Error", "Could not submit report: " + error.message); } finally { setReportModalVisible(false); setPostToReport(null); setReportStep(0); setSelectedMainReason(null); setSelectedReportReason(null); setReportAdditionalInfo(''); }
  };
  const handleCommentOptions = (comment) => { setSelectedCommentForOptions(comment); setCommentOptionsModalVisible(true); };
  const handleEditCommentAction = () => { setCommentOptionsModalVisible(false); setEditingCommentId(selectedCommentForOptions.id); setNewComment(selectedCommentForOptions.text); setReplyingTo(null); };
  const handleDeleteCommentAction = async () => { setCommentOptionsModalVisible(false); Alert.alert("Delete Comment", "Are you sure you want to delete this?", [ { text: "Cancel", style: "cancel" }, { text: "Delete", style: 'destructive', onPress: async () => { await supabase.from('comments').update({ text: '[This comment has been deleted]', is_deleted: true }).eq('id', selectedCommentForOptions.id); openPostDetails(selectedPost); }} ]); };
  const handleReportCommentAction = () => { setCommentOptionsModalVisible(false); setCommentReportStep(0); setReportAdditionalInfo(''); setCommentReportModalVisible(true); };
  const submitCommentReport = async (baseReason) => { const fullReasonString = reportAdditionalInfo.trim() ? `${baseReason} - Details: ${reportAdditionalInfo}` : baseReason; try { const { error } = await supabase.from('comment_reports').insert([{ comment_id: selectedCommentForOptions.id, reporter_email: userData.name, reason: fullReasonString, status: 'Pending' }]); if (error) throw error; Alert.alert("Report Submitted", `Thank you for reporting this comment. Our admins will review it.`); } catch (error) { Alert.alert("Error", "Could not submit report: " + error.message); } finally { setCommentReportModalVisible(false); setCommentReportStep(0); setSelectedMainCommentReason(null); setSelectedCommentSubReason(null); setReportAdditionalInfo(''); } };

  const filteredPosts = posts.filter(post => {
      const matchFilter = activeFilter === 'All' ? true : post.type === activeFilter;
      const matchSearch = post.title?.toLowerCase().includes(searchQuery.toLowerCase()) || post.desc?.toLowerCase().includes(searchQuery.toLowerCase()) || post.user?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFilter && matchSearch;
  });

  const formatTime = (dateString) => { const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000); if (diffMins < 1) return 'Just now'; if (diffMins < 60) return `${diffMins}m ago`; if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`; return `${Math.floor(diffMins / 1440)}d ago`; };

  const extractPhotoCaptions = (desc = '') => {
    const lines = desc.split('\n');
    const captionStartIndex = lines.findIndex(line =>
      line.trim().toLowerCase() === 'photo captions:'
    );

    if (captionStartIndex === -1) return [];

    return lines
      .slice(captionStartIndex + 1)
      .map(line => {
        const match = line.match(/^Photo\s+(\d+):\s*(.*)$/i);
        return match ? match[2].trim() : '';
      });
  };

  const cleanPostDescription = (desc = '') => {
    const captionStartIndex = desc.toLowerCase().indexOf('photo captions:');

    if (captionStartIndex === -1) {
      return desc;
    }

    return desc.substring(0, captionStartIndex).trim();
  };

  if (selectedPost) {
    const mainComments = postComments.filter(c => !c.parent_id);
    const getReplies = (parentId) => postComments.filter(c => c.parent_id === parentId);
    
    const postImagesArray = selectedPost.image ? selectedPost.image.split(',') : [];
    const photoCaptions = extractPhotoCaptions(selectedPost.desc || '');
    const cleanDescription = cleanPostDescription(selectedPost.desc || '');
    const isDIY = selectedPost.type === 'DIY Project';
    const isSelectedPostOwner = selectedPost.user === userData.name;

    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
        
        <View style={[styles.subHeader, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 15, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, zIndex: 10 }]}>
            <View style={styles.subHeaderRow}>
                <TouchableOpacity onPress={() => {
                    setRestoreFeedScrollY(lastFeedScrollY.current);
                    setSelectedPost(null);
                    setReplyingTo(null);
                    setEditingCommentId(null);
                    setNewComment('');
                    router.setParams({ openPostTitle: null });
                }} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={{alignItems: 'center'}}>
                    <Text style={styles.subHeaderTitle}>Community Post</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>
        </View>

        <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 20}} keyboardShouldPersistTaps="handled">
                <View style={{position: 'relative'}}>
                    <ScrollView 
                        horizontal 
                        pagingEnabled 
                        showsHorizontalScrollIndicator={false} 
                        style={{width: screenWidth, height: 350}}
                        onScroll={(e) => {
                            const slide = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
                            if (slide !== activeImageIndex) setActiveImageIndex(slide);
                        }}
                        scrollEventThrottle={16}
                    >
                        {postImagesArray.map((imgUrl, idx) => (
                            <View key={idx} style={{width: screenWidth, height: 350}}>
                                <Image
                                    source={{ uri: imgUrl }}
                                    style={{width: screenWidth, height: 350, resizeMode: 'contain', backgroundColor: '#F7F7F7'}}
                                />

                                {photoCaptions[idx] ? (
                                    <LinearGradient
                                        colors={['transparent', 'rgba(0,0,0,0.78)']}
                                        style={styles.photoCaptionOverlay}
                                    >
                                        <Text style={styles.photoCaptionText} numberOfLines={3}>
                                            {photoCaptions[idx]}
                                        </Text>
                                    </LinearGradient>
                                ) : null}
                            </View>
                        ))}
                    </ScrollView>
                    
                    <View style={{position: 'absolute', top: 15, left: 15, backgroundColor: isDIY ? '#00A86B' : '#007AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, elevation: 3}}>
                        <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>{selectedPost.type}</Text>
                    </View>
                    
                    {postImagesArray.length > 1 && (
                        <View style={{position: 'absolute', bottom: 15, width: '100%', flexDirection: 'row', justifyContent: 'center'}}>
                            {postImagesArray.map((_, i) => (
                                <View key={i} style={{width: i === activeImageIndex ? 10 : 6, height: 6, borderRadius: 3, backgroundColor: i === activeImageIndex ? '#007C00' : 'rgba(255,255,255,0.7)', marginHorizontal: 3, elevation: 2}} />
                            ))}
                        </View>
                    )}
                </View>

                <View style={{padding: 20}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}}>
                        <Image source={{ uri: selectedPost.avatar }} style={{width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#f0f0f0'}} />
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

                        {selectedPost.user !== userData.name && (
                            isDIY ? (
                                <TouchableOpacity style={{backgroundColor: '#FF9800', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', elevation: 2}} onPress={() => handleSavePost(selectedPost)}>
                                    <Ionicons name="bookmark" size={14} color="white" style={{marginRight: 5}} />
                                    <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>Save</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={{backgroundColor: '#007C00', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', elevation: 2}} onPress={() => handleContact(selectedPost)}>
                                    <Ionicons name="chatbubble-ellipses" size={14} color="white" style={{marginRight: 5}} />
                                    <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>Contact</Text>
                                </TouchableOpacity>
                            )
                        )}
                    </View>

                    <Text style={{fontSize: 24, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 15, lineHeight: 32}}>{selectedPost.title}</Text>

                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25}}>
                        <View style={{flex: 1, paddingRight: 10}}>
                            {isDIY && <Text style={{fontSize: 12, color: '#00A86B', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1}}>Market Value:</Text>}
                            <Text style={{fontSize: isDIY ? 24 : 26, fontWeight: '900', color: '#00A86B', letterSpacing: -0.5}}>{selectedPost.price.replace('Market Value: ', '')}</Text>
                            <Text style={{fontSize: 14, color: '#8E8E93', marginTop: 2}}>{selectedPost.likes || 0} people liked this</Text>
                        </View>

                        <View style={{alignItems: 'flex-end'}}>
                            <TouchableOpacity activeOpacity={0.7} onPress={() => handleLike(selectedPost)}>
                                <Ionicons name={selectedPost.liked_by?.includes(userData.name) ? "heart" : "heart-outline"} size={34} color={selectedPost.liked_by?.includes(userData.name) ? "#FF1744" : "#8E8E93"} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 10}}>Description</Text>
                    <View style={styles.descriptionCard}>
                        <Text style={styles.descriptionText}>
                            {cleanDescription}
                        </Text>
                    </View>

                    <View style={{borderTopWidth: 1, borderTopColor: '#E5E5EA', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', paddingVertical: 20, marginBottom: 25}}>
                        <View style={{flexDirection: 'row', marginBottom: 20}}>
                            <View style={{marginRight: 15, marginTop: 2}}><MaterialCommunityIcons name="tag-outline" size={24} color="#8E8E93" /></View>
                            <View>
                                <Text style={{fontSize: 13, color: '#8E8E93', marginBottom: 4}}>Category</Text>
                                <Text style={{fontSize: 16, fontWeight: '600', color: '#1C1C1E'}}>{selectedPost.type}</Text>
                            </View>
                        </View>

                        <View style={{flexDirection: 'row'}}>
                            <View style={{marginRight: 15, marginTop: 2}}><MaterialCommunityIcons name="map-marker-outline" size={24} color="#8E8E93" /></View>
                            <View style={{flex: 1}}>
                                <Text style={{fontSize: 13, color: '#8E8E93', marginBottom: 4}}>Location</Text>
                                <Text style={{fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 15}}>{selectedPost.location}</Text>
                                {(selectedPost.latitude && selectedPost.longitude) ? (
                                    <View style={{width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E5EA'}}>
                                        <MapView style={{width: '100%', height: '100%'}} initialRegion={{latitude: selectedPost.latitude, longitude: selectedPost.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01}} scrollEnabled={false} zoomEnabled={false}>
                                            <Marker coordinate={{latitude: selectedPost.latitude, longitude: selectedPost.longitude}} />
                                        </MapView>
                                    </View>
                                ) : null}
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 35}} onPress={() => handleOtherPostOptions(selectedPost)}>
                        <Ionicons name="flag-outline" size={18} color="#8E8E93" style={{marginRight: 8}} />
                        <Text style={{color: '#8E8E93', fontSize: 15, fontWeight: '500'}}>Report this post</Text>
                    </TouchableOpacity>

                    <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 20}}>Comments ({selectedPost.comments})</Text>
                    
                    {mainComments.length === 0 ? (<Text style={{color: '#8E8E93', marginTop: 5}}>No comments yet. Be the first!</Text>) : null}
                    
                    {mainComments.map((comment) => (
                        <View key={comment.id} style={{marginBottom: 20}}>
                            <View style={{flexDirection: 'row'}}>
                                <Image source={{ uri: comment.avatar }} style={{width: 40, height: 40, borderRadius: 20, marginRight: 12, backgroundColor: '#f0f0f0', opacity: comment.is_deleted ? 0.5 : 1}} />
                                <View style={{flex: 1}}>
                                  <View style={{backgroundColor: comment.is_deleted ? '#e0e0e0' : '#F2F2F7', padding: 12, borderRadius: 16, borderTopLeftRadius: 4}}>
                                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
                                          <Text style={{fontWeight: '600', fontSize: 14, color: comment.is_deleted ? '#8E8E93' : '#1C1C1E'}}>{comment.user_name}</Text>
                                          {!comment.is_deleted ? (
                                              <TouchableOpacity onPress={() => { setSelectedCommentForOptions(comment); setCommentOptionsModalVisible(true); }}>
                                                  <Ionicons name="ellipsis-horizontal" size={18} color="#8E8E93" />
                                              </TouchableOpacity>
                                          ) : null}
                                      </View>
                                      <Text style={{fontSize: 14, color: comment.is_deleted ? '#8E8E93' : '#3C3C43', lineHeight: 20, fontStyle: comment.is_deleted ? 'italic' : 'normal'}}>{comment.text}</Text>
                                  </View>
                                  
                                  <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingLeft: 4, gap: 15}}>
                                      <Text style={{fontSize: 12, color: '#8E8E93'}}>{formatTime(comment.created_at)} {comment.is_edited ? (<Text style={{fontStyle: 'italic'}}>(edited)</Text>) : null}</Text>
                                      {!comment.is_deleted ? (
                                          <>
                                              <TouchableOpacity onPress={() => setReplyingTo({id: comment.id, name: comment.user_name})}>
                                                  <Text style={{fontSize: 12, fontWeight: '600', color: '#666'}}>Reply</Text>
                                              </TouchableOpacity>
                                              <TouchableOpacity onPress={() => handleCommentLike(comment)} style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                                  <MaterialCommunityIcons name={comment.liked_by?.includes(userData.name) ? "heart" : "heart-outline"} size={14} color={comment.liked_by?.includes(userData.name) ? "#FF1744" : "#8E8E93"} />
                                                  <Text style={{fontSize: 12, color: comment.liked_by?.includes(userData.name) ? '#FF1744' : '#8E8E93'}}>{comment.likes || 0}</Text>
                                              </TouchableOpacity>
                                          </>
                                      ) : null}
                                  </View>
                                </View>
                            </View>
                            
                            {getReplies(comment.id).map(reply => (
                                <View key={reply.id} style={{flexDirection: 'row', marginTop: 15, marginLeft: 45}}>
                                    <Image source={{ uri: reply.avatar }} style={{width: 30, height: 30, borderRadius: 15, marginRight: 10, backgroundColor: '#f0f0f0', opacity: reply.is_deleted ? 0.5 : 1}} />
                                    <View style={{flex: 1}}>
                                      <View style={{backgroundColor: reply.is_deleted ? '#e0e0e0' : '#F2F2F7', padding: 12, borderRadius: 16, borderTopLeftRadius: 4}}>
                                          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
                                              <Text style={{fontWeight: '600', fontSize: 13, color: reply.is_deleted ? '#8E8E93' : '#1C1C1E'}}>{reply.user_name}</Text>
                                              {!reply.is_deleted ? (
                                                  <TouchableOpacity onPress={() => { setSelectedCommentForOptions(reply); setCommentOptionsModalVisible(true); }}>
                                                      <Ionicons name="ellipsis-horizontal" size={18} color="#8E8E93" />
                                                  </TouchableOpacity>
                                              ) : null}
                                          </View>
                                          <Text style={{fontSize: 13, color: reply.is_deleted ? '#8E8E93' : '#3C3C43', lineHeight: 20, fontStyle: reply.is_deleted ? 'italic' : 'normal'}}>{reply.text}</Text>
                                      </View>
                                      
                                      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingLeft: 4, gap: 15}}>
                                          <Text style={{fontSize: 11, color: '#8E8E93'}}>{formatTime(reply.created_at)} {reply.is_edited ? (<Text style={{fontStyle: 'italic'}}>(edited)</Text>) : null}</Text>
                                          {!reply.is_deleted ? (
                                              <TouchableOpacity onPress={() => handleCommentLike(reply)} style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                                                  <MaterialCommunityIcons name={reply.liked_by?.includes(userData.name) ? "heart" : "heart-outline"} size={14} color={reply.liked_by?.includes(userData.name) ? "#FF1744" : "#8E8E93"} />
                                                  <Text style={{fontSize: 12, color: reply.liked_by?.includes(userData.name) ? '#FF1744' : '#8E8E93'}}>{reply.likes || 0}</Text>
                                              </TouchableOpacity>
                                          ) : null}
                                      </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            </ScrollView>
            
            <View style={{backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E5EA', paddingBottom: Platform.OS === 'ios' ? 20 : 0}}>
                {replyingTo ? (<View style={styles.statusBanner}><Text style={{fontSize: 12, color: '#007C00'}}>Replying to <Text style={{fontWeight: 'bold'}}>@{replyingTo.name}</Text></Text><TouchableOpacity onPress={() => setReplyingTo(null)}><MaterialCommunityIcons name="close" size={16} color="#666" /></TouchableOpacity></View>) : null}
                {editingCommentId ? (<View style={[styles.statusBanner, {backgroundColor: '#FFF3E0'}]}><Text style={{fontSize: 12, color: '#EF6C00'}}>Editing comment...</Text><TouchableOpacity onPress={() => {setEditingCommentId(null); setNewComment('');}}><MaterialCommunityIcons name="close" size={16} color="#666" /></TouchableOpacity></View>) : null}
                <View style={[styles.footerInput, {borderTopWidth: 0}]}>
                    <TextInput 
                        placeholder={editingCommentId ? "Edit your comment..." : replyingTo ? "Write a reply..." : "Write a comment..."} 
                        style={styles.inputField} 
                        value={newComment} 
                        onChangeText={setNewComment} 
                        multiline={true}
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={handleAddComment}>
                        <Ionicons name={editingCommentId ? "checkmark" : "send"} size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>

        {/* 🟢 TINAWAG YUNG MODAL COMPONENT */}
        <BankedKgModal 
            visible={isBankedModalVisible} 
            onClose={() => setBankedModalVisible(false)} 
            bankedDetails={bankedDetails} 
        />

        <Modal visible={commentOptionsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCommentOptionsModalVisible(false)}>
          <TouchableOpacity style={{flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setCommentOptionsModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.darkModalSheet}>
              <View style={{width: 40, height: 5, backgroundColor: '#555', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 20}} />

              <View style={styles.darkMenuContainer}>
                  {(selectedCommentForOptions?.user_name === userData.name || isSelectedPostOwner) ? (
                      <>
                          {selectedCommentForOptions?.user_name === userData.name ? (
                              <TouchableOpacity style={styles.darkMenuItem} onPress={handleEditCommentAction}>
                                  <Ionicons name="pencil" size={22} color="#fff" style={{marginRight: 15}} />
                                  <Text style={styles.darkMenuText}>Edit Comment</Text>
                              </TouchableOpacity>
                          ) : null}

                          <TouchableOpacity style={[styles.darkMenuItem, { borderBottomWidth: 0 }]} onPress={handleDeleteCommentAction}>
                              <Ionicons name="trash-outline" size={22} color="#FF3B30" style={{marginRight: 15}} />
                              <Text style={[styles.darkMenuText, { color: '#FF3B30', fontWeight: 'bold' }]}>
                                  Delete Comment
                              </Text>
                          </TouchableOpacity>
                      </>
                  ) : (
                      <TouchableOpacity style={[styles.darkMenuItem, { borderBottomWidth: 0 }]} onPress={handleReportCommentAction}>
                          <Ionicons name="warning-outline" size={22} color="#FF3B30" style={{marginRight: 15}} />
                          <Text style={[styles.darkMenuText, { color: '#FF3B30', fontWeight: 'bold' }]}>
                              Report Comment
                          </Text>
                      </TouchableOpacity>
                  )}
              </View>

              <TouchableOpacity style={styles.darkCancelBtn} onPress={() => setCommentOptionsModalVisible(false)}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* 🟢 FIX: Post Report Modal inside Community Post details */}
        <Modal visible={reportModalVisible} animationType="slide" transparent={true} onRequestClose={() => setReportModalVisible(false)}>
          <TouchableOpacity style={{flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setReportModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.darkModalSheet}>
              <View style={{width: 40, height: 5, backgroundColor: '#555', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 20}} />

              {reportStep === 0 && (
                <View style={styles.darkMenuContainer}>
                  <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', padding: 18}} onPress={() => setReportStep(1)}>
                    <Ionicons name="warning-outline" size={22} color="#FF3B30" style={{marginRight: 15}} />
                    <Text style={{fontSize: 16, color: '#FF3B30', fontWeight: 'bold'}}>Report this post</Text>
                  </TouchableOpacity>
                </View>
              )}

              {reportStep === 1 && (
                <View style={{marginBottom: 15}}>
                  <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>Why report this post?</Text>
                  {reportReasons.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.darkMenuItem} onPress={() => { setSelectedMainReason(item); setReportStep(2); }}>
                      <Text style={styles.darkMenuText}>{item.title}</Text>
                      <Ionicons name="chevron-forward" size={20} color="#555" />
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 15}]} onPress={() => setReportStep(0)}>
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {reportStep === 2 && selectedMainReason && (
                <View style={{marginBottom: 15}}>
                  <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>{selectedMainReason.title}</Text>
                  <Text style={{color: '#aaa', textAlign: 'center', marginBottom: 15, paddingHorizontal: 20}}>Please specify the exact issue:</Text>
                  {selectedMainReason.subCategories.map((sub, index) => (
                    <TouchableOpacity key={index} style={styles.darkMenuItem} onPress={() => { setSelectedReportReason(sub); setReportStep(3); }}>
                      <Text style={styles.darkMenuText}>{sub.title}</Text>
                      <Ionicons name="chevron-forward" size={20} color="#555" />
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 15}]} onPress={() => setReportStep(1)}>
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>Back</Text>
                  </TouchableOpacity>
                </View>
              )}

              {reportStep === 3 && selectedReportReason && (
                <View style={{marginBottom: 15}}>
                  <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>Confirm Report</Text>
                  <View style={{backgroundColor: '#2C2C2E', padding: 20, borderRadius: 15, marginBottom: 15}}>
                    <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8}}>{selectedMainReason.title} - {selectedReportReason.title}</Text>
                    <Text style={{color: '#aaa', fontSize: 14, lineHeight: 22}}>{selectedReportReason.desc}</Text>
                  </View>
                  <TextInput style={styles.darkTextInput} placeholder="Add additional details (optional)..." placeholderTextColor="#888" multiline={true} returnKeyType="done" blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} value={reportAdditionalInfo} onChangeText={setReportAdditionalInfo} />
                  <TouchableOpacity style={{backgroundColor: '#FF3B30', padding: 18, borderRadius: 15, alignItems: 'center'}} onPress={() => submitReport(`${selectedMainReason.title}: ${selectedReportReason.title}`)}>
                    <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Submit Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 10}]} onPress={() => setReportStep(2)}>
                    <Text style={{color: '#fff', fontWeight: 'bold'}}>Back</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={commentReportModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCommentReportModalVisible(false)}>
          <TouchableOpacity style={{flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setCommentReportModalVisible(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.darkModalSheet}>
              <View style={{width: 40, height: 5, backgroundColor: '#555', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 20}} />
              
              {commentReportStep === 0 && (
                <View style={styles.darkMenuContainer}><TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', padding: 18}} onPress={() => setCommentReportStep(1)}><Ionicons name="warning-outline" size={22} color="#FF3B30" style={{marginRight: 15}} /><Text style={{fontSize: 16, color: '#FF3B30', fontWeight: 'bold'}}>Report this comment</Text></TouchableOpacity></View>
              )}
              
              {commentReportStep === 1 && (
                <View style={{marginBottom: 15}}>
                  <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>Why report this comment?</Text>
                  {reportReasons.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.darkMenuItem} onPress={() => { setSelectedMainCommentReason(item); setCommentReportStep(2); }}>
                      <Text style={styles.darkMenuText}>{item.title}</Text>
                      <Ionicons name="chevron-forward" size={20} color="#555" />
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 15}]} onPress={() => setCommentReportStep(0)}><Text style={{color: '#fff', fontWeight: 'bold'}}>Cancel</Text></TouchableOpacity>
                </View>
              )}

              {commentReportStep === 2 && selectedMainCommentReason && (
                <View style={{marginBottom: 15}}>
                  <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>{selectedMainCommentReason.title}</Text>
                  <Text style={{color: '#aaa', textAlign: 'center', marginBottom: 15, paddingHorizontal: 20}}>Please specify the exact issue:</Text>
                  {selectedMainCommentReason.subCategories.map((sub, index) => (
                    <TouchableOpacity key={index} style={styles.darkMenuItem} onPress={() => { setSelectedCommentSubReason(sub); setCommentReportStep(3); }}>
                      <Text style={styles.darkMenuText}>{sub.title}</Text>
                      <Ionicons name="chevron-forward" size={20} color="#555" />
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 15}]} onPress={() => setCommentReportStep(1)}><Text style={{color: '#fff', fontWeight: 'bold'}}>Back</Text></TouchableOpacity>
                </View>
              )}

              {commentReportStep === 3 && selectedCommentSubReason && (
                <View style={{marginBottom: 15}}>
                  <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>Confirm Report</Text>
                  <View style={{backgroundColor: '#2C2C2E', padding: 20, borderRadius: 15, marginBottom: 15}}>
                      <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8}}>{selectedMainCommentReason.title} - {selectedCommentSubReason.title}</Text>
                      <Text style={{color: '#aaa', fontSize: 14, lineHeight: 22}}>{selectedCommentSubReason.desc}</Text>
                  </View>
                  <TextInput style={styles.darkTextInput} placeholder="Add additional details (optional)..." placeholderTextColor="#888" multiline={true} returnKeyType="done" blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} value={reportAdditionalInfo} onChangeText={setReportAdditionalInfo} />
                  <TouchableOpacity style={{backgroundColor: '#FF3B30', padding: 18, borderRadius: 15, alignItems: 'center'}} onPress={() => submitCommentReport(`${selectedMainCommentReason.title}: ${selectedCommentSubReason.title}`)}><Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Submit Report</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 10}]} onPress={() => setCommentReportStep(2)}><Text style={{color: '#fff', fontWeight: 'bold'}}>Back</Text></TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  if (isCreating) {
      return (
        <View style={styles.container}>
          {/* 🟢 SOLID GREEN STATUS BAR TRICK */}
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
          
          <View style={[styles.subHeader, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
              <View style={styles.subHeaderRow}>
                  <TouchableOpacity onPress={() => {setIsCreating(false); setEditingPostId(null); setShowDIYShowcaseOption(false); setImageCaptions([]);}} style={styles.backButton}>
                      <Ionicons name="arrow-back" size={24} color="white" />
                  </TouchableOpacity>
                  <View style={{alignItems: 'center'}}>
                      <Text style={styles.subHeaderTitle}>{editingPostId ? 'Edit Post' : 'Create Post'}</Text>
                  </View>
                  <View style={{ width: 40 }} />
              </View>
          </View>

          <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}>
            <ScrollView contentContainerStyle={styles.createContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.guidelineCard}>
                  <View style={styles.guidelineHeader}>
                      <MaterialCommunityIcons name="clipboard-check-outline" size={22} color="#007C00" />
                      <Text style={styles.guidelineTitle}>Create Post Guidelines</Text>
                  </View>
                  <Text style={styles.guidelineText}>• Use clear photos and captions for every image.</Text>
                  <Text style={styles.guidelineText}>• Add the exact meet-up location using the map.</Text>
                  <Text style={styles.guidelineText}>• Post only recyclable, reusable, or upcycled items.</Text>
              </View>

              <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Post Details</Text>
              <Text style={styles.label}>Post Type</Text>
              
              <View style={styles.typeRow}>{['For Sale', 'Trade', 'Free'].map(type => (<TouchableOpacity key={type} style={[styles.typeBtn, form.type === type && styles.typeBtnActive, {borderColor: form.type === type ? '#007C00' : '#E0E0E0'}]} onPress={() => setForm({...form, type: type})}><Text style={[styles.typeBtnText, form.type === type && {color: '#007C00'}]}>{type}</Text></TouchableOpacity>))}</View>
              
              <Text style={styles.label}>Name of your Item</Text><TextInput style={styles.input} placeholder="Title" value={form.title} onChangeText={(t) => setForm({...form, title: t})} />
              <Text style={styles.label}>Description of your Item</Text><TextInput style={[styles.input, {height: 80}]} placeholder="Describe your item..." multiline value={form.desc} onChangeText={(t) => setForm({...form, desc: t})} />
              
              {form.type === 'For Sale' ? (<><Text style={styles.label}>Price *</Text><View style={styles.inputIconWrap}><Text style={{color: '#999', marginRight: 5}}>₱</Text><TextInput style={{flex: 1}} placeholder="0.00" keyboardType="numeric" value={form.price} onChangeText={(t) => setForm({...form, price: t})}/></View></>) : null}
              {form.type === 'Trade' ? (<><Text style={styles.label}>Looking For *</Text><TextInput style={styles.input} placeholder="e.g. Glass bottles..." value={form.lookingFor} onChangeText={(t) => setForm({...form, lookingFor: t})}/></>) : null}
              
              </View>

              <Text style={styles.label}>Location Details</Text>
              <View style={styles.locationSearchBox}>
                  <TextInput
                      style={styles.locationSearchTextInput}
                      placeholder="Type place, mall, street, or landmark"
                      value={form.location}
                      onChangeText={(t) => {
                          setForm(prev => ({
                              ...prev,
                              location: t,
                              latitude: null,
                              longitude: null
                          }));
                      }}
                      returnKeyType="search"
                      onSubmitEditing={() => searchTypedLocation(form.location, true, true)}
                  />
                  {form.location?.length > 0 && (
                      <TouchableOpacity onPress={() => { setForm({...form, location: ''}); setLocationSuggestions([]); }}>
                          <Ionicons name="close-circle" size={18} color="#B0BEC5" />
                      </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.locationPinBtn} onPress={() => searchTypedLocation(form.location, true, true)} disabled={isSearchingLocation}>
                      {isSearchingLocation ? (
                          <ActivityIndicator size="small" color="white" />
                      ) : (
                          <MaterialCommunityIcons name="map-marker-radius" size={22} color="white" />
                      )}
                  </TouchableOpacity>
              </View>

              {isSearchingLocation && (
                  <Text style={styles.searchingLocationText}>Searching recommended locations...</Text>
              )}

              {locationSuggestions.length > 0 && (
                  <View style={styles.suggestionsCard}>
                      <Text style={styles.suggestionsTitle}>Recommended Locations</Text>
                      <TouchableOpacity
                          style={styles.useTypedLocationItem}
                          onPress={() => searchTypedLocation(form.location, true, true)}
                      >
                          <View style={styles.suggestionIcon}>
                              <MaterialCommunityIcons name="map-search" size={18} color="#007C00" />
                          </View>
                          <View style={{flex: 1}}>
                              <Text style={styles.suggestionTitle} numberOfLines={1}>Use typed address</Text>
                              <Text style={styles.suggestionAddress} numberOfLines={2}>{form.location}</Text>
                          </View>
                      </TouchableOpacity>
                      {locationSuggestions.map((place) => (
                          <TouchableOpacity key={place.id} style={styles.suggestionItem} onPress={() => selectLocationSuggestion(place)}>
                              <View style={styles.suggestionIcon}>
                                  <MaterialCommunityIcons name="map-marker" size={18} color="#007C00" />
                              </View>
                              <View style={{flex: 1}}>
                                  <Text style={styles.suggestionTitle} numberOfLines={1}>{place.title}</Text>
                                  <Text style={styles.suggestionAddress} numberOfLines={2}>{place.address}</Text>
                              </View>
                          </TouchableOpacity>
                      ))}
                  </View>
              )}

              <Text style={[styles.label, {marginTop: 15}]}>Pin your Location *</Text>
              <Text style={{fontSize: 12, color: '#666', marginBottom: 10}}>Type a full address then tap the green pin button, or tap the map manually for exact pin.</Text>
              
              <View style={styles.mapBox}>
                  <MapView
                      style={styles.map}
                      region={{
                          latitude: form.latitude || 14.3262,
                          longitude: form.longitude || 120.9386,
                          latitudeDelta: form.latitude && form.longitude ? 0.01 : 0.05,
                          longitudeDelta: form.latitude && form.longitude ? 0.01 : 0.05
                      }}
                      onPress={handleMapPress}
                  >
                      {(form.latitude && form.longitude) ? (
                          <Marker
                              coordinate={{latitude: form.latitude, longitude: form.longitude}}
                              title={form.location || "Meet-up Spot"}
                          />
                      ) : null}
                  </MapView>
              </View>

              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 5}}>
                  <Text style={[styles.label, {marginTop: 0, marginBottom: 0}]}>Upload Photos *</Text>
                  <Text style={{fontSize: 12, color: '#666'}}>{form.imageUris.length}/5</Text>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 10, paddingVertical: 10}} keyboardShouldPersistTaps="handled">
                  {form.imageUris.map((uri, index) => (
                      <View key={index} style={{position: 'relative', width: 150}}>
                          <Image source={{ uri: uri }} style={{width: 150, height: 120, borderRadius: 12, backgroundColor: '#eee'}} resizeMode="cover" />
                          <TouchableOpacity style={{position: 'absolute', top: -5, right: -5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 15, padding: 4}} onPress={() => removeImage(index)}>
                              <Ionicons name="close" size={16} color="white" />
                          </TouchableOpacity>
                          <TextInput
                              style={styles.captionInput}
                              placeholder={`Caption for photo ${index + 1}`}
                              placeholderTextColor="#999"
                              value={imageCaptions[index] || ''}
                              onChangeText={(text) => {
                                  setImageCaptions(prev => {
                                      const next = [...prev];
                                      next[index] = text;
                                      return next;
                                  });
                              }}
                              multiline
                          />
                      </View>
                  ))}
                  
                  {form.imageUris.length < 5 && (
                      <TouchableOpacity style={{width: 120, height: 120, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA'}} onPress={handleImagePick}>
                          <MaterialCommunityIcons name="camera-plus" size={30} color="#999" />
                          <Text style={{fontSize: 10, color: '#999', marginTop: 5}}>Add Photo</Text>
                      </TouchableOpacity>
                  )}
              </ScrollView>
              
              <TouchableOpacity style={styles.submitBtn} onPress={handlePostSubmit} disabled={isModerating || isUploading}>
                  {isModerating ? (<Text style={{color: 'white', fontWeight: 'bold'}}>AI is checking your post...</Text>) : 
                   isUploading ? (<ActivityIndicator color="white" />) : 
                   (<Text style={{color: 'white', fontWeight: 'bold'}}>{editingPostId ? 'SAVE CHANGES' : 'POST NOW'}</Text>)}
              </TouchableOpacity>
              <View style={{height: keyboardVisible ? 280 : 30}} />
            </ScrollView>
          </KeyboardAvoidingView>

          <Modal
            visible={locationPickerVisible}
            animationType="slide"
            transparent={false}
            onRequestClose={() => setLocationPickerVisible(false)}
          >
            <View style={styles.locationModalContainer}>
              <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
              <View style={[styles.locationModalHeader, { paddingTop: Math.max(insets.top, 20) + 10 }]}>
                  <TouchableOpacity onPress={() => setLocationPickerVisible(false)} style={styles.locationBackBtn}>
                      <Ionicons name="arrow-back" size={24} color="#263238" />
                  </TouchableOpacity>
                  <View style={{alignItems: 'center'}}>
                      <Text style={styles.locationModalTitle}>Enter Location</Text>
                      <Text style={styles.locationModalSub}>Pin the exact meet-up place.</Text>
                  </View>
                  <TouchableOpacity onPress={useCurrentLocationForPost} style={styles.locationBackBtn}>
                      <MaterialCommunityIcons name="crosshairs-gps" size={23} color="#007C00" />
                  </TouchableOpacity>
              </View>

              <View style={styles.locationSearchWrap}>
                  <Ionicons name="search" size={22} color="#999" />
                  <TextInput
                      value={locationSearch}
                      onChangeText={setLocationSearch}
                      placeholder="Search or type address..."
                      placeholderTextColor="#999"
                      style={styles.locationSearchInput}
                      returnKeyType="search"
                      onSubmitEditing={() => searchTypedLocation(locationSearch, true, true)}
                  />
                  <TouchableOpacity style={styles.modalSearchBtn} onPress={() => searchTypedLocation(locationSearch, true, true)} disabled={isSearchingLocation}>
                      {isSearchingLocation ? (
                          <ActivityIndicator size="small" color="#007C00" />
                      ) : (
                          <MaterialCommunityIcons name="map-search" size={22} color="#007C00" />
                      )}
                  </TouchableOpacity>
              </View>

              <Text style={styles.locationMapHelper}>Tap anywhere on the map to move the pin.</Text>

              <View style={styles.fullMapBox}>
                  <MapView
                      style={styles.fullMap}
                      region={tempLocation}
                      onRegionChangeComplete={setTempLocation}
                      onPress={handleLocationPickerPress}
                  >
                      <Marker
                          coordinate={{
                              latitude: tempLocation.latitude,
                              longitude: tempLocation.longitude
                          }}
                      />
                  </MapView>

                  <TouchableOpacity style={styles.currentLocationFloating} onPress={useCurrentLocationForPost}>
                      <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#007C00" />
                  </TouchableOpacity>
              </View>

              <View style={styles.locationBottomPanel}>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                      <MaterialCommunityIcons name="map-marker" size={22} color="#007C00" />
                      <Text style={styles.pickedLocationText} numberOfLines={2}>
                          {locationSearch || 'Selected pin location'}
                      </Text>
                  </View>

                  <TouchableOpacity style={styles.confirmLocationBtn} onPress={confirmPickedLocation}>
                      <Text style={styles.confirmLocationText}>Confirm Location</Text>
                  </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      );
  }

  return (
    <View style={styles.container}>
      {/* 🟢 SOLID GREEN STATUS BAR TRICK */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      
      {/* PADDING TOP PARA MAG-SNAP YUNG HEADER SA STATUS BAR */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
        <View style={styles.headerContent}>
            <View>
              <Text style={styles.appName}>GreenSort</Text>
              <Text style={styles.welcomeText}>Welcome back, {userData.name}!</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                <TouchableOpacity style={styles.topMessageBtn} onPress={() => { setUnreadNotifs(0); router.push('/notifications'); }}>
                    <Ionicons name="notifications" size={24} color="white" />
                    {unreadNotifs > 0 ? (<View style={styles.badgeDot}><Text style={styles.badgeDotText}>{unreadNotifs > 99 ? '99+' : unreadNotifs}</Text></View>) : null}
                </TouchableOpacity>
                <TouchableOpacity style={styles.topMessageBtn} onPress={() => { setUnreadMessages(0); router.push('/messages'); }}>
                    <Ionicons name="chatbubble-ellipses" size={24} color="white" />
                    {unreadMessages > 0 ? (<View style={styles.badgeDot}><Text style={styles.badgeDotText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text></View>) : null}
                </TouchableOpacity>
            </View>
        </View>
      </View>

<ScrollView
        ref={feedScrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyboardShouldPersistTaps="always"
        scrollEventThrottle={16}
        onScroll={(event) => {
            lastFeedScrollY.current = event.nativeEvent.contentOffset.y;
        }}
      >        
        <View style={styles.tipCard}>
            <View style={styles.tipHeader}><MaterialCommunityIcons name="lightbulb-on-outline" size={20} color="#FBC02D" /><Text style={styles.tipTitle}>Eco Tip of the Day</Text></View>
            <Text style={styles.tipText}>Rinse and dry your recyclables before disposal.</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginBottom: 10, marginTop: 5 }]}>Eco Impact</Text>
        
       <TouchableOpacity 
    activeOpacity={0.8} 
    onPress={() => {
        Keyboard.dismiss();
        // 🟢 FIX: Pinipilit nito si React Native na i-render AGAD yung modal
        requestAnimationFrame(() => {
            setBankedModalVisible(true);
        });
    }}
>
    
    <View pointerEvents="none">
        <LinearGradient colors={['#007C00', '#004d00']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pointsBanner}>
            <View style={styles.pointsTitleWrap}>
                <MaterialCommunityIcons name="safe" size={28} color="#FFD54F" />
                <View>
                    <Text style={styles.pointsTitle}>Banked KG (Points)</Text>
                    <Text style={{color: 'rgba(255,255,255,0.7)', fontSize: 10, marginLeft: 8}}>Tap to view breakdown</Text>
                </View>
            </View>
            <Text style={styles.pointsValue}>{userData.bankedPoints} <Text style={{fontSize: 14, fontWeight: 'normal'}}>KG</Text></Text>
        </LinearGradient>
    </View>
</TouchableOpacity>

        <View style={styles.impactRow}>
            <ImpactCard value={userData.kgRecycled} unit="kg recycled" icon="chart-line-variant" color="#007C00" bgColor="#E8F5E9" />
            <ImpactCard value={userData.submissions} unit="submissions" icon="target" color="#2979FF" bgColor="#E3F2FD" />
            <ImpactCard value={userData.upcycleProjects} unit="projects" icon="leaf" color="#AA00FF" bgColor="#F3E5F5" />
        </View>

        <View style={[styles.sectionHeader, { zIndex: 10 }]}>
            <Text style={styles.sectionTitle}>Community Feed</Text>
            <TouchableOpacity style={[styles.addPostBtn, { zIndex: 100, elevation: 5 }]} onPress={() => setIsCreating(true)} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
                <MaterialCommunityIcons name="plus" size={24} color="white" />
            </TouchableOpacity>
        </View>
        
        <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#3f3e3e" style={{marginLeft: 10}} />
            <TextInput style={styles.searchInput} placeholder="Search posts..." placeholderTextColor="#999" value={searchQuery} onChangeText={setSearchQuery} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>{['All', 'For Sale', 'Trade', 'Free', 'DIY Project'].map((filter) => (<TouchableOpacity key={filter} style={[styles.filterPill, activeFilter === filter && styles.activePill]} onPress={() => setActiveFilter(filter)}><Text style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>{filter}</Text></TouchableOpacity>))}</ScrollView>

        {filteredPosts.length === 0 ? (<Text style={{textAlign: 'center', marginTop: 50, color: '#999'}}>No posts found.</Text>) : (
            filteredPosts.map((post) => {
                const isOwner = post.user === userData.name;
                const firstImageUrl = post.image ? post.image.split(',')[0] : null;
                const feedPhotoCaptions = extractPhotoCaptions(post.desc || '');
                const feedCleanDesc = cleanPostDescription(post.desc || '');

                if (post.status === 'flagged' && isOwner) {
                    return (
                        <View key={post.id} style={{backgroundColor: '#FFF5F5', borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 2, borderColor: '#FF3B30', elevation: 3}}>
                            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                                <Ionicons name="warning" size={28} color="#FF3B30" />
                                <Text style={{color: '#FF3B30', fontSize: 18, fontWeight: '900', marginLeft: 10}}>POST FLAGGED BY AI</Text>
                            </View>
                            <Text style={{color: '#333', fontSize: 14, marginBottom: 5}}>Your post <Text style={{fontWeight: 'bold'}}>"{post.title}"</Text> was hidden from the community.</Text>
                            <Text style={{color: '#FF3B30', fontSize: 14, fontWeight: 'bold', marginBottom: 15, backgroundColor: '#FFEBEB', padding: 10, borderRadius: 8}}>Reason: {post.ai_reason}</Text>
                            <TouchableOpacity onPress={() => handleAppeal(post)} style={{backgroundColor: '#FF3B30', paddingVertical: 12, borderRadius: 8, alignItems: 'center', shadowColor: '#FF3B30', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5}}>
                                <Text style={{color: 'white', fontWeight: '900', fontSize: 16, letterSpacing: 1}}>SUBMIT APPEAL TO ADMIN</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }

                return (
                    <View key={post.id} style={[styles.postCard, isOwner && styles.myPostCardBorder]}>
                        <View style={styles.postHeader}>
                            <Image source={{ uri: post.avatar }} style={styles.postAvatar} />
                            <View style={{flex: 1, marginLeft: 10}}>
                                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                                    <Text style={styles.postUser}>{post.user}</Text>
                                    {isOwner ? (<View style={styles.meBadge}><Text style={styles.meBadgeText}>YOU</Text></View>) : null}
                                </View>
                                <Text style={styles.postTime}>{formatTime(post.created_at)}</Text>
                            </View>
                            <View style={[styles.typeBadge, {backgroundColor: post.type === 'DIY Project' ? '#E8F5E9' : '#E3F2FD'}]}>
                                <Text style={{color: post.type === 'DIY Project' ? '#00A86B' : '#1976D2', fontSize: 10, fontWeight: 'bold'}}>{post.type}</Text>
                            </View>
                            <TouchableOpacity onPress={() => isOwner ? handlePostOptions(post) : handleOtherPostOptions(post)} style={{padding: 5, marginLeft: 10}}><Ionicons name="ellipsis-vertical" size={20} color="#999" /></TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity onPress={() => openPostDetails(post)}>
                            <Text style={styles.postTitle}>{post.title}</Text>
                            <Text style={styles.postDesc} numberOfLines={2}>{feedCleanDesc}</Text>
                            <View style={{position: 'relative'}}>
                                {firstImageUrl && (
                                    <Image source={{ uri: firstImageUrl }} style={styles.postImage} />
                                )}
                                {post.image && post.image.includes(',') && (
                                    <View style={{position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center'}}>
                                        <MaterialCommunityIcons name="layers-outline" size={14} color="white" style={{marginRight: 4}} />
                                        <Text style={{color: 'white', fontSize: 11, fontWeight: 'bold'}}>{post.image.split(',').length}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                        
                        <View style={styles.postFooter}>
                            <View style={{flexDirection: 'row', alignItems: 'center', gap: 15}}>
                                <TouchableOpacity activeOpacity={0.7} style={styles.iconRow} onPress={() => handleLike(post)}><Ionicons name={post.liked_by?.includes(userData.name) ? "heart" : "heart-outline"} size={24} color={post.liked_by?.includes(userData.name) ? "#FF1744" : "#666"} /><Text style={styles.iconText}>{post.likes}</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.iconRow} onPress={() => openPostDetails(post)}><Ionicons name="chatbubble-outline" size={22} color="#666" /><Text style={styles.iconText}>{post.comments}</Text></TouchableOpacity>
                            </View>
                            
                            <View style={{flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 10, justifyContent: 'flex-end', flex: 1}}>
                                <Text style={[styles.postPrice, { flexShrink: 1, textAlign: 'right' }]} numberOfLines={1}>
                                    {post.price.replace('Market Value: ', '')}
                                </Text>
                                {!isOwner && (
                                    post.type === 'DIY Project' ? (
                                        <TouchableOpacity style={[styles.contactBtn, {backgroundColor: '#FF9800'}]} onPress={() => handleSavePost(post)}>
                                            <Text style={styles.contactText}>Save</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity style={styles.contactBtn} onPress={() => handleContact(post)}>
                                            <Text style={styles.contactText}>Contact</Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>
                        </View>
                    </View>
                );
            })
        )}
        <View style={{height: 100}} /> 
      </ScrollView>

      {/* 🟢 FIX: Banked KG Modal on main Dashboard */}
      <BankedKgModal 
        visible={isBankedModalVisible} 
        onClose={() => setBankedModalVisible(false)} 
        bankedDetails={bankedDetails} 
      />

      {/* MODALS */}
      <Modal visible={optionsModalVisible} animationType="slide" transparent={true} onRequestClose={() => setOptionsModalVisible(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.darkModalSheet}>
            <View style={{width: 40, height: 5, backgroundColor: '#555', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 20}} />
            <View style={styles.darkMenuContainer}>
              <TouchableOpacity style={styles.darkMenuItem} onPress={handleEditAction}><Ionicons name="create-outline" size={22} color="#fff" style={{marginRight: 15}} /><Text style={styles.darkMenuText}>Edit Post</Text></TouchableOpacity>
              <TouchableOpacity style={styles.darkMenuItem} onPress={handleSoldAction}><Ionicons name="checkmark-circle-outline" size={22} color="#007C00" style={{marginRight: 15}} /><Text style={[styles.darkMenuText, {color: '#007C00', fontWeight: 'bold'}]}>Mark as Sold/Traded</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.darkMenuItem, { borderBottomWidth: 0 }]} onPress={handleDeleteAction}><Ionicons name="trash-outline" size={22} color="#FF3B30" style={{marginRight: 15}} /><Text style={[styles.darkMenuText, { color: '#FF3B30', fontWeight: 'bold' }]}>Delete Post</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.darkCancelBtn} onPress={() => setOptionsModalVisible(false)}><Text style={{color: '#fff', fontWeight: 'bold'}}>Cancel</Text></TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={reportModalVisible} animationType="slide" transparent={true} onRequestClose={() => setReportModalVisible(false)}>
        <TouchableOpacity style={{flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setReportModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.darkModalSheet}>
            <View style={{width: 40, height: 5, backgroundColor: '#555', borderRadius: 5, alignSelf: 'center', marginTop: 15, marginBottom: 20}} />
            {reportStep === 0 && (<View style={styles.darkMenuContainer}><TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', padding: 18}} onPress={() => setReportStep(1)}><Ionicons name="warning-outline" size={22} color="#FF3B30" style={{marginRight: 15}} /><Text style={{fontSize: 16, color: '#FF3B30', fontWeight: 'bold'}}>Report this post</Text></TouchableOpacity></View>)}
            {reportStep === 1 && (
              <View style={{marginBottom: 15}}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>Why report this post?</Text>
                {reportReasons.map((item, index) => (
                  <TouchableOpacity key={index} style={styles.darkMenuItem} onPress={() => { setSelectedMainReason(item); setReportStep(2); }}>
                    <Text style={styles.darkMenuText}>{item.title}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 15}]} onPress={() => setReportStep(0)}><Text style={{color: '#fff', fontWeight: 'bold'}}>Cancel</Text></TouchableOpacity>
              </View>
            )}
            {reportStep === 2 && selectedMainReason && (
              <View style={{marginBottom: 15}}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>{selectedMainReason.title}</Text>
                <Text style={{color: '#aaa', textAlign: 'center', marginBottom: 15, paddingHorizontal: 20}}>Please specify the exact issue:</Text>
                {selectedMainReason.subCategories.map((sub, index) => (
                  <TouchableOpacity key={index} style={styles.darkMenuItem} onPress={() => { setSelectedReportReason(sub); setReportStep(3); }}>
                    <Text style={styles.darkMenuText}>{sub.title}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 15}]} onPress={() => setReportStep(1)}><Text style={{color: '#fff', fontWeight: 'bold'}}>Back</Text></TouchableOpacity>
              </View>
            )}
            {reportStep === 3 && selectedReportReason && (
              <View style={{marginBottom: 15}}>
                <Text style={{fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15, textAlign: 'center'}}>Confirm Report</Text>
                <View style={{backgroundColor: '#2C2C2E', padding: 20, borderRadius: 15, marginBottom: 15}}>
                    <Text style={{color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8}}>{selectedMainReason.title} - {selectedReportReason.title}</Text>
                    <Text style={{color: '#aaa', fontSize: 14, lineHeight: 22}}>{selectedReportReason.desc}</Text>
                </View>
                <TextInput style={styles.darkTextInput} placeholder="Add additional details (optional)..." placeholderTextColor="#888" multiline={true} returnKeyType="done" blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} value={reportAdditionalInfo} onChangeText={setReportAdditionalInfo} />
                <TouchableOpacity style={{backgroundColor: '#FF3B30', padding: 18, borderRadius: 15, alignItems: 'center'}} onPress={() => submitReport(`${selectedMainReason.title}: ${selectedReportReason.title}`)}><Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Submit Report</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.darkCancelBtn, {marginTop: 10}]} onPress={() => setReportStep(2)}><Text style={{color: '#fff', fontWeight: 'bold'}}>Back</Text></TouchableOpacity>
              </View>
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
  scrollView: { flex: 1 }, scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 }, tipCard: { backgroundColor: '#FFF3E0', padding: 16, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FFE0B2' }, tipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 }, tipTitle: { fontSize: 14, fontWeight: 'bold', color: '#EF6C00', marginLeft: 8 }, tipText: { fontSize: 12, color: '#E65100', lineHeight: 18 }, 
  pointsBanner: { borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, elevation: 3 }, 
  pointsTitleWrap: { flexDirection: 'row', alignItems: 'center' }, pointsTitle: { color: 'white', fontSize: 16, fontWeight: '600', marginLeft: 8 }, pointsValue: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  impactRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, gap: 10 }, impactCard: { flex: 1, backgroundColor: 'white', paddingVertical: 18, borderRadius: 16, alignItems: 'center', elevation: 2 }, impactIconBg: { padding: 10, borderRadius: 12, marginBottom: 10 }, impactValue: { fontSize: 18, fontWeight: 'bold' }, impactUnit: { fontSize: 10, color: '#90A4AE', textAlign: 'center', marginTop: 2 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 15, zIndex: 10 }, sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#263238' }, searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, marginBottom: 15, paddingHorizontal: 10, borderWidth: 1, borderColor: '#eee' }, searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: '#333' }, 
  topMessageBtn: { justifyContent: 'center', alignItems: 'center', position: 'relative' }, badgeDot: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF1744', borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, minWidth: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'white' }, badgeDotText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  addPostBtn: { backgroundColor: '#007C00', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.3, shadowRadius: 3, zIndex: 100 }, 
  filterPill: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: 'white', borderRadius: 20, marginRight: 10, elevation: 1, borderWidth: 1, borderColor: '#eee' }, activePill: { backgroundColor: '#263238', borderColor: '#263238' }, filterText: { fontSize: 13, color: '#666', fontWeight: '600' }, activeFilterText: { color: 'white' }, 
  postCard: { backgroundColor: 'white', borderRadius: 18, padding: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 4 }, myPostCardBorder: { backgroundColor: '#F1F8E9', borderWidth: 1, borderColor: '#C8E6C9' }, meBadge: { backgroundColor: '#007C00', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }, meBadgeText: { color: 'white', fontSize: 8, fontWeight: 'bold' },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 }, postAvatar: { width: 40, height: 40, borderRadius: 20 }, postUser: { fontWeight: 'bold', fontSize: 14, color: '#333' }, postTime: { fontSize: 11, color: '#999' }, typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }, postTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 }, postDesc: { fontSize: 13, color: '#78909C', marginBottom: 12, lineHeight: 18 }, postImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 14, marginBottom: 15, resizeMode: 'cover', backgroundColor: '#f0f0f0' }, 
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, 
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 5 }, 
  iconText: { fontSize: 14, color: '#666' }, 
  postPrice: { fontSize: 18, fontWeight: '900', color: '#007C00' },
  
  contactBtn: { backgroundColor: '#007C00', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 }, contactText: { color: 'white', fontWeight: 'bold', fontSize: 12 }, footerInput: { padding: 14, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', flexDirection: 'row', alignItems: 'flex-end', gap: 10, elevation: 8, shadowColor: '#000', shadowOffset: {width: 0, height: -3}, shadowOpacity: 0.06, shadowRadius: 8 }, statusBanner: { backgroundColor: '#E8F5E9', padding: 8, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, inputField: { flex: 1, backgroundColor: '#F5F7FA', borderRadius: 22, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, borderWidth: 1, borderColor: '#ECEFF1' }, sendBtn: { width: 40, height: 40, backgroundColor: '#007C00', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 2 }, createContent: { padding: 20, paddingBottom: 60 }, label: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4, marginTop: 15 }, input: { backgroundColor: '#F5F7FA', borderRadius: 10, padding: 15, borderWidth: 1, borderColor: '#F0F0F0' }, inputIconWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: '#F0F0F0' }, typeRow: { flexDirection: 'row', gap: 10 }, typeBtn: { flex: 1, paddingVertical: 15, borderRadius: 12, borderWidth: 1, alignItems: 'center', borderColor: '#E0E0E0' }, typeBtnActive: { borderColor: '#007C00', backgroundColor: '#E8F5E9' }, typeBtnText: { fontSize: 12, fontWeight: '600', color: '#666' }, imageUploadBox: { width: '100%', aspectRatio: 16 / 9, borderWidth: 1, borderColor: '#ddd', borderStyle: 'dashed', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA', marginTop: 15 }, submitBtn: { padding: 15, borderRadius: 12, backgroundColor: '#007C00', alignItems: 'center', marginTop: 30 },
  darkModalSheet: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingBottom: 35, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 15 }, darkMenuContainer: { backgroundColor: '#2C2C2E', borderRadius: 15, overflow: 'hidden', marginBottom: 15 }, darkMenuItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#3A3A3C' }, darkMenuText: { fontSize: 16, color: '#fff' }, darkCancelBtn: { padding: 18, backgroundColor: '#2C2C2E', borderRadius: 15, alignItems: 'center' },
  
  guidelineCard: { backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: '#C8E6C9' },
  guidelineHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  guidelineTitle: { marginLeft: 8, fontSize: 15, fontWeight: '900', color: '#007C00' },
  guidelineText: { fontSize: 12, color: '#2E7D32', lineHeight: 19 },
  formSection: { backgroundColor: 'white', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ECEFF1' },
  formSectionTitle: { fontSize: 17, fontWeight: '900', color: '#263238', marginBottom: 10 },
  helperText: { fontSize: 12, color: '#78909C', lineHeight: 18, marginBottom: 12 },
  locationSelectBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E0E0E0' },
  locationIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  locationSelectLabel: { fontSize: 11, color: '#78909C', fontWeight: '700', marginBottom: 3 },
  locationSelectText: { fontSize: 14, color: '#263238', fontWeight: '700', lineHeight: 19 },
  miniMapBox: { height: 150, borderRadius: 16, overflow: 'hidden', marginTop: 12, borderWidth: 1, borderColor: '#E0E0E0' },
  miniMap: { width: '100%', height: '100%' },
  locationModalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  locationModalHeader: { paddingHorizontal: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationBackBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center' },
  locationModalTitle: { fontSize: 22, fontWeight: '900', color: '#263238' },
  locationModalSub: { fontSize: 12, color: '#90A4AE', marginTop: 3 },
  locationSearchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 24, marginHorizontal: 20, paddingHorizontal: 16, height: 54, marginTop: 4 },
  locationSearchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#263238' },
  locationMapHelper: { marginHorizontal: 22, marginTop: 14, marginBottom: 8, fontSize: 12, color: '#D32F2F' },
  fullMapBox: { flex: 1, overflow: 'hidden' },
  fullMap: { width: '100%', height: '100%' },
  currentLocationFloating: { position: 'absolute', right: 16, top: 16, width: 44, height: 44, borderRadius: 12, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  locationBottomPanel: { backgroundColor: 'white', padding: 18, borderTopLeftRadius: 22, borderTopRightRadius: 22, elevation: 12 },
  pickedLocationText: { flex: 1, marginLeft: 8, color: '#263238', fontSize: 14, fontWeight: '700', lineHeight: 19 },
  confirmLocationBtn: { backgroundColor: '#FFC107', borderRadius: 20, paddingVertical: 16, alignItems: 'center' },
  confirmLocationText: { color: '#111', fontWeight: '900', fontSize: 15 },

    locationSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden' },
  locationSearchTextInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 14, fontSize: 14, color: '#263238' },
  locationPinBtn: { width: 48, height: 48, backgroundColor: '#007C00', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  locationInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0', overflow: 'hidden' },
  locationInput: { flex: 1, padding: 15, color: '#333', fontSize: 14 },
  locationSearchBtn: { width: 52, height: 52, backgroundColor: '#007C00', justifyContent: 'center', alignItems: 'center' },
  searchingLocationText: { fontSize: 11, color: '#78909C', marginTop: 8, marginLeft: 4 },
  suggestionsCard: { backgroundColor: 'white', borderRadius: 16, marginTop: 10, borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden', zIndex: 50, elevation: 8 },
  suggestionsTitle: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6, fontSize: 12, color: '#007C00', fontWeight: '900', textTransform: 'uppercase' },
  useTypedLocationItem: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', alignItems: 'center', backgroundColor: '#F8FFF8' },
  suggestionItem: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', alignItems: 'center' },
  suggestionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  suggestionTitle: { fontSize: 14, fontWeight: '900', color: '#263238', marginBottom: 2 },
  suggestionAddress: { fontSize: 12, color: '#78909C', lineHeight: 16 },
  modalSearchBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  mapBox: { width: '100%', height: 230, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#E8F5E9', marginBottom: 15 },
  map: { width: '100%', height: '100%' },
  captionInput: { marginTop: 8, backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: '#333', minHeight: 44, textAlignVertical: 'top' },
  darkTextInput: { backgroundColor: '#2C2C2E', color: 'white', borderRadius: 12, padding: 15, height: 90, textAlignVertical: 'top', marginBottom: 20, borderWidth: 1, borderColor: '#3A3A3C', fontSize: 15 }
});