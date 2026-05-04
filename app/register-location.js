import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

// 🟢 IMPORT SUPABASE AT LIBRARY
import { barangays, city_mun, provinces, regions } from 'phil-reg-prov-mun-brgy';
import { supabase } from '../lib/supabase'; 

export default function RegisterLocation() {
    const router = useRouter();
    const insets = useSafeAreaInsets(); 
    
    // --- AUTH & OFFICER STATES ---
    const [officerName, setOfficerName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    // --- LOCATION FORM STATES ---
    const [programName, setProgramName] = useState('');
    const [locationName, setLocationName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    
    // Address Values (Names)
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedBarangay, setSelectedBarangay] = useState('');

    // Codes (Para sa filtering)
    const [regionCode, setRegionCode] = useState('');
    const [provinceCode, setProvinceCode] = useState('');
    const [cityCode, setCityCode] = useState('');

    const [duration, setDuration] = useState('5 months or Less (Short - Term)'); 
    const [permitImage, setPermitImage] = useState(null);
    const [socialLink, setSocialLink] = useState('');
    
    // --- PROCESS STATES ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false); // 🟢 Gagamitin na natin ito as trigger sa Modal!
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpCode, setOtpCode] = useState('');

    // --- DYNAMIC ADDRESS FILTERING ---
    const regionList = regions.map(r => ({ label: r.name, value: r.reg_code }));
    const provinceList = regionCode ? provinces.filter(p => p.reg_code.toString() === regionCode.toString()).map(p => ({ label: p.name, value: p.prov_code })) : [];
    const cityList = provinceCode ? city_mun.filter(c => c.prov_code.toString() === provinceCode.toString()).map(c => ({ label: c.name, value: c.mun_code })) : [];
    const barangayList = cityCode ? barangays.filter(b => b.mun_code.toString() === cityCode.toString()).map(b => ({ label: b.name, value: b.name })) : [];

    // --- HANDLERS ---
    const handlePhoneChange = (text) => {
        const filteredText = text.replace(/[^0-9]/g, '');
        setContactNumber(filteredText);
    };

    const handleRegionChange = (item) => {
        setSelectedRegion(item.label); setRegionCode(item.value);
        setSelectedProvince(''); setProvinceCode('');
        setSelectedCity(''); setCityCode('');
        setSelectedBarangay('');
    };

    const handleProvinceChange = (item) => {
        setSelectedProvince(item.label); setProvinceCode(item.value);
        setSelectedCity(''); setCityCode(''); setSelectedBarangay('');
    };

    const handleCityChange = (item) => {
        setSelectedCity(item.label); setCityCode(item.value); setSelectedBarangay('');
    };

    const handleBarangayChange = (item) => {
        setSelectedBarangay(item.label);
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.5,
        });
        if (!result.canceled) { setPermitImage(result.assets[0].uri); }
    };

    // --- PASSWORD VALIDATION LOGIC ---
    const isMinLength = password.length >= 8;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-]/.test(password);
    const isPasswordValid = isMinLength && hasLower && hasUpper && hasNumber && hasSpecial;

    // --- SUBMIT 1: SIGNUP & REQUEST OTP ---
    const handleInitialSubmit = async () => {
        if(!officerName || !email || !password || !confirmPassword || !programName || !locationName || !contactNumber || !selectedRegion || !selectedProvince || !selectedCity || !selectedBarangay) {
            Alert.alert("Missing Fields", "Please fill in all details."); return;
        }
        
        const emailRegex = /^[^\s]+@[^\s]+\.[^\s]+$/;
        if (!emailRegex.test(email.trim())) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.'); return;
        }

        if (!isPasswordValid) {
            Alert.alert('Weak Password', 'Please ensure all password requirements are met (all checks must be green).'); return;
        }
        
        if (password !== confirmPassword) {
            Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.'); return;
        }

        if (duration.includes('Less') && !permitImage) {
            Alert.alert("Requirement Missing", "Please upload your Barangay/LGU Permit."); return;
        }
        if (duration.includes('More') && !socialLink) {
            Alert.alert("Requirement Missing", "Please provide an active FB Page/Social Link."); return;
        }

        setIsSubmitting(true);

        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                data: {
                    full_name: officerName.trim(),
                    role: 'center' 
                }
            }
        });

        if (data?.session) {
            await supabase.auth.signOut();
        }

        if (error) {
            setIsSubmitting(false);
            Alert.alert('Signup Error', error.message);
            return;
        }

        if (data?.user && data.user.identities && data.user.identities.length === 0) {
            setIsSubmitting(false);
            Alert.alert('Email Already in Use', 'Nagamit na ang email na ito sa GreenSort.');
            return;
        }

        setIsSubmitting(false);
        setShowOtpModal(true); 
    };

    // --- SUBMIT 2: VERIFY OTP & SAVE DATA ---
    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length < 6) {
            Alert.alert('Invalid Code', 'Please enter the verification code sent to your email.'); return;
        }

        setIsSubmitting(true);
        const { error } = await supabase.auth.verifyOtp({
            email: email.trim(),
            token: otpCode,
            type: 'signup'
        });

        if (error) {
            setIsSubmitting(false);
            Alert.alert('Verification Failed', error.message);
            return;
        }

        let uploadedPermitUrl = socialLink; 

        if (duration.includes('Less') && permitImage) {
            try {
                const formData = new FormData();
                formData.append('file', {
                    uri: permitImage,
                    name: `permit_${Date.now()}.jpg`,
                    type: 'image/jpeg',
                });

                const { data: uploadData, error: uploadError } = await supabase.storage.from('permits').upload(`public/${Date.now()}.jpg`, formData);
                if (uploadError) throw uploadError;

                const { data: urlData } = supabase.storage.from('permits').getPublicUrl(uploadData.path);
                uploadedPermitUrl = urlData.publicUrl;
            } catch (e) {
                Alert.alert("Upload Failed", "Could not upload the permit image.");
                setIsSubmitting(false);
                return;
            }
        }

        const { error: dbError } = await supabase.from('dropoff_applications').insert([{
            user_email: email.trim(),
            program_name: programName,
            applicant_name: locationName, 
            contact_number: contactNumber,
            region: selectedRegion,
            province: selectedProvince,
            city: selectedCity,
            barangay: selectedBarangay,
            operation_duration: duration,
            permit_url: uploadedPermitUrl,
            status: 'pending' 
        }]);

        await supabase.auth.signOut();

        if (dbError) {
            Alert.alert("Error", "Could not submit application. " + dbError.message);
            setIsSubmitting(false);
        } else {
            setIsSubmitting(false);
            setShowOtpModal(false);
            setIsSubmitted(true); // 🟢 Ito ang magta-trigger sa pop-up modal natin
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

            <View style={[styles.header, { paddingTop: Math.max(insets.top, 45) + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={{padding: 5}}>
                    <MaterialCommunityIcons name="chevron-left" size={30} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Register Drop-off Location</Text>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : undefined} 
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    
                    <Text style={styles.sectionTitle}>Account Credentials</Text>
                    <InputGroup label="Full Name of the Officer" placeholder="Juan Dela Cruz" val={officerName} setVal={setOfficerName} />
                    <InputGroup label="Center Email Address" placeholder="center@gmail.com" val={email} setVal={setEmail} keyboard="email-address" />
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Enter New Password</Text>
                        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
                    </View>

                    {password.length > 0 && (
                        <View style={styles.passwordRulesContainer}>
                            <PasswordCheck isValid={isMinLength} text="Minimum of 8 characters" />
                            <PasswordCheck isValid={hasLower} text="At least 1 lowercase letter (a-z)" />
                            <PasswordCheck isValid={hasUpper} text="At least 1 uppercase letter (A-Z)" />
                            <PasswordCheck isValid={hasNumber} text="At least 1 number" />
                            <PasswordCheck isValid={hasSpecial} text="At least 1 special character (e.g. ! @ # $ % - _)" />
                        </View>
                    )}

                    <View style={{ marginBottom: 15 }}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput 
                            style={[
                                styles.input, 
                                confirmPassword.length > 0 && password !== confirmPassword ? { borderColor: '#D50000', borderWidth: 1.5 } : 
                                confirmPassword.length > 0 && password === confirmPassword ? { borderColor: '#38B000', borderWidth: 1.5 } : {}
                            ]} 
                            placeholder="Re-enter your password" 
                            value={confirmPassword} 
                            onChangeText={setConfirmPassword} 
                            secureTextEntry 
                        />
                        {confirmPassword.length > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                                <Ionicons name={password === confirmPassword ? "checkmark-circle" : "close-circle"} size={14} color={password === confirmPassword ? "#38B000" : "#D50000"} />
                                <Text style={{
                                    color: password === confirmPassword ? '#38B000' : '#D50000',
                                    fontSize: 12,
                                    marginLeft: 4,
                                    fontWeight: '600'
                                }}>
                                    {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.sectionTitle}>Basic Information</Text>
                    <InputGroup label="Program Name" placeholder="e.g. Trash-to-Cashback" val={programName} setVal={setProgramName} />
                    <InputGroup label="Exact Location of the Program" placeholder="Brgy. San Isidro Hall / My Store" val={locationName} setVal={setLocationName} />
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Contact Number</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="63+ 9123456789" 
                            value={contactNumber} 
                            onChangeText={handlePhoneChange} 
                            keyboardType="number-pad"
                            maxLength={12}
                        />
                        <Text style={{fontSize: 10, color: '#888', marginTop: 3}}>PH based numbers only (Up to 12 digits).</Text>
                    </View>

                    <Text style={styles.sectionTitle}>Location Details</Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Country</Text>
                        <View style={[styles.input, {backgroundColor: '#eee'}]}><Text>Philippines</Text></View>
                    </View>

                    <CustomDropdown label="Region" value={selectedRegion} options={regionList} onSelect={handleRegionChange} />
                    <CustomDropdown label="Province" value={selectedProvince} options={provinceList} onSelect={handleProvinceChange} disabled={!selectedRegion} />
                    <CustomDropdown label="City / Municipality" value={selectedCity} options={cityList} onSelect={handleCityChange} disabled={!selectedProvince} />
                    <CustomDropdown label="Barangay" value={selectedBarangay} options={barangayList} onSelect={handleBarangayChange} disabled={!selectedCity} />

                    <Text style={styles.sectionTitle}>Verification Details</Text>
                    <CustomDropdown 
                        label="Duration" 
                        value={duration} 
                        options={[{label: '5 months or Less (Short - Term)', value: 'Short'}, {label: '6 months or More (Long - Term)', value: 'Long'}]} 
                        onSelect={(item) => setDuration(item.label)} 
                    />

                    <View style={styles.requirementBox}>
                        {duration.includes('Less') ? (
                            <>
                                <Text style={styles.reqLabel}>Barangay/LGU Permit</Text>
                                <Text style={styles.reqSub}>Upload your valid Barangay/LGU permit</Text>
                                <TouchableOpacity style={styles.uploadArea} onPress={pickImage}>
                                    {permitImage ? (
                                        <Image source={{ uri: permitImage }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons name="cloud-upload-outline" size={30} color="#007BFF" />
                                            <Text style={{color: '#007BFF', marginTop: 5}}>Click to upload image</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.reqLabel}>Social Proof / Active Page</Text>
                                <Text style={styles.reqSub}>Provide an active FB Page link or Website for verification</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="https://facebook.com/my-page" 
                                    value={socialLink}
                                    onChangeText={setSocialLink}
                                />
                            </>
                        )}
                    </View>

                    <TouchableOpacity style={[styles.submitButton, isSubmitting && {opacity: 0.7}]} onPress={handleInitialSubmit} disabled={isSubmitting}>
                        {isSubmitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.buttonText}>Submit Application</Text>
                        )}
                    </TouchableOpacity>

                    <View style={{height: 50}} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* --- OTP MODAL --- */}
            <Modal visible={showOtpModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={{alignItems: 'center', marginBottom: 20}}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="mail-unread" size={40} color="#007BFF" />
                            </View>
                            <Text style={styles.modalTitle}>Verify Center Email</Text>
                            <Text style={styles.modalSub}>We sent a verification code to <Text style={{fontWeight: 'bold', color: '#333'}}>{email}</Text></Text>
                        </View>

                        <TextInput
                            style={styles.otpInput}
                            placeholder="Enter code"
                            keyboardType="number-pad"
                            maxLength={8}
                            value={otpCode}
                            onChangeText={setOtpCode}
                            textAlign="center"
                        />
                        
                        <TouchableOpacity style={[styles.submitButton, {marginTop: 10, backgroundColor: '#007BFF'}]} onPress={handleVerifyOtp} disabled={isSubmitting}>
                            {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>VERIFY & COMPLETE</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowOtpModal(false)} disabled={isSubmitting}>
                            <Text style={{color: '#666', fontWeight: 'bold'}}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 🟢 SUCCESS POP-UP MODAL (Match na match sa Figma design mo!) --- */}
            <Modal visible={isSubmitted} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.successCard}>
                        <Text style={styles.successTitle}>You’re One Step Away!</Text>
                        <Text style={styles.successText}>
                            Your request to become a Drop-off Point is now Under Review. Please wait for the Admin to verify your submitted documents. You will receive a notification once your application is approved.
                        </Text>
                        <TouchableOpacity 
                            style={styles.blueButton} 
                            // 🟢 ROUTE TO HOME/ONBOARDING "Join Our Community"
                            onPress={() => router.replace('/')} 
                        >
                            <Text style={styles.buttonText}>Back to Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// --- REUSABLE COMPONENTS ---

const PasswordCheck = ({ isValid, text }) => (
    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 6}}>
        <Ionicons name={isValid ? "checkmark-circle" : "close-circle"} size={16} color={isValid ? "#38B000" : "#A9A9A9"} />
        <Text style={{marginLeft: 8, fontSize: 13, color: isValid ? "#38B000" : "#888"}}>{text}</Text>
    </View>
);

const InputGroup = ({ label, placeholder, val, setVal, keyboard='default' }) => (
    <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput style={styles.input} placeholder={placeholder} value={val} onChangeText={setVal} keyboardType={keyboard} autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}/>
    </View>
);

const CustomDropdown = ({ label, value, options, onSelect, disabled }) => {
    const [visible, setVisible] = useState(false);
    
    return (
        <View style={[styles.inputContainer, { opacity: disabled ? 0.5 : 1 }]}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity 
                style={styles.dropdown} 
                onPress={() => !disabled && setVisible(true)}
            >
                <Text style={{ color: value ? '#333' : '#aaa' }}>{value || `Select ${label}`}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeaderTitle}>Select {label}</Text>
                        <ScrollView style={{maxHeight: 300}}>
                            {options.length > 0 ? options.map((opt, index) => (
                                <TouchableOpacity key={index} style={styles.modalItem} onPress={() => {
                                    onSelect(opt);
                                    setVisible(false);
                                }}>
                                    <Text>{opt.label}</Text>
                                </TouchableOpacity>
                            )) : (
                                <Text style={{padding: 20, textAlign: 'center', color: '#888'}}>No options available</Text>
                            )}
                        </ScrollView>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
                            <Text style={{color: 'red', fontWeight: 'bold'}}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    
    header: { 
        backgroundColor: '#007BFF', 
        paddingBottom: 25, 
        paddingHorizontal: 20, 
        flexDirection: 'row', 
        alignItems: 'center',
        borderBottomLeftRadius: 25, 
        borderBottomRightRadius: 25, 
        elevation: 5, 
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        zIndex: 10, 
    },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    
    scrollContent: { padding: 20 },
    
    sectionTitle: { fontSize: 15, fontWeight: 'bold', marginTop: 15, marginBottom: 15, color: '#333' },
    inputContainer: { marginBottom: 15 },
    label: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 5 },
    input: { backgroundColor: '#E3F2FD', padding: 14, borderRadius: 8, fontSize: 14, color: '#333' },
    dropdown: { backgroundColor: '#E3F2FD', padding: 14, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    
    passwordRulesContainer: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },

    requirementBox: { backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: '#BBDEFB', borderStyle: 'dashed' },
    reqLabel: { fontWeight: 'bold', color: '#007BFF' },
    reqSub: { fontSize: 10, color: '#555', marginBottom: 10 },
    uploadArea: { height: 100, backgroundColor: 'white', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
    
    submitButton: { backgroundColor: '#007BFF', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 30 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }, // 🟢 Added alignItems center para gitna ang modal card
    modalContent: { width: '100%', backgroundColor: 'white', borderRadius: 12, padding: 20 },
    modalHeaderTitle: { fontWeight: 'bold', marginBottom: 15, fontSize: 16, textAlign: 'center' },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    closeBtn: { marginTop: 20, alignItems: 'center' },

    modalCard: { width: '100%', backgroundColor: 'white', borderRadius: 20, padding: 30, elevation: 10 },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E3F2FD', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    modalSub: { fontSize: 14, color: '#666', textAlign: 'center' },
    otpInput: { backgroundColor: '#F5F5F5', paddingVertical: 15, borderRadius: 12, fontSize: 20, fontWeight: 'bold', color: '#007BFF', borderWidth: 2, borderColor: '#E0E0E0', letterSpacing: 3, marginTop: 15 },

    // 🟢 POP-UP SUCCESS MODAL STYLES (MATCHES FIGMA)
    successCard: { 
        width: '95%', 
        padding: 25, 
        borderRadius: 15, 
        backgroundColor: 'white', 
        alignItems: 'center', 
        borderWidth: 1.5, 
        borderColor: '#007BFF', // Blue border based sa image
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    successTitle: { fontSize: 20, fontWeight: 'bold', color: '#007BFF', marginBottom: 15, textAlign: 'center' },
    successText: { textAlign: 'center', color: '#333', marginBottom: 25, lineHeight: 22, fontSize: 13 },
    blueButton: { backgroundColor: '#007BFF', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 20 },
});