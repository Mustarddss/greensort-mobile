import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Switch, Image, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export default function ManageRewards() {
  const router = useRouter();
  
  // --- STATES ---
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Form States
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formQty, setFormQty] = useState('1');
  const [formUnit, setFormUnit] = useState('kg');
  const [formType, setFormType] = useState('Clean Dry Plastic');
  const [formImage, setFormImage] = useState(null);
  const [isStockAvailable, setIsStockAvailable] = useState(true);

  // MOCK DATA (Initial Rewards)
  const [rewards, setRewards] = useState([
    { 
      id: 1, 
      name: '1kg Rice', 
      desc: 'Premium Sinandomeng Rice', 
      condition: '3kg Clean Dry Plastic', 
      tags: ['Plastics', 'Paper'], 
      image: null, 
      isAvailable: true 
    },
    { 
      id: 2, 
      name: 'Canned Sardines', 
      desc: '555 Sardines in Tomato Sauce', 
      condition: '1kg Metal Cans', 
      tags: ['Metal'], 
      image: null, 
      isAvailable: false // Out of stock sample
    },
  ]);

  // --- HANDLERS ---

  // 1. Open Add Modal
  const openAddModal = () => {
    setIsEditing(false);
    resetForm();
    setModalVisible(true);
  };

  // 2. Open Edit Modal
  const openEditModal = (item) => {
    setIsEditing(true);
    setSelectedId(item.id);
    setFormName(item.name);
    setFormDesc(item.desc);
    // Sa totoong app, ipaparse mo yung condition string
    setFormType('Clean Dry Plastic'); 
    setFormImage(item.image);
    setIsStockAvailable(item.isAvailable);
    setModalVisible(true);
  };

  // 3. Pick Image
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setFormImage(result.assets[0].uri);
    }
  };

  // 4. Save (Add or Update)
  const handleSave = () => {
    if (!formName || !formType) {
        Alert.alert("Missing Info", "Please provide item name and condition.");
        return;
    }

    const conditionString = `${formQty}${formUnit} ${formType}`;

    if (isEditing) {
        // UPDATE EXISTING
        setRewards(rewards.map(item => 
            item.id === selectedId 
            ? { ...item, name: formName, desc: formDesc, condition: conditionString, image: formImage, isAvailable: isStockAvailable } 
            : item
        ));
    } else {
        // CREATE NEW
        const newItem = {
            id: Date.now(),
            name: formName,
            desc: formDesc,
            condition: conditionString,
            tags: ['General'], // Default tag
            image: formImage,
            isAvailable: isStockAvailable
        };
        setRewards([newItem, ...rewards]);
    }
    setModalVisible(false);
  };

  // 5. Delete
  const handleDelete = (id) => {
    Alert.alert("Delete Reward", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => setRewards(rewards.filter(r => r.id !== id)) }
    ]);
  };

  // 6. Toggle Stock Directly
  const toggleStock = (id) => {
    setRewards(rewards.map(item => 
        item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
    ));
  };

  // Reset Form Helper
  const resetForm = () => {
    setFormName(''); setFormDesc(''); setFormQty('1'); setFormImage(null); setIsStockAvailable(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />

      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 10 : 45 }]}>
        <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()}>
                <MaterialCommunityIcons name="chevron-left" size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Manage Rewards</Text>
            <View style={{width: 30}} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        
        {/* ADD BUTTON */}
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <MaterialCommunityIcons name="plus" size={24} color="white" />
            <Text style={styles.addBtnText}>Add New Incentive</Text>
        </TouchableOpacity>

        {/* INFO BANNER */}
        <View style={styles.banner}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#0066FF" />
            <View style={{marginLeft: 10, flex: 1}}>
                <Text style={styles.bannerTitle}>Preview Mode</Text>
                <Text style={styles.bannerText}>Below is how users will see your incentives in the Exchange screen</Text>
            </View>
        </View>

        {/* LIST OF REWARDS */}
        {rewards.map((item) => (
            <View key={item.id} style={styles.card}>
                {/* Status Badge */}
                <View style={[styles.badge, {backgroundColor: item.isAvailable ? '#E8F5E9' : '#FFEBEE'}]}>
                    <Text style={{color: item.isAvailable ? '#00C853' : '#D32F2F', fontSize: 10, fontWeight: 'bold'}}>
                        {item.isAvailable ? 'Available' : 'Out of Stock'}
                    </Text>
                </View>

                <View style={styles.cardContent}>
                    {/* Image */}
                    <View style={styles.itemImage}>
                        {item.image ? (
                            <Image source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <MaterialCommunityIcons name="image-outline" size={30} color="#ccc" />
                        )}
                    </View>

                    {/* Details */}
                    <View style={{flex: 1, marginLeft: 15}}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={styles.conditionBox}>
                            <Text style={styles.conditionText}>Requires {item.condition}</Text>
                        </View>
                        <View style={styles.tagsRow}>
                            {item.tags.map((tag, idx) => (
                                <View key={idx} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Actions */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                        <MaterialCommunityIcons name="pencil" size={16} color="#333" />
                        <Text style={styles.btnLabel}> Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.stockBtn, {borderColor: item.isAvailable ? '#D32F2F' : '#00C853'}]} 
                        onPress={() => toggleStock(item.id)}
                    >
                        <Text style={{color: item.isAvailable ? '#D32F2F' : '#00C853', fontSize: 12, fontWeight: 'bold'}}>
                            {item.isAvailable ? 'Mark Out of Stock' : 'Mark Available'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        ))}
        
        <View style={{height: 50}} />
      </ScrollView>


      {/* 🟢 MODAL (CREATE / EDIT) */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{isEditing ? 'Edit Incentive' : 'Create Incentive'}</Text>
                    <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                        {formImage ? (
                            <Image source={{ uri: formImage }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="plus" size={20} color="#666" />
                                <Text style={{fontSize: 10, color: '#666'}}>Upload</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={styles.label}>Item Name</Text>
                    <TextInput style={styles.input} placeholder="e.g. 1kg Rice" value={formName} onChangeText={setFormName} />

                    <Text style={styles.label}>Description</Text>
                    <TextInput style={[styles.input, {height: 60}]} multiline placeholder="Item details..." value={formDesc} onChangeText={setFormDesc} />

                    <Text style={styles.label}>Exchange Condition</Text>
                    <View style={{flexDirection: 'row', gap: 10}}>
                        <TextInput style={[styles.input, {width: 60, textAlign: 'center'}]} value={formQty} onChangeText={setFormQty} keyboardType="numeric" />
                        <View style={[styles.input, {width: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee'}]}>
                            <Text>{formUnit}</Text>
                        </View>
                        <View style={[styles.input, {flex: 1, justifyContent: 'center', backgroundColor: '#eee'}]}>
                            <Text>{formType}</Text> 
                        </View>
                    </View>

                    <View style={styles.switchRow}>
                        <Text style={styles.label}>Stock Status (Available)</Text>
                        <Switch 
                            value={isStockAvailable} 
                            onValueChange={setIsStockAvailable}
                            trackColor={{ false: "#767577", true: "#00C853" }}
                        />
                    </View>

                    <View style={styles.modalBtnRow}>
                        <TouchableOpacity style={styles.cancelModalBtn} onPress={() => setModalVisible(false)}>
                            <Text style={{color: '#666'}}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveModalBtn} onPress={handleSave}>
                            <Text style={{color: 'white', fontWeight: 'bold'}}>{isEditing ? 'Update' : 'Create'}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  
  // Header
  header: { backgroundColor: '#0066FF', paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },

  body: { padding: 20 },

  // Buttons & Banner
  addBtn: { backgroundColor: '#008000', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 3 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 5 },
  banner: { backgroundColor: '#E3F2FD', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#90CAF9' },
  bannerTitle: { fontWeight: 'bold', color: '#0066FF', fontSize: 12 },
  bannerText: { fontSize: 10, color: '#555' },

  // Cards
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2, position: 'relative' },
  badge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  cardContent: { flexDirection: 'row', marginBottom: 15 },
  itemImage: { width: 60, height: 60, backgroundColor: '#f0f0f0', borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  itemName: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  conditionBox: { backgroundColor: '#FFF3E0', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginTop: 5 },
  conditionText: { fontSize: 10, color: '#E65100', fontWeight: 'bold' },
  tagsRow: { flexDirection: 'row', marginTop: 5, gap: 5 },
  tag: { backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 9, color: '#666' },

  // Card Actions
  actionRow: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingVertical: 8 },
  btnLabel: { fontSize: 12, fontWeight: '600' },
  stockBtn: { flex: 1.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingVertical: 8 },
  deleteBtn: { width: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#D32F2F', borderRadius: 6 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', width: '100%', borderRadius: 15, padding: 20, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  uploadBox: { width: 60, height: 60, backgroundColor: '#eee', borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  label: { fontSize: 12, fontWeight: '600', color: '#555', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8, fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 30 },
  cancelModalBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#eee', borderRadius: 20 },
  saveModalBtn: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#00C853', borderRadius: 20 },
});