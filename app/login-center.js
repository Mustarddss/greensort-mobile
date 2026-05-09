import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function LoginCenter() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showLoginOtpModal, setShowLoginOtpModal] = useState(false);
    const [loginOtpCode, setLoginOtpCode] = useState('');

    const handleLogin = async () => {
        if (!email || !password) { Alert.alert('Error', 'Fill in all fields'); return; }
        setLoading(true);
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) { setLoading(false); Alert.alert('Login Failed', signInError.message); return; }

        await supabase.auth.signOut();
        const { error: otpError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
        setLoading(false);

        if (otpError) Alert.alert("Error", otpError.message);
        else setShowLoginOtpModal(true);
    };

    const handleVerifyLoginOtp = async () => {
        if (!loginOtpCode || loginOtpCode.length < 8) { Alert.alert('Invalid Code', 'Enter 8-digit code.'); return; }
        setLoading(true);
        const { data, error } = await supabase.auth.verifyOtp({ email: email.trim(), token: loginOtpCode, type: 'email' });
        
        if (error) { setLoading(false); Alert.alert('Verification Failed', error.message); return; }

        // 🟢 CENTER VERIFICATION SECURITY (CHE-CHECK KUNG APPROVED NA SILA)
        const { data: dropoffData } = await supabase.from('dropoff_applications').select('status').ilike('user_email', email.trim()).single();

        setLoading(false);
        if (dropoffData && (dropoffData.status.toLowerCase() === 'approved' || dropoffData.status.toLowerCase() === 'active')) {
            setShowLoginOtpModal(false);
            router.replace('/collector-dashboard'); // Redirect papuntang collector dashboard
        } else {
            await supabase.auth.signOut(); // Force logout dahil hindi pa approved
            setShowLoginOtpModal(false);
            Alert.alert('Access Denied', 'Your Center application is either still Pending or Not Found.');
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
            <StatusBar style="dark" backgroundColor="#ffffff" />
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    
                    <TouchableOpacity onPress={() => router.back()} style={{marginBottom: 30, alignSelf: 'flex-start'}}>
                        <Ionicons name="arrow-back" size={28} color="#1C1C1E" />
                    </TouchableOpacity>

                    <Text style={[styles.title, {color: '#2962FF'}]}>Center Login</Text>
                    <Text style={styles.subtitle}>Sign in as an approved Drop-off Center.</Text>

                    <View style={styles.formContainer}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Center Email</Text>
                            <TextInput style={styles.input} placeholder="center@gmail.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>LOGIN CENTER</Text>}
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={{ color: '#888' }}>Not registered yet? </Text>
                            {/* 🟢 FIXED ROUTE PARA DIRETSO SA CENTER SIGNUP */}
                            <TouchableOpacity onPress={() => router.push('/register-location')}><Text style={styles.link}>Apply Now</Text></TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={showLoginOtpModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Verify Center Email</Text>
                        <TextInput style={[styles.input, {borderColor: '#2962FF', borderWidth: 2}]} placeholder="8-Digit OTP" keyboardType="number-pad" maxLength={8} value={loginOtpCode} onChangeText={setLoginOtpCode} textAlign="center" />
                        <TouchableOpacity style={styles.button} onPress={handleVerifyLoginOtp} disabled={loading}>
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>VERIFY SECURELY</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 20 },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
    subtitle: { fontSize: 14, color: '#888', marginBottom: 40 },
    formContainer: { width: '100%' },
    inputContainer: { marginBottom: 20 },
    label: { fontSize: 13, color: '#333', fontWeight: '500', marginBottom: 8 },
    input: { backgroundColor: '#F0F4FF', paddingVertical: 16, paddingHorizontal: 15, borderRadius: 8, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#BBDEFB' },
    button: { backgroundColor: '#2962FF', padding: 18, borderRadius: 8, alignItems: 'center', marginTop: 10, elevation: 3 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
    link: { color: '#2962FF', fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2962FF', marginBottom: 15, textAlign: 'center' }
});