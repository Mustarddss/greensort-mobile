import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 🟢 IMPORT SUPABASE
import { supabase } from '../lib/supabase'; 

export default function Signup() {
  const router = useRouter();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(''); 
  const [address, setAddress] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handleSignup = async () => {
    if (!fullName || !email || !phone || !address || !password || !confirmPassword) {
      Alert.alert('Missing Info', 'Please fill all text fields.');
      return;
    }

    // 🟢 EMAIL FORMAT CHECKER
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email 🛑', 'Please enter a valid email address (e.g., juandelacruz@gmail.com).');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Weak Password', 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          full_name: fullName, 
          address: address,     
          phone: phone         
        }
      }
    });

    setLoading(false);

    if (error) {
      Alert.alert('Signup Error', error.message);
      return;
    } 
    
    // CHECK KUNG GAMIT NA ANG EMAIL
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      Alert.alert(
        'Email Already in Use 🛑', 
        'Nagamit na ang email na ito sa GreenSort. Kung sa iyo ito, paki-try mag-login.'
      );
      return;
    }

    setShowOtpModal(true);
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
        Alert.alert('Invalid Code', 'Please enter the verification code sent to your email.');
        return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode,
        type: 'signup' 
    });

    if (error) {
        setLoading(false);
        Alert.alert('Verification Failed ❌', error.message);
        return;
    } 

    // 🟢 FIX 1: I-force logout AGAD-AGAD bago pa siya mapunta sa Dashboard
    await supabase.auth.signOut();
    
    setLoading(false);
    setShowOtpModal(false);

    // 🟢 FIX 2: Delay para siguradong hindi mag-trigger ang auto-redirect
    setTimeout(() => {
        Alert.alert(
            'Account Created! 🎉', 
            'Your account is now created! You can log in your account now!', 
            [{ text: 'Go', onPress: () => router.replace('/login') }]
        );
    }, 500); 
  };
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.centerHeader}>
              <Image source={require('../assets/images/signup logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>

          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the GreenSort revolution!</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.input} placeholder="Juan Dela Cruz" value={fullName} onChangeText={setFullName} />

            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} placeholder="email@gmail.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />

            <Text style={styles.label}>Mobile Number</Text>
            <TextInput style={styles.input} placeholder="09123456789" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />

            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} placeholder="e.g. Brgy. Sampaloc I" value={address} onChangeText={setAddress} />

            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} placeholder="Min. 8 characters" secureTextEntry value={password} onChangeText={setPassword} />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput style={styles.input} placeholder="Re-enter your password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

            <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>SIGN UP</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={{color: '#888'}}>Already have an Account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                    <Text style={styles.link}>Login</Text>
                </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showOtpModal} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                  <View style={{alignItems: 'center', marginBottom: 20}}>
                      <View style={styles.iconCircle}>
                          <Ionicons name="mail-unread" size={40} color="#007C00" />
                      </View>
                      <Text style={styles.modalTitle}>Verify your Email</Text>
                      <Text style={styles.modalSub}>We sent a verification code to <Text style={{fontWeight: 'bold', color: '#333'}}>{email}</Text></Text>
                  </View>

                  <TextInput 
                      style={styles.otpInput} 
                      placeholder="Enter verification code" 
                      keyboardType="number-pad" 
                      maxLength={8}
                      value={otpCode}
                      onChangeText={setOtpCode}
                      textAlign="center"
                  />

                  <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
                      {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>VERIFY CODE</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowOtpModal(false)} disabled={loading}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, paddingHorizontal: 30, paddingTop: 20, paddingBottom: 50 },
  centerHeader: { alignItems: 'center', marginBottom: 10 },
  logoImage: { width: 200, height: 200 },
  headerTextContainer: { marginBottom: 25, alignItems: 'flex-start' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#007C00', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#888' },
  form: { width: '100%' },
  label: { fontSize: 14, color: '#333', fontWeight: '500', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#F5F5F5', paddingVertical: 14, paddingHorizontal: 15, borderRadius: 8, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#EEEEEE' },
  button: { backgroundColor: '#007C00', paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginTop: 30, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 15, marginBottom: 20 },
  link: { color: '#007C00', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, elevation: 10, shadowColor: '#000', shadowOffset: {width: 0, height: -2}, shadowOpacity: 0.1, shadowRadius: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  modalSub: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  otpInput: { backgroundColor: '#F5F5F5', paddingVertical: 15, borderRadius: 12, fontSize: 20, fontWeight: 'bold', color: '#007C00', borderWidth: 2, borderColor: '#E0E0E0', letterSpacing: 3 },
  cancelBtn: { paddingVertical: 15, alignItems: 'center', marginTop: 5 },
  cancelBtnText: { color: '#666', fontSize: 15, fontWeight: 'bold' }
});