import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera'; 
import * as ImagePicker from 'expo-image-picker'; 
import * as ImageManipulator from 'expo-image-manipulator'; 
import { supabase } from '../lib/supabase'; 

export default function ProcessSurrender() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  
  const [step, setStep] = useState(1); 
  const [scanned, setScanned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  const [isProfileModalVisible, setProfileModalVisible] = useState(false);
  const [scannedProfilePic, setScannedProfilePic] = useState(null);
  const [userAddress, setUserAddress] = useState('Fetching address...'); 
  const [userData, setUserData] = useState(null);
  
  const [wasteType, setWasteType] = useState('');
  const [requiredKg, setRequiredKg] = useState(0); 
  const [weight, setWeight] = useState('');
  const [reward, setReward] = useState('');
  const [rewardImage, setRewardImage] = useState(null); 
  
  const [transactionType, setTransactionType] = useState('Claimed'); 
  const [isBankedRedemption, setIsBankedRedemption] = useState(false); 
  
  const [proofImage, setProofImage] = useState(null);
  const [saveExcess, setSaveExcess] = useState(false);

  const [maxBankedKg, setMaxBankedKg] = useState(0);
  const [availableRewards, setAvailableRewards] = useState([]);
  const [selectedReward, setSelectedReward] = useState(null);
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleBack = () => {
      if (step === 4) {
          router.replace('/collector-dashboard');
      } else if (step === 3) {
          setStep(2);
      } else if (step === 2) {
          setStep(1);
          setScanned(false);
          setProofImage(null);
          setWeight('');
          setSaveExcess(false);
      } else {
          router.back();
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

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true); 
    try {
        const parsedData = JSON.parse(data);
        
        if (parsedData.email && parsedData.name) {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                Alert.alert("Error", "You must be logged in as a Center to scan.", [{ text: "Okay", onPress: () => router.replace('/login') }]);
                return;
            }

            if (parsedData.isBankedRedemption === 'true' || parsedData.isBankedRedemption === true) {
                if (parsedData.collectorEmail && parsedData.collectorEmail !== user.email) {
                    Alert.alert("Invalid QR Code 🛑", "Bawal ito i-scan! Ang Banked Kg na ito ay nakapangalan sa ibang drop-off center.", [{ text: "Scan Again", onPress: () => setScanned(false) }]);
                    return; 
                }

                setIsBankedRedemption(true);
                setTransactionType('Claimed');
                setMaxBankedKg(parseFloat(parsedData.bankedKg) || 0);
                setRequiredKg(0);
                setWeight(''); 
                setSelectedReward(null);

                const { data: rewards } = await supabase.from('rewards_inventory')
                    .select('*')
                    .eq('user_email', user.email)
                    .eq('is_available', true)
                    .ilike('condition', `%${parsedData.targetMaterial}%`);
                setAvailableRewards(rewards || []);
            } else {
                setIsBankedRedemption(false);
                setTransactionType('Claimed');
                
                setReward(parsedData.targetReward || 'None specified');
                
                const rawQty = parsedData.wasteQty || '0';
                const extractedNum = String(rawQty).replace(/[^0-9.]/g, '');
                setRequiredKg(parseFloat(extractedNum) || 0); 

                setRewardImage(parsedData.rewardImage || null);
                setWeight('');
            }

            setUserData({ name: parsedData.name, email: parsedData.email });
            setWasteType(parsedData.targetMaterial || 'Recyclables');

            try {
                const cleanEmail = parsedData.email.trim().toLowerCase();
                const { data: profile, error } = await supabase.from('profiles').select('*').eq('email', cleanEmail).single();
                
                if (profile && !error) {
                    setScannedProfilePic(profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(parsedData.name)}&background=0066FF&color=fff&size=150`);
                    const exactAddress = profile.address || profile.full_address || profile.location || (profile.barangay && profile.city ? `${profile.barangay}, ${profile.city}` : null);
                    setUserAddress(exactAddress || 'Address not provided in profile');
                } else {
                    setScannedProfilePic(`https://ui-avatars.com/api/?name=${encodeURIComponent(parsedData.name)}&background=0066FF&color=fff&size=150`);
                    setUserAddress('Profile not found in database');
                }
            } catch (e) {
                setScannedProfilePic(`https://ui-avatars.com/api/?name=${encodeURIComponent(parsedData.name)}&background=0066FF&color=fff&size=150`);
                setUserAddress('Address data unavailable');
            }

            setProfileModalVisible(true);

        } else {
            Alert.alert("Invalid QR", "This QR code is not recognized by GreenSort.", [{ text: "Scan Again", onPress: () => setScanned(false) }]);
        }
    } catch (error) {
        Alert.alert("Error", "Invalid QR Format.", [{ text: "Scan Again", onPress: () => setScanned(false) }]);
    }
  };

  const takeProofPhoto = async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
          Alert.alert("Permission Required", "Please allow camera access to capture waste proof.");
          return;
      }
      
      let result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
      
      if (!result.canceled) {
          const uri = result.assets[0].uri;
          try {
              const manipResult = await ImageManipulator.manipulateAsync(
                  uri,
                  [{ resize: { width: 1080 } }], 
                  { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
              );
              setProofImage(manipResult.uri);
          } catch(e) {
              setProofImage(uri);
          }
      }
  };

  // 🟢 📨 EMAIL FUNCTION GAMIT ANG EMAILJS
  const sendEmailReceipt = async (finalRewardStatus, centerName) => {
      try {
          const emailData = {
              service_id: 'service_nzpn1cn', 
              template_id: 'template_x9sn1oq', 
              user_id: 'lkfpdujTp2Sx9Eq3u', 
              template_params: {
                  to_email: userData.email,
                  to_name: userData.name,
                  center_name: centerName,
                  waste_type: wasteType,
                  weight: weight,
                  reward: finalRewardStatus
              }
          };

          const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(emailData)
          });

          if (response.ok) {
              console.log("Receipt emailed successfully!");
          } else {
              console.log("EmailJS Error Response", await response.text());
          }
      } catch (error) {
          console.log("Failed to send email", error);
      }
  };

  const handleConfirmSurrender = async () => {
      setIsSubmitting(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Collector is not logged in.");

          const centerName = user.user_metadata?.full_name || 'GreenSort Drop-off Center';

          const inputKg = parseFloat(weight) || 0;
          const isShort = inputKg < requiredKg;
          const isExcess = inputKg > requiredKg;
          const excessKg = isExcess ? inputKg - requiredKg : 0;

          const kgToBank = transactionType === 'Banked' || isShort ? inputKg : (saveExcess ? excessKg : 0);

          if (kgToBank > 0) {
              const { data: existingBank } = await supabase.from('banked_materials')
                  .select('*').eq('resident_email', userData.email).eq('center_email', user.email).eq('material_type', wasteType).single();
              
              if (existingBank) {
                  await supabase.from('banked_materials').update({ kg_amount: existingBank.kg_amount + kgToBank }).eq('id', existingBank.id);
              } else {
                  await supabase.from('banked_materials').insert([{ 
                      resident_email: userData.email, resident_name: userData.name, center_email: user.email, material_type: wasteType, kg_amount: kgToBank 
                  }]);
              }
          }

          const finalRewardStatus = isBankedRedemption ? `Banked Redemption - ${selectedReward?.name}` : (transactionType === 'Claimed' && !isShort ? reward : 'Banked');

          // 🟢 IBINALIK KO NA YUNG MGA COLUMNS DITO (Required Kg, Excess Kg, Proof Image)
          const { error } = await supabase.from('surrender_logs').insert([{
              collector_email: user.email,
              resident_email: userData.email,
              resident_name: userData.name,
              waste_type: wasteType,
              weight_kg: inputKg,
              required_kg: requiredKg,
              excess_banked_kg: saveExcess ? excessKg : 0,
              reward_claimed: finalRewardStatus,
              proof_image: proofImage
          }]);

          if (error) throw error;
          
          // 🟢 IPAPADALA ANG EMAIL RECEIPT
          await sendEmailReceipt(finalRewardStatus, centerName);

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
          <Text style={{marginBottom: 20}}>We need your permission to use the camera</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.blueBtn}><Text style={styles.btnText}>Grant Permission</Text></TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.stepContainer}>
        <View style={styles.guideBox}>
            <Ionicons name="information-circle" size={18} color="#0066FF" />
            <Text style={styles.guideText}>Scan the QR Code presented by the resident to securely fetch their surrender intent and personal details.</Text>
        </View>

        <View style={styles.cameraBox}>
            <CameraView 
                style={styles.camera} 
                facing="back" 
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} 
                barcodeScannerSettings={{ barcodeTypes: ["qr", "pdf417", "aztec", "datamatrix"] }} 
            />
            <View style={styles.overlay}><View style={styles.scanFrame} /></View>
        </View>
        <Text style={styles.scanText}>Point camera at a GreenSort QR Code</Text>
      </View>
    );
  };

  const renderStep2 = () => {
    const inputKg = parseFloat(weight) || 0;
    const isShort = inputKg > 0 && inputKg < requiredKg;
    const isExcess = inputKg > requiredKg;
    const excessKg = isExcess ? (inputKg - requiredKg).toFixed(2) : 0;

    return (
        <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.guideBox}>
                <Ionicons name="information-circle" size={18} color="#0066FF" />
                <Text style={styles.guideText}>Weigh the actual waste and enter the exact quantity. If it exceeds or falls short, the system will adapt automatically.</Text>
            </View>

            <View style={styles.userCard}>
                <Image source={{uri: scannedProfilePic}} style={styles.avatarImgSmall} />
                <View style={{flex: 1}}>
                    <Text style={styles.userName}>{userData?.name}</Text>
                    <Text style={styles.userId}>{userData?.email}</Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                        <MaterialCommunityIcons name="map-marker" size={12} color="#555" />
                        <Text style={styles.userAddressSmall} numberOfLines={2}>{userAddress}</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.sectionLabel}>Log Waste Details</Text>

            <View style={styles.rowInputs}>
                <View style={{flex: 1}}>
                    <Text style={styles.inputLabel}>Expected Waste</Text>
                    <TextInput style={[styles.input, {backgroundColor: '#f0f0f0', color: '#555'}]} editable={false} value={wasteType} />
                </View>
                {!isBankedRedemption && (
                    <View style={{flex: 1}}>
                        <Text style={styles.inputLabel}>Required Target</Text>
                        <TextInput style={[styles.input, {backgroundColor: '#E3F2FD', color: '#0066FF', fontWeight:'bold'}]} editable={false} value={`${requiredKg} kg`} />
                    </View>
                )}
            </View>
            
            <Text style={styles.inputLabel}>Actual Weighed Quantity (kg)</Text>
            <TextInput style={[styles.input, {borderColor: '#0066FF', borderWidth: 1}]} placeholder="Enter exact weight e.g. 12" keyboardType="numeric" value={weight} onChangeText={setWeight} />
            
            {!isBankedRedemption && isShort && (
                <Text style={{color: '#D32F2F', fontSize: 12, marginBottom: 15, fontStyle: 'italic'}}>
                    ⚠️ Short of {requiredKg}kg target. Action restricted to "Save to Balance".
                </Text>
            )}

            {!isBankedRedemption && isExcess && (
                <TouchableOpacity style={styles.excessBox} onPress={() => setSaveExcess(!saveExcess)}>
                    <MaterialCommunityIcons name={saveExcess ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color="#007C00" />
                    <Text style={styles.excessText}>Save excess <Text style={{fontWeight:'bold'}}>{excessKg} kg</Text> to Resident's Banked Balance?</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.inputLabel}>Target Reward</Text>
            {isBankedRedemption ? (
                <TouchableOpacity style={styles.dropdownBtn} onPress={() => setRewardModalVisible(true)}>
                    <Text style={[styles.dropdownBtnText, selectedReward && {color: '#333'}]}>
                        {selectedReward ? selectedReward.name : 'Select a reward...'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
            ) : (
                <TextInput style={[styles.input, {backgroundColor: '#f0f0f0', color: '#555'}]} editable={false} value={reward} />
            )}

            {!isBankedRedemption && (
                <>
                    <Text style={styles.sectionLabel}>Action</Text>
                    <View style={styles.actionToggleRow}>
                        <TouchableOpacity 
                            style={[styles.actionBox, transactionType === 'Claimed' && !isShort && styles.actionBoxActive, isShort && {opacity: 0.5}]} 
                            onPress={() => { if(!isShort) setTransactionType('Claimed'); }}
                            disabled={isShort} 
                        >
                            <MaterialCommunityIcons name="gift-outline" size={24} color={transactionType === 'Claimed' && !isShort ? 'white' : '#0066FF'} />
                            <Text style={[styles.actionBoxText, transactionType === 'Claimed' && !isShort && {color: 'white'}]}>Give Reward</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.actionBox, (transactionType === 'Banked' || isShort) && styles.actionBoxActive]} 
                            onPress={() => setTransactionType('Banked')}
                        >
                            <MaterialCommunityIcons name="safe" size={24} color={(transactionType === 'Banked' || isShort) ? 'white' : '#0066FF'} />
                            <Text style={[styles.actionBoxText, (transactionType === 'Banked' || isShort) && {color: 'white'}]}>Save to Balance</Text>
                            <Text style={[styles.actionBoxSub, (transactionType === 'Banked' || isShort) && {color: 'rgba(255,255,255,0.8)'}]}>For next time</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            <Text style={styles.sectionLabel}>Proof of Surrender</Text>
            <TouchableOpacity style={styles.proofUploadBox} onPress={takeProofPhoto}>
                {proofImage ? (
                    <Image source={{uri: proofImage}} style={{width: '100%', height: '100%', borderRadius: 10}} />
                ) : (
                    <>
                        <Ionicons name="camera" size={30} color="#0066FF" />
                        <Text style={{color: '#0066FF', fontWeight: 'bold', marginTop: 5}}>Capture Waste Photo</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.blueBtn, {marginTop: 20}]} onPress={() => {
                if(!weight || isNaN(inputKg) || inputKg <= 0) return Alert.alert("Required", "Please enter valid actual weight.");
                if(!proofImage) return Alert.alert("Proof Required", "Please capture a photo of the surrendered waste.");
                if(!isBankedRedemption && isExcess && !saveExcess) return Alert.alert("Action Required", "Resident's waste exceeded the required amount. Please check the box to bank the excess weight.");
                
                if (isBankedRedemption) {
                    if (!selectedReward) return Alert.alert("Required", "Please select a target reward from the dropdown.");
                    if (inputKg > maxBankedKg) {
                        setErrorMessage(`${userData?.name} doesn't have enough points. Available credit is only ${maxBankedKg} kg.`);
                        setErrorModalVisible(true);
                        return;
                    }
                    const match = selectedReward.condition.match(/(\d+)/);
                    const baseRate = match ? parseFloat(match[1]) : 1;
                    if (inputKg < baseRate) {
                        setErrorMessage(`You need at least ${baseRate} kg to redeem ${selectedReward.name}.`);
                        setErrorModalVisible(true);
                        return;
                    }
                }
                
                setStep(3);
            }}>
                <Text style={styles.btnText}>Review Transaction</Text>
            </TouchableOpacity>
            <View style={{height: 40}}/>
        </ScrollView>
    );
  };

  const renderStep3 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.guideBox}>
            <Ionicons name="information-circle" size={18} color="#0066FF" />
            <Text style={styles.guideText}>Please verify all details. Once confirmed, an electronic receipt will be emailed to the resident and saved to their history.</Text>
        </View>

        <View style={{alignItems: 'center', marginBottom: 15}}>
            <MaterialCommunityIcons name="text-box-check-outline" size={45} color="#0066FF" />
            <Text style={styles.confirmTitle}>Confirm Details</Text>
        </View>

        <View style={styles.receiptCard}>
            <Text style={styles.receiptHeader}>Transaction Summary</Text>
            <View style={styles.divider} />
            <View style={styles.row}><Text style={styles.label}>Surrenderer</Text><Text style={styles.val}>{userData?.name}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Waste Type</Text><Text style={styles.val}>{wasteType}</Text></View>
            
            <View style={styles.row}>
                <Text style={styles.label}>Required Target</Text>
                <Text style={styles.valBlue}>{isBankedRedemption ? 'N/A' : `${requiredKg} kg`}</Text>
            </View>
            
            <View style={styles.row}>
                <Text style={styles.label}>Quantity Provided</Text>
                <Text style={[styles.valBlue, {fontSize: 16}]}>{weight} kg</Text>
            </View>
            
            {saveExcess && (
                <View style={styles.row}>
                    <Text style={styles.label}>Excess Saved to Bank</Text>
                    <Text style={{fontWeight: 'bold', color: '#007C00'}}>+ {(parseFloat(weight) - requiredKg).toFixed(2)} kg</Text>
                </View>
            )}

            <View style={styles.divider} />
            <View style={styles.row}>
                <Text style={styles.label}>Action Taken</Text>
                {isBankedRedemption ? (
                    <Text style={styles.valGreen}>Claimed: {selectedReward?.name}</Text>
                ) : transactionType === 'Claimed' && parseFloat(weight) >= requiredKg ? (
                    <Text style={styles.valGreen}>Claimed: {reward}</Text>
                ) : (
                    <Text style={{fontWeight: 'bold', color: '#F57C00'}}>Added to Balance</Text>
                )}
            </View>

            <Text style={[styles.label, {marginTop: 15, marginBottom: 10}]}>Attached Evidence & Reward:</Text>
            <View style={{flexDirection: 'row', gap: 10}}>
                <View style={{flex: 1, height: 100, backgroundColor: '#f5f5f5', borderRadius: 8, overflow: 'hidden'}}>
                    {proofImage && <Image source={{uri: proofImage}} style={{width: '100%', height: '100%'}} />}
                    <Text style={{position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 9, paddingHorizontal: 5, borderRadius: 4}}>Waste Proof</Text>
                </View>
                {!isBankedRedemption && transactionType === 'Claimed' && parseFloat(weight) >= requiredKg && (
                    <View style={{flex: 1, height: 100, backgroundColor: '#f5f5f5', borderRadius: 8, overflow: 'hidden'}}>
                        {rewardImage ? (
                            <Image source={{uri: rewardImage}} style={{width: '100%', height: '100%'}} resizeMode="cover" />
                        ) : (
                            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><MaterialCommunityIcons name="gift" size={30} color="#ccc" /></View>
                        )}
                        <Text style={{position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 9, paddingHorizontal: 5, borderRadius: 4}}>Reward Issued</Text>
                    </View>
                )}
            </View>
        </View>

        <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}><Text style={{color: '#666', fontWeight: 'bold'}}>Edit</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.blueBtn, {flex: 1}]} onPress={handleConfirmSurrender} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Confirm & Complete</Text>}
            </TouchableOpacity>
        </View>
        <View style={{height: 40}}/>
    </ScrollView>
  );

  const renderStep4 = () => (
    <View style={[styles.stepContainer, {justifyContent: 'center', alignItems: 'center'}]}>
        <MaterialCommunityIcons name="check-circle" size={100} color="#007C00" />
        <Text style={styles.successTitle}>Success!</Text>
        <Text style={styles.successSub}>Surrender has been logged securely.</Text>
        <Text style={{color: '#888', fontSize: 12, marginTop: 15, textAlign: 'center', paddingHorizontal: 20}}>
            A digital receipt and summary report will be sent to the resident's email ({userData?.email}) shortly.
        </Text>
        <TouchableOpacity style={[styles.blueBtn, {width: '100%', marginTop: 40}]} onPress={() => router.replace('/collector-dashboard')}><Text style={styles.btnText}>Back to Dashboard</Text></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.navRow}>
            <TouchableOpacity onPress={handleBack}><MaterialCommunityIcons name="chevron-left" size={30} color="white" /></TouchableOpacity>
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

      <Modal visible={rewardModalVisible} transparent={true} animationType="fade">
          <View style={styles.modalOverlayDark}>
              <View style={styles.dropdownModalCard}>
                  <View style={styles.dropdownHeader}>
                      <Text style={styles.dropdownTitle}>Available Rewards</Text>
                      <TouchableOpacity onPress={() => setRewardModalVisible(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
                  </View>
                  
                  <ScrollView style={{maxHeight: 300}}>
                      {availableRewards.length === 0 ? (
                          <Text style={{padding: 20, textAlign: 'center', color: '#999'}}>No available rewards found for this item at your center.</Text>
                      ) : (
                          availableRewards.map((item) => (
                              <TouchableOpacity 
                                  key={item.id} 
                                  style={styles.dropdownItem} 
                                  onPress={() => {
                                      setSelectedReward(item);
                                      setRewardModalVisible(false);
                                  }}
                              >
                                  <View style={{flex: 1}}>
                                      <Text style={styles.dropdownItemName}>{item.name}</Text>
                                      <Text style={styles.dropdownItemCondition}>Requires: {item.condition}</Text>
                                  </View>
                                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                              </TouchableOpacity>
                          ))
                      )}
                  </ScrollView>
              </View>
          </View>
      </Modal>

      <Modal visible={errorModalVisible} transparent={true} animationType="fade">
          <View style={styles.modalOverlayDark}>
              <View style={styles.errorModalCard}>
                  <View style={styles.errorIconBg}>
                      <Ionicons name="warning" size={40} color="#D32F2F" />
                  </View>
                  <Text style={styles.errorModalTitle}>Insufficient Points</Text>
                  <Text style={styles.errorModalMessage}>{errorMessage}</Text>
                  <TouchableOpacity style={styles.errorBtn} onPress={() => setErrorModalVisible(false)}>
                      <Text style={styles.errorBtnText}>Okay, I understand</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

      <Modal visible={isProfileModalVisible} transparent={true} animationType="fade">
          <View style={styles.modalOverlayDark}>
              <View style={styles.profileModalCard}>
                  <View style={styles.modalBanner} />
                  <View style={styles.avatarContainerModal}><Image source={{ uri: scannedProfilePic }} style={styles.profilePicLarge} /></View>
                  <Text style={styles.modalUserName}>{userData?.name}</Text>
                  <Text style={styles.modalUserId}>{userData?.email}</Text>
                  <View style={styles.addressRow}><MaterialCommunityIcons name="map-marker" size={14} color="#666" /><Text style={styles.modalUserAddress} numberOfLines={2}>{userAddress}</Text></View>
                  
                  <View style={styles.rewardIntentBox}>
                      <MaterialCommunityIcons name={isBankedRedemption ? "safe" : "star-shooting"} size={20} color="#F57C00" />
                      <Text style={styles.rewardIntentTitle}>{isBankedRedemption ? "Redeeming Balance:" : "Wants to claim:"}</Text>
                      <Text style={styles.rewardIntentValue}>{reward}</Text>
                      <Text style={{fontSize: 12, color: '#666', marginTop: 4}}>Item: <Text style={{fontWeight:'bold', color:'#333'}}>{wasteType}</Text></Text>
                  </View>

                  <View style={styles.modalBtnRow}>
                      <TouchableOpacity style={styles.modalCancelBtn} onPress={handleCancelScan}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.modalProceedBtn} onPress={handleProceedToStep2}><Text style={styles.modalProceedText}>Proceed</Text></TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, 
  header: { backgroundColor: '#0066FF', paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }, 
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 }, 
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' }, 
  content: { flex: 1, padding: 20 }, 
  stepContainer: { flex: 1 }, 
  
  guideBox: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#90CAF9', marginBottom: 15, alignItems: 'center' },
  guideText: { fontSize: 11, color: '#0066FF', marginLeft: 8, flex: 1, lineHeight: 16 },

  cameraBox: { height: 320, borderRadius: 20, overflow: 'hidden', marginTop: 10, marginBottom: 20, elevation: 5 }, 
  camera: { flex: 1 }, 
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }, 
  scanFrame: { width: 200, height: 200, borderWidth: 2, borderColor: 'white', borderStyle: 'dashed', borderRadius: 20 }, 
  scanText: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#333' }, 
  
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#eee', elevation: 1 }, 
  avatarImgSmall: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#ccc' }, 
  userName: { fontWeight: 'bold', fontSize: 16, color: '#0066FF' }, 
  userId: { color: '#555', fontSize: 12 }, 
  userAddressSmall: { fontSize: 11, color: '#555', marginLeft: 4, flex: 1 },
  
  sectionLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 10, marginTop: 10 }, 
  inputLabel: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: 'bold' }, 
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 1 }, 
  rowInputs: { flexDirection: 'row', gap: 10 },

  excessBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#007C00', marginBottom: 15 },
  excessText: { fontSize: 12, color: '#007C00', marginLeft: 8, flex: 1 },

  proofUploadBox: { height: 120, backgroundColor: '#E3F2FD', borderRadius: 12, borderWidth: 2, borderColor: '#90CAF9', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  
  actionToggleRow: { flexDirection: 'row', gap: 10, marginBottom: 15 }, 
  actionBox: { flex: 1, backgroundColor: 'white', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#90CAF9', alignItems: 'center', justifyContent: 'center' }, 
  actionBoxActive: { backgroundColor: '#0066FF', borderColor: '#0066FF' }, 
  actionBoxText: { fontWeight: 'bold', fontSize: 14, color: '#0066FF', marginTop: 8 }, 
  actionBoxSub: { fontSize: 10, color: '#888', marginTop: 2 }, 
  
  confirmTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10 }, 
  receiptCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 3, marginBottom: 30 }, 
  receiptHeader: { fontWeight: 'bold', fontSize: 14, marginBottom: 10 }, 
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 }, 
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }, 
  label: { color: '#666', fontSize: 12 }, 
  val: { fontWeight: '600', fontSize: 13 }, 
  valBlue: { fontWeight: 'bold', color: '#0066FF', fontSize: 13 }, 
  valGreen: { fontWeight: 'bold', color: '#007C00', fontSize: 13 }, 
  
  successTitle: { fontSize: 28, fontWeight: 'bold', marginTop: 20, color: '#333' }, 
  successSub: { color: '#666', textAlign: 'center', marginTop: 5 }, 
  
  btnRow: { flexDirection: 'row', gap: 10 }, 
  blueBtn: { backgroundColor: '#0066FF', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 2, justifyContent: 'center' }, 
  backBtn: { backgroundColor: '#ddd', padding: 15, borderRadius: 10, alignItems: 'center', width: 80, justifyContent: 'center' }, 
  btnText: { color: 'white', fontWeight: 'bold' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  dropdownBtn: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownBtnText: { color: '#999', fontSize: 14 },
  dropdownModalCard: { width: '90%', backgroundColor: 'white', borderRadius: 15, overflow: 'hidden' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownItemName: { fontSize: 16, fontWeight: 'bold', color: '#0066FF' },
  dropdownItemCondition: { fontSize: 12, color: '#666', marginTop: 2 },

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
  modalProceedText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  errorModalCard: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 10 },
  errorIconBg: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  errorModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#D32F2F', marginBottom: 10 },
  errorModalMessage: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 25 },
  errorBtn: { backgroundColor: '#D32F2F', width: '100%', padding: 15, borderRadius: 12, alignItems: 'center' },
  errorBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});