import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function BankedKgModal({ visible, onClose, bankedDetails }) {
  const router = useRouter();

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlayDark}>
        <View style={styles.bankedModalCard}>
          <View style={styles.bankedModalHeader}>
            <MaterialCommunityIcons name="safe" size={28} color="#FFD54F" />
            <View style={{flex: 1, marginLeft: 10}}>
              <Text style={styles.bankedModalTitle}>My Banked KG</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#007C00" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.bankedModalContent}>
             <Text style={styles.bankedModalDesc}>Select an item to generate a QR Code and redeem your banked KG!</Text>
             
             {bankedDetails.length === 0 ? (
                <View style={{alignItems: 'center', marginTop: 30}}>
                  <MaterialCommunityIcons name="leaf-off" size={50} color="#ddd" />
                  <Text style={{textAlign: 'center', color: '#999', marginTop: 10}}>You don't have any banked items yet.</Text>
                </View>
             ) : (
                 <ScrollView showsVerticalScrollIndicator={false} style={{maxHeight: 400}}>
                    {bankedDetails.map((center, index) => (
                       <View key={index} style={styles.bankedCenterCard}>
                          <View style={styles.bankedCenterHeader}>
                            <MaterialCommunityIcons name="store" size={18} color="#007C00" />
                            <Text style={styles.bankedCenterName}>{center.location}</Text>
                          </View>
                          <View style={styles.bankedMaterialsList}>
                             {center.materials.map((mat, i) => {
                                 // 🟢 LOGIC: I-check kung ubos na ba ang points
                                 const isClaimed = mat.kg <= 0;

                                 return (
                                     <View key={i} style={[styles.bankedMaterialRow, isClaimed && {opacity: 0.6}]}>
                                         <Text style={[styles.bankedMaterialType, isClaimed && {color: '#888', textDecorationLine: 'line-through'}]}>
                                             {mat.type}
                                         </Text>
                                         <TouchableOpacity 
                                            activeOpacity={0.7} 
                                            style={[styles.qrBadge, isClaimed && {backgroundColor: '#F0F0F0'}]}
                                            disabled={isClaimed} // I-disable pag 0 na
                                            onPress={() => { 
                                              onClose(); 
                                              router.push({ 
                                                pathname: '/qr-generator', 
                                                params: { 
                                                  isBankedRedemption: 'true', 
                                                  collectorEmail: center.email, 
                                                  materialType: mat.type, 
                                                  bankedKg: mat.kg, 
                                                  rewardName: 'Redeem Banked Points' 
                                                } 
                                              }); 
                                            }}
                                         >
                                            <Text style={[styles.bankedMaterialKg, isClaimed && {color: '#888', fontSize: 12}]}>
                                                {isClaimed ? 'Claimed' : `${mat.kg.toFixed(1)} kg`}
                                            </Text>
                                            {isClaimed ? (
                                                <MaterialCommunityIcons name="check-circle" size={14} color="#888" />
                                            ) : (
                                                <MaterialCommunityIcons name="qrcode-scan" size={14} color="#007C00" />
                                            )}
                                         </TouchableOpacity>
                                     </View>
                                 );
                             })}
                          </View>
                       </View>
                    ))}
                    <View style={{height: 20}}/>
                 </ScrollView>
             )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }, 
  bankedModalCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden', elevation: 10 }, 
  bankedModalHeader: { backgroundColor: '#007C00', padding: 20, flexDirection: 'row', alignItems: 'center' }, 
  bankedModalTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' }, 
  closeBtn: { backgroundColor: 'white', borderRadius: 15, width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  bankedModalContent: { padding: 20 }, 
  bankedModalDesc: { fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 18 }, 
  bankedCenterCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#eee', elevation: 1 }, 
  bankedCenterHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 10 }, 
  bankedCenterName: { fontWeight: 'bold', color: '#333', fontSize: 14, marginLeft: 8 }, 
  bankedMaterialsList: { paddingHorizontal: 5 }, 
  bankedMaterialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' }, 
  bankedMaterialType: { color: '#333', fontSize: 14, fontWeight: '600' }, 
  bankedMaterialKg: { fontWeight: 'bold', color: '#007C00', fontSize: 14 },
  qrBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }
});