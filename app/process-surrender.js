import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera'; // Modern Camera

export default function ProcessSurrender() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  
  // --- STATES ---
  const [step, setStep] = useState(1); // 1: Scan, 2: Details, 3: Confirm, 4: Success
  const [scanned, setScanned] = useState(false);
  
  // Data galing sa QR Scan (Mock muna)
  const [userData, setUserData] = useState(null);

  // Data na i-input ni Officer
  const [wasteType, setWasteType] = useState('');
  const [weight, setWeight] = useState('');
  const [reward, setReward] = useState('');

  // --- STEP 1: CAMERA LOGIC ---
  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    // SA totoong app, ipapasa ng QR code ang User ID.
    // Dito, isi-simulate natin na nakuha natin si "Juan Dela Cruz"
    setUserData({
        name: 'Juan Dela Cruz',
        id: 'USR-2026-001',
        qrData: data
    });
    Alert.alert("QR Scanned!", `User: Juan Dela Cruz`, [
        { text: "Proceed", onPress: () => setStep(2) }
    ]);
  };

  // --- RENDER STEPS ---
  
  // 📸 STEP 1: SCANNER
  const renderStep1 = () => {
    if (!permission) return <View />;
    if (!permission.granted) {
      return (
        <View style={styles.centerContent}>
          <Text>We need your permission to show the camera</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.blueBtn}><Text style={styles.btnText}>Grant Permission</Text></TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.stepContainer}>
        <View style={styles.cameraBox}>
            {/* REAL CAMERA VIEW */}
            <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            />
            <View style={styles.overlay}>
                <View style={styles.scanFrame} />
            </View>
        </View>
        <Text style={styles.scanText}>Scan User QR Code</Text>
        <Text style={styles.scanSub}>Align the QR code within the frame</Text>

        {/* SIMULATE BUTTON (Para makapag-test ka sa Emulator kung walang Camera) */}
        <TouchableOpacity style={styles.simulateBtn} onPress={() => handleBarCodeScanned({type: 'qr', data: 'USER-123'})}>
            <Text style={{color: '#0066FF'}}>Simulate Scan (For Testing)</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 📝 STEP 2: LOG DETAILS
  const renderStep2 = () => (
    <ScrollView style={styles.stepContainer}>
        {/* User Info Card */}
        <View style={styles.userCard}>
            <View style={styles.avatar}>
                <MaterialCommunityIcons name="account" size={30} color="#0066FF" />
            </View>
            <View>
                <Text style={styles.userName}>{userData?.name}</Text>
                <Text style={styles.userId}>ID: {userData?.id}</Text>
            </View>
        </View>

        <Text style={styles.sectionLabel}>Log Waste Details</Text>

        <Text style={styles.inputLabel}>Waste Category</Text>
        <TextInput style={styles.input} placeholder="e.g. Plastic Bottles" value={wasteType} onChangeText={setWasteType} />

        <Text style={styles.inputLabel}>Quantity (kg)</Text>
        <TextInput style={styles.input} placeholder="0.0" keyboardType="numeric" value={weight} onChangeText={setWeight} />

        <Text style={styles.inputLabel}>Available Exchange</Text>
        <TextInput style={styles.input} placeholder="e.g. 1kg Rice" value={reward} onChangeText={setReward} />

        <TouchableOpacity style={styles.blueBtn} onPress={() => {
            if(!wasteType || !weight) return Alert.alert("Error", "Please fill all fields");
            setStep(3);
        }}>
            <Text style={styles.btnText}>Continue</Text>
        </TouchableOpacity>
    </ScrollView>
  );

  // ✅ STEP 3: CONFIRMATION
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
        <View style={{alignItems: 'center', marginBottom: 20}}>
            <MaterialCommunityIcons name="cube-outline" size={50} color="#0066FF" />
            <Text style={styles.confirmTitle}>Confirm Surrender</Text>
            <Text style={styles.confirmSub}>Please review details before confirming</Text>
        </View>

        <View style={styles.receiptCard}>
            <Text style={styles.receiptHeader}>Transaction Summary</Text>
            <View style={styles.divider} />
            
            <View style={styles.row}><Text style={styles.label}>Date</Text><Text style={styles.val}>{new Date().toLocaleDateString()}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Surrenderer</Text><Text style={styles.val}>{userData?.name}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Waste Type</Text><Text style={styles.val}>{wasteType}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Quantity</Text><Text style={styles.valBlue}>{weight} kg</Text></View>
            
            <View style={[styles.divider, {marginVertical: 10}]} />
            <View style={styles.row}><Text style={styles.label}>Reward</Text><Text style={styles.valGreen}>{reward}</Text></View>
        </View>

        <View style={styles.btnRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(2)}>
                <Text style={{color: '#666'}}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.blueBtn, {flex: 1}]} onPress={() => setStep(4)}>
                <Text style={styles.btnText}>Confirm</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  // 🎉 STEP 4: SUCCESS
  const renderStep4 = () => (
    <View style={[styles.stepContainer, {justifyContent: 'center', alignItems: 'center'}]}>
        <MaterialCommunityIcons name="check-circle" size={100} color="#00C853" />
        <Text style={styles.successTitle}>Success!</Text>
        <Text style={styles.successSub}>Surrender has been logged successfully.</Text>
        <Text style={styles.successSub}>Logbook has been updated.</Text>

        <TouchableOpacity 
            style={[styles.blueBtn, {width: '100%', marginTop: 30}]} 
            onPress={() => router.push('/collector-dashboard')} // Back to Dashboard
        >
            <Text style={styles.btnText}>Back to Dashboard</Text>
        </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 🔵 HEADER & STEPPER */}
      <View style={styles.header}>
        <View style={styles.navRow}>
            <TouchableOpacity onPress={() => router.back()}>
                <MaterialCommunityIcons name="chevron-left" size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Process Surrender</Text>
            <View style={{width: 30}} />
        </View>

        {/* STEP INDICATOR */}
        <View style={styles.stepper}>
            <StepIndicator num={1} label="Scan" active={step >= 1} />
            <View style={styles.line} />
            <StepIndicator num={2} label="Details" active={step >= 2} />
            <View style={styles.line} />
            <StepIndicator num={3} label="Confirm" active={step >= 3} />
        </View>
      </View>

      {/* BODY */}
      <View style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </View>
    </View>
  );
}

// Sub-component for Stepper
const StepIndicator = ({ num, label, active }) => (
    <View style={{alignItems: 'center'}}>
        <View style={[styles.stepCircle, active && {backgroundColor: 'white', borderColor: 'white'}]}>
            <Text style={[styles.stepNum, active && {color: '#0066FF'}]}>{num}</Text>
        </View>
        <Text style={[styles.stepLabel, active && {opacity: 1}]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  
  // Header
  header: { backgroundColor: '#0066FF', paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  // Stepper
  stepper: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  stepCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  stepNum: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  stepLabel: { color: 'white', fontSize: 10, marginTop: 4, opacity: 0.6 },
  line: { width: 40, height: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 5, marginBottom: 15 },

  content: { flex: 1, padding: 20 },
  stepContainer: { flex: 1 },

  // Camera Styles
  cameraBox: { height: 300, borderRadius: 20, overflow: 'hidden', marginTop: 20, marginBottom: 20, elevation: 5 },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  scanFrame: { width: 200, height: 200, borderWidth: 2, borderColor: 'white', borderStyle: 'dashed', borderRadius: 20 },
  scanText: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#333' },
  scanSub: { textAlign: 'center', color: '#888', marginTop: 5 },
  simulateBtn: { marginTop: 30, padding: 15, alignItems: 'center' },

  // Form Styles
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#90CAF9' },
  avatar: { width: 50, height: 50, backgroundColor: 'white', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  userName: { fontWeight: 'bold', fontSize: 16, color: '#0066FF' },
  userId: { color: '#555', fontSize: 12 },
  sectionLabel: { fontWeight: 'bold', fontSize: 16, marginBottom: 15 },
  inputLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 1 },

  // Confirm Styles
  confirmTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  confirmSub: { color: '#888', fontSize: 12 },
  receiptCard: { backgroundColor: 'white', padding: 20, borderRadius: 15, elevation: 3, marginBottom: 20 },
  receiptHeader: { fontWeight: 'bold', fontSize: 14, marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { color: '#666' },
  val: { fontWeight: '600' },
  valBlue: { fontWeight: 'bold', color: '#0066FF' },
  valGreen: { fontWeight: 'bold', color: '#00C853' },
  
  // Success
  successTitle: { fontSize: 22, fontWeight: 'bold', marginTop: 20 },
  successSub: { color: '#666', textAlign: 'center', marginTop: 5 },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 10 },
  blueBtn: { backgroundColor: '#0066FF', padding: 15, borderRadius: 10, alignItems: 'center', elevation: 2 },
  backBtn: { backgroundColor: '#ddd', padding: 15, borderRadius: 10, alignItems: 'center', width: 80 },
  btnText: { color: 'white', fontWeight: 'bold' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});