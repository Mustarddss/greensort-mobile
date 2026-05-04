import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, Platform, Modal, TextInput, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

const getSafeShadow = () => Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    android: { elevation: 3 },
    web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
});

export default function CenterSettings() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // --- MODAL STATE ---
    const [isProfileModalVisible, setProfileModalVisible] = useState(false);
    
    // --- EDITABLE STATES ---
    const [officerName, setOfficerName] = useState('');
    const [programName, setProgramName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // --- READ-ONLY STATES ---
    const [email, setEmail] = useState('');
    const [fullAddress, setFullAddress] = useState('');
    const [duration, setDuration] = useState('');
    const [status, setStatus] = useState('');

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- PASSWORD VALIDATION LOGIC ---
    const isMinLength = newPassword.length >= 8;
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    const isPasswordValid = isMinLength && hasLower && hasUpper && hasNumber && hasSpecial;

    // 🟢 FETCH CURRENT CENTER DATA
    useEffect(() => {
        const fetchCenterData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.replace('/login-center');
                    return;
                }

                setEmail(user.email);
                setOfficerName(user.user_metadata?.full_name || '');

                const { data: profileData } = await supabase
                    .from('dropoff_applications')
                    .select('*')
                    .ilike('user_email', user.email)
                    .single();

                if (profileData) {
                    setProgramName(profileData.program_name || '');
                    setContactNumber(profileData.contact_number || '');
                    setFullAddress(`${profileData.applicant_name}, ${profileData.barangay}, ${profileData.city}, ${profileData.province}, ${profileData.region}`);
                    setDuration(profileData.operation_duration || '');
                    setStatus(profileData.status || '');
                }
            } catch (error) {
                console.log("Error fetching profile", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCenterData();
    }, []);

    const handlePhoneChange = (text) => {
        const filteredText = text.replace(/[^0-9]/g, '');
        setContactNumber(filteredText);
    };

    // 🟢 SAVE UPDATES FUNCTION
    const handleSaveChanges = async () => {
        if (!officerName || !programName || !contactNumber) {
            Alert.alert("Missing Fields", "Please fill in all required editable fields.");
            return;
        }

        if (newPassword.length > 0) {
            if (!isPasswordValid) {
                Alert.alert('Weak Password', 'Please ensure all password requirements are met.');
                return;
            }
            if (newPassword !== confirmPassword) {
                Alert.alert('Password Mismatch', 'New passwords do not match.');
                return;
            }
        }

        setIsSaving(true);

        try {
            let authUpdates = { data: { full_name: officerName.trim() } };
            if (newPassword.length > 0) {
                authUpdates.password = newPassword;
            }
            
            const { error: authError } = await supabase.auth.updateUser(authUpdates);
            if (authError) throw authError;

            const { error: dbError } = await supabase
                .from('dropoff_applications')
                .update({
                    program_name: programName.trim(),
                    contact_number: contactNumber.trim()
                })
                .ilike('user_email', email);

            if (dbError) throw dbError;

            Alert.alert("Success!", "Your profile has been updated successfully.");
            setNewPassword('');
            setConfirmPassword('');
            setProfileModalVisible(false); // Close Modal on success
        } catch (error) {
            Alert.alert("Update Failed", error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // 🟢 LOGOUT FUNCTION (With Skip to Onboarding 5)
    const handleLogout = async () => {
        Alert.alert("Log Out", "Are you sure you want to log out from the Center Dashboard?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: async () => {
                await supabase.auth.signOut();
                router.replace({ pathname: '/onboarding', params: { skip: 'true' } });
            }}
        ]);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#0066FF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0066FF" translucent={true} />

            {/* 🔵 BLUE HEADER THEME */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>Center Settings</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                
                <Text style={styles.sectionTitle}>Account Management</Text>

                {/* 1. PROFILE SETTINGS BUTTON */}
                <TouchableOpacity style={styles.menuItem} onPress={() => setProfileModalVisible(true)}>
                    <View style={[styles.menuIcon, { backgroundColor: '#E3F2FD' }]}>
                        <MaterialCommunityIcons name="store-cog-outline" size={22} color="#0066FF" />
                    </View>
                    <Text style={styles.menuText}>Profile Settings</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                {/* 2. TERMS AND CONDITIONS BUTTON */}
                <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/terms-conditions')}>
                    <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
                        <MaterialCommunityIcons name="file-document-outline" size={22} color="#00C853" />
                    </View>
                    <Text style={styles.menuText}>Terms & Conditions</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Account Action</Text>

                {/* 3. LOG OUT BUTTON */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#D50000" style={{ marginRight: 10 }} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={{ alignItems: 'center', marginTop: 30, marginBottom: 20 }}>
                    <Text style={{ color: '#ccc', fontSize: 12 }}>GreenSort Center v1.0.0</Text>
                </View>
            </ScrollView>

            {/* 🟢 PROFILE SETTINGS MODAL */}
            <Modal visible={isProfileModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setProfileModalVisible(false)}>
                <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
                    <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 10) + 15 }]}>
                        <Text style={styles.modalTitle}>Profile Settings</Text>
                        <TouchableOpacity onPress={() => setProfileModalVisible(false)} style={{ padding: 5 }}>
                            <Ionicons name="close" size={28} color="white" />
                        </TouchableOpacity>
                    </View>

                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                            
                            <Text style={styles.sectionTitle}>Account Credentials</Text>
                            
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Center Email (Read-Only)</Text>
                                <TextInput style={[styles.input, styles.disabledInput]} value={email} editable={false} />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Full Name of the Officer</Text>
                                <TextInput style={styles.input} placeholder="Juan Dela Cruz" value={officerName} onChangeText={setOfficerName} />
                            </View>
                            
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Change Password (Optional)</Text>
                                <TextInput style={styles.input} placeholder="Type new password" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
                            </View>

                            {newPassword.length > 0 && (
                                <View style={styles.passwordRulesContainer}>
                                    <PasswordCheck isValid={isMinLength} text="Minimum of 8 characters" />
                                    <PasswordCheck isValid={hasLower} text="At least 1 lowercase letter (a-z)" />
                                    <PasswordCheck isValid={hasUpper} text="At least 1 uppercase letter (A-Z)" />
                                    <PasswordCheck isValid={hasNumber} text="At least 1 number" />
                                    <PasswordCheck isValid={hasSpecial} text="At least 1 special character (e.g. ! @ # $ %)" />
                                </View>
                            )}

                            {newPassword.length > 0 && (
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Confirm New Password</Text>
                                    <TextInput style={styles.input} placeholder="Re-enter your new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
                                </View>
                            )}

                            <Text style={styles.sectionTitle}>Basic Information</Text>
                            
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Program / Center Name</Text>
                                <TextInput style={styles.input} placeholder="e.g. Trash-to-Cashback" value={programName} onChangeText={setProgramName} />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Contact Number</Text>
                                <TextInput style={styles.input} placeholder="63+ 9123456789" value={contactNumber} onChangeText={handlePhoneChange} keyboardType="number-pad" maxLength={12} />
                            </View>

                            <Text style={[styles.sectionTitle, { color: '#D32F2F', marginTop: 15 }]}>Locked Details</Text>
                            <Text style={styles.noteText}>These details were verified by the Admin and cannot be edited.</Text>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Registered Address</Text>
                                <TextInput style={[styles.input, styles.disabledInput]} value={fullAddress} editable={false} multiline />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Verification Duration</Text>
                                <TextInput style={[styles.input, styles.disabledInput]} value={duration} editable={false} />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Account Status</Text>
                                <View style={[styles.input, styles.disabledInput, { flexDirection: 'row', alignItems: 'center' }]}>
                                    <MaterialCommunityIcons name="check-decagram" size={18} color="#0066FF" style={{ marginRight: 5 }} />
                                    <Text style={{ color: '#0066FF', fontWeight: 'bold', textTransform: 'uppercase' }}>{status}</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.submitButton, isSaving && {opacity: 0.7}]} onPress={handleSaveChanges} disabled={isSaving}>
                                {isSaving ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.buttonText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>

                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

// --- REUSABLE COMPONENT ---
const PasswordCheck = ({ isValid, text }) => (
    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
        <Ionicons name={isValid ? "checkmark-circle" : "close-circle"} size={16} color={isValid ? "#0066FF" : "#A9A9A9"} />
        <Text style={{marginLeft: 8, fontSize: 13, color: isValid ? "#0066FF" : "#888"}}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { backgroundColor: '#0066FF', paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
    headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
    backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },
    
    content: { padding: 20, paddingTop: 30 },
    sectionTitle: { fontSize: 11, fontWeight: 'bold', color: '#888', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 18, borderRadius: 16, marginBottom: 12, ...getSafeShadow() },
    menuIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    menuText: { flex: 1, fontSize: 16, color: '#333', fontWeight: '600' },
    
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#FFCDD2', padding: 18, borderRadius: 16, ...getSafeShadow() },
    logoutText: { color: '#D50000', fontWeight: 'bold', fontSize: 16 },

    // MODAL STYLES
    modalHeader: { backgroundColor: '#0066FF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5 },
    modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    noteText: { fontSize: 11, color: '#D32F2F', marginBottom: 15, fontStyle: 'italic', lineHeight: 16 },
    inputContainer: { marginBottom: 15 },
    label: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 5 },
    input: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, fontSize: 14, color: '#333', borderWidth: 1, borderColor: '#E4E6EB' },
    disabledInput: { backgroundColor: '#E0E0E0', color: '#777', borderColor: '#ccc', borderWidth: 1 },
    passwordRulesContainer: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
    submitButton: { backgroundColor: '#0066FF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, elevation: 3, shadowColor: '#0066FF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});