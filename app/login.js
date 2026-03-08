import { useState, useEffect } from 'react'; 
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar'; 
import { SafeAreaView } from 'react-native-safe-area-context';

// 🟢 IMPORT SUPABASE
import { supabase } from '../lib/supabase'; 

export default function Login() {
  const router = useRouter();
  
  // 🟢 NORMAL LOGIN STATES
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 🟢 FORGOT PASSWORD STATES
  const [forgotPassStep, setForgotPassStep] = useState(0); // 0 = Normal Login, 1 = Email, 2 = OTP, 3 = New Pass
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // 🟢 DEEP LINK LISTENER
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // Wag mag-redirect kung nag-v-verify lang ng OTP para sa password recovery
      if (event === 'SIGNED_IN' && session && forgotPassStep === 0) {
        router.replace('/(tabs)/dashboard'); 
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [forgotPassStep]);

  // 🟢 NORMAL LOGIN FUNCTION
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      router.replace('/(tabs)/dashboard');
    }
  };

  // 🟢 STEP 1: SEND OTP TO EMAIL
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
      Alert.alert("OTP Sent", "Please check your email for the 6-digit recovery code.");
      setForgotPassStep(2); // Proceed to OTP input
    }
  };

  // 🟢 STEP 2: VERIFY OTP
  const handleVerifyOTP = async () => {
    if (!otpCode) {
      Alert.alert("Error", "Please enter the OTP code.");
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
      setForgotPassStep(3); // Proceed to set new password
    }
  };

  // 🟢 STEP 3: SET NEW PASSWORD
  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Wait!", "Password must be at least 6 characters.");
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
      setForgotPassStep(0); // Bumalik sa normal login
      setPassword('');
      setOtpCode('');
      setNewPassword('');
    }
  };

  // 🟢 CANCEL RESET PROCESS
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

          {/* 🟢 DYNAMIC TITLES BASE SA CURRENT STEP */}
          <Text style={styles.title}>
            {forgotPassStep === 0 ? "Welcome Back!" : 
             forgotPassStep === 1 ? "Forgot Password" : 
             forgotPassStep === 2 ? "Enter OTP" : "New Password"}
          </Text>
          <Text style={styles.subtitle}>
            {forgotPassStep === 0 ? "Sign in to continue to GreenSort" : 
             forgotPassStep === 1 ? "Enter your email to receive a recovery code" : 
             forgotPassStep === 2 ? `We sent a 6-digit code to ${email}` : "Enter your new secure password"}
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
                  {/* 🟢 Pinalitan ng 8-Digit */}
                  <Text style={styles.label}>8-Digit OTP Code</Text> 
                  <TextInput 
                    style={[styles.input, { letterSpacing: 5, textAlign: 'center', fontSize: 18 }]} 
                    placeholder="00000000" // 🟢 Dinagdagan ng dalawang zero
                    value={otpCode} 
                    onChangeText={setOtpCode} 
                    keyboardType="numeric" 
                    maxLength={8} // 👈 🟢 DITO: Ginawa nating 8 ang maximum length!
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
  
  // 🟢 MGA BAGONG STYLES PARA SA FORGOT PASSWORD
  forgotPasswordText: { color: '#007C00', fontSize: 13, fontWeight: 'bold', textAlign: 'right', marginTop: 10 },
  backButton: { padding: 15, alignItems: 'center', marginTop: 10 },
  backButtonText: { color: '#888', fontSize: 14, fontWeight: 'bold' },
});