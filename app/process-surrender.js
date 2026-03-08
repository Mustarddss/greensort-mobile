import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera'; 
import { supabase } from '../lib/supabase'; 

export default function ProcessSurrender() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  
  const [step, setStep] = useState(1); 
  const [scanned, setScanned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  
  const [userData, setUserData] = useState(null);
  const [wasteType, setWasteType] = useState('');
  const [weight, setWeight] = useState('');
  const [reward, setReward] = useState('');

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    try {
        const parsedData = JSON.parse(data);
        
        if (parsedData.email && parsedData.name) {
            setUserData({ name: parsedData.name, email: parsedData.email });
            
            // 🟢 AUTO-FILL THE REWARD FROM QR CODE!
            if (parsedData.targetReward) {
                setReward(parsedData.targetReward);
            }

            Alert.alert("Resident Scanned!", `User: ${parsedData.name}`, [
                { text: "Proceed", onPress: () => setStep(2) }
            ]);
        } else {
            Alert.alert("Invalid QR", "This QR code is not recognized by GreenSort.", [{ text: "Scan Again", onPress: () => setScanned(false) }]);
        }
    } catch (error) {
        Alert.alert("Error", "Invalid QR Format.", [{ text: "Scan Again", onPress: () => setScanned(false) }]);
    }
  };

  const handleConfirmSurrender = async () => {
      setIsSubmitting(true);
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("Collector is not logged in.");

          // 🟢 EXACT MATCH NA ANG MASE-SAVE SA DATABASE
          const { error } = await supabase.from('surrender_logs').insert([{
              collector_email: user.email,
              resident_email: userData.email,
              resident_name: userData.name,
              waste_type: wasteType,
              weight_kg: parseFloat(weight),
              reward_claimed: reward || 'None'
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
        
        {/* 🟢 SIMULATE BUTTON WITH TARGET REWARD */}
        <TouchableOpacity style={styles.simulateBtn} onPress={() => handleBarCodeScanned({type: 'qr', data: '{"email":"test@test.com", "name":"Maria Clara", "targetReward":"10 KG of Coffee bean"}'})}>
            <Text style={{color: '#0066FF', marginTop: 20}}>Simulate Scan (For Testing)</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.userCard}>
            <View style={styles.avatar}><MaterialCommunityIcons name="account" size={30} color="#0066FF" /></View>
            <View><Text style={styles.userName}>{userData?.name}</Text><Text style={styles.userId}>{userData?.email}</Text></View>
        </View>
        <Text style={styles.sectionLabel}>Log Waste Details</Text>
        <Text style={styles.inputLabel}>Waste Category</Text>
        <TextInput style={styles.input} placeholder="e.g. Plastic Bottles" value={wasteType} onChangeText={setWasteType} />
        <Text style={styles.inputLabel}>Quantity (kg)</Text>
        <TextInput style={styles.input} placeholder="0.0" keyboardType="numeric" value={weight} onChangeText={setWeight} />
        
        {/* 🟢 REWARD INPUT (AUTO-FILLED NA ITO) */}
        <Text style={styles.inputLabel}>Reward / Exchange</Text>
        <TextInput style={[styles.input, {backgroundColor: '#f0f0f0'}]} placeholder="e.g. 1kg Rice" value={reward} onChangeText={setReward} />

        <TouchableOpacity style={styles.blueBtn} onPress={() => {
            if(!wasteType || !weight) return Alert.alert("Required", "Please fill in the Waste Category and Quantity.");
            setStep(3);
        }}>
            <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
    </ScrollView>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
        <View style={{alignItems: 'center', marginBottom: 20}}><MaterialCommunityIcons name="cube-outline" size={50} color="#0066FF" /><Text style={styles.confirmTitle}>Confirm Surrender</Text></View>
        <View style={styles.receiptCard}>
            <Text style={styles.receiptHeader}>Transaction Summary</Text>
            <View style={styles.divider} />
            <View style={styles.row}><Text style={styles.label}>Surrenderer</Text><Text style={styles.val}>{userData?.name}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Waste Type</Text><Text style={styles.val}>{wasteType}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Quantity</Text><Text style={styles.valBlue}>{weight} kg</Text></View>
            <View style={styles.row}><Text style={styles.label}>Reward</Text><Text style={styles.valGreen}>{reward || 'None'}</Text></View>
        </View>
        <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}><Text style={{color: '#666', fontWeight: 'bold'}}>Edit</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.blueBtn, {flex: 1}]} onPress={handleConfirmSurrender} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Confirm Transaction</Text>}
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
      <View style={styles.content}>{step === 1 && renderStep1()}{step === 2 && renderStep2()}{step === 3 && renderStep3()}{step === 4 && renderStep4()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' }, header: { backgroundColor: '#0066FF', paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }, navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 }, headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' }, content: { flex: 1, padding: 20 }, stepContainer: { flex: 1 }, cameraBox: { height: 350, borderRadius: 20, overflow: 'hidden', marginTop: 10, marginBottom: 20, elevation: 5 }, camera: { flex: 1 }, overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }, scanFrame: { width: 200, height: 200, borderWidth: 2, borderColor: 'white', borderStyle: 'dashed', borderRadius: 20 }, scanText: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#333' }, simulateBtn: { marginTop: 10, padding: 15, alignItems: 'center' }, userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#90CAF9' }, avatar: { width: 50, height: 50, backgroundColor: 'white', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 }, userName: { fontWeight: 'bold', fontSize: 16, color: '#0066FF' }, userId: { color: '#555', fontSize: 12 }, sectionLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 15 }, inputLabel: { fontSize: 12, color: '#666', marginBottom: 5, fontWeight: 'bold' }, input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 1 }, confirmTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10 }, receiptCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 3, marginBottom: 30 }, receiptHeader: { fontWeight: 'bold', fontSize: 14, marginBottom: 10 }, divider: { height: 1, backgroundColor: '#eee', marginVertical: 5 }, row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }, label: { color: '#666' }, val: { fontWeight: '600' }, valBlue: { fontWeight: 'bold', color: '#0066FF' }, valGreen: { fontWeight: 'bold', color: '#007C00' }, successTitle: { fontSize: 28, fontWeight: 'bold', marginTop: 20, color: '#333' }, successSub: { color: '#666', textAlign: 'center', marginTop: 5 }, btnRow: { flexDirection: 'row', gap: 10 }, blueBtn: { backgroundColor: '#0066FF', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 2, justifyContent: 'center' }, backBtn: { backgroundColor: '#ddd', padding: 15, borderRadius: 10, alignItems: 'center', width: 80, justifyContent: 'center' }, btnText: { color: 'white', fontWeight: 'bold' }, centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});