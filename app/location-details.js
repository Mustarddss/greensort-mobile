import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, StatusBar, Platform, Animated, PanResponder, Dimensions, Linking, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '../lib/supabase'; 

const screenWidth = Dimensions.get('window').width;

export default function LocationDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const location = params.data ? JSON.parse(params.data) : null;

  const pan = useRef(new Animated.ValueXY()).current;
  
  const panResponder = useRef(
      PanResponder.create({
          onMoveShouldSetPanResponder: (evt, gestureState) => {
              return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
          },
          onPanResponderGrant: () => {
              pan.setOffset({
                  x: pan.x._value,
                  y: pan.y._value
              });
              pan.setValue({ x: 0, y: 0 });
          },
          onPanResponderMove: Animated.event(
              [null, { dx: pan.x, dy: pan.y }],
              { useNativeDriver: false } 
          ),
          onPanResponderRelease: () => {
              pan.flattenOffset();
              
              const buttonWidth = 110;
              const sideMargin = 15;
              const leftSnap = -(screenWidth - buttonWidth - (sideMargin * 2));
              
              const isCloserToLeft = pan.x._value < (leftSnap / 2);

              Animated.spring(pan, {
                  toValue: { 
                      x: isCloserToLeft ? leftSnap : 0, 
                      y: pan.y._value
                  },
                  useNativeDriver: false,
                  friction: 6
              }).start();
          }
      })
  ).current;

  const openInMaps = () => {
      if (location.latitude && location.longitude) {
          const lat = parseFloat(location.latitude);
          const lng = parseFloat(location.longitude);
          const label = encodeURIComponent(location.name);
          const url = Platform.select({
              ios: `maps:0,0?q=${label}@${lat},${lng}`,
              android: `geo:0,0?q=${lat},${lng}(${label})`
          });
          Linking.openURL(url);
      }
  };

  if (!location) return null;

  const surrenderItem = location.searchedWasteType || location.accepted?.[0] || 'Recyclables';
  const rewardItem = location.rewardUnit || 'Reward Item';
  const rewardDesc = location.subText; 
  const requiredAmount = location.bringRequiredAmount || 'Any amount'; 

  const handleContactCenter = async () => {
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) {
              Alert.alert("Error", "Please login to contact the center.");
              return;
          }
          const residentName = session.user.user_metadata?.full_name;
          const receiverName = location.officerName || location.name; 

          const inquiryContext = {
              type: "Reward",
              wasteType: surrenderItem,
              wasteQty: requiredAmount,
              rewardName: rewardItem,
              location: location.address || location.name
          };

          // 🟢 TINANGGAL YUNG RAW TEXT SA UNAHAN PARA CARD LANG ANG LUMABAS SA CHAT
          const inquiryText = `|||INQUIRY|||${JSON.stringify(inquiryContext)}`;

          // 1. Check muna natin kung nag-message na sila dati (KINI-KEEP NATIN TO KASI AYAW MO MAGBURA)
          const { data: existingChat } = await supabase
              .from('messages')
              .select('id')
              .or(`and(sender_name.eq."${residentName}",receiver_name.eq."${receiverName}"),and(sender_name.eq."${receiverName}",receiver_name.eq."${residentName}")`)
              .limit(1);

          // 2. Isesend natin yung Card! (TINANGGAL YUNG IF CONDITION PARA KAHIT NAKA-CHAT NA KAYO, MAG-SESEND PA RIN NG CARD)
          await supabase.from('messages').insert([{
              sender_name: residentName,
              receiver_name: receiverName,
              text: inquiryText,
              is_read: false
          }]);

          // 3. Pagkatapos i-send, ibabato na natin yung Resident papunta sa Chat Screen
          router.push({ 
              pathname: '/chat', 
              params: { 
                  chatUser: receiverName, 
                  centerEmail: location.userEmail || '' 
              } 
          });

      } catch (error) {
          console.log("Error starting chat:", error);
          Alert.alert("Error", "Could not start chat with center.");
      }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15 }]}>
          <View style={styles.headerRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={{alignItems: 'center'}}>
                  <Text style={styles.headerTitle}>Rewards Drop-off Centers</Text>
                  <Text style={styles.headerSubtitle}>Check your reward</Text>
              </View>
              <View style={{ width: 40 }} />
          </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 100}}>
          
          <View style={{padding: 20}}>
              
              <View style={styles.exchangeContainer}>
                  <View style={styles.boxRow}>
                      <MaterialCommunityIcons name="cube-send" size={24} color="#007C00" />
                      <Text style={styles.boxLabel}>You Will Surrender:</Text>
                  </View>
                  <View style={[styles.itemBox, { alignItems: 'flex-start' }]}>
                      <View style={[styles.itemImagePlaceholder, location.wasteImageUrl && { borderWidth: 0, backgroundColor: 'transparent' }]}>
                         {location.wasteImageUrl ? (
                             <Image source={{uri: location.wasteImageUrl}} style={{width: '100%', height: '100%', borderRadius: 8}} resizeMode="cover" />
                         ) : (
                             <MaterialCommunityIcons name="recycle" size={30} color="#ccc" />
                         )}
                      </View>
                      
                      <View style={{flex: 1, paddingTop: 2}}>
                          <Text style={styles.itemTitle}>{surrenderItem}</Text>
                          
                          {requiredAmount ? (
                              <Text style={{fontSize: 12, color: '#0056b3', fontWeight: 'bold', marginTop: 2, marginBottom: 6}}>
                                  Target: {requiredAmount}
                              </Text>
                          ) : null}

                          <Text style={styles.itemSub}>Your waste should be:</Text>
                          <View style={styles.badgeRow}>
                              <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>Clean</Text></View>
                              <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>Dry</Text></View>
                          </View>
                      </View>
                  </View>

                  <View style={styles.dividerContainer}>
                      <View style={styles.dividerLine} />
                      <MaterialCommunityIcons name="swap-vertical-circle" size={30} color="#007C00" style={styles.swapIcon} />
                      <View style={styles.dividerLine} />
                  </View>

                  <View style={[styles.boxRow, {marginTop: 5}]}>
                      <MaterialCommunityIcons name="gift-outline" size={24} color="#007C00" />
                      <Text style={styles.boxLabel}>Your Reward is:</Text>
                  </View>
                  
                  <View style={[styles.itemBox, {backgroundColor: '#E8F5E9', borderColor: '#A5D6A7', alignItems: 'flex-start'}]}>
                      <View style={[styles.itemImagePlaceholder, {backgroundColor: 'white'}]}>
                          <Image source={{uri: location.imageUrl || 'https://cdn-icons-png.flaticon.com/512/5166/5166986.png'}} style={{width: 40, height: 40}} resizeMode="contain" />
                      </View>
                      <View style={{flex: 1, justifyContent: 'center', paddingTop: 2}}>
                          <Text style={[styles.itemTitle, {color: '#007C00', fontSize: 18}]}>{rewardItem}</Text>
                          
                          {rewardDesc ? (
                              <Text style={{fontSize: 12, color: '#2E7D32', marginTop: 4, lineHeight: 18}}>
                                  {rewardDesc}
                              </Text>
                          ) : null}
                      </View>
                  </View>
              </View>

              <View style={styles.detailsContainer}>
                  <Text style={styles.detailsTitle}>Collection Center Details</Text>
                  <Text style={styles.centerName}>{location.name}</Text>

                  <View style={styles.infoRow}>
                      <View style={styles.iconCircle}><Ionicons name="location-outline" size={20} color="#666" /></View>
                      <View style={{flex: 1}}>
                          <Text style={styles.infoLabel}>Location</Text>
                          <Text style={styles.infoText}>{location.address || 'Address not provided'}</Text>
                      </View>
                  </View>

                  <View style={styles.infoRow}>
                      <View style={styles.iconCircle}><MaterialCommunityIcons name="clock-time-four-outline" size={20} color="#666" /></View>
                      <View style={{flex: 1}}>
                          <Text style={styles.infoLabel}>Operating Hours</Text>
                          <Text style={styles.infoText}>{location.schedule}</Text>
                      </View>
                  </View>

                  <View style={styles.infoRow}>
                      <View style={styles.iconCircle}><Ionicons name="call-outline" size={20} color="#666" /></View>
                      <View style={{flex: 1}}>
                          <Text style={styles.infoLabel}>Telephone Number</Text>
                          <Text style={styles.infoText}>{location.contact || 'No contact provided'}</Text>
                      </View>
                  </View>

                  {(location.latitude && location.longitude) ? (
                      <TouchableOpacity 
                          activeOpacity={0.8} 
                          onPress={openInMaps} 
                          style={styles.detailsMapWrapper}
                      >
                          <View pointerEvents="none" style={{ flex: 1 }}>
                              <MapView
                                  style={styles.detailsMap}
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
                          
                          <View style={styles.mapOverlayButton}>
                              <Ionicons name="navigate-circle" size={20} color="white" />
                              <Text style={styles.mapOverlayText}>Tap to open in Maps</Text>
                          </View>
                      </TouchableOpacity>
                  ) : null}
              </View>

              <View style={styles.warningBox}>
                  <View style={styles.warningHeader}>
                      <MaterialCommunityIcons name="alert-outline" size={22} color="#D32F2F" />
                      <Text style={styles.warningTitle}>Before You Go - Required Checklist</Text>
                  </View>
                  
                  <View style={styles.warningBody}>
                      {location.checklist ? (
                          <Text style={styles.warningPointText}>{location.checklist}</Text>
                      ) : (
                          <>
                              <View style={styles.bulletRow}>
                                  <View style={styles.bullet} />
                                  <View>
                                      <Text style={styles.bulletTitle}>I have separated my waste by type</Text>
                                      <Text style={styles.bulletSub}>Plastics, paper, and metals should be in separate bags.</Text>
                                  </View>
                              </View>
                              <View style={styles.bulletRow}>
                                  <View style={styles.bullet} />
                                  <View>
                                      <Text style={styles.bulletTitle}>I have cleaned and dried my items</Text>
                                      <Text style={styles.bulletSub}>Dirty items will not be accepted by the center.</Text>
                                  </View>
                              </View>
                          </>
                      )}
                  </View>
              </View>

              {location.isClaimed ? (
                  <View style={[styles.actionBtn, {backgroundColor: '#9E9E9E', elevation: 0}]}>
                      <Text style={styles.actionText}>Reward Already Claimed</Text>
                  </View>
              ) : (
                  <TouchableOpacity 
                      style={styles.actionBtn} 
                      onPress={() => router.push({ pathname: '/qr-generator', params: { rewardName: location.rewardUnit, materialType: location.searchedWasteType || location.accepted[0] } })}
                      activeOpacity={0.8}
                  >
                      <Text style={styles.actionText}>Surrender</Text>
                  </TouchableOpacity>
              )}

          </View>
      </ScrollView>

      <Animated.View 
          style={[
              styles.floatingChatWrapper, 
              { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
          ]}
          {...panResponder.panHandlers}
      >
          <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleContactCenter} 
          >
              <Image 
                  source={require('../assets/images/contact.png')} 
                  style={{ width: 110, height: 110 }} 
                  resizeMode="contain" 
              />
          </TouchableOpacity>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
      backgroundColor: '#007C00', 
      paddingHorizontal: 20, 
      paddingBottom: 25, 
      borderBottomLeftRadius: 30, 
      borderBottomRightRadius: 30, 
      elevation: 5, 
      zIndex: 10 
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 },
  backButton: { padding: 5 },
  
  exchangeContainer: {
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: '#007C00',
      marginBottom: 20,
      elevation: 2,
      shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4
  },
  boxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  boxLabel: { fontSize: 13, fontWeight: 'bold', color: '#1C1C1E', marginLeft: 8 },
  itemBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F7FA', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' },
  itemImagePlaceholder: { width: 50, height: 50, borderRadius: 8, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#ddd' },
  itemTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  itemSub: { fontSize: 11, color: '#666', marginTop: 2, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  miniBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: '#007C00' },
  miniBadgeText: { fontSize: 9, color: '#007C00', fontWeight: 'bold', textTransform: 'uppercase' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#007C00' },
  swapIcon: { marginHorizontal: 10 },

  detailsContainer: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20, elevation: 1 },
  detailsTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  centerName: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F7FA', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoLabel: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  infoText: { fontSize: 12, color: '#888', marginTop: 2 },

  detailsMapWrapper: {
      width: '100%',
      height: 180,
      borderRadius: 16,
      overflow: 'hidden',
      marginTop: 10,
      borderWidth: 1,
      borderColor: '#E5E5EA',
      position: 'relative'
  },
  detailsMap: { width: '100%', height: '100%' },
  mapOverlayButton: {
      position: 'absolute',
      bottom: 10,
      alignSelf: 'center',
      backgroundColor: 'rgba(0, 124, 0, 0.9)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      elevation: 3,
  },
  mapOverlayText: { color: 'white', fontWeight: 'bold', fontSize: 12, marginLeft: 6 },

  warningBox: { backgroundColor: '#FFEBEE', borderRadius: 16, borderWidth: 1, borderColor: '#FFCDD2', marginBottom: 25, overflow: 'hidden' },
  warningHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#FFCDD2' },
  warningTitle: { fontSize: 13, fontWeight: 'bold', color: '#D32F2F', marginLeft: 6 },
  warningBody: { padding: 15 },
  warningPointText: { fontSize: 13, color: '#333', lineHeight: 20 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333', marginTop: 6, marginRight: 10 },
  bulletTitle: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  bulletSub: { fontSize: 11, color: '#666', marginTop: 2 },

  actionBtn: { 
      backgroundColor: '#007C00', 
      padding: 16, 
      borderRadius: 12, 
      alignItems: 'center', 
      elevation: 3,
      shadowColor: '#007C00', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 5
  },
  actionText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  floatingChatWrapper: {
      position: 'absolute',
      right: 15,
      bottom: 120,
      zIndex: 999,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 8,
  }
});