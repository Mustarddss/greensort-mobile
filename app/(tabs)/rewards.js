import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Rewards() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 🟢 UI STATES
  const [instructionModalVisible, setInstructionModalVisible] = useState(false); // Modal 1
  const [previewModalVisible, setPreviewModalVisible] = useState(false);         // Modal 2
  const [capturedImage, setCapturedImage] = useState(null);

  // ⚠️ YOUR IP
  const API_URL = 'https://jumpier-michale-identical.ngrok-free.dev'; 

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
            const userId = JSON.parse(storedUser).id;
            const response = await axios.get(`${API_URL}/user/${userId}`);
            if (response.data.success) {
                setUser(response.data.user);
            }
        }
    } catch (error) {
        console.log("Fetch Error:", error);
    } finally {
        setLoading(false);
    }
  };

  // 🔘 STEP 1: HANDLE PROCEED CLICK (Show Options)
  const handleProceedClick = () => {
    setInstructionModalVisible(false); // Close the warning modal first

    // Wait a bit to prevent UI freezing
    setTimeout(() => {
        Alert.alert(
            "Select Upload Method",
            "Choose how you want to provide your proof of surrender.",
            [
                { 
                    text: "Camera", 
                    onPress: openCamera 
                },
                { 
                    text: "Gallery", 
                    onPress: openGallery 
                },
                { 
                    text: "Cancel", 
                    style: "cancel" 
                }
            ]
        );
    }, 500);
  };

  // 📸 OPTION A: OPEN CAMERA
  const openCamera = async () => {
    try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Camera access is needed.");
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            quality: 0.5,
            allowsEditing: false, 
        });

        if (!result.canceled) {
            setCapturedImage(result.assets[0].uri);
            setPreviewModalVisible(true); // Show Preview
        }
    } catch (error) {
        Alert.alert("Error", "Could not open camera.");
    }
  };

  // 🖼️ OPTION B: OPEN GALLERY
  const openGallery = async () => {
    try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Denied", "Gallery access is needed.");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.5,
            allowsEditing: false, 
        });

        if (!result.canceled) {
            setCapturedImage(result.assets[0].uri);
            setPreviewModalVisible(true); // Show Preview
        }
    } catch (error) {
        Alert.alert("Error", "Could not open gallery.");
    }
  };

  // ✅ STEP 3: CONFIRM & SUBMIT
  const handleConfirmSubmission = () => {
    setPreviewModalVisible(false); // Close preview
    
    // 👇 BACKEND LOGIC HERE (Simulated)
    console.log("Submitting Image:", capturedImage);

    setTimeout(() => {
        Alert.alert(
            "Submission Successful", 
            "Your Proof of Surrender Photo was already sent to Waste Management Officer. Please wait for 3-5 working days for approval."
        );
        setCapturedImage(null); // Clear image
    }, 300);
  };

  // 🔄 STEP 4: RETAKE (Ask user again)
  const handleRetake = () => {
    setPreviewModalVisible(false);
    setCapturedImage(null);
    handleProceedClick(); // Show options again
  };

  if (loading) return <ActivityIndicator size="large" color="#00C853" style={{flex:1}} />;

  const currentPoints = user?.points || 0;
  const goalPoints = 1000;
  const progressPercent = Math.min((currentPoints / goalPoints) * 100, 100);

  return (
    <View style={{flex: 1, backgroundColor: '#F5F5F5'}}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* 🟠 HEADER */}
        <View style={styles.header}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rewards & Badges</Text>
                <View style={{width: 24}} />
            </View>
            <Text style={styles.headerSubtitle}>Track your eco achievements</Text>
        </View>

        <View style={styles.body}>
            {/* 🏆 POINTS CARD */}
            <View style={styles.pointsCard}>
                <View style={styles.pointsRow}>
                    <View>
                        <Text style={styles.pointsLabel}>Your Total Points</Text>
                        <Text style={styles.pointsValue}>{currentPoints}</Text>
                        <Text style={styles.pointsSub}>Progress to Waste Warrior</Text>
                    </View>
                    <FontAwesome5 name="trophy" size={40} color="rgba(255,255,255,0.8)" />
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, {width: `${progressPercent}%`}]} />
                </View>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 5}}>
                    <Text style={styles.progressText}>Current: {currentPoints}</Text>
                    <Text style={styles.progressText}>Goal: {goalPoints}</Text>
                </View>
            </View>

            {/* 📸 UPLOAD CARD */}
            <View style={styles.uploadCard}>
                <View style={styles.uploadHeader}>
                    <MaterialCommunityIcons name="camera-account" size={20} color="#555" />
                    <Text style={styles.uploadTitle}> Upload Proof of Surrender</Text>
                </View>
                <View style={styles.dashedBox}>
                    <MaterialCommunityIcons name="cloud-upload" size={40} color="#00C853" />
                    <Text style={styles.uploadInstruction}>Upload a photo of your waste with your UserID written on it.</Text>
                    <Text style={styles.uploadSubInstruction}>Make sure your GreenSort UserID is clearly visible.</Text>
                    
                    <TouchableOpacity style={styles.takePhotoBtn} onPress={() => setInstructionModalVisible(true)}>
                        <MaterialCommunityIcons name="camera" size={18} color="white" style={{marginRight: 8}} />
                        <Text style={styles.takePhotoText}>Take Photo / Choose File</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 🎖 BADGES */}
            <Text style={styles.sectionTitle}>Your Badges</Text>
            <View style={styles.badgesGrid}>
                <BadgeItem name="Eco Beginner" points="100 pts" icon="leaf" active={user?.badges?.includes("Eco Beginner")} />
                <BadgeItem name="First Scan" points="50 pts" icon="camera" active={user?.badges?.includes("First Scan")} />
                <BadgeItem name="Recycling Hero" points="500 pts" icon="medal" active={user?.badges?.includes("Recycling Hero")} />
            </View>
            
            {/* 📜 ACHIEVEMENTS */}
            <Text style={[styles.sectionTitle, {marginTop: 20}]}>Achievements</Text>
            <AchievementItem title="First Scan" desc="Scanned your first waste item" points="+10 points" completed={user?.badges?.includes("First Scan")} />
            <AchievementItem title="Week Streak" desc="Recycled for 7 consecutive days" points="+50 points" completed={false} />
        </View>
        <View style={{height: 50}} />
        </ScrollView>

        {/* 🛑 MODAL 1: INSTRUCTIONS */}
        <Modal animationType="fade" transparent={true} visible={instructionModalVisible} onRequestClose={() => setInstructionModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <FontAwesome5 name="bolt" size={18} color="#00C853" style={{marginRight: 8}} />
                        <Text style={styles.modalTitle}>Before You Surrender</Text>
                        <MaterialCommunityIcons name="recycle" size={20} color="green" style={{marginLeft: 8}}/>
                    </View>
                    <Text style={styles.modalText}>
                        Don't forget that <Text style={{fontWeight: 'bold'}}>unsegregated waste</Text> will not be accepted by the <Text style={{fontWeight: 'bold'}}>GreenSort Admin</Text>.
                    </Text>
                    <View style={styles.noteBox}>
                        <MaterialCommunityIcons name="notebook-outline" size={20} color="#E65100" style={{marginRight: 5}} />
                        <Text style={styles.noteText}>
                            <Text style={{fontWeight: 'bold'}}>Note:</Text> Any type of garbage bag is accepted. Just make sure your <Text style={{fontWeight: 'bold', color: '#E65100'}}>GreenSort UserID</Text> is written on it.
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.proceedBtn} onPress={handleProceedClick}>
                        <Text style={styles.proceedText}>Proceed</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>

        {/* ✅ MODAL 2: PREVIEW & CONFIRMATION */}
        <Modal animationType="slide" transparent={true} visible={previewModalVisible} onRequestClose={() => setPreviewModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.previewContent}>
                    <Text style={styles.previewTitle}>Confirm Submission</Text>
                    <Text style={styles.previewSub}>Please verify that your UserID is clearly visible.</Text>
                    
                    {capturedImage && (
                        <Image source={{ uri: capturedImage }} style={styles.previewImage} />
                    )}

                    <View style={styles.previewActions}>
                        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                            <Text style={styles.retakeText}>Retake</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmSubmission}>
                            <Text style={styles.confirmText}>Submit Proof</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

    </View>
  );
}

// 🔹 HELPER COMPONENTS
const BadgeItem = ({ name, points, icon, active }) => (
    <View style={[styles.badgeCard, !active && {opacity: 0.5, backgroundColor: '#EEE'}]}>
        <View style={[styles.badgeIconBg, active ? {backgroundColor: '#E8F5E9'} : {backgroundColor: '#DDD'}]}>
            <MaterialCommunityIcons name={icon} size={28} color={active ? "#00C853" : "#888"} />
        </View>
        <Text style={styles.badgeName}>{name}</Text>
        <Text style={styles.badgePoints}>{points}</Text>
    </View>
);

const AchievementItem = ({ title, desc, points, completed }) => (
    <View style={styles.achievementCard}>
        <View style={{flex: 1}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.achTitle}>{title}</Text>
                {completed && <View style={styles.completedTag}><Text style={styles.tagText}>Completed</Text></View>}
            </View>
            <Text style={styles.achDesc}>{desc}</Text>
            <Text style={styles.achPoints}>{points}</Text>
        </View>
        <MaterialCommunityIcons name="bookmark-check" size={24} color={completed ? "#00C853" : "#DDD"} />
    </View>
);

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  header: { backgroundColor: '#FF6D00', paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 5 },
  body: { padding: 20 },
  pointsCard: { backgroundColor: '#00C853', borderRadius: 20, padding: 25, marginTop: -40, elevation: 5, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.2, shadowRadius: 4 },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pointsLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 14 },
  pointsValue: { color: 'white', fontSize: 42, fontWeight: 'bold' },
  pointsSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  progressBarBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4, marginTop: 15 },
  progressBarFill: { height: '100%', backgroundColor: 'white', borderRadius: 4 },
  progressText: { color: 'white', fontSize: 12, fontWeight: '600' },
  uploadCard: { backgroundColor: 'white', borderRadius: 15, padding: 15, marginTop: 20, elevation: 2 },
  uploadHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  uploadTitle: { fontWeight: 'bold', color: '#444' },
  dashedBox: { borderWidth: 1.5, borderColor: '#81C784', borderStyle: 'dashed', borderRadius: 12, backgroundColor: '#F1F8E9', padding: 20, alignItems: 'center' },
  uploadInstruction: { textAlign: 'center', fontSize: 12, color: '#333', marginTop: 10, fontWeight: '600' },
  uploadSubInstruction: { textAlign: 'center', fontSize: 10, color: '#666', marginTop: 2, marginBottom: 15 },
  takePhotoBtn: { backgroundColor: '#00C853', flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center' },
  takePhotoText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 25, marginBottom: 10 },
  badgesGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  badgeCard: { width: '31%', backgroundColor: 'white', borderRadius: 10, padding: 10, alignItems: 'center', elevation: 2, marginBottom: 10 },
  badgeIconBg: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  badgeName: { fontSize: 11, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  badgePoints: { fontSize: 10, color: '#666' },
  achievementCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1, borderLeftWidth: 4, borderLeftColor: '#00C853' },
  achTitle: { fontWeight: 'bold', color: '#333', fontSize: 14 },
  achDesc: { fontSize: 11, color: '#666', marginVertical: 2 },
  achPoints: { fontSize: 12, color: '#00C853', fontWeight: 'bold' },
  completedTag: { backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  tagText: { color: '#00C853', fontSize: 9, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25, elevation: 10 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  modalTitle: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  modalText: { fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 20 },
  noteBox: { flexDirection: 'row', backgroundColor: '#FFF3E0', padding: 10, borderRadius: 8, marginTop: 15, marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#FF9800' },
  noteText: { flex: 1, fontSize: 12, color: '#E65100', lineHeight: 18 },
  proceedBtn: { backgroundColor: '#00C853', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  proceedText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  previewContent: { width: '90%', backgroundColor: 'white', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 10 },
  previewTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  previewSub: { fontSize: 12, color: '#666', marginBottom: 15 },
  previewImage: { width: '100%', height: 350, borderRadius: 15, resizeMode: 'contain', marginBottom: 20, backgroundColor: '#f0f0f0' },
  previewActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 10 },
  retakeBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  retakeText: { color: '#666', fontWeight: 'bold' },
  confirmBtn: { flex: 1, backgroundColor: '#00C853', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmText: { color: 'white', fontWeight: 'bold' },
});