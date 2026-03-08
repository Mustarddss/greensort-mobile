import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, FlatList, BackHandler, StatusBar, Platform, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 

// INITIAL MOCK DATA
const INITIAL_PROJECTS = [
  { id: '1', title: 'Plastic Bottle Planter', materialCategory: 'Plastics', difficulty: 'Easy', time: '15 min', cost: '₱50-100', image: 'https://www.cravingsomecreativity.com/wp-content/uploads/2018/06/soda-bottle-animal-planters.jpg', materials: ['2-3 plastic bottles', 'Scissors', 'Paint (optional)', 'Soil and seeds'], steps: ['Clean bottles thoroughly', 'Cut bottle in half', 'Add drainage holes', 'Fill with soil and plant'], sellingPrice: '₱30-80' },
  { id: '2', title: 'Glass Jar Organizer', materialCategory: 'Glass', difficulty: 'Easy', time: '10 min', cost: '₱30-80', image: 'https://ilovepeanutbutter.com/cdn/shop/articles/Earth_Day-Horizontal-blog-Large_a82d851d-a196-4604-8e5e-84a844eee8c3_1600x.jpg?v=1619013996', materials: ['Glass Jars', 'Glue Gun', 'Acrylic Paint', 'Labels'], steps: ['Remove labels from jars', 'Wash and dry completely', 'Paint lids or jars', 'Add labels'], sellingPrice: '₱50-120' },
  { id: '3', title: 'Cardboard Storage Box', materialCategory: 'Paper', difficulty: 'Medium', time: '30 min', cost: '₱100-200', image: 'https://www.discoguard.com/media/catalog/product/cache/890204c48d2563bc5f1aa1b5dd0d3f52/a/r/archiefdoos-singles.jpg', materials: ['Old Cardboard boxes', 'Fabric or wrapping paper', 'Glue', 'Rope for handles'], steps: ['Reinforce box bottom', 'Wrap box in fabric', 'Punch holes for handles', 'Insert rope'], sellingPrice: '₱150-300' },
  { id: '4', title: 'DIY Tin Can Lanterns', materialCategory: 'Metals', difficulty: 'Medium', time: '40 min', cost: '₱50-100', image: 'https://images.squarespace-cdn.com/content/v1/5e946e4f801baa0af592f817/1588852878548-PCX9LX0YHHDX8G2JH7VN/2+fire+and+air+outside.png', materials: ['Clean tin cans', 'Hammer and Nail', 'Wire for handle', 'Tea light candles'], steps: ['Freeze water in can', 'Draw design patterns', 'Punch holes using nail', 'Add wire handle'], sellingPrice: '₱80-150' },
  { id: '5', title: 'Woven Newspaper Basket', materialCategory: 'Paper', difficulty: 'Hard', time: '1 hour', cost: '₱20-50', image: 'https://live.staticflickr.com/4051/4419567360_bc8692f745.jpg', materials: ['Old newspapers', 'Glue stick', 'Cardboard base'], steps: ['Roll paper into tubes', 'Glue tubes around base', 'Weave tubes over/under', 'Secure ends'], sellingPrice: '₱200-350' },
  { id: '6', title: 'Bottle Cap Coasters', materialCategory: 'Plastics', difficulty: 'Easy', time: '20 min', cost: '₱30-60', image: 'https://dollarstorecrafts.com/wp-content/uploads/2013/03/Bottle-Cap-Coasters.jpg', materials: ['Plastic bottle caps', 'Hot glue gun', 'Cork sheet'], steps: ['Clean bottle caps', 'Arrange in honeycomb', 'Glue sides together', 'Attach to base'], sellingPrice: '₱40-100' }
];

const CATEGORIES = ['All', 'Plastics', 'Glass', 'Paper', 'Metals', 'Others'];

const getSafeShadow = () => Platform.select({ 
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, 
    android: { elevation: 3 } 
});

export default function ProjectsPage() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  const insets = useSafeAreaInsets(); 
  
  const [projects] = useState(INITIAL_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Hardware Back Button handling
  useEffect(() => {
    const backAction = () => {
      if (selectedProject) { setSelectedProject(null); return true; }
      return false; 
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedProject]);

  const handleBack = () => selectedProject ? setSelectedProject(null) : router.back();

  const filteredProjects = projects.filter(project => {
    const matchesCategory = activeCategory === 'All' ? true : project.materialCategory === activeCategory;
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          project.materialCategory.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // 📖 RENDER: DIY GUIDE (DETAIL VIEW)
  if (selectedProject) {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
            
            {/* Header matches Rewards.js height */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity>
                    <Text style={styles.headerTitle}>DIY Guide</Text>
                    <View style={{ width: 40 }} />
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.detailBody}>
                    <View style={styles.detailCard}>
                        <Image source={{ uri: selectedProject.image }} style={styles.detailImage} />
                        <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{selectedProject.materialCategory}</Text></View>
                        <View style={styles.detailContent}>
                            <Text style={styles.detailTitle}>{selectedProject.title}</Text>
                            <View style={styles.tagsRow}>
                                <View style={[styles.tag, {backgroundColor: '#E8F5E9'}]}><Text style={[styles.tagText, {color: '#007C00'}]}>{selectedProject.difficulty}</Text></View>
                                <View style={styles.metaItem}><MaterialCommunityIcons name="clock-outline" size={16} color="#666" /><Text style={styles.metaText}>{selectedProject.time}</Text></View>
                                
                                {/* 🟢 RESTORED: Estimated Cost */}
                                <View style={styles.metaItem}>
                                    <MaterialCommunityIcons name="cash" size={16} color="#666" />
                                    <Text style={styles.metaText}>{selectedProject.cost}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Required Materials</Text>
                        {selectedProject.materials.map((mat, i) => <View key={i} style={styles.listItem}><View style={styles.squareBullet} /><Text style={styles.listText}>{mat}</Text></View>)}
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
                        {selectedProject.steps.map((step, i) => <View key={i} style={styles.stepItem}><View style={styles.stepNumberBox}><Text style={styles.stepNumber}>{i+1}</Text></View><Text style={styles.stepText}>{step}</Text></View>)}
                    </View>

                    {/* Potential Selling Price Info */}
                    <View style={[styles.sectionCard, { borderLeftWidth: 5, borderLeftColor: '#007C00' }]}>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}><FontAwesome5 name="money-bill-wave" size={16} color="#007C00" /><Text style={[styles.sectionTitle, {marginLeft: 10, marginBottom: 0}]}>Market Value</Text></View>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#007C00', marginTop: 5 }}>{selectedProject.sellingPrice}</Text>
                        <Text style={{ fontSize: 12, color: '#888' }}>Potential selling price for your finished product.</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
  }

  // 📋 RENDER: PROJECT LIST (MAIN VIEW)
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007C00" translucent={true} />
      
      {/* 🟢 FIXED HEADER: height aligned with Rewards.js */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 15, paddingBottom: 25 }]}>
          <View style={styles.headerRow}>
             <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="white" /></TouchableOpacity> 
             <View style={{alignItems: 'center'}}><Text style={styles.headerTitle}>Upcycle Ideas</Text><Text style={styles.headerSubtitle}>Give waste a second life</Text></View>
             <View style={{ width: 40 }} />
          </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
          {/* 🟢 SEARCH BAR: Placed cleanly below the header */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput placeholder="Search projects or materials..." style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
                {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color="#ccc" /></TouchableOpacity>}
            </View>
          </View>

          <View style={styles.categoryContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {CATEGORIES.map((cat, i) => (
                    <TouchableOpacity key={i} style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]} onPress={() => setActiveCategory(cat)}>
                        <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
          </View>

          <FlatList
            data={filteredProjects}
            scrollEnabled={false} 
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="magnify-close" size={60} color="#ccc" />
                <Text style={styles.emptyText}>No results found for "{searchQuery}"</Text>
              </View>
            )}
            renderItem={({ item }) => (
                <TouchableOpacity style={styles.card} onPress={() => setSelectedProject(item)} activeOpacity={0.9}>
                  <Image source={{ uri: item.image }} style={styles.cardImage} />
                  <View style={[styles.badge, {backgroundColor: '#007C00'}]}><Text style={styles.badgeText}>{item.difficulty}</Text></View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardMaterialTag}>{item.materialCategory}</Text>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}><MaterialCommunityIcons name="clock-outline" size={16} color="#888" /><Text style={styles.metaText}>{item.time}</Text></View>
                        <View style={styles.metaItem}><MaterialCommunityIcons name="cash" size={16} color="#888" /><Text style={styles.metaText}>{item.cost}</Text></View>
                    </View>
                  </View>
                </TouchableOpacity>
            )}
          />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#007C00', paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 2 },
  backButton: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12 },

  searchContainer: { paddingHorizontal: 20, marginTop: 20 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 15, paddingHorizontal: 15, height: 52, ...getSafeShadow() },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#333' },

  categoryContainer: { marginTop: 10 },
  categoryScroll: { paddingHorizontal: 20, paddingVertical: 10 },
  categoryPill: { backgroundColor: 'white', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 10, ...getSafeShadow() },
  categoryPillActive: { backgroundColor: '#007C00' },
  categoryText: { fontSize: 13, color: '#666', fontWeight: '600' },
  categoryTextActive: { color: 'white' },

  listContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 20, marginBottom: 20, ...getSafeShadow(), overflow: 'hidden' },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  badge: { position: 'absolute', top: 15, right: 15, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  cardContent: { padding: 18 },
  cardMaterialTag: { color: '#007C00', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#666', fontSize: 13, fontWeight: '500' },
  
  detailBody: { paddingHorizontal: 20, marginTop: 20 },
  detailCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 20, ...getSafeShadow() },
  detailImage: { width: '100%', height: 220, borderRadius: 16 },
  categoryBadge: { position: 'absolute', top: 35, left: 35, padding: 6, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)' },
  categoryBadgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  detailTitle: { fontSize: 24, fontWeight: 'bold', color: '#263238', marginVertical: 15 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  tag: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 12 },
  tagText: { fontSize: 12, fontWeight: 'bold' },
  sectionCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, marginBottom: 20, ...getSafeShadow() },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#263238', marginBottom: 18 },
  listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  squareBullet: { width: 8, height: 8, backgroundColor: '#007C00', marginRight: 12, borderRadius: 3 }, 
  listText: { color: '#546E7A', fontSize: 15, flex: 1 },
  stepItem: { flexDirection: 'row', marginBottom: 18 },
  stepNumberBox: { width: 32, height: 32, backgroundColor: '#E8F5E9', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 }, 
  stepNumber: { color: '#007C00', fontWeight: 'bold' },
  stepText: { color: '#546E7A', fontSize: 15, flex: 1, lineHeight: 22 },

  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 14 }
});