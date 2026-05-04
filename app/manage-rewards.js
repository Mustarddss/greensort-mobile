import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Switch, Image, Alert, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator'; 
import { supabase } from '../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ManageRewards() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [rewards, setRewards] = useState([]);
  const [userEmail, setUserEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [guidelinesVisible, setGuidelinesVisible] = useState(false);
  const [expandedGuide, setExpandedStep] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formName, setFormName] = useState('');
  const [rewardQty, setRewardQty] = useState('1');
  const [rewardUnit, setRewardUnit] = useState('kg');
  const [formDesc, setFormDesc] = useState('');
  const [rewardImage, setRewardImage] = useState(null);
  const [wasteImage, setWasteImage] = useState(null);

  const predefinedWasteTypes = ['Plastic Bottle', 'Glass Bottle', 'Metal', 'Cans', 'E-Waste', 'Cartons', 'Rubber', 'Textile'];
  const [selectedWasteTypes, setSelectedWasteTypes] = useState([]);
  const [otherWasteType, setOtherWasteType] = useState('');
  const [wasteQty, setWasteQty] = useState('10');
  const [wasteUnit, setWasteUnit] = useState('kg');

  const predefinedChecklist = ['Remove caps and labels', 'Do not crush plastic bottles', 'Ensure items are totally dry', 'Sort waste into separate bags'];
  const [selectedChecklists, setSelectedChecklists] = useState([]);
  const [otherChecklist, setOtherChecklist] = useState('');

  const [isBarangayOnly, setIsBarangayOnly] = useState(false);
  const [isStockAvailable, setIsStockAvailable] = useState(true);
  const [isCleanDryOnly, setIsCleanDryOnly] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        setUserEmail(user.email);
        const { data } = await supabase
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
    setFormName(item.name.replace(/^\d+(kg|pcs)\s+/, ''));
    setFormDesc(item.description);
    
    const match = item.condition.match(/(\d+)(kg|pcs)\s+(.*)/);
    if (match) {
        setWasteQty(match[1]); setWasteUnit(match[2]); 
        const types = match[3].split(', ');
        const matchedTypes = types.filter(t => predefinedWasteTypes.includes(t));
        const customType = types.filter(t => !predefinedWasteTypes.includes(t)).join(', ');
        setSelectedWasteTypes(matchedTypes);
        setOtherWasteType(customType);
    }

    setRewardImage(item.image_url);
    setWasteImage(item.waste_image_url || null);
    setIsStockAvailable(item.is_available);
    setIsBarangayOnly(item.tags?.includes('BarangayOnly') || false);
    setIsCleanDryOnly(item.checklist?.includes('Must be 100% clean and dry') || false);
    setModalVisible(true);
  };

  const processImage = async (uri) => {
    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [],
            { format: ImageManipulator.SaveFormat.JPEG }
        );

        const actions = [];
        const MAX_SIZE = 2048;

        if (manipResult.width > MAX_SIZE || manipResult.height > MAX_SIZE) {
            if (manipResult.width > manipResult.height) {
                actions.push({ resize: { width: MAX_SIZE } });
            } else {
                actions.push({ resize: { height: MAX_SIZE } });
            }
        }

        const finalManip = await ImageManipulator.manipulateAsync(
            uri,
            actions,
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        return finalManip.uri;
    } catch (error) {
        console.log("Error compressing image:", error);
        return uri; 
    }
  };

  const pickImage = async (type) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false, 
      quality: 1, 
    });
    if (!result.canceled) {
        setIsSaving(true); 
        const compressedUri = await processImage(result.assets[0].uri);
        setIsSaving(false);

        if (type === 'reward') setRewardImage(compressedUri);
        else setWasteImage(compressedUri); 
    }
  };

  const toggleSelection = (item, list, setList) => {
      if (list.includes(item)) setList(list.filter(i => i !== item));
      else setList([...list, item]);
  };

  const handleSave = async () => {
    if (!formName || (selectedWasteTypes.length === 0 && !otherWasteType)) {
        return Alert.alert("Incomplete", "Please provide a Reward Name and select at least one Accepted Waste Type.");
    }
    setIsSaving(true);
    
    let uploadedRewardUrl = rewardImage;
    if (rewardImage && !rewardImage.startsWith('http')) {
        try {
            const formData = new FormData();
            formData.append('file', { uri: rewardImage, name: `reward_${Date.now()}.jpg`, type: 'image/jpeg' });
            const { data, error } = await supabase.storage.from('post_images').upload(`rewards/${Date.now()}.jpg`, formData);
            if (!error) {
                const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path);
                uploadedRewardUrl = urlData.publicUrl;
            }
        } catch(e) { console.log("Reward upload error", e); }
    }

    let uploadedWasteUrl = wasteImage;
    if (wasteImage && !wasteImage.startsWith('http')) {
        try {
            const formData = new FormData();
            formData.append('file', { uri: wasteImage, name: `waste_${Date.now()}.jpg`, type: 'image/jpeg' });
            const { data, error } = await supabase.storage.from('post_images').upload(`rewards/waste_${Date.now()}.jpg`, formData);
            if (!error) {
                const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(data.path);
                uploadedWasteUrl = urlData.publicUrl;
            }
        } catch(e) { console.log("Waste upload error", e); }
    }

    const allWasteTypes = [...selectedWasteTypes];
    if (otherWasteType.trim()) allWasteTypes.push(otherWasteType.trim());
    const finalCondition = `${wasteQty}${wasteUnit} ${allWasteTypes.join(', ')}`;

    let checklistArr = [];
    if (isBarangayOnly) checklistArr.push("⚠️ OPEN FOR VERIFIED BARANGAY RESIDENTS ONLY.");
    if (isCleanDryOnly) checklistArr.push("Must be 100% clean and dry.");
    checklistArr.push(...selectedChecklists);
    if (otherChecklist.trim()) checklistArr.push(otherChecklist.trim());
    const finalChecklist = checklistArr.length > 0 ? "• " + checklistArr.join('\n• ') : "";

    const cleanFormName = formName.replace(/^\d+\s*(kg|pcs)\s*/i, '').trim();

    const rewardData = {
        user_email: userEmail,
        name: `${rewardQty}${rewardUnit} ${cleanFormName}`,
        description: formDesc,
        condition: finalCondition,
        image_url: uploadedRewardUrl,
        waste_image_url: uploadedWasteUrl, 
        is_available: isStockAvailable,
        checklist: finalChecklist,
        tags: isBarangayOnly ? 'BarangayOnly' : 'General'
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
    setFormName(''); setFormDesc(''); setRewardQty('1'); setRewardUnit('kg');
    setSelectedWasteTypes([]); setOtherWasteType(''); setWasteQty('10'); setWasteUnit('kg');
    setSelectedChecklists([]); setOtherChecklist('');
    setRewardImage(null); setWasteImage(null); 
    setIsStockAvailable(true); setIsBarangayOnly(false); setIsCleanDryOnly(true);
  };

  const guideSteps = [
    {
        id: 1,
        title: 'Upload Photos',
        subTitle: 'Reward item + reward Sample',
        icon: 'camera-outline',
        details: [
            { bold: 'Reward photo', text: ' — show the actual item users will receive (e.g., rice bag, grocery item)' },
            { bold: 'Waste photo', text: ' — show a sample of the recyclable waste you accept (e.g., clean bottles)' },
            { bold: '', text: 'Use clear, well-lit images on a plain light background.\nMax 50MB per photo' }
        ]
    },
    {
        id: 2,
        title: 'Reward Details',
        subTitle: 'Item name, quantity & Description',
        icon: 'document-text-outline',
        details: [
            { bold: 'Enter the item name clearly', text: ' — users will see this as their reward (e.g., "1kg White Rice")' },
            { bold: 'Set the quantity and unit', text: ' (kg, pcs, L) so users know exactly what they\'re getting.' },
            { bold: 'Add a short description', text: ' (max 120 characters) for extra context.' }
        ]
    },
    {
        id: 3,
        title: 'Accepted waste type',
        subTitle: 'Select recycle materials',
        icon: 'sync-circle-outline',
        details: [
            { bold: 'Select one or more waste types you accept', text: ' — Plastic, Paper, Metal, Glass, E-waste, etc.' },
            { bold: 'Specify the minimum quantity', text: ' required per exchange (e.g., 10 pieces of plastic bottles).' },
            { bold: 'A live exchange preview', text: ' will show users exactly what they bring and what they get.' }
        ]
    },
    {
        id: 4,
        title: 'Available Settings',
        subTitle: 'Barangay, Stock & Quantity',
        icon: 'settings-outline',
        details: [
            { bold: 'Disable this', text: ' if you accept waste from outside your barangay/community.' },
            { bold: 'Stock available Enable only', text: ' if the reward has sufficient quantity in stock.' },
            { bold: 'Clean & dry only', text: ' Require waste to be clean and dry before submission.' }
        ]
    },
    {
        id: 5,
        title: 'Final Step',
        subTitle: 'Review Before Publishing',
        icon: 'checkmark-circle-outline',
        details: [
            { bold: 'Review all details', text: ' — Item name, photos, waste types, and settings before saving.' },
            { bold: 'Once published,', text: ' users in your area will immediately see this incentive on their app.' },
            { bold: 'You can edit or deactivate', text: ' the incentive anytime from your dashboard.' }
        ]
    }
  ];

  if (isLoading) return <View style={[styles.container, {justifyContent:'center', alignItems:'center'}]}><ActivityIndicator size="large" color="#0066FF"/></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />

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

        {rewards.length === 0 ? <Text style={{textAlign: 'center', marginTop: 50, color: '#999'}}>No rewards added yet.</Text> : null}

        {rewards.map((item) => (
            <View key={item.id} style={styles.card}>
                <View style={[styles.badge, {backgroundColor: item.is_available ? '#E8F5E9' : '#FFEBEE'}]}>
                    <Text style={{color: item.is_available ? '#007C00' : '#D32F2F', fontSize: 10, fontWeight: 'bold'}}>{item.is_available ? 'Available' : 'Out of Stock'}</Text>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.itemImage}>
                        {item.image_url ? <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} /> : <MaterialCommunityIcons name="image-outline" size={30} color="#ccc" />}
                    </View>
                    <View style={{flex: 1, marginLeft: 15}}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <View style={styles.conditionBox}><Text style={styles.conditionText}>Requires: {item.condition}</Text></View>
                        {item.tags === 'BarangayOnly' && <Text style={{fontSize: 10, color: '#D32F2F', fontWeight: 'bold', marginTop: 4}}>* Brgy Residents Only</Text>}
                    </View>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                        <MaterialCommunityIcons name="pencil" size={16} color="#333" /><Text style={styles.btnLabel}> Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.stockBtn, {borderColor: item.is_available ? '#D32F2F' : '#007C00'}]} onPress={() => toggleStock(item)}>
                        <Text style={{color: item.is_available ? '#D32F2F' : '#007C00', fontSize: 12, fontWeight: 'bold'}}>{item.is_available ? 'Mark Out of Stock' : 'Mark Available'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                        <MaterialCommunityIcons name="trash-can-outline" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        ))}
        <View style={{height: 50}} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
            
            <View style={[styles.modalHeaderBox, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBackBtn}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={{flex: 1}}>
                    <Text style={styles.modalTitleText}>{isEditing ? 'Edit Incentive' : 'Add New Incentive'}</Text>
                    <Text style={styles.modalSubText}>Manage Exchange Reward Details</Text>
                </View>
                <TouchableOpacity onPress={() => setGuidelinesVisible(true)}>
                    <Ionicons name="information-circle-outline" size={26} color="white" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
                    
                    {/* 🟢 EXACT FIGMA ALIGNMENT FOR PHOTO UPLOADS */}
                    <View style={styles.photoUploadContainer}>
                        
                        <View style={styles.photoColumn}>
                            <Text style={styles.photoLabelText}>Reward Photo</Text>
                            <TouchableOpacity activeOpacity={0.8} onPress={() => pickImage('reward')}>
                                <View style={styles.photoBox}>
                                    {rewardImage ? (
                                        <Image source={{uri: rewardImage}} style={styles.fullImg} resizeMode="cover" />
                                    ) : (
                                        <View style={styles.placeholderCenter}>
                                            <MaterialCommunityIcons name="gift-outline" size={32} color="#0062FF" />
                                            <Text style={styles.uploadMainTxt}>Tap to Upload</Text>
                                            <Text style={styles.uploadSubTxt}>Reward Item</Text>
                                            <Text style={styles.uploadSmallTxt}>JPG/PNG</Text>
                                            <Text style={styles.uploadSmallTxt}>MAX 50 MB</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.swapIconContainer}>
                            <MaterialCommunityIcons name="swap-horizontal" size={26} color="#0062FF" />
                        </View>
                        
                        <View style={styles.photoColumn}>
                            <Text style={styles.photoLabelText}>Waste Photo</Text>
                            <TouchableOpacity activeOpacity={0.8} onPress={() => pickImage('waste')}>
                                <View style={styles.photoBox}>
                                    {wasteImage ? (
                                        <Image source={{uri: wasteImage}} style={styles.fullImg} resizeMode="cover" />
                                    ) : (
                                        <View style={styles.placeholderCenter}>
                                            <MaterialCommunityIcons name="recycle" size={32} color="#0062FF" />
                                            <Text style={styles.uploadMainTxt}>Tap to Upload</Text>
                                            <Text style={styles.uploadSubTxt}>Waste Sample</Text>
                                            <Text style={styles.uploadSmallTxt}>JPG/PNG</Text>
                                            <Text style={styles.uploadSmallTxt}>MAX 50 MB</Text>
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        </View>

                    </View>
                    
                    <Text style={styles.compressionNotice}>
                        * Note: Photos exceeding max size will be automatically compressed to 2048px resolution to prevent blur and optimize performance.
                    </Text>

                    <View style={styles.cardSection}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialCommunityIcons name="cog-outline" size={18} color="#0062FF" />
                            <Text style={styles.sectionHeaderTitle}>REWARDS DETAILS</Text>
                        </View>
                        
                        <Text style={styles.inputLabel}>Item Name:</Text>
                        <TextInput style={styles.inputField} placeholder="e.g. RICE" value={formName} onChangeText={setFormName} />
                        
                        <Text style={styles.inputLabel}>Quantity:</Text>
                        <View style={styles.rowInputs}>
                            <TextInput style={[styles.inputField, {flex: 1}]} keyboardType="numeric" placeholder="e.g. 10" value={rewardQty} onChangeText={setRewardQty} />
                            <TouchableOpacity style={styles.unitToggle} onPress={() => setRewardUnit(rewardUnit === 'kg' ? 'pcs' : 'kg')}>
                                <Text style={styles.unitToggleText}>{rewardUnit.toUpperCase()}</Text>
                                <Ionicons name="chevron-down" size={14} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Description:</Text>
                        <TextInput style={[styles.inputField, {height: 60}]} multiline placeholder="write your rewards description here..." value={formDesc} onChangeText={setFormDesc} />
                    </View>

                    <View style={styles.cardSection}>
                        <View style={styles.sectionTitleRow}>
                            <MaterialCommunityIcons name="recycle" size={18} color="#0062FF" />
                            <Text style={styles.sectionHeaderTitle}>ACCEPTED WASTE TYPES</Text>
                        </View>
                        
                        <View style={styles.pillContainer}>
                            {predefinedWasteTypes.map(type => (
                                <TouchableOpacity key={type} style={[styles.pillBtn, selectedWasteTypes.includes(type) && styles.pillBtnActive]} onPress={() => toggleSelection(type, selectedWasteTypes, setSelectedWasteTypes)}>
                                    <Text style={[styles.pillTxt, selectedWasteTypes.includes(type) && styles.pillTxtActive]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <Text style={styles.inputLabel}>Other:</Text>
                        <TextInput style={styles.inputField} placeholder="Type other material..." value={otherWasteType} onChangeText={setOtherWasteType} />

                        <Text style={styles.inputLabel}>Quantity Required:</Text>
                        <View style={styles.rowInputs}>
                            <TextInput style={[styles.inputField, {flex: 1}]} keyboardType="numeric" placeholder="e.g. 10" value={wasteQty} onChangeText={setWasteQty} />
                            <TouchableOpacity style={styles.unitToggle} onPress={() => setWasteUnit(wasteUnit === 'kg' ? 'pcs' : 'kg')}>
                                <Text style={styles.unitToggleText}>{wasteUnit.toUpperCase()}</Text>
                                <Ionicons name="chevron-down" size={14} color="#666" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.cardSection}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="list" size={18} color="#0062FF" />
                            <Text style={styles.sectionHeaderTitle}>BEFORE YOU GO (CHECKLIST)</Text>
                        </View>

                        {predefinedChecklist.map(item => (
                            <TouchableOpacity key={item} style={styles.checkRow} onPress={() => toggleSelection(item, selectedChecklists, setSelectedChecklists)}>
                                <MaterialCommunityIcons name={selectedChecklists.includes(item) ? "checkbox-marked" : "checkbox-blank-outline"} size={20} color={selectedChecklists.includes(item) ? "#007C00" : "#999"} />
                                <Text style={styles.checkText}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                        
                        <TextInput style={[styles.inputField, {marginTop: 10}]} placeholder="Add custom rule (Optional)..." value={otherChecklist} onChangeText={setOtherChecklist} />
                    </View>

                    <View style={styles.cardSection}>
                        <View style={styles.sectionTitleRow}>
                            <Ionicons name="eye" size={18} color="#0062FF" />
                            <Text style={styles.sectionHeaderTitle}>AVAILABILITY SETTINGS</Text>
                        </View>

                        <View style={styles.switchContainer}>
                            <View style={{flex: 1, paddingRight: 10}}>
                                <Text style={styles.switchTitle}>Barangay Only</Text>
                                <Text style={styles.switchSub}>Limit to your Barangay Location only</Text>
                            </View>
                            <Switch value={isBarangayOnly} onValueChange={setIsBarangayOnly} trackColor={{ true: '#4CD964', false: '#E5E5EA' }} />
                        </View>

                        <View style={styles.switchContainer}>
                            <View style={{flex: 1, paddingRight: 10}}>
                                <Text style={styles.switchTitle}>Stock Available</Text>
                                <View style={styles.availableBadge}><Text style={styles.availableBadgeText}>Available</Text></View>
                            </View>
                            <Switch value={isStockAvailable} onValueChange={setIsStockAvailable} trackColor={{ true: '#4CD964', false: '#E5E5EA' }} />
                        </View>

                        <View style={[styles.switchContainer, {borderBottomWidth: 0, paddingBottom: 0}]}>
                            <View style={{flex: 1, paddingRight: 10}}>
                                <Text style={styles.switchTitle}>Clean and Dry only</Text>
                                <Text style={styles.switchSub}>Only Accept Clean and Dry Waste</Text>
                            </View>
                            <Switch value={isCleanDryOnly} onValueChange={setIsCleanDryOnly} trackColor={{ true: '#4CD964', false: '#E5E5EA' }} />
                        </View>
                    </View>

                    <View style={styles.footerBtns}>
                        <TouchableOpacity style={styles.footerCancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.footerCancelTxt}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.footerSubmitBtn} onPress={handleSave} disabled={isSaving}>
                            {isSaving ? <ActivityIndicator color="white" /> : <Text style={styles.footerSubmitTxt}>{isEditing ? 'Update Incentive' : 'Create Incentive'}</Text>}
                        </TouchableOpacity>
                    </View>
                    <View style={{height: 40}} />

                </ScrollView>
            </KeyboardAvoidingView>

            {guidelinesVisible && (
                <View style={styles.guideOverlayAbsolute}>
                    <View style={styles.guideBox}>
                        <View style={styles.guideHeader}>
                            <View>
                                <Text style={styles.guideMainTitle}>Guidelines</Text>
                                <Text style={styles.guideSubTitle}>Tap each section to learn more</Text>
                            </View>
                            <TouchableOpacity onPress={() => setGuidelinesVisible(false)} style={styles.guideCloseBtn}>
                                <Ionicons name="close-circle-outline" size={26} color="white" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.guideScroll} showsVerticalScrollIndicator={false}>
                            
                            {guideSteps.map(step => (
                                <View key={step.id} style={styles.accordionWrap}>
                                    <TouchableOpacity 
                                        style={styles.accordionHeader} 
                                        onPress={() => setExpandedStep(expandedGuide === step.id ? null : step.id)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.stepNumBox}>
                                            <Text style={styles.stepNumTxt}>{step.id}</Text>
                                        </View>
                 a                       <Ionicons name={step.icon} size={22} color="#0062FF" style={{marginRight: 12}} />
                                        <View style={{flex: 1}}>
                                            <Text style={styles.accordionTitle}>{step.title}</Text>
                                            <Text style={styles.accordionSubTitle}>{step.subTitle}</Text>
                                        </View>
                                        <Ionicons name={expandedGuide === step.id ? "chevron-down" : "chevron-forward"} size={20} color="#0062FF" />
                                    </TouchableOpacity>
                                    
                                    {expandedGuide === step.id && (
                                        <View style={styles.accordionBody}>
                                            {step.details.map((line, index) => (
                                                <View key={index} style={styles.bulletRowGuide}>
                                                    <Text style={styles.bulletDot}>•</Text>
                                                    <Text style={styles.accordionText}>
                                                        {line.bold ? <Text style={{fontWeight: 'bold', color: '#1C1C1E'}}>{line.bold}</Text> : null}
                                                        {line.text}
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                            
                            <View style={styles.guideTipBox}>
                                <MaterialCommunityIcons name="lightbulb-on-outline" size={26} color="#0062FF" />
                                <View style={{marginLeft: 12, flex: 1}}>
                                    <Text style={styles.guideTipTitle}>Good incentives get more drop-offs</Text>
                                    <Text style={styles.guideTipDesc}>Clear photos, specific waste types, and fair quantities attract more users to your center.</Text>
                                </View>
                            </View>

                            <View style={{height: 20}} />
                        </ScrollView>
                    </View>
                </View>
            )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#0062FF', paddingBottom: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  body: { padding: 20 },
  addBtn: { backgroundColor: '#008000', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 15, borderRadius: 10, marginBottom: 20, elevation: 3 },
  addBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 5 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2, position: 'relative' },
  badge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  cardContent: { flexDirection: 'row', marginBottom: 15, marginTop: 10 },
  itemImage: { width: 60, height: 60, backgroundColor: '#f0f0f0', borderRadius: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  itemName: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  conditionBox: { backgroundColor: '#FFF3E0', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginTop: 5 },
  conditionText: { fontSize: 10, color: '#E65100', fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', gap: 10 },
  editBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingVertical: 8 },
  btnLabel: { fontSize: 12, fontWeight: '600' },
  stockBtn: { flex: 1.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingVertical: 8 },
  deleteBtn: { width: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#D32F2F', borderRadius: 6 },
  
  modalHeaderBox: { backgroundColor: '#0062FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingBottom: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  modalBackBtn: { padding: 5, marginRight: 10 },
  modalTitleText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  modalSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  modalBody: { padding: 20 },
  
  // 🟢 FIXED ALIGNMENT BASED ON FIGMA
  photoUploadContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 5 },
  photoColumn: { alignItems: 'center', marginHorizontal: 10 },
  swapIconContainer: { justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  
  photoLabelText: { fontSize: 13, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 10 },
  
  photoBox: { 
      width: 135, 
      height: 125, 
      borderRadius: 18, 
      backgroundColor: '#EAECEF', 
      justifyContent: 'center', 
      alignItems: 'center', 
      overflow: 'hidden'
  },
  placeholderCenter: { justifyContent: 'center', alignItems: 'center' },
  fullImg: { width: '100%', height: '100%' },
  
  uploadMainTxt: { color: '#0062FF', fontSize: 13, fontWeight: 'bold', marginTop: 6, marginBottom: 2 },
  uploadSubTxt: { color: '#666', fontSize: 11, textAlign: 'center' },
  uploadSmallTxt: { color: '#999', fontSize: 10, textAlign: 'center' },
  
  compressionNotice: { fontSize: 10, color: '#8E8E93', fontStyle: 'italic', textAlign: 'center', marginBottom: 20, paddingHorizontal: 15, lineHeight: 14 },

  cardSection: { backgroundColor: 'white', borderRadius: 16, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#EAECEF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionHeaderTitle: { fontSize: 13, fontWeight: '900', color: '#0062FF', marginLeft: 8, letterSpacing: 0.5 },
  
  inputLabel: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 6, marginTop: 10 },
  inputField: { backgroundColor: '#EAECEF', borderRadius: 10, padding: 14, fontSize: 13, color: '#333' },
  rowInputs: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  unitToggle: { backgroundColor: '#EAECEF', paddingHorizontal: 15, paddingVertical: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  unitToggleText: { fontSize: 12, fontWeight: 'bold', color: '#555' },

  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  pillBtn: { backgroundColor: '#F0F0F0', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#EAECEF' },
  pillBtnActive: { backgroundColor: '#EBF4FF', borderColor: '#0062FF', borderWidth: 1 },
  pillTxt: { fontSize: 11, color: '#666', fontWeight: '600' },
  pillTxtActive: { color: '#0062FF', fontWeight: 'bold' },

  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkText: { fontSize: 13, color: '#333', marginLeft: 10, flex: 1 },

  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  switchTitle: { fontSize: 13, fontWeight: 'bold', color: '#1C1C1E' },
  switchSub: { fontSize: 10, color: '#888', marginTop: 2 },
  availableBadge: { backgroundColor: '#4CD964', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, alignSelf: 'flex-start', marginTop: 4 },
  availableBadgeText: { fontSize: 9, color: 'white', fontWeight: 'bold' },

  footerBtns: { flexDirection: 'row', justifyContent: 'space-between', gap: 15, marginTop: 10 },
  footerCancelBtn: { flex: 1, paddingVertical: 16, backgroundColor: 'white', borderRadius: 25, alignItems: 'center', borderWidth: 1, borderColor: '#ddd' },
  footerCancelTxt: { fontWeight: 'bold', color: '#333', fontSize: 15 },
  footerSubmitBtn: { flex: 1.5, paddingVertical: 16, backgroundColor: '#0062FF', borderRadius: 25, alignItems: 'center', elevation: 2 },
  footerSubmitTxt: { fontWeight: 'bold', color: 'white', fontSize: 15 },

  guideOverlayAbsolute: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20, zIndex: 999, elevation: 999 },
  guideBox: { backgroundColor: '#F5F7FA', borderRadius: 20, maxHeight: '85%', overflow: 'hidden' },
  guideHeader: { backgroundColor: '#0062FF', padding: 20, paddingTop: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  guideMainTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  guideSubTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2, textAlign: 'center' },
  guideCloseBtn: { position: 'absolute', right: 15, top: 20 },
  
  guideScroll: { padding: 15 },
  accordionWrap: { backgroundColor: 'white', marginBottom: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#EBF4FF', elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.05, shadowRadius: 3 },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  
  stepNumBox: { backgroundColor: '#EBF4FF', width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#B3D4FF' },
  stepNumTxt: { color: '#0062FF', fontSize: 14, fontWeight: 'bold' },
  
  accordionTitle: { fontSize: 15, fontWeight: 'bold', color: '#0062FF' },
  accordionSubTitle: { fontSize: 11, color: '#66A3FF', marginTop: 2 },
  
  accordionBody: { padding: 15, paddingTop: 5, backgroundColor: 'white' },
  bulletRowGuide: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  
  bulletDot: { fontSize: 16, color: '#0062FF', marginRight: 8, lineHeight: 18 },
  accordionText: { flex: 1, fontSize: 12, color: '#3385FF', lineHeight: 18 },
  
  guideTipBox: { flexDirection: 'row', backgroundColor: '#EBF4FF', padding: 16, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#B3D4FF' },
  guideTipTitle: { fontWeight: 'bold', fontSize: 13, color: '#0062FF', marginBottom: 2 },
  guideTipDesc: { fontSize: 11, color: '#3385FF', lineHeight: 16 }
});