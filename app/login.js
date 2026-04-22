import { useState, useEffect } from 'react'; 
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 🟢 IMPORT SUPABASE
import { supabase } from '../lib/supabase'; 

export default function Login() {
  const router = useRouter();
  
  // 🟢 NORMAL LOGIN STATES
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 🟢 2FA LOGIN STATES
  const [showLoginOtpModal, setShowLoginOtpModal] = useState(false);
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [isVerifyingLogin, setIsVerifyingLogin] = useState(false);

  // 🟢 FORGOT PASSWORD STATES
  const [forgotPassStep, setForgotPassStep] = useState(0); 
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // 🟢 INITIAL SESSION CHECK ONLY
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/(tabs)/dashboard'); 
      }
    };
    checkSession();
  }, []);

  // 🟢 NORMAL LOGIN FUNCTION (2FA Flow)
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    
    // 1. I-verify muna natin kung tama ang Email at Password
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (signInError) {
      setLoading(false);
      Alert.alert('Login Failed', signInError.message);
      return;
    }

    // 2. Kung tama ang password, I-LOGOUT NATIN AGAD para hingan ng OTP
    await supabase.auth.signOut();

    // 3. Mag-send ng OTP sa Email
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false, // PREVENTS CREATING NEW ACCOUNTS
      }
    });

    setLoading(false);

    if (otpError) {
        if (otpError.message.includes('5 seconds') || otpError.message.includes('rate limit')) {
             Alert.alert("Please Wait", "For security purposes, you can only request an OTP every few seconds. Please wait a moment and try again.");
        } else {
             Alert.alert("Error Sending OTP", otpError.message);
        }
    } else {
        // 4. Ipakita ang OTP Modal para sa Login
        setShowLoginOtpModal(true);
    }
  };

  // 🟢 VERIFY LOGIN 2FA OTP
  const handleVerifyLoginOtp = async () => {
    if (!loginOtpCode || loginOtpCode.length < 8) {
        Alert.alert('Invalid Code', 'Please enter the 8-digit verification code.');
        return;
    }

    setIsVerifyingLogin(true);

    const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: loginOtpCode,
        type: 'email' 
    });

    setIsVerifyingLogin(false);

    if (error) {
        Alert.alert('Verification Failed ❌', error.message);
    } else {
        // MANUAL REDIRECT TO DASHBOARD
        setShowLoginOtpModal(false);
        setLoginOtpCode('');
        router.replace('/(tabs)/dashboard');
    }
  };

  // 🟢 STEP 1: SEND OTP TO EMAIL (FORGOT PASSWORD)
  const handleSendOTP = async () => {
    if (!email) {
      Alert.alert("Wait!", "Please enter your email address first.");
      return;
    }
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setIsResetting(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("OTP Sent", "Please check your email for the 8-digit recovery code.");
      setForgotPassStep(2); 
    }
  };

  // 🟢 STEP 2: VERIFY OTP (FORGOT PASSWORD)
  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length < 8) {
      Alert.alert("Error", "Please enter the full 8-digit OTP code.");
      return;
    }
    setIsResetting(true);
    const { error } = await supabase.auth.verifyOtp({ 
      email, 
      token: otpCode, 
      type: 'recovery' 
    });
    setIsResetting(false);

    if (error) {
      Alert.alert("Invalid Code", error.message);
    } else {
      setForgotPassStep(3); 
    }
  };

  // 🟢 STEP 3: SET NEW PASSWORD (FORGOT PASSWORD)
  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert("Wait!", "Password must be at least 8 characters.");
      return;
    }
    setIsResetting(true);
    const { error } = await supabase.auth.updateUser({ 
      password: newPassword 
    });
    setIsResetting(false);

    if (error) {
      Alert.alert("Update Failed", error.message);
    } else {
      Alert.alert("Success!", "Your password has been successfully reset. You can now login.");
      setForgotPassStep(0); 
      setPassword('');
      setOtpCode('');
      setNewPassword('');
    }
  };

  const cancelReset = () => {
    setForgotPassStep(0);
    setOtpCode('');
    setNewPassword('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          <View style={styles.logoContainer}>
              <Image source={require('../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>

          <Text style={styles.title}>
            {forgotPassStep === 0 ? "Welcome Back!" : 
             forgotPassStep === 1 ? "Forgot Password" : 
             forgotPassStep === 2 ? "Enter OTP" : "New Password"}
          </Text>
          <Text style={styles.subtitle}>
            {forgotPassStep === 0 ? "Sign in to continue to GreenSort" : 
             forgotPassStep === 1 ? "Enter your email to receive a recovery code" : 
             forgotPassStep === 2 ? `We sent an 8-digit code to ${email}` : "Enter your new secure password"}
          </Text>

          <View style={styles.formContainer}>
            
            {/* 🔴 NORMAL LOGIN VIEW (Step 0) */}
            {forgotPassStep === 0 && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput style={styles.input} placeholder="email@gmail.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput style={styles.input} placeholder="Enter your password" value={password} onChangeText={setPassword} secureTextEntry />
                  <TouchableOpacity onPress={() => setForgotPassStep(1)}>
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>LOGIN</Text>}
                </TouchableOpacity>

                <View style={styles.footer}>
                  <Text style={{ color: '#888' }}>Don't have an account? </Text>
                  <TouchableOpacity onPress={() => router.push('/signup')}>
                    <Text style={styles.link}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* 🔴 FORGOT PASSWORD: GET EMAIL (Step 1) */}
            {forgotPassStep === 1 && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput style={styles.input} placeholder="email@gmail.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                </View>
                <TouchableOpacity style={styles.button} onPress={handleSendOTP} disabled={isResetting}>
                    {isResetting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>SEND RECOVERY CODE</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.backButton} onPress={cancelReset}>
                    <Text style={styles.backButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )}

            {/* 🔴 FORGOT PASSWORD: ENTER OTP (Step 2) */}
            {forgotPassStep === 2 && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>8-Digit OTP Code</Text> 
                  <TextInput 
                    style={[styles.input, { letterSpacing: 5, textAlign: 'center', fontSize: 18 }]} 
                    placeholder="00000000" 
                    value={otpCode} 
                    onChangeText={setOtpCode} 
                    keyboardType="numeric" 
                    maxLength={8} 
                  />
                </View>
                <TouchableOpacity style={styles.button} onPress={handleVerifyOTP} disabled={isResetting}>
                    {isResetting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>VERIFY CODE</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.backButton} onPress={cancelReset}>
                    <Text style={styles.backButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {/* 🔴 FORGOT PASSWORD: NEW PASSWORD (Step 3) */}
            {forgotPassStep === 3 && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput style={styles.input} placeholder="Enter new password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
                </View>
                <TouchableOpacity style={styles.button} onPress={handleUpdatePassword} disabled={isResetting}>
                    {isResetting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>UPDATE PASSWORD</Text>}
                </TouchableOpacity>
              </>
            )}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🟢 2FA LOGIN OTP MODAL (NAKA-BALOT NA NGAYON SA KEYBOARD AVOIDING VIEW PARA UMANGAT) */}
      <Modal visible={showLoginOtpModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                  <View style={{alignItems: 'center', marginBottom: 20}}>
                      <View style={styles.iconCircle}>
                          <Ionicons name="mail" size={32} color="#007C00" />
                      </View>
                      <Text style={styles.modalTitle}>Verify your Email</Text>
                      <Text style={styles.modalSub}>We sent an 8-digit verification code to <Text style={{fontWeight: 'bold', color: '#333'}}>{email}</Text></Text>
                  </View>

                  <TextInput 
                      style={styles.otpInput} 
                      placeholder="00000000" 
                      placeholderTextColor="#999"
                      keyboardType="number-pad" 
                      maxLength={8} 
                      value={loginOtpCode}
                      onChangeText={setLoginOtpCode}
                      textAlign="center"
                  />

                  <TouchableOpacity style={styles.verifyButton} onPress={handleVerifyLoginOtp} disabled={isVerifyingLogin}>
                      {isVerifyingLogin ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>VERIFY CODE</Text>}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowLoginOtpModal(false); setLoginOtpCode(''); }} disabled={isVerifyingLogin}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
              </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 20 },
  logoContainer: { alignItems: 'flex-start', marginBottom: 20, marginTop: 20 },
  logoImage: { width: 120, height: 120, marginLeft: -10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#007C00', marginBottom: 5, textAlign: 'left' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 40, textAlign: 'left' },
  formContainer: { width: '100%' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 13, color: '#333', fontWeight: '500', marginBottom: 8 },
  input: { backgroundColor: '#F5F5F5', paddingVertical: 16, paddingHorizontal: 15, borderRadius: 8, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#EEEEEE' },
  button: { backgroundColor: '#007C00', padding: 18, borderRadius: 8, alignItems: 'center', marginTop: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  link: { color: '#007C00', fontWeight: 'bold' },
  
  forgotPasswordText: { color: '#007C00', fontSize: 13, fontWeight: 'bold', textAlign: 'right', marginTop: 10 },
  backButton: { padding: 15, alignItems: 'center', marginTop: 10 },
  backButtonText: { color: '#888', fontSize: 14, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, elevation: 10, shadowColor: '#000', shadowOffset: {width: 0, height: -2}, shadowOpacity: 0.1, shadowRadius: 10 },
  iconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  modalSub: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },
  otpInput: { backgroundColor: '#F5F5F5', paddingVertical: 16, borderRadius: 8, fontSize: 16, fontWeight: '600', color: '#333', borderWidth: 1, borderColor: '#E0E0E0', letterSpacing: 2, marginBottom: 20 },
  verifyButton: { backgroundColor: '#007C00', paddingVertical: 16, borderRadius: 8, alignItems: 'center', width: '100%' },
  cancelBtn: { paddingVertical: 15, alignItems: 'center', marginTop: 5 },
  cancelBtnText: { color: '#666', fontSize: 14, fontWeight: 'bold' }
});