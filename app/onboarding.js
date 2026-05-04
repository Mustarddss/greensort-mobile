import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router'; // 🟢 IN-ADD NATIN ANG useLocalSearchParams
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
  // Intro slide
  {
    id: '0',
    isIntro: true,
    title: 'Recycle\nYour\nWaste\nMaterial',
    description: 'AI powered guidance for responsible waste management.',
    descColor: '#2E5A35',
  },
  {
    id: '1',
    titleBlack: 'Snap\nIdentify &',
    titleHighlight: 'Upcycle',
    highlightColor: '#007C00',
    descColor: '#2E5A35',
    description: 'Upload a photo of your waste and let GreenSort AI identify what it is and what you can do with it. You can also ask the built-in chatbot for guidance on how to properly handle different types of waste. Follow suggested upcycle projects, create them on your own, and share your results with the community.',
  },
  {
    id: '2',
    titleBlack: 'Post, Trade &',
    titleHighlight: 'Give Away',
    highlightColor: '#2962FF',
    descColor: '#4A6582',
    description: 'Turn your recyclable materials into value—barter, trade, or give them away for free while connecting with others in your community through our direct exchange system.',
  },
  {
    id: '3',
    titleBlack: 'Find\nDrop-Off',
    titleHighlight: 'Locations',
    highlightColor: '#007C00',
    descColor: '#2E5A35',
    description: 'Easily locate nearby drop-off centers based on your area. If none are available, GreenSort will recommend the nearest options to make recycling more accessible.',
  },
  {
    id: '4',
    titleBlack: 'Reward Every',
    titleHighlight: 'Sustainable\nAction',
    highlightColor: '#2962FF',
    descColor: '#4A6582',
    description: 'Turn your recyclable materials into value—barter, trade, or give them away for free while connecting with others in your community.',
  },
  // 🟢 NEW: Entry-choice slide
  {
    id: '5',
    isEntryChoice: true,
    titleBlack: 'Join our',
    titleHighlight: 'Community',
    highlightColor: '#007C00',
    descColor: '#2E5A35',
    description: 'Create an account or log in to start tracking your sustainable impact.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { skip } = useLocalSearchParams(); // 🟢 TITINGNAN NATIN KUNG MAY IPINASANG "skip" PARAMETER

  // 🟢 KUNG SKIP AY TRUE, HINDI NA MAG-S-SHOW ANG SPLASH SCREEN
  const [showSplash, setShowSplash] = useState(skip !== 'true');

  const logoScale = useRef(new Animated.Value(0)).current; 
  const splashOpacity = useRef(new Animated.Value(1)).current;

  // 🟢 KUNG SKIP AY TRUE, MAPUPUNTA AGAD ANG SCROLLX SA LAST SLIDE (Index 5)
  const scrollX = useRef(new Animated.Value(skip === 'true' ? width * 5 : 0)).current;
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(skip === 'true' ? 5 : 0);

  const [currentView, setCurrentView] = useState('onboarding_swirl');

  useEffect(() => {
    // 🟢 HINDI NA NATIN I-RUN ANG SPLASH ANIMATION KAPAG GALING SA LOGOUT
    if (skip === 'true') {
        // Para siguradong mapupunta sa dulo yung scroll kahit bago pa lang nag-load
        setTimeout(() => {
             flatListRef.current?.scrollToOffset({ offset: width * 5, animated: false });
        }, 100); 
        return; 
    }

    Animated.sequence([
      Animated.delay(200), 
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      Animated.delay(1200), 
      Animated.timing(splashOpacity, { toValue: 0, duration: 600, useNativeDriver: true })
    ]).start(() => {
      setShowSplash(false); 
    });
  }, [skip]);

  const changeView = (viewName) => {
    if (viewName === 'onboarding_swirl') {
        const lastIdx = ONBOARDING_DATA.length - 1;
        flatListRef.current?.scrollToOffset({ offset: width * lastIdx, animated: false });
    }
    setCurrentView(viewName);
  };

  const handleEntryChoice = (choice) => {
    if (choice === 'create') changeView('create_selection');
    if (choice === 'login') changeView('login_selection');
  };

  const handleSelection = (type, action) => {
    if (action === 'create' && type === 'user') router.push('/signup');
    if (action === 'create' && type === 'center') router.push('/register-location'); 
    if (action === 'login' && type === 'user') router.push('/login');
    if (action === 'login' && type === 'center') router.push('/login-center');
  };

  const renderCustomMockup = (id) => {
    if (id === '0') {
      return (
        <View style={styles.mockupContainer0}>
          <Image source={require('../assets/images/trashcans.png')} style={styles.introBin} resizeMode="contain" />
          <Image source={require('../assets/images/image 35.png')} style={styles.introBag} resizeMode="contain" />
          <Image source={require('../assets/images/image 34.png')} style={styles.introCan} resizeMode="contain" />
          <Image source={require('../assets/images/image 40.png')} style={styles.introBottle} resizeMode="contain" />
        </View>
      );
    }
    if (id === '1') {
      return (
        <View style={styles.mockupContainer1}>
          <View style={styles.scanBox}>
            <Ionicons name="scan-outline" size={80} color="#38B000" />
            <Ionicons name="image-outline" size={30} color="#007C00" style={{ position: 'absolute', top: '35%' }} />
            <Text style={styles.scanText}>Scanning...</Text>
          </View>
          <Image source={require('../assets/images/image 35.png')} style={styles.floatBag} resizeMode="contain" />
          <Image source={require('../assets/images/image 34.png')} style={styles.floatCan} resizeMode="contain" />
          <Image source={require('../assets/images/trashcans.png')} style={styles.floatBin} resizeMode="contain" />
          <Image source={require('../assets/images/image 40.png')} style={styles.floatBottle} resizeMode="contain" />
        </View>
      );
    }
    if (id === '2') {
      return (
        <View style={styles.mockupContainer2}>
          <View style={styles.lightBlueBox}>
            <Text style={styles.lbTitle}>Earn points for</Text>
            <Text style={styles.lbTitle}>discarded trash</Text>
            <Text style={styles.lbSub}>Scan & Earn</Text>
          </View>
          <View style={styles.darkBlueBox}>
            <Text style={styles.dbTitle}>Points Earned 67 pts</Text>
            <Text style={styles.dbSub}>Redeem your points</Text>
          </View>
          <Text style={styles.collectionText}>Your Collection</Text>
          <View style={styles.pillRow}>
            <View style={[styles.pill, {backgroundColor: '#1E3A8A'}]}><Text style={styles.pillTextWhite}>Buy</Text></View>
            <View style={[styles.pill, {backgroundColor: '#2962FF'}]}><Text style={styles.pillTextWhite}>Trade</Text></View>
            <View style={[styles.pill, {backgroundColor: '#BBDEFB'}]}><Text style={styles.pillTextBlue}>Free</Text></View>
          </View>
          <View style={styles.cardLeft}>
            <Image source={require('../assets/images/plastics.png')} style={styles.cardImg} resizeMode="cover" />
            <Text style={styles.cardTitle}>Plastic Bottles</Text>
            <Text style={styles.cardWeight}>2.8kg</Text>
          </View>
          <View style={styles.cardRight}>
            <Image source={require('../assets/images/metal cans.png')} style={styles.cardImg} resizeMode="cover" />
            <Text style={styles.cardTitle}>Tin Cans</Text>
            <Text style={styles.cardWeight}>2.8kg</Text>
          </View>
        </View>
      );
    }
    if (id === '3') {
      return (
        <View style={styles.mockupContainer3}>
          <View style={styles.mapGraphicArea}>
            <Ionicons name="location" size={40} color="#007C00" style={{ zIndex: 2 }} />
            <View style={styles.solidLine} />
          </View>
          <View style={styles.locationCard}>
            <View style={styles.locIconBg}><Ionicons name="location-outline" size={20} color="#007C00" /></View>
            <View style={styles.locDetails}>
              <Text style={styles.locTitle}>SM City Dasma</Text>
              <Text style={styles.locSub}>3KG PLASTIC BOTTLES = 2KG RICE</Text>
              <Text style={styles.locDistance}>0.8km away</Text>
            </View>
            <View style={styles.openBadge}><Text style={styles.openText}>OPEN</Text></View>
          </View>
          <View style={[styles.locationCard, {marginTop: 15}]}>
            <View style={styles.locIconBg}><Ionicons name="location-outline" size={20} color="#007C00" /></View>
            <View style={styles.locDetails}>
              <Text style={styles.locTitle}>SM City Dasma</Text>
              <Text style={styles.locSub}>3KG PLASTIC BOTTLES = 2KG RICE</Text>
              <Text style={styles.locDistance}>0.8km away</Text>
            </View>
            <View style={styles.openBadge}><Text style={styles.openText}>OPEN</Text></View>
          </View>
        </View>
      );
    }
    if (id === '4') {
      return (
        <View style={styles.mockupContainer4Swirl}>
          <Image source={require('../assets/images/TOGETHR.png')} style={styles.togethrImg} resizeMode="contain" />
        </View>
      );
    }
    if (id === '5') {
      return (
        <View style={styles.mockupContainerEntry}>
          <Image source={require('../assets/images/trashcans.png')} style={styles.entryBin} resizeMode="contain" />
          <Image source={require('../assets/images/image 35.png')} style={styles.entryBag} resizeMode="contain" />
          <Image source={require('../assets/images/image 34.png')} style={styles.entryCan} resizeMode="contain" />
          <Image source={require('../assets/images/image 40.png')} style={styles.entryBottle} resizeMode="contain" />
        </View>
      );
    }
  };

  const renderItem = ({ item, index }) => {
    const translateY = scrollX.interpolate({
      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
      outputRange: [60, 0, -60],
      extrapolate: 'clamp',
    });
    const scale = scrollX.interpolate({
      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
      outputRange: [0.85, 1, 0.85],
      extrapolate: 'clamp',
    });

    if (item.isIntro) {
      return (
        <View style={styles.slideSwirl}>
          <View style={styles.textContainerSwirl}>
            <Text style={styles.introTitle}>{item.title}</Text>
            <Text style={[styles.descriptionSwirl, { color: item.descColor, marginTop: 10 }]}>{item.description}</Text>
          </View>
          <Animated.View style={[styles.imageContainerSwirl, { transform: [{ translateY }, { scale }] }]}>
            {renderCustomMockup(item.id)}
          </Animated.View>
          <TouchableOpacity
            style={styles.getStartedButton}
            activeOpacity={0.85}
            onPress={() => flatListRef.current?.scrollToOffset({ offset: width, animated: true })}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (item.isEntryChoice) {
      return (
        <View style={styles.slideSwirl}>
          <View style={styles.textContainerSwirl}>
            <Text style={styles.titleBlackSwirl}>{item.titleBlack}</Text>
            <Text style={[styles.titleHighlightSwirl, { color: '#000000' }]}>{item.titleHighlight}</Text>
          </View>

          <View style={styles.topButtonsContainer}>
            <TouchableOpacity
              style={styles.btnSolidGreen}
              activeOpacity={0.8}
              onPress={() => handleEntryChoice('create')}
            >
              <Text style={styles.btnSolidText}>Create an Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnOutlineGreen}
              activeOpacity={0.8}
              onPress={() => handleEntryChoice('login')}
            >
              <Text style={styles.btnOutlineText}>I already have an account</Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.imageContainerSwirl, { transform: [{ translateY }, { scale }] }]}>
            {renderCustomMockup(item.id)}
          </Animated.View>
        </View>
      );
    }

    return (
      <View style={styles.slideSwirl}>
        <View style={styles.textContainerSwirl}>
          <Text style={styles.titleBlackSwirl}>{item.titleBlack}</Text>
          <Text style={[styles.titleHighlightSwirl, { color: item.highlightColor }]}>{item.titleHighlight}</Text>
          <Text style={[styles.descriptionSwirl, { color: item.descColor }]}>{item.description}</Text>
        </View>

        <Animated.View style={[styles.imageContainerSwirl, { transform: [{ translateY }, { scale }] }]}>
          {renderCustomMockup(item.id)}
        </Animated.View>
      </View>
    );
  };

  const BackgroundGraphics = () => (
    <View style={styles.graphicsContainerFixed} pointerEvents="none">
      <Image source={require('../assets/images/image 35.png')} style={styles.floatBagFixed} resizeMode="contain" />
      <Image source={require('../assets/images/image 34.png')} style={styles.floatCanFixed} resizeMode="contain" />
      <Image source={require('../assets/images/trashcans.png')} style={styles.floatBinFixed} resizeMode="contain" />
      <Image source={require('../assets/images/image 40.png')} style={styles.floatBottleFixed} resizeMode="contain" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={showSplash ? "light-content" : "dark-content"} backgroundColor={showSplash ? "#007C00" : "#F8FAFC"} />

      <View style={StyleSheet.absoluteFillObject}>

        {currentView === 'onboarding_swirl' && (
          <>
            <Animated.FlatList
              ref={flatListRef}
              data={ONBOARDING_DATA}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              // 🟢 Kung galing log-out, kailangan ipwesto agad natin 'yung content sa Slide 5.
              contentOffset={skip === 'true' ? { x: width * 5, y: 0 } : undefined}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                setCurrentIndex(newIndex);
              }}
              renderItem={renderItem}
            />

            {!showSplash && (
              <View style={styles.bottomNavSwirl}>
                <View style={styles.dotsContainerSwirl}>
                  {ONBOARDING_DATA.map((_, index) => {
                    const dotWidth = scrollX.interpolate({
                      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                      outputRange: [8, 24, 8],
                      extrapolate: 'clamp',
                    });
                    const backgroundColor = scrollX.interpolate({
                      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                      outputRange: ['#C8E6C9', '#38B000', '#C8E6C9'],
                      extrapolate: 'clamp',
                    });
                    return <Animated.View key={index} style={[styles.dotSwirl, { width: dotWidth, backgroundColor }]} />;
                  })}
                </View>
              </View>
            )}
          </>
        )}

        {currentView === 'create_selection' && (
          <View style={styles.selectionViewContainer}>
            <View style={styles.selectionHeader}>
              <TouchableOpacity onPress={() => changeView('onboarding_swirl')} style={styles.backButton}>
                <Ionicons name="arrow-back" size={28} color="#1C1C1E" />
              </TouchableOpacity>
              <Text style={styles.selectionTitle}>Join our{'\n'}Community</Text>
            </View>
            <View style={styles.selectionCardsArea}>
              <View style={{marginBottom: 20}}>
                <Text style={styles.subTextGreen}>Create new account</Text>
                <Text style={styles.subTextBlack}>Choose Account Type:</Text>
              </View>
              <TouchableOpacity style={styles.cardUser} onPress={() => handleSelection('user', 'create')}>
                <Ionicons name="person-circle-outline" size={50} color="#007C00" />
                <Text style={styles.cardTitleUser}>User</Text>
                <Text style={styles.cardSubText}>For individuals, student, and households</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardCenter} onPress={() => handleSelection('center', 'create')}>
                <MaterialCommunityIcons name="map-marker-plus" size={46} color="#2962FF" />
                <Text style={styles.cardTitleCenter}>Drop-Off Center</Text>
                <Text style={styles.cardSubTextBlue}>For recycling centers and collection points</Text>
              </TouchableOpacity>
            </View>
            <BackgroundGraphics />
            <View style={styles.staticDotsRow}>
              <View style={styles.dotInactive} /><View style={styles.dotActive} />
              <View style={styles.dotInactive} /><View style={styles.dotInactive} />
            </View>
          </View>
        )}

        {currentView === 'login_selection' && (
          <View style={styles.selectionViewContainer}>
            <View style={styles.selectionHeader}>
              <TouchableOpacity onPress={() => changeView('onboarding_swirl')} style={styles.backButton}>
                <Ionicons name="arrow-back" size={28} color="#1C1C1E" />
              </TouchableOpacity>
              <Text style={styles.selectionTitle}>Welcome{'\n'}Back!</Text>
            </View>
            <View style={styles.selectionCardsArea}>
              <View style={{marginBottom: 20}}>
                <Text style={styles.subTextGreen}>Login Account</Text>
                <Text style={styles.subTextBlack}>Choose Account Type:</Text>
              </View>
              <TouchableOpacity style={styles.cardUser} onPress={() => handleSelection('user', 'login')}>
                <Ionicons name="person-circle-outline" size={50} color="#007C00" />
                <Text style={styles.cardTitleUser}>User</Text>
                <Text style={styles.cardSubText}>For individuals, student, and households</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cardCenter} onPress={() => handleSelection('center', 'login')}>
                <Ionicons name="location-outline" size={46} color="#2962FF" style={{marginBottom: 4}} />
                <Text style={styles.cardTitleCenter}>Drop-Off Center</Text>
                <Text style={styles.cardSubTextBlue}>For recycling centers and collection points</Text>
              </TouchableOpacity>
            </View>
            <BackgroundGraphics />
            <View style={styles.staticDotsRow}>
              <View style={styles.dotInactive} /><View style={styles.dotActive} />
              <View style={styles.dotInactive} /><View style={styles.dotInactive} />
            </View>
          </View>
        )}
      </View>

      {showSplash && (
        <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]} pointerEvents="none">
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            <Image source={require('../assets/images/leaf.png')} style={{ width: 150, height: 150 }} resizeMode="contain" />
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  splashContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#007C00', justifyContent: 'center', alignItems: 'center', zIndex: 10 },

  slideSwirl: { width, flex: 1, paddingTop: Platform.OS === 'ios' ? 70 : 45, paddingHorizontal: 25 },
  textContainerSwirl: { marginBottom: 10 },
  introTitle: { fontSize: 44, fontWeight: '900', color: '#000000', lineHeight: 48, letterSpacing: -1 },
  titleBlackSwirl: { fontSize: 38, fontWeight: '900', color: '#000000', lineHeight: 44, letterSpacing: -1 },
  titleHighlightSwirl: { fontSize: 38, fontWeight: '900', lineHeight: 44, letterSpacing: -1 },
  descriptionSwirl: { fontSize: 13, lineHeight: 22, fontWeight: '500', marginTop: 15, paddingRight: 10 },
  imageContainerSwirl: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },

  getStartedButton: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 85 : 70, 
    left: 25,
    right: 25,
    backgroundColor: '#007C00',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    elevation: 3,
    zIndex: 5,
  },
  getStartedText: { color: 'white', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 },

  topButtonsContainer: {
    width: '100%',
    marginTop: 10,
    marginBottom: 10,
  },
  btnSolidGreen: {
    backgroundColor: '#007C00',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnSolidText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  btnOutlineGreen: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#007C00',
  },
  btnOutlineText: { color: '#007C00', fontSize: 16, fontWeight: 'bold' },

  mockupContainer0: { width: '100%', flex: 1, position: 'relative', alignItems: 'center' },
  introBin: { position: 'absolute', bottom: 60, right: -20, width: 220, height: 290, transform: [{ rotate: '-5deg' }], zIndex: 1 },
  introBag: { position: 'absolute', bottom: 90, left: 10, width: 80, height: 100, transform: [{ rotate: '-10deg' }], zIndex: 3 },
  introCan: { position: 'absolute', bottom: 40, left: '35%', width: 45, height: 55, transform: [{ rotate: '8deg' }], zIndex: 3 },
  introBottle: { position: 'absolute', top: 50, right: 30, width: 30, height: 85, transform: [{ rotate: '15deg' }], zIndex: 3 },

  mockupContainer1: { width: '100%', height: 380, position: 'relative', alignItems: 'center', marginTop: 10 },
  scanBox: { width: 200, height: 200, backgroundColor: '#E8F5E9', borderRadius: 24, justifyContent: 'center', alignItems: 'center', zIndex: 2, marginTop: 20 },
  scanText: { color: '#007C00', fontWeight: 'bold', marginTop: 15, fontSize: 13 },
  floatBag: { position: 'absolute', bottom: 30, left: 10, width: 70, height: 90, transform: [{ rotate: '-8deg' }], zIndex: 3 },
  floatCan: { position: 'absolute', bottom: 10, left: '42%', width: 40, height: 50, transform: [{ rotate: '5deg' }], zIndex: 3 },
  floatBin: { position: 'absolute', bottom: -10, right: -40, width: 170, height: 230, transform: [{ rotate: '12deg' }], zIndex: 1 },
  floatBottle: { position: 'absolute', top: 50, right: 20, width: 25, height: 75, zIndex: 3 },

  mockupContainer2: { width: '100%', height: 380, position: 'relative', alignItems: 'center', marginTop: 10 },
  lightBlueBox: { position: 'absolute', top: '0%', right: '5%', backgroundColor: '#90CAF9', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, transform: [{ rotate: '4deg' }], zIndex: 1 },
  lbTitle: { fontSize: 15, fontWeight: '800', color: '#0D47A1', lineHeight: 18 }, lbSub: { fontSize: 11, color: '#1565C0', marginTop: 4, fontWeight: '600' },
  darkBlueBox: { position: 'absolute', top: '15%', left: '0%', backgroundColor: '#2962FF', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 14, transform: [{ rotate: '-3deg' }], zIndex: 2, width: '95%', elevation: 6 },
  dbTitle: { fontSize: 17, fontWeight: 'bold', color: 'white' }, dbSub: { fontSize: 12, color: '#BBDEFB', marginTop: 2 },
  collectionText: { position: 'absolute', top: '42%', left: '5%', fontSize: 20, fontWeight: '900', color: '#1A237E', zIndex: 3 },
  pillRow: { position: 'absolute', top: '52%', left: '5%', flexDirection: 'row', gap: 10, zIndex: 3 }, pill: { paddingVertical: 6, paddingHorizontal: 20, borderRadius: 15 }, pillTextWhite: { color: 'white', fontWeight: 'bold', fontSize: 12 }, pillTextBlue: { color: '#1A237E', fontWeight: 'bold', fontSize: 12 },
  cardLeft: { position: 'absolute', top: '65%', left: '0%', backgroundColor: '#BBDEFB', padding: 8, borderRadius: 14, transform: [{ rotate: '-6deg' }], zIndex: 4 }, cardRight: { position: 'absolute', top: '75%', right: '0%', backgroundColor: '#BBDEFB', padding: 8, borderRadius: 14, transform: [{ rotate: '4deg' }], zIndex: 3 }, cardImg: { width: 110, height: 80, borderRadius: 10 }, cardTitle: { fontSize: 11, fontWeight: '800', color: '#0D47A1', marginTop: 8 }, cardWeight: { fontSize: 13, fontWeight: '900', color: '#0D47A1' },

  mockupContainer3: { width: '100%', height: 380, position: 'relative', alignItems: 'center', marginTop: 10 },
  mapGraphicArea: { width: '100%', height: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 30, position: 'relative' }, solidLine: { position: 'absolute', top: '50%', width: '90%', height: 3, backgroundColor: '#007C00', borderRadius: 2 },
  locationCard: { width: '95%', backgroundColor: 'white', borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E8F5E9', elevation: 2 },
  locIconBg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 }, locDetails: { flex: 1 }, locTitle: { fontSize: 14, fontWeight: 'bold', color: '#1C1C1E' }, locSub: { fontSize: 10, color: '#555', marginTop: 2, fontWeight: '600' }, locDistance: { fontSize: 10, color: '#9AA0A6', marginTop: 2 }, openBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 }, openText: { fontSize: 9, fontWeight: 'bold', color: '#007C00' },

  mockupContainer4Swirl: { width: '100%', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 10 },
  togethrImg: { width: '100%', height: 280, marginBottom: 30 },

  mockupContainerEntry: { width: '100%', flex: 1, position: 'relative', alignItems: 'center' },
  entryBin: { position: 'absolute', bottom: 20, right: -30, width: 250, height: 320, transform: [{ rotate: '8deg' }], zIndex: 1 },
  entryBag: { position: 'absolute', bottom: 80, left: 20, width: 75, height: 95, transform: [{ rotate: '-15deg' }], zIndex: 3 },
  entryCan: { position: 'absolute', top: 20, right: 80, width: 42, height: 52, transform: [{ rotate: '-20deg' }], zIndex: 3 },
  entryBottle: { position: 'absolute', top: 0, right: 30, width: 28, height: 80, transform: [{ rotate: '10deg' }], zIndex: 3 },

  bottomNavSwirl: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 25, width: '100%', alignItems: 'center', justifyContent: 'center' },
  dotsContainerSwirl: { flexDirection: 'row', alignItems: 'center' },
  dotSwirl: { height: 8, borderRadius: 4, marginHorizontal: 4 },

  selectionViewContainer: { flex: 1, backgroundColor: '#F4F8F5' },
  selectionHeader: { paddingTop: Platform.OS === 'ios' ? 40 : 60, paddingHorizontal: 30, zIndex: 10 },
  backButton: { marginBottom: 15, marginLeft: -5 },
  selectionTitle: { fontSize: 38, fontWeight: '900', color: '#000000', lineHeight: 44, letterSpacing: -1 },
  selectionCardsArea: { flex: 1, paddingHorizontal: 30, paddingTop: 30, zIndex: 10 },
  subTextGreen: { fontSize: 18, fontWeight: '800', color: '#007C00', marginBottom: 2 },
  subTextBlack: { fontSize: 18, fontWeight: '900', color: '#1C1C1E' },
  cardUser: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#E8F5E9', marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTitleUser: { fontSize: 18, fontWeight: 'bold', color: '#007C00', marginTop: 5 }, cardSubText: { fontSize: 10, color: '#007C00', fontWeight: '600', marginTop: 4 },
  cardCenter: { backgroundColor: '#F0F4FF', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1.5, borderColor: '#BBDEFB', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTitleCenter: { fontSize: 18, fontWeight: 'bold', color: '#2962FF' }, cardSubTextBlue: { fontSize: 10, color: '#2962FF', fontWeight: '600', marginTop: 4 },
  graphicsContainerFixed: { position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.45, zIndex: 1 },
  floatBinFixed: { position: 'absolute', bottom: -40, right: -30, width: 250, height: 320, transform: [{ rotate: '10deg' }] },
  floatBagFixed: { position: 'absolute', bottom: 80, left: 20, width: 80, height: 100, transform: [{ rotate: '-15deg' }] },
  floatCanFixed: { position: 'absolute', bottom: '40%', left: '25%', width: 40, height: 50, transform: [{ rotate: '15deg' }] },
  floatBottleFixed: { position: 'absolute', top: 30, right: 20, width: 25, height: 75, zIndex: 3 },
  staticDotsRow: { position: 'absolute', bottom: Platform.OS === 'ios' ? 40 : 20, left: 40, flexDirection: 'row', alignItems: 'center' },
  dotInactive: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1C1C1E', marginHorizontal: 3 },
  dotActive: { width: 20, height: 8, borderRadius: 4, backgroundColor: '#38B000', marginHorizontal: 3 },
});