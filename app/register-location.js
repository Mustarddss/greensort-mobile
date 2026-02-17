import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// 🟢 IMPORT LIBRARY
import { regions, provinces, city_mun, barangays } from 'phil-reg-prov-mun-brgy';

export default function RegisterLocation() {
    const router = useRouter();
    
    // --- FORM STATES ---
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
    const [isSubmitted, setIsSubmitted] = useState(false); 

    // --- DYNAMIC ADDRESS FILTERING (FIXED) ---
    
    // 1. Regions
    const regionList = regions.map(r => ({ label: r.name, value: r.reg_code }));

    // 2. Provinces (FIX: Added toString() para mag-match kahit number/string)
    const provinceList = regionCode 
        ? provinces
            .filter(p => p.reg_code.toString() === regionCode.toString()) 
            .map(p => ({ label: p.name, value: p.prov_code })) 
        : [];

    // 3. Cities/Municipalities (FIX: Added toString())
    const cityList = provinceCode 
        ? city_mun
            .filter(c => c.prov_code.toString() === provinceCode.toString())
            .map(c => ({ label: c.name, value: c.mun_code })) 
        : [];

    // 4. Barangays (FIX: Added toString())
    const barangayList = cityCode 
        ? barangays
            .filter(b => b.mun_code.toString() === cityCode.toString())
            .map(b => ({ label: b.name, value: b.name })) 
        : [];

    // --- HANDLERS ---
    const handleRegionChange = (item) => {
        setSelectedRegion(item.label);
        setRegionCode(item.value);
        // Reset Lower Levels
        setSelectedProvince(''); setProvinceCode('');
        setSelectedCity(''); setCityCode('');
        setSelectedBarangay('');
    };

    const handleProvinceChange = (item) => {
        setSelectedProvince(item.label);
        setProvinceCode(item.value);
        // Reset Lower Levels
        setSelectedCity(''); setCityCode('');
        setSelectedBarangay('');
    };

    const handleCityChange = (item) => {
        setSelectedCity(item.label);
        setCityCode(item.value);
        // Reset Lower Level
        setSelectedBarangay('');
    };

    const handleBarangayChange = (item) => {
        setSelectedBarangay(item.label);
    };

    // --- IMAGE PICKER ---
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });
        if (!result.canceled) {
            setPermitImage(result.assets[0].uri);
        }
    };

    // --- SUBMIT ---
    const handleSubmit = () => {
        if(!locationName || !contactNumber || !selectedRegion || !selectedProvince || !selectedCity || !selectedBarangay) {
            Alert.alert("Missing Fields", "Please fill in all location details.");
            return;
        }
        if (duration.includes('Less') && !permitImage) {
            Alert.alert("Requirement Missing", "Please upload your Barangay/LGU Permit.");
            return;
        }
        if (duration.includes('More') && !socialLink) {
            Alert.alert("Requirement Missing", "Please provide an active FB Page/Social Link.");
            return;
        }

        const formData = new FormData();
        formData.append('location_name', locationName);
        formData.append('contact', contactNumber);
        formData.append('full_address', `${selectedBarangay}, ${selectedCity}, ${selectedProvince}, ${selectedRegion}`);
        formData.append('duration', duration);
        
        if (duration.includes('Less')) {
            formData.append('permit_file', {
                uri: permitImage,
                name: 'permit.jpg',
                type: 'image/jpeg',
            });
        } else {
            formData.append('social_link', socialLink);
        }

        console.log("Submitting:", formData);
        setIsSubmitted(true);
    };

    if (isSubmitted) {
        return (
            <View style={styles.successContainer}>
                <View style={styles.successCard}>
                    <MaterialCommunityIcons name="check-circle" size={60} color="#00C853" style={{marginBottom: 10}} />
                    <Text style={styles.successTitle}>Application Submitted! 🌱</Text>
                    <Text style={styles.successText}>
                        Your request to become a Drop-off Point is now Under Review. 
                        Please wait for the Admin to verify your submitted documents.
                    </Text>
                    <TouchableOpacity 
                        style={styles.greenButton} 
                        onPress={() => router.push('/collector-dashboard')} 
                    >
                        <Text style={styles.buttonText}>Go to Collector Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={{padding: 5}}>
                    <MaterialCommunityIcons name="chevron-left" size={30} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Register Drop-off Location</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <Text style={styles.sectionTitle}>Basic Information</Text>
                <InputGroup label="Location Name" placeholder="Brgy. San Isidro Hall / My Store" val={locationName} setVal={setLocationName} />
                <InputGroup label="Contact Number" placeholder="63+ 9123456789" val={contactNumber} setVal={setContactNumber} keyboard="phone-pad" />

                <Text style={styles.sectionTitle}>Location Details</Text>
                
                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Country</Text>
                    <View style={[styles.input, {backgroundColor: '#eee'}]}><Text>Philippines</Text></View>
                </View>

                {/* DYNAMIC DROPDOWNS */}
                <CustomDropdown 
                    label="Region" 
                    value={selectedRegion} 
                    options={regionList} 
                    onSelect={handleRegionChange} 
                />
                
                <CustomDropdown 
                    label="Province" 
                    value={selectedProvince} 
                    options={provinceList} 
                    onSelect={handleProvinceChange} 
                    disabled={!selectedRegion} 
                />

                <CustomDropdown 
                    label="City / Municipality" 
                    value={selectedCity} 
                    options={cityList} 
                    onSelect={handleCityChange} 
                    disabled={!selectedProvince} 
                />

                <CustomDropdown 
                    label="Barangay" 
                    value={selectedBarangay} 
                    options={barangayList} 
                    onSelect={handleBarangayChange} 
                    disabled={!selectedCity} 
                />

                <Text style={styles.sectionTitle}>Operation Duration</Text>
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
                                        <MaterialCommunityIcons name="cloud-upload-outline" size={30} color="#2962FF" />
                                        <Text style={{color: '#2962FF', marginTop: 5}}>Click to upload image</Text>
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

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                    <Text style={styles.buttonText}>Submit Application</Text>
                </TouchableOpacity>

                <View style={{height: 50}} />
            </ScrollView>
        </View>
    );
}

// --- REUSABLE COMPONENTS ---

const InputGroup = ({ label, placeholder, val, setVal, keyboard='default' }) => (
    <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput style={styles.input} placeholder={placeholder} value={val} onChangeText={setVal} keyboardType={keyboard}/>
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
                <Text style={{ color: value ? '#000' : '#aaa' }}>{value || `Select ${label}`}</Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select {label}</Text>
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
                            <Text style={{color: 'red'}}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { backgroundColor: '#007BFF', paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    scrollContent: { padding: 20 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 10, color: '#333' },
    inputContainer: { marginBottom: 15 },
    label: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 5 },
    input: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 8, fontSize: 14 },
    dropdown: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    requirementBox: { backgroundColor: '#E3F2FD', padding: 15, borderRadius: 10, marginTop: 10, borderWidth: 1, borderColor: '#BBDEFB', borderStyle: 'dashed' },
    reqLabel: { fontWeight: 'bold', color: '#0D47A1' },
    reqSub: { fontSize: 10, color: '#555', marginBottom: 10 },
    uploadArea: { height: 100, backgroundColor: 'white', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
    submitButton: { backgroundColor: '#008000', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 30 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 },
    successCard: { width: '100%', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: '#00C853', alignItems: 'center', elevation: 5 },
    successTitle: { fontSize: 20, fontWeight: 'bold', color: '#00C853', marginBottom: 10 },
    successText: { textAlign: 'center', color: '#555', marginBottom: 20, lineHeight: 22 },
    greenButton: { backgroundColor: '#008000', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', borderRadius: 10, padding: 20 },
    modalTitle: { fontWeight: 'bold', marginBottom: 15, fontSize: 16 },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
    closeBtn: { marginTop: 15, alignItems: 'center' }
}); 