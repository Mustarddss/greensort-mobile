import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera'; 
import { supabase } from '../lib/supabase'; 

export default function ProcessSurrender() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  
  const [step, setStep] = useState(1); 
  const [scanned, setScanned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  // STATES PARA SA CUSTOM POPUP AT PROFILE
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [scannedProfilePic, setScannedProfilePic] = useState(null);
  const [userAddress, setUserAddress] = useState('Fetching address...'); 
  
  const [userData, setUserData] = useState(null);
  const [wasteType, setWasteType] = useState('');
  const [weight, setWeight] = useState('');
  const [reward, setReward] = useState('');
  
  const [transactionType, setTransactionType] = useState('Claimed'); 

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    try {
        const parsedData = JSON.parse(data);
        
        if (parsedData.email && parsedData.name) {
            setUserData({ name: parsedData.name, email: parsedData.email });
            setReward(parsedData.targetReward || 'None specified');
            
            // 🟢 AUTO-FILL ANG WASTE CATEGORY MULA SA QR CODE
            setWasteType(parsedData.targetMaterial || 'Recyclables');

            // KUNIN ANG PROFILE PIC AT ADDRESS SA SUPABASE
            try {
                const { data: profile, error } = await supabase
                    .from('profiles') 
                    .select('*') 
                    .eq('email', parsedData.email)
                    .single();
                
                if (profile && !error) {
                    if (profile.avatar_url) {
                        setScannedProfilePic(profile.avatar_url);
                    } else {
                        setScannedProfilePic(`https://ui-avatars.com/api/?name=${encodeURIComponent(parsedData.name)}&background=0066FF&color=fff&size=150`);
                    }

                    const fetchedAddress = profile.address || 
                                           (profile.barangay && profile.city ? `${profile.barangay}, ${profile.city}` : null) || 
                                           profile.location || 
                                           'Address not provided in profile';
                    setUserAddress(fetchedAddress);
                } else {
                    setScannedProfilePic(`https://ui-avatars.com/api/?name=${encodeURIComponent(parsedData.name)}&background=0066FF&color=fff&size=150`);
                    setUserAddress('Profile not found');
                }
            } catch (e) {
                setScannedProfilePic(`https://ui-avatars.com/api/?name=${encodeURIComponent(parsedData.name)}&background=0066FF&color=fff&size=150`);
                setUserAddress('Address not available');
            }

            setProfileModalVisible(true);

        } else {
            Alert.alert("Invalid QR", "This QR code is not recognized by GreenSort.", [{ text: "Scan Again", onPress: () => setScanned(false) }]);
        }
    } catch (error) {
        Alert.alert("Error", "Invalid QR Format.", [{ text: "Scan Again", onPress: () => setScanned(false) }]);
    }
  };

  const handleCancelScan = () => {
      setProfileModalVisible(false);
      setScanned(false);
      setUserData(null);
  };

  const handleProceedToStep2 = () => {
      setProfileModalVisible(false);
      setStep(2);
  };

  const handleConfirmSurrender = async () => {
      setIsSubmitting(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Collector is not logged in.");

          const finalRewardStatus = transactionType === 'Claimed' ? reward : 'Banked';

          const { error } = await supabase.from('surrender_logs').insert([{
              collector_email: user.email,
              resident_email: userData.email,
              resident_name: userData.name,
              waste_type: wasteType,
              weight_kg: parseFloat(weight),
              reward_claimed: finalRewardStatus
          }]);

          if (error) throw error;
          setStep(4); 
      } catch (error) {
          Alert.alert("Transaction Failed", error.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const renderStep1 = () => {
    if (!permission) return <View />;
    if (!permission.granted) {
      return (
        <View style={styles.centerContent}>
          <Text style={{marginBottom: 20}}>We need your permission to show the camera</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.blueBtn}><Text style={styles.btnText}>Grant Permission</Text></TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.stepContainer}>
        <View style={styles.cameraBox}>
            <CameraView style={styles.camera} facing="back" onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} barcodeScannerSettings={{ barcodeTypes: ["qr"] }} />
            <View style={styles.overlay}><View style={styles.scanFrame} /></View>
        </View>
        <Text style={styles.scanText}>Scan User QR Code</Text>
        
        {/* 🟢 SIMULATE BUTTON: Dinagdagan ko ng targetMaterial para ma-test mo agad */}
        <TouchableOpacity style={styles.simulateBtn} onPress={() => handleBarCodeScanned({type: 'qr', data: '{"email":"mustarddsss@gmail.com", "name":"Lalisa Manoban", "targetReward":"Rice", "targetMaterial":"Plastic Bottles"}'})}>
            <Text style={{color: '#0066FF', marginTop: 20}}>Simulate Scan (For Testing)</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.userCard}>
            <Image source={{uri: scannedProfilePic}} style={styles.avatarImgSmall} />
            <View style={{flex: 1}}>
                <Text style={styles.userName}>{userData?.name}</Text>
                <Text style={styles.userId}>{userData?.email}</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                    <MaterialCommunityIcons name="map-marker" size={12} color="#555" />
                    <Text style={styles.userAddressSmall} numberOfLines={1}>{userAddress}</Text>
                </View>
            </View>
        </View>

        <Text style={styles.sectionLabel}>Log Waste Details</Text>
        
        {/* 🟢 GINAWANG READ-ONLY ANG WASTE CATEGORY DAHIL GALING SA QR */}
        <Text style={styles.inputLabel}>Expected Waste Category</Text>
        <TextInput style={[styles.input, {backgroundColor: '#f0f0f0', color: '#555'}]} editable={false} value={wasteType} />
        
        <Text style={styles.inputLabel}>Quantity (kg) Surrendered</Text>
        <TextInput style={styles.input} placeholder="0.0" keyboardType="numeric" value={weight} onChangeText={setWeight} />
        
        <Text style={styles.inputLabel}>Target Reward</Text>
        <TextInput style={[styles.input, {backgroundColor: '#f0f0f0', color: '#555'}]} editable={false} value={reward} />

        <Text style={styles.sectionLabel}>Action</Text>
        <View style={styles.actionToggleRow}>
            <TouchableOpacity 
                style={[styles.actionBox, transactionType === 'Claimed' && styles.actionBoxActive]} 
                onPress={() => setTransactionType('Claimed')}>
                <MaterialCommunityIcons name="gift-outline" size={24} color={transactionType === 'Claimed' ? 'white' : '#0066FF'} />
                <Text style={[styles.actionBoxText, transactionType === 'Claimed' && {color: 'white'}]}>Give Reward</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionBox, transactionType === 'Banked' && styles.actionBoxActive]} 
                onPress={() => setTransactionType('Banked')}>
                <MaterialCommunityIcons name="safe" size={24} color={transactionType === 'Banked' ? 'white' : '#0066FF'} />
                <Text style={[styles.actionBoxText, transactionType === 'Banked' && {color: 'white'}]}>Save to Balance</Text>
                <Text style={[styles.actionBoxSub, transactionType === 'Banked' && {color: 'rgba(255,255,255,0.8)'}]}>Not enough KG</Text>
            </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.blueBtn, {marginTop: 20}]} onPress={() => {
            if(!weight) return Alert.alert("Required", "Please type the Quantity (kg).");
            setStep(3);
        }}>
            <Text style={styles.btnText}>Review Transaction</Text>
        </TouchableOpacity>
        <View style={{height: 40}}/>
    </ScrollView>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
        <View style={{alignItems: 'center', marginBottom: 20}}><MaterialCommunityIcons name="text-box-check-outline" size={50} color="#0066FF" /><Text style={styles.confirmTitle}>Confirm Details</Text></View>
        <View style={styles.receiptCard}>
            <Text style={styles.receiptHeader}>Transaction Summary</Text>
            <View style={styles.divider} />
            <View style={styles.row}><Text style={styles.label}>Surrenderer</Text><Text style={styles.val}>{userData?.name}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Waste Type</Text><Text style={styles.val}>{wasteType}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Quantity</Text><Text style={styles.valBlue}>{weight} kg</Text></View>
            <View style={styles.divider} />
            <View style={styles.row}>
                <Text style={styles.label}>Action Taken</Text>
                {transactionType === 'Claimed' ? (
                    <Text style={styles.valGreen}>Claimed: {reward}</Text>
                ) : (
                    <Text style={{fontWeight: 'bold', color: '#F57C00'}}>Added to Balance</Text>
                )}
            </View>
        </View>
        <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}><Text style={{color: '#666', fontWeight: 'bold'}}>Edit</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.blueBtn, {flex: 1}]} onPress={handleConfirmSurrender} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Confirm & Save</Text>}
            </TouchableOpacity>
        </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={[styles.stepContainer, {justifyContent: 'center', alignItems: 'center'}]}>
        <MaterialCommunityIcons name="check-circle" size={100} color="#007C00" />
        <Text style={styles.successTitle}>Success!</Text>
        <Text style={styles.successSub}>Surrender has been logged successfully.</Text>
        <TouchableOpacity style={[styles.blueBtn, {width: '100%', marginTop: 40}]} onPress={() => router.replace('/collector-dashboard')}><Text style={styles.btnText}>Back to Dashboard</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.navRow}>
            <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="chevron-left" size={30} color="white" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Process Surrender</Text>
            <View style={{width: 30}} />
        </View>
      </View>
      
      <View style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </View>

      {/* CUSTOM PROFILE POPUP MODAL */}
      <Modal visible={isProfileModalVisible} transparent={true} animationType="fade">
          <View style={styles.modalOverlayDark}>
              <View style={styles.profileModalCard}>
                  <View style={styles.modalBanner} />
                  
                  <View style={styles.avatarContainerModal}>
                      <Image source={{ uri: scannedProfilePic }} style={styles.profilePicLarge} />
                  </View>

                  <Text style={styles.modalUserName}>{userData?.name}</Text>
                  <Text style={styles.modalUserId}>{userData?.email}</Text>
                  
                  <View style={styles.addressRow}>
                      <MaterialCommunityIcons name="map-marker" size={14} color="#666" />
                      <Text style={styles.modalUserAddress} numberOfLines={2}>{userAddress}</Text>
                  </View>

                  <View style={styles.rewardIntentBox}>
                      <MaterialCommunityIcons name="star-shooting" size={20} color="#F57C00" />
                      <Text style={styles.rewardIntentTitle}>Wants to claim:</Text>
                      <Text style={styles.rewardIntentValue}>{reward}</Text>
                      <Text style={{fontSize: 12, color: '#666', marginTop: 4}}>Expected Item: <Text style={{fontWeight:'bold', color:'#333'}}>{wasteType}</Text></Text>
                  </View>

                  <View style={styles.modalBtnRow}>
                      <TouchableOpacity style={styles.modalCancelBtn} onPress={handleCancelScan}>
                          <Text style={styles.modalCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalProceedBtn} onPress={handleProceedToStep2}>
                          <Text style={styles.modalProceedText}>Proceed</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, header: { backgroundColor: '#0066FF', paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }, navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 }, headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' }, content: { flex: 1, padding: 20 }, stepContainer: { flex: 1 }, cameraBox: { height: 350, borderRadius: 20, overflow: 'hidden', marginTop: 10, marginBottom: 20, elevation: 5 }, camera: { flex: 1 }, overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }, scanFrame: { width: 200, height: 200, borderWidth: 2, borderColor: 'white', borderStyle: 'dashed', borderRadius: 20 }, scanText: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#333' }, simulateBtn: { marginTop: 10, padding: 15, alignItems: 'center' }, 
  
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#90CAF9' }, avatarImgSmall: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#ccc' }, userName: { fontWeight: 'bold', fontSize: 16, color: '#0066FF' }, userId: { color: '#555', fontSize: 12 }, userAddressSmall: { fontSize: 11, color: '#555', marginLeft: 4, flex: 1 },
  
  sectionLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 10, marginTop: 10 }, inputLabel: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: 'bold' }, input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 1 }, 
  
  actionToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  actionBox: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#90CAF9', alignItems: 'center', justifyContent: 'center' },
  actionBoxActive: { backgroundColor: '#0066FF', borderColor: '#0066FF' },
  actionBoxText: { fontWeight: 'bold', fontSize: 14, color: '#0066FF', marginTop: 8 },
  actionBoxSub: { fontSize: 10, color: '#888', marginTop: 2 },

  confirmTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10 }, receiptCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 3, marginBottom: 30 }, receiptHeader: { fontWeight: 'bold', fontSize: 14, marginBottom: 10 }, divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 }, row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }, label: { color: '#666' }, val: { fontWeight: '600' }, valBlue: { fontWeight: 'bold', color: '#0066FF' }, valGreen: { fontWeight: 'bold', color: '#007C00' }, successTitle: { fontSize: 28, fontWeight: 'bold', marginTop: 20, color: '#333' }, successSub: { color: '#666', textAlign: 'center', marginTop: 5 }, btnRow: { flexDirection: 'row', gap: 10 }, blueBtn: { backgroundColor: '#0066FF', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 2, justifyContent: 'center' }, backBtn: { backgroundColor: '#ddd', padding: 15, borderRadius: 10, alignItems: 'center', width: 80, justifyContent: 'center' }, btnText: { color: 'white', fontWeight: 'bold' }, centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // MODAL STYLES
  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  profileModalCard: { width: '100%', backgroundColor: 'white', borderRadius: 20, overflow: 'hidden', alignItems: 'center', paddingBottom: 25, elevation: 10 },
  modalBanner: { width: '100%', height: 80, backgroundColor: '#0066FF' },
  avatarContainerModal: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'white', marginTop: -50, justifyContent: 'center', alignItems: 'center', elevation: 5, padding: 4 },
  profilePicLarge: { width: '100%', height: '100%', borderRadius: 50 },
  modalUserName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 10 },
  modalUserId: { fontSize: 14, color: '#666' },
  
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 20, paddingHorizontal: 20 },
  modalUserAddress: { fontSize: 13, color: '#666', marginLeft: 5, textAlign: 'center' },
  
  rewardIntentBox: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 12, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: '#FFE0B2', marginBottom: 25 },
  rewardIntentTitle: { fontSize: 12, color: '#F57C00', fontWeight: 'bold', marginTop: 5 },
  rewardIntentValue: { fontSize: 16, fontWeight: '900', color: '#E65100', textAlign: 'center', marginTop: 2 },
  modalBtnRow: { flexDirection: 'row', width: '85%', gap: 10 },
  modalCancelBtn: { flex: 1, backgroundColor: '#F5F5F5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { color: '#666', fontWeight: 'bold', fontSize: 15 },
  modalProceedBtn: { flex: 1, backgroundColor: '#00C853', paddingVertical: 14, borderRadius: 12, alignItems: 'center', elevation: 2 },
  modalProceedText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});