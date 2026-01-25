import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, FlatList, ActivityIndicator, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

// 👇 DATABASE MOCK DATA (Ready for MongoDB)
const INITIAL_PROJECTS = [
  {
    id: '1',
    title: 'Plastic Bottle Planter',
    category: 'Upcycling',
    difficulty: 'Easy',
    time: '15 min',
    cost: '₱50-100',
    image: 'https://images.unsplash.com/photo-1596468138838-7066d66e5f8f?q=80&w=600',
    materials: ['2-3 plastic bottles', 'Scissors', 'Paint (optional)', 'Soil and seeds'],
    steps: [
      'Clean plastic bottles thoroughly',
      'Cut bottle in half or create opening',
      'Decorate with paint if desired',
      'Add drainage holes at bottom',
      'Fill with soil and plant seeds'
    ],
    sellingPrice: '₱30-80'
  },
  {
    id: '2',
    title: 'Glass Jar Organizer',
    category: 'Upcycling',
    difficulty: 'Easy',
    time: '10 min',
    cost: '₱30-80',
    image: 'https://images.unsplash.com/photo-1605373307521-72921966ba47?q=80&w=600',
    materials: ['Glass Jars', 'Glue Gun', 'Acrylic Paint', 'Labels'],
    steps: [
        'Remove labels from jars',
        'Wash and dry completely',
        'Paint lids or jars',
        'Glue jars together (optional)',
        'Add labels for sorting'
    ],
    sellingPrice: '₱50-120'
  },
  {
    id: '3',
    title: 'Cardboard Storage Box',
    category: 'Upcycling',
    difficulty: 'Medium',
    time: '30 min',
    cost: '₱100-200',
    image: 'https://images.unsplash.com/photo-1592657422634-92736417539f?q=80&w=600',
    materials: ['Old Cardboard boxes', 'Fabric or wrapping paper', 'Glue', 'Rope for handles'],
    steps: [
        'Reinforce box bottom with extra cardboard',
        'Wrap box in fabric or paper',
        'Punch holes for handles',
        'Insert rope handles',
        'Use for organizing clothes or toys'
    ],
    sellingPrice: '₱150-300'
  }
];

export default function ProjectsPage() {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  
  const [projects, setProjects] = useState(INITIAL_PROJECTS);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔄 1. DEEP LINK LOGIC (FIXED: CONSUME & CLEAR)
  useEffect(() => {
    // Check natin kung may utos na mag-open
    if (params.openDirectly === 'true' && params.projectType) {
        
        // Hanapin ang project
        const found = projects.find(p => p.title.toLowerCase().includes(params.projectType.toLowerCase()));
        
        if (found) {
            setSelectedProject(found);
        } else {
            // Gumawa ng temporary project kung wala sa listahan ("Others")
            setSelectedProject({
                id: 'temp',
                title: params.projectType, 
                difficulty: 'Medium',
                time: '45 min',
                cost: '₱0-100',
                image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=600',
                materials: ['Collected Waste Material', 'Adhesive', 'Tools', 'Creativity'],
                steps: ['Clean the materials', 'Plan your design', 'Assemble parts', 'Decorate', 'Final touches'],
                sellingPrice: '₱50-200'
            });
        }

        // 🛠️ IMPORTANT FIX: Burahin agad ang params para hindi mag-loop/glitch pag nag-back
        router.setParams({ openDirectly: null, projectType: null });
    }
  }, [params.openDirectly]); // Makinig lang sa pagbabago ng openDirectly

  // 📱 2. HARDWARE BACK BUTTON (Android Fix)
  useEffect(() => {
    const backAction = () => {
      if (selectedProject) {
        setSelectedProject(null); // Isara ang Guide, ipakita ang Listahan
        return true; // Pigilan ang pag-exit sa app
      }
      return false; // Hayaan ang default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [selectedProject]);

  // 🔙 3. CUSTOM HEADER BACK BUTTON
  const handleBack = () => {
    if (selectedProject) {
        setSelectedProject(null); // Babalik sa Listahan
    } else {
        router.back(); // Babalik sa Home/Scan
    }
  };

  // 📖 RENDER: GUIDE VIEW (Specific Project)
  if (selectedProject) {
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.headerBg}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={handleBack}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>DIY Guides</Text>
                    <View style={{width: 24}} /> 
                </View>
                <Text style={styles.headerSubtitle}>Transform waste into valuable items</Text>
            </View>

            <View style={styles.detailBody}>
                {/* Main Image Card */}
                <View style={styles.detailCard}>
                    <Image source={{ uri: selectedProject.image }} style={styles.detailImage} />
                    
                    <View style={styles.detailContent}>
                        <Text style={styles.detailTitle}>{selectedProject.title}</Text>
                        
                        <View style={styles.tagsRow}>
                            <View style={[styles.tag, {backgroundColor: '#00C853'}]}>
                                <Text style={styles.tagText}>{selectedProject.difficulty}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                                <Text style={styles.metaText}>{selectedProject.time}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <MaterialCommunityIcons name="cash" size={16} color="#666" />
                                <Text style={styles.metaText}>{selectedProject.cost}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Materials List */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Required Materials</Text>
                    {selectedProject.materials.map((mat, index) => (
                        <View key={index} style={styles.listItem}>
                            <View style={styles.squareBullet} />
                            <Text style={styles.listText}>{mat}</Text>
                        </View>
                    ))}
                </View>

                {/* Steps List */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Step-by-Step Instructions</Text>
                    {selectedProject.steps.map((step, index) => (
                        <View key={index} style={styles.stepItem}>
                            <View style={styles.stepNumberBox}>
                                <Text style={styles.stepNumber}>{index + 1}</Text>
                            </View>
                            <Text style={styles.stepText}>{step}</Text>
                        </View>
                    ))}
                </View>

                {/* Selling Price Box */}
                <View style={styles.priceBox}>
                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}>
                         <FontAwesome5 name="money-bill-wave" size={16} color="#F57F17" />
                         <Text style={styles.priceLabel}> Estimated Selling Price</Text>
                    </View>
                    <Text style={styles.priceValue}>{selectedProject.sellingPrice}</Text>
                    <Text style={styles.priceSub}>Prices vary based on quality and materials used</Text>
                </View>
            </View>
            <View style={{height: 40}} />
        </ScrollView>
    );
  }

  // 📋 RENDER: LIST VIEW (Default)
  return (
    <View style={styles.container}>
      <View style={styles.headerBg}>
          <View style={styles.headerRow}>
             <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="white" />
             </TouchableOpacity> 
             <Text style={styles.headerTitle}>Upcycling Projects</Text>
             <View style={{width: 24}} />
          </View>
          <Text style={styles.headerSubtitle}>Transform waste into valuable items</Text>
      </View>

      <FlatList
        data={projects}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => setSelectedProject(item)}>
              <Image source={{ uri: item.image }} style={styles.cardImage} />
              <View style={[styles.badge, item.difficulty === 'Easy' ? {backgroundColor: '#00C853'} : {backgroundColor: '#FFA000'}]}>
                <Text style={styles.badgeText}>{item.difficulty}</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                        <Text style={styles.metaText}>{item.time}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="cash" size={16} color="#666" />
                        <Text style={styles.metaText}>{item.cost}</Text>
                    </View>
                </View>
              </View>
            </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  headerBg: { backgroundColor: '#0288D1', paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 25, borderBottomRightRadius: 25, marginBottom: 10, elevation: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 5, textAlign: 'center' },
  listContainer: { padding: 20 },
  card: { backgroundColor: 'white', borderRadius: 15, marginBottom: 20, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4 },
  cardImage: { width: '100%', height: 180, resizeMode: 'cover' },
  cardContent: { padding: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 15 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: '#666', fontSize: 13 },
  badge: { position: 'absolute', top: 15, right: 15, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, zIndex: 1 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  detailBody: { paddingHorizontal: 20 },
  detailCard: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 20, elevation: 2 },
  detailImage: { width: '100%', height: 200, borderRadius: 15, resizeMode: 'cover' },
  detailContent: { marginTop: 15 },
  detailTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  tag: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  tagText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  sectionCard: { backgroundColor: 'white', borderRadius: 20, padding: 20, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#444', marginBottom: 15 },
  listItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  squareBullet: { width: 8, height: 8, backgroundColor: '#2196F3', marginRight: 10, borderRadius: 2 },
  listText: { color: '#555', fontSize: 14 },
  stepItem: { flexDirection: 'row', marginBottom: 15 },
  stepNumberBox: { width: 28, height: 28, backgroundColor: '#0288D1', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  stepNumber: { color: 'white', fontWeight: 'bold' },
  stepText: { color: '#444', fontSize: 14, flex: 1, lineHeight: 20 },
  priceBox: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 15, padding: 15, marginBottom: 20 },
  priceLabel: { color: '#388E3C', fontWeight: 'bold', fontSize: 14 },
  priceValue: { color: '#2E7D32', fontSize: 24, fontWeight: 'bold', marginVertical: 5 },
  priceSub: { color: '#888', fontSize: 11 },
});