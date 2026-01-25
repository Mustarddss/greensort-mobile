import { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera'; 
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';

export default function Signup() {
  const router = useRouter();
  
  // STATES
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('Barangay San Francisco, General Trias, Cavite'); 
  
  const [idImage, setIdImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // CAMERA SETTINGS
  const [cameraVisible, setCameraVisible] = useState(false);
  const [activeCaptureMode, setActiveCaptureMode] = useState(null); // 'ID' or 'SELFIE'
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  // ⚠️ UPDATE YOUR NGROK URL HERE
  const API_URL = 'https://jumpier-michale-identical.ngrok-free.dev'; 

  // 📸 HANDLE IMAGE PICK
  const handleImagePick = (type) => {
    if (type === 'SELFIE') {
        openCamera('SELFIE');
    } else {
        Alert.alert(
            "Select ID Type",
            "Please choose which ID you are scanning:",
            [
                { text: "National ID (PhilSys)", onPress: () => openCamera('ID') },
                { text: "Driver's License", onPress: () => openCamera('ID') },
                { text: "Cancel", style: "cancel" }
            ]
        );
    }
  };

  // 📷 OPEN CAMERA
  const openCamera = async (mode) => {
      if (!permission) return;
      if (!permission.granted) {
        const result = await requestPermission();
        if (!result.granted) {
            Alert.alert("Permission Denied", "Camera access is required.");
            return;
        }
      }
      setActiveCaptureMode(mode);
      setCameraVisible(true);
  };

  // ⚡ FAST TAKE PICTURE (RESIZED)
  const takePicture = async () => {
    if (cameraRef.current) {
        try {
            // 👇 ITO ANG SIKRETO SA BILIS: width: 500
            // Hindi kailangan ng HD para sa AI. 500px is perfect.
            const photo = await cameraRef.current.takePictureAsync({ 
                quality: 0.3, 
                width: 500,
                skipProcessing: true 
            });
            
            if (activeCaptureMode === 'ID') {
                setIdImage(photo.uri);
            } else {
                setSelfieImage(photo.uri);
            }
            
            setCameraVisible(false); 
        } catch (error) {
            Alert.alert("Error", "Failed to take photo.");
        }
    }
  };

  // 🚀 SUBMIT FORM
  const handleSignup = async () => {
    if (!fullName || !email || !password || !idImage || !selfieImage) {
      Alert.alert('Missing Info', 'Please fill all fields and upload photos.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('address', address);
    
    // Append Images
    formData.append('validID', { uri: idImage, name: 'id.jpg', type: 'image/jpeg' });
    formData.append('selfie', { uri: selfieImage, name: 'selfie.jpg', type: 'image/jpeg' });

    try {
      console.log("Sending request...");
      const response = await axios.post(`${API_URL}/signup`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
          setLoading(false);
          // ✅ FIX: Redirect sa LOGIN
          Alert.alert('Verification Successful!', 'Your account has been created. Please log in.', [
            { text: 'Login Now', onPress: () => router.replace('/login') }
          ]);
      }

    } catch (error) {
      setLoading(false);
      console.log("Error:", error);
      if (error.response) {
          Alert.alert('Verification Failed', error.response.data.message);
      } else {
          Alert.alert('Network Error', 'Cannot connect to server. Check your Ngrok URL.');
      }
    }
  };
  
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Identity Verification</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} placeholder="Juan Dela Cruz" value={fullName} onChangeText={setFullName} />

        <Text style={styles.label}>Home Address</Text>
        <TextInput style={[styles.input, {backgroundColor: '#E8F5E9', color: '#2E7D32'}]} value={address} editable={false} />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="email@gmail.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />

        <View style={styles.rowContainer}>
            <View style={{flex: 1, marginRight: 10}}>
                <Text style={styles.label}>Valid ID</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={() => handleImagePick('ID')}>
                    {idImage ? (
                        <Image source={{ uri: idImage }} style={styles.uploadedId} />
                    ) : (
                        <View style={{alignItems: 'center'}}>
                            <MaterialCommunityIcons name="card-account-details" size={24} color="#00C853" />
                            <Text style={styles.miniText}>Scan ID</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={{flex: 1}}>
                <Text style={styles.label}>Face Verify</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={() => handleImagePick('SELFIE')}>
                    {selfieImage ? (
                        <Image source={{ uri: selfieImage }} style={styles.uploadedId} />
                    ) : (
                        <View style={{alignItems: 'center'}}>
                            <MaterialCommunityIcons name="face-recognition" size={24} color="#2979FF" />
                            <Text style={[styles.miniText, {color: '#2979FF'}]}>Take Selfie</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>SIGN UP</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.push('/login')}><Text style={styles.link}>Login instead</Text></TouchableOpacity>
        </View>
      </View>

      {/* 📷 CAMERA OVERLAY */}
      <Modal visible={cameraVisible} animationType="slide">
        <View style={styles.cameraContainer}>
            <CameraView 
                style={StyleSheet.absoluteFill} 
                facing={activeCaptureMode === 'SELFIE' ? 'front' : 'back'} 
                ref={cameraRef}
            />
            <View style={styles.cameraOverlay}>
                <Text style={styles.cameraTitle}>
                    {activeCaptureMode === 'ID' ? 'Align ID within frame' : 'Take a Selfie'}
                </Text>
                
                <View style={[
                    styles.faceFrame, 
                    activeCaptureMode === 'ID' && { width: 300, height: 200, borderRadius: 10 }
                ]} />

                <View style={styles.cameraControls}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => setCameraVisible(false)}>
                        <Text style={{color: 'white', fontSize: 16}}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
                        <View style={styles.captureInner} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', padding: 30, justifyContent: 'center' },
  header: { marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#00C853' },
  subtitle: { fontSize: 16, color: '#888' },
  form: { width: '100%' },
  label: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  rowContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 20 },
  uploadBtn: { height: 110, backgroundColor: '#F0F9F4', borderRadius: 10, borderWidth: 1, borderColor: '#DDD', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadedId: { width: '100%', height: '100%', resizeMode: 'cover' },
  miniText: { fontSize: 12, fontWeight: 'bold', color: '#00C853', marginTop: 5 },
  button: { backgroundColor: '#00C853', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footer: { alignItems: 'center', marginTop: 20 },
  link: { color: '#00C853', fontWeight: 'bold' },

  cameraContainer: { flex: 1, backgroundColor: 'black' },
  cameraOverlay: { 
      flex: 1, 
      backgroundColor: 'transparent', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: 40 
  },
  cameraTitle: { color: 'white', fontSize: 18, marginTop: 40, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 10 },
  faceFrame: { width: 280, height: 380, borderWidth: 2, borderColor: 'white', borderRadius: 200, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', opacity: 0.8 },
  cameraControls: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-around', marginBottom: 20 },
  captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#333' },
  closeBtn: { padding: 10 },
});