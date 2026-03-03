import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Switch, Image, Alert, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ManageRewards() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [rewards, setRewards] = useState([]);
  const [userEmail, setUserEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal & Form States
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formQty, setFormQty] = useState('1');
  const [formUnit, setFormUnit] = useState('kg');
  const [formType, setFormType] = useState('Clean Dry Plastic');
  const [formImage, setFormImage] = useState(null);
  const [isStockAvailable, setIsStockAvailable] = useState(true);
  
  // 🟢 BAGONG STATE PARA SA CHECKLIST / NOTICE
  const [formChecklist, setFormChecklist] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        setUserEmail(user.email);
        const { data, error } = await supabase
            .from('rewards_inventory')
            .select('*')
            .eq('user_email', user.email)
            .order('id', { ascending: false });
        
        if (data) setRewards(data);
    }
    setIsLoading(false);
  };

  const openAddModal = () => { setIsEditing(false); resetForm(); setModalVisible(true); };

  const openEditModal = (item) => {
    setIsEditing(true);
    setSelectedId(item.id);
    setFormName(item.name);
    setFormDesc(item.description);
    setFormChecklist(item.checklist || ''); // 🟢 I-load ang saved checklist
    
    const match = item.condition.match(/(\d+)(kg|pcs)\s+(.*)/);
    if (match) {
        setFormQty(match[1]); setFormUnit(match[2]); setFormType(match[3]);
    } else {
        setFormQty('1'); setFormUnit('kg'); setFormType('Clean Dry Plastic');
    }

    setFormImage(item.image_url);
    setIsStockAvailable(item.is_available);
    setModalVisible(true);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.5,
    });
    if (!result.canceled) setFormImage(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!formName || !formType) return Alert.alert("Wait", "Please provide item name and condition.");
    setIsSaving(true);
    let uploadedImageUrl = formImage;

    if (formImage && !formImage.startsWith('http')) {
        try {
            const formData = new FormData();
            formData.append('file', { uri: formImage, name: `reward_${Date.now()}.jpg`, type: 'image/jpeg' });
            const { data, error } = await supabase.storage.from('post_images').upload(`rewards/${Date.now()}.jpg`, formData);
            if (!error) {
                const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path);
                uploadedImageUrl = urlData.publicUrl;
            }
        } catch(e) { console.log("Image upload error", e); }
    }

    const rewardData = {
        user_email: userEmail,
        name: formName,
        description: formDesc,
        condition: `${formQty}${formUnit} ${formType}`,
        image_url: uploadedImageUrl,
        is_available: isStockAvailable,
        checklist: formChecklist, // 🟢 ISASAVE NA SA SUPABASE
        tags: 'General'
    };

    if (isEditing) {
        await supabase.from('rewards_inventory').update(rewardData).eq('id', selectedId);
    } else {
        await supabase.from('rewards_inventory').insert([rewardData]);
    }

    setIsSaving(false); setModalVisible(false); fetchData();
  };

  const handleDelete = (id) => {
    Alert.alert("Delete", "Are you sure you want to remove this reward?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            await supabase.from('rewards_inventory').delete().eq('id', id);
            fetchData();
        }}
    ]);
  };

  const toggleStock = async (item) => {
    const newStatus = !item.is_available;
    setRewards(rewards.map(r => r.id === item.id ? { ...r, is_available: newStatus } : r));
    await supabase.from('rewards_inventory').update({ is_available: newStatus }).eq('id', item.id);
  };

  const resetForm = () => { 
    setFormName(''); setFormDesc(''); setFormChecklist(''); setFormQty('1'); setFormUnit('kg'); setFormType('Clean Dry Plastic'); setFormImage(null); setIsStockAvailable(true); 
  };

  if (isLoading) return <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}><ActivityIndicator size="large" color="#0066FF"/></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 10 : 45 }]}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()}><MaterialCommunityIcons name="chevron-left" size={30} color="white" /></TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Rewards</Text>
            <View style={{width: 30}} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <MaterialCommunityIcons name="plus" size={24} color="white" /><Text style={styles.addBtnText}>Add New Incentive</Text>
        </TouchableOpacity>

        <View style={styles.banner}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#0066FF" />
            <View style={{marginLeft: 10, flex: 1}}><Text style={styles.bannerTitle}>Preview Mode</Text><Text style={styles.bannerText}>Below is how users will see your incentives in the Exchange screen</Text></View>
        </View>

        {rewards.length === 0 ? <Text style={{textAlign: 'center', marginTop: 50, color: '#999'}}>No rewards added yet.</Text> : null}

        {rewards.map((item) => (
            <View key={item.id} style={styles.card}>
                <View style={[styles.badge, {backgroundColor: item.is_available ? '#E8F5E9' : '#FFEBEE'}]}>
                    <Text style={{color: item.is_available ? '#00C853' : '#D32F2F', fontSize: 10, fontWeight: 'bold'}}>{item.is_available ? 'Available' : 'Out of Stock'}</Text>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.itemImage}>
                        {item.image_url ? <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} /> : <MaterialCommunityIcons name="image-outline" size={30} color="#ccc" />}
                    </View>
                    <View style={{flex: 1, marginLeft: 15}}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={styles.conditionBox}><Text style={styles.conditionText}>Requires {item.condition}</Text></View>
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                        <MaterialCommunityIcons name="pencil" size={16} color="#333" /><Text style={styles.btnLabel}> Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.stockBtn, {borderColor: item.is_available ? '#D32F2F' : '#00C853'}]} onPress={() => toggleStock(item)}>
                        <Text style={{color: item.is_available ? '#D32F2F' : '#00C853', fontSize: 12, fontWeight: 'bold'}}>{item.is_available ? 'Mark Out of Stock' : 'Mark Available'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        ))}
        <View style={{height: 50}} />
      </ScrollView>

      {/* 🟢 MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditing ? 'Edit Incentive' : 'Create Incentive'}</Text>
                            <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                                {formImage ? <Image source={{ uri: formImage }} style={{ width: '100%', height: '100%', borderRadius: 8 }} /> : <><MaterialCommunityIcons name="plus" size={20} color="#666" /><Text style={{fontSize: 10, color: '#666'}}>Upload</Text></>}
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <Text style={styles.label}>Item Name</Text>
                            <TextInput style={styles.input} placeholder="e.g. 1kg Rice" value={formName} onChangeText={setFormName} />

                            <Text style={styles.label}>Description</Text>
                            <TextInput style={[styles.input, {height: 60}]} multiline placeholder="Item details..." value={formDesc} onChangeText={setFormDesc} />

                            <Text style={styles.label}>Exchange Condition</Text>
                            <View style={{flexDirection: 'row', gap: 10}}>
                                <TextInput style={[styles.input, {width: 60, textAlign: 'center'}]} value={formQty} onChangeText={setFormQty} keyboardType="numeric" />
                                <TextInput style={[styles.input, {width: 60, textAlign: 'center'}]} value={formUnit} onChangeText={setFormUnit} placeholder="kg" />
                                <TextInput style={[styles.input, {flex: 1}]} value={formType} onChangeText={setFormType} placeholder="e.g. Clean Dry Plastic" />
                            </View>

                            {/* 🟢 BAGONG INPUT PARA SA CHECKLIST */}
                            <Text style={styles.label}>Before You Go (Notice / Checklist)</Text>
                            <TextInput 
                                style={[styles.input, {height: 60}]} 
                                multiline 
                                placeholder="e.g. Please separate plastics by color. Bring ID." 
                                value={formChecklist} 
                                onChangeText={setFormChecklist} 
                            />

                            <View style={styles.switchRow}>
                                <Text style={styles.label}>Stock Status (Available)</Text>
                                <Switch value={isStockAvailable} onValueChange={setIsStockAvailable} trackColor={{ false: "#767577", true: "#00C853" }} />
                            </View>

                            <View style={styles.modalBtnRow}>
                                <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setModalVisible(false)}><Text style={{color: '#666'}}>Cancel</Text></TouchableOpacity>
                                <TouchableOpacity style={styles.saveModalBtn} onPress={handleSave} disabled={isSaving}>
                                    {isSaving ? <ActivityIndicator color="white" /> : <Text style={{color: 'white', fontWeight: 'bold'}}>{isEditing ? 'Update' : 'Create'}</Text>}
                                </TouchableOpacity>
                            </View>
                            <View style={{height: 20}} />
                        </ScrollView>
                    </View>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#0066FF', paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  body: { padding: 20 },
  addBtn: { backgroundColor: '#008000', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 3 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 5 },
  banner: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#90CAF9' },
  bannerTitle: { fontWeight: 'bold', color: '#0066FF', fontSize: 12 },
  bannerText: { fontSize: 10, color: '#555' },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2, position: 'relative' },
  badge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  cardContent: { flexDirection: 'row', marginBottom: 15 },
  itemImage: { width: 60, height: 60, backgroundColor: '#f0f0f0', borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  itemName: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  conditionBox: { backgroundColor: '#FFF3E0', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginTop: 5 },
  conditionText: { fontSize: 10, color: '#E65100', fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingVertical: 8 },
  btnLabel: { fontSize: 12, fontWeight: '600' },
  stockBtn: { flex: 1.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingVertical: 8 },
  deleteBtn: { width: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#D32F2F', borderRadius: 6 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  uploadBox: { width: 60, height: 60, backgroundColor: '#eee', borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  label: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8, fontSize: 14, color: '#333' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelModalBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#eee', borderRadius: 20 },
  saveModalBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#00C853', borderRadius: 20 },
});