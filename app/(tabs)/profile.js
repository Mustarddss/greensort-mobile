import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // Toggle Edit Mode
  
  // Form States
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState(null);

  // ⚠️ UPDATE NGROK URL
  const API_URL = 'https://jumpier-michale-identical.ngrok-free.dev'; 

  // 🟢 1. FETCH DATA ON LOAD
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Kunin ang ID na sinave natin nung Login
      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) {
          router.replace('/login'); 
          return;
      }

      const parsedUser = JSON.parse(storedUser);
      const userId = parsedUser.id;

      // Tawagin ang Database
      const response = await axios.get(`${API_URL}/user/${userId}`);
      if (response.data.success) {
          const user = response.data.user;
          setUserData(user);
          setFullName(user.fullName);
          setPhone(user.phone || '');
          setImage(user.profileImage ? `${API_URL}/${user.profileImage.replace(/\\/g, '/')}` : null);
      }
    } catch (error) {
      console.log("Error fetching profile:", error);
      Alert.alert("Error", "Could not load profile data.");
    } finally {
      setLoading(false);
    }
  };

  // 📸 2. PICK IMAGE
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // 💾 3. SAVE CHANGES
  const saveProfile = async () => {
    setLoading(true);
    try {
        const storedUser = await AsyncStorage.getItem('user');
        const userId = JSON.parse(storedUser).id;

        const formData = new FormData();
        formData.append('fullName', fullName);
        formData.append('phone', phone);
        formData.append('email', userData.email); // Email usually bawal palitan, pero send natin for validation

        // Kung bago ang image (galing sa phone storage), i-upload. 
        // Kung URL pa rin (galing server), wag isama.
        if (image && !image.includes('http')) {
            formData.append('profileImage', {
                uri: image,
                name: 'profile.jpg',
                type: 'image/jpeg',
            });
        }

        const response = await axios.put(`${API_URL}/user/update/${userId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data.success) {
            Alert.alert("Success", "Profile Updated!");
            setIsEditing(false); // Exit Edit Mode
            fetchUserData(); // Refresh Data
        }

    } catch (error) {
        console.log(error);
        Alert.alert("Error", "Failed to update profile.");
    } finally {
        setLoading(false);
    }
  };

  // 🚪 LOGOUT
  const handleLogout = async () => {
      await AsyncStorage.removeItem('user');
      router.replace('/login');
  };

  if (loading) {
      return <View style={styles.center}><ActivityIndicator size="large" color="#00C853" /></View>;
  }

  return (
    <ScrollView style={styles.container}>
      
      {/* HEADER & IMAGE */}
      <View style={styles.header}>
        <View style={styles.imageContainer}>
             {/* Show Image or Default Icon */}
            {image ? (
                <Image source={{ uri: image }} style={styles.profileImage} />
            ) : (
                <View style={[styles.profileImage, {backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center'}]}>
                    <FontAwesome5 name="user" size={40} color="#888" />
                </View>
            )}

            {/* Camera Icon (Only visible in Edit Mode) */}
            {isEditing && (
                <TouchableOpacity style={styles.cameraIcon} onPress={pickImage}>
                    <MaterialIcons name="camera-alt" size={20} color="white" />
                </TouchableOpacity>
            )}
        </View>

        {isEditing ? (
            <TextInput 
                style={styles.inputName} 
                value={fullName} 
                onChangeText={setFullName} 
                placeholder="Enter Name"
            />
        ) : (
            <Text style={styles.name}>{userData?.fullName}</Text>
        )}
        
        <Text style={styles.date}>Member since {new Date(userData?.joinDate).toLocaleDateString()}</Text>

        {/* EDIT / SAVE BUTTON */}
        <TouchableOpacity 
            style={[styles.editBtn, isEditing ? {backgroundColor: '#00C853'} : {backgroundColor: 'transparent', borderWidth: 1, borderColor: '#00C853'}]}
            onPress={isEditing ? saveProfile : () => setIsEditing(true)}
        >
            <Text style={[styles.editBtnText, isEditing ? {color: 'white'} : {color: '#00C853'}]}>
                {isEditing ? "Save Changes" : "Edit Profile"}
            </Text>
        </TouchableOpacity>
      </View>

      {/* PERSONAL INFO */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        
        <View style={styles.row}>
            <View style={styles.iconBox}><MaterialIcons name="email" size={20} color="#00C853" /></View>
            <View>
                <Text style={styles.label}>Email</Text>
                <Text style={styles.value}>{userData?.email}</Text>
            </View>
        </View>

        <View style={styles.row}>
            <View style={styles.iconBox}><MaterialIcons name="phone" size={20} color="#00C853" /></View>
            <View style={{flex: 1}}>
                <Text style={styles.label}>Phone</Text>
                {isEditing ? (
                    <TextInput 
                        style={styles.input} 
                        value={phone} 
                        onChangeText={setPhone} 
                        placeholder="+63 900 000 0000" 
                        keyboardType="phone-pad"
                    />
                ) : (
                    <Text style={styles.value}>{phone || 'Not set'}</Text>
                )}
            </View>
        </View>

        <View style={styles.row}>
            <View style={styles.iconBox}><MaterialIcons name="location-on" size={20} color="#00C853" /></View>
            <View>
                <Text style={styles.label}>Address</Text>
                <Text style={styles.value} numberOfLines={2}>{userData?.address}</Text>
            </View>
        </View>
      </View>

      {/* STATS (READ ONLY - Depende sa Database) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Waste Segregation Stats</Text>
        <View style={styles.statsRow}>
            <StatBox number={userData?.stats?.recyclable || 0} label="Recyclable" color="#2196F3" />
            <StatBox number={userData?.stats?.upcyclable || 0} label="Upcyclable" color="#9C27B0" />
            <StatBox number={userData?.stats?.compostable || 0} label="Compostable" color="#4CAF50" />
            <StatBox number={userData?.stats?.surrendered || 0} label="Surrendered" color="#FF9800" />
        </View>
      </View>

      {/* LOGOUT BUTTON */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#FF5252" />
          <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
      
      <View style={{height: 30}} />
    </ScrollView>
  );
}

// Component para sa Stats Box
const StatBox = ({ number, label, color }) => (
    <View style={styles.stat}>
        <Text style={[styles.statNumber, {color}]}>{number}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { backgroundColor: 'white', alignItems: 'center', padding: 20, marginBottom: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  imageContainer: { position: 'relative', marginBottom: 10 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#00C853', padding: 8, borderRadius: 20 },
  
  name: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  inputName: { fontSize: 22, fontWeight: 'bold', color: '#333', borderBottomWidth: 1, borderColor: '#ccc', textAlign: 'center', minWidth: 200 },
  date: { color: '#888', fontSize: 12, marginBottom: 15 },
  
  editBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
  editBtnText: { fontWeight: '600', fontSize: 14 },

  section: { backgroundColor: 'white', marginHorizontal: 15, marginBottom: 15, padding: 20, borderRadius: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 40, height: 40, backgroundColor: '#E8F5E9', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  label: { fontSize: 12, color: '#888' },
  value: { fontSize: 14, color: '#333', fontWeight: '500' },
  input: { fontSize: 14, color: '#333', borderBottomWidth: 1, borderColor: '#ccc', paddingVertical: 2, width: '100%' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: '#666' },

  logoutBtn: { flexDirection: 'row', backgroundColor: '#FFEBEE', marginHorizontal: 15, padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  logoutText: { color: '#FF5252', fontWeight: 'bold', marginLeft: 10 }
});