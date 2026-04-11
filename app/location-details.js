import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export default function LocationDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const location = params.data ? JSON.parse(params.data) : null;

  if (!location) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      
      {/* HEADER (Gaya ng sa Community Post) */}
      <View style={[styles.subHeader, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
          <View style={styles.subHeaderRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={{alignItems: 'center'}}>
                  <Text style={styles.subHeaderTitle}>Reward Center</Text>
              </View>
              <View style={{ width: 40 }} />
          </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 40}}>
          
          {/* HERO IMAGE */}
          <View style={{position: 'relative'}}>
              {location.imageUrl ? (
                  <Image source={{ uri: location.imageUrl }} style={styles.heroImage} />
              ) : (
                  <View style={[styles.heroImage, {backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center'}]}>
                      <MaterialCommunityIcons name="gift-outline" size={80} color="#A5D6A7" />
                  </View>
              )}
              
              <View style={styles.typeBadge}>
                  <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>Reward Item</Text>
              </View>

              {location.isClaimed && (
                  <View style={[styles.typeBadge, {right: 15, left: undefined, backgroundColor: '#9E9E9E'}]}>
                      <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>CLAIMED</Text>
                  </View>
              )}
          </View>

          <View style={{padding: 20}}>
              
              {/* CENTER INFO ROW (Parang User Profile Row) */}
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 20}}>
                  <View style={styles.centerAvatar}>
                      <MaterialCommunityIcons name="storefront-outline" size={24} color="#007C00" />
                  </View>
                  <View style={{flex: 1}}>
                      <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginRight: 5}}>{location.name}</Text>
                          <MaterialCommunityIcons name="check-decagram" size={18} color="#007C00" />
                      </View>
                      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                          <MaterialCommunityIcons name="clock-time-four-outline" size={12} color="#8E8E93" style={{marginRight: 4}}/>
                          <Text style={{fontSize: 13, color: '#8E8E93'}}>{location.schedule}</Text>
                      </View>
                  </View>
              </View>

              {/* REWARD TITLE */}
              <Text style={{fontSize: 24, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 15, lineHeight: 32}}>
                  {location.rewardUnit}
              </Text>

              {/* REQUIREMENT ROW (Parang Price Row) */}
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25}}>
                  <View>
                      <Text style={{fontSize: 32, fontWeight: 'bold', color: '#00A86B'}}>{location.baseRate}kg</Text>
                      <Text style={{fontSize: 14, color: '#8E8E93', marginTop: 2}}>Required amount of {location.accepted[0]}</Text>
                  </View>
                  
                  {location.contact && (
                      <TouchableOpacity style={styles.contactBtn}>
                          <Ionicons name="call" size={18} color="white" style={{marginRight: 8}} />
                          <Text style={{color: 'white', fontWeight: 'bold', fontSize: 14}}>Call</Text>
                      </TouchableOpacity>
                  )}
              </View>

              {/* DESCRIPTION */}
              {location.subText ? (
                  <>
                      <Text style={{fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 10}}>Description</Text>
                      <Text style={{fontSize: 15, color: '#3C3C43', lineHeight: 24, marginBottom: 30}}>{location.subText}</Text>
                  </>
              ) : null}

              {/* DETAILS SECTION (Tags & Location Map) */}
              <View style={styles.detailsBorderBox}>
                  
                  {/* ACCEPTS TAGS */}
                  <View style={{flexDirection: 'row', marginBottom: 20}}>
                      <View style={{marginRight: 15, marginTop: 2}}><MaterialCommunityIcons name="recycle" size={24} color="#8E8E93" /></View>
                      <View style={{flex: 1}}>
                          <Text style={{fontSize: 13, color: '#8E8E93', marginBottom: 8}}>Accepts Materials</Text>
                          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                              {location.accepted.map((item, index) => (
                                  <View key={index} style={styles.materialTag}>
                                      <Text style={styles.materialTagText}>{item}</Text>
                                  </View>
                              ))}
                          </View>
                      </View>
                  </View>

                  {/* LOCATION & MAP */}
                  <View style={{flexDirection: 'row'}}>
                      <View style={{marginRight: 15, marginTop: 2}}><MaterialCommunityIcons name="map-marker-outline" size={24} color="#8E8E93" /></View>
                      <View style={{flex: 1}}>
                          <Text style={{fontSize: 13, color: '#8E8E93', marginBottom: 4}}>Exact Location</Text>
                          <Text style={{fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 15, lineHeight: 22}}>
                              {location.address ? location.address : "Address not provided"}
                          </Text>
                          
                          {(location.latitude && location.longitude) ? (
                              <View style={styles.mapWrapper}>
                                  <MapView
                                      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined} 
                                      style={{width: '100%', height: '100%'}}
                                      initialRegion={{
                                          latitude: parseFloat(location.latitude),
                                          longitude: parseFloat(location.longitude),
                                          latitudeDelta: 0.005,
                                          longitudeDelta: 0.005,
                                      }}
                                      scrollEnabled={false} 
                                      zoomEnabled={false}
                                      pitchEnabled={false}
                                      rotateEnabled={false}
                                  >
                                      <Marker coordinate={{ latitude: parseFloat(location.latitude), longitude: parseFloat(location.longitude) }} />
                                  </MapView>
                              </View>
                          ) : null}
                      </View>
                  </View>
              </View>

              {/* RULES / CHECKLIST */}
              <View style={styles.warningCard}>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#D32F2F" style={{marginRight: 8}} />
                      <Text style={{fontSize: 15, fontWeight: 'bold', color: '#D32F2F'}}>Center Rules</Text>
                  </View>
                  <Text style={{fontSize: 14, color: '#333', lineHeight: 22}}>
                      {location.checklist ? location.checklist : "Please make sure your recyclables are clean and separated by type before going to the center."}
                  </Text>
              </View>

              {/* ACTION BUTTON */}
              {location.isClaimed ? (
                  <View style={[styles.actionBtn, {backgroundColor: '#9E9E9E', elevation: 0}]}>
                      <MaterialCommunityIcons name="lock-outline" size={24} color="white" style={{marginRight: 8}} />
                      <Text style={styles.actionText}>Reward Already Claimed</Text>
                  </View>
              ) : (
                  <TouchableOpacity 
                      style={styles.actionBtn} 
                      onPress={() => router.push({ pathname: '/qr-generator', params: { rewardName: location.rewardUnit, materialType: location.searchedWasteType || location.accepted[0] } })}
                  >
                      <MaterialCommunityIcons name="qrcode-scan" size={24} color="white" style={{marginRight: 8}} />
                      <Text style={styles.actionText}>Scan to Exchange</Text>
                  </TouchableOpacity>
              )}

          </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  subHeader: { 
      backgroundColor: '#007C00', 
      paddingHorizontal: 20, 
      paddingBottom: 15, 
      borderBottomLeftRadius: 0, 
      borderBottomRightRadius: 0, 
      zIndex: 10 
  },
  subHeaderRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      width: '100%' 
  },
  subHeaderTitle: { 
      color: 'white', 
      fontSize: 20, 
      fontWeight: 'bold' 
  },
  backButton: { 
      backgroundColor: 'rgba(255,255,255,0.2)', 
      padding: 8, 
      borderRadius: 12 
  },
  heroImage: {
      width: '100%', 
      height: 350, 
      resizeMode: 'cover', 
      backgroundColor: '#eee'
  },
  typeBadge: {
      position: 'absolute', 
      top: 15, 
      left: 15, 
      backgroundColor: '#007C00', 
      paddingHorizontal: 12, 
      paddingVertical: 6, 
      borderRadius: 12, 
      elevation: 3
  },
  centerAvatar: {
      width: 50, 
      height: 50, 
      borderRadius: 25, 
      marginRight: 15, 
      backgroundColor: '#E8F5E9',
      alignItems: 'center',
      justifyContent: 'center'
  },
  contactBtn: {
      backgroundColor: '#007C00', 
      paddingHorizontal: 20, 
      paddingVertical: 12, 
      borderRadius: 25, 
      flexDirection: 'row', 
      alignItems: 'center', 
      elevation: 2
  },
  detailsBorderBox: {
      borderTopWidth: 1, 
      borderTopColor: '#E5E5EA', 
      borderBottomWidth: 1, 
      borderBottomColor: '#E5E5EA', 
      paddingVertical: 20, 
      marginBottom: 25
  },
  materialTag: {
      backgroundColor: '#E8F5E9', 
      paddingHorizontal: 12, 
      paddingVertical: 6, 
      borderRadius: 16
  },
  materialTagText: {
      fontSize: 12, 
      color: '#2E7D32', 
      fontWeight: '600'
  },
  mapWrapper: {
      width: '100%', 
      height: 160, 
      borderRadius: 16, 
      overflow: 'hidden', 
      borderWidth: 1, 
      borderColor: '#E5E5EA'
  },
  warningCard: { 
      backgroundColor: '#FFF5F5', 
      borderRadius: 16, 
      padding: 16, 
      borderWidth: 1, 
      borderColor: '#FFCDD2', 
      marginBottom: 30 
  },
  actionBtn: { 
      backgroundColor: '#007C00', 
      flexDirection: 'row', 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 18, 
      borderRadius: 30, 
      shadowColor: '#007C00', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.3, 
      shadowRadius: 5, 
      elevation: 5 
  },
  actionText: { 
      color: 'white', 
      fontWeight: 'bold', 
      fontSize: 16 
  }
});