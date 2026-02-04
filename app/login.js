import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    // 👇 OFFLINE SIMULATION
    setTimeout(async () => {
      try {
        const mockUser = {
            id: 'user_offline',
            fullName: 'Test User',
            email: email,
            points: 100,
            badges: ['Newbie']
        };

        await AsyncStorage.setItem('user', JSON.stringify(mockUser));
        setLoading(false);

        Alert.alert('Success', 'Welcome back!', [
            { text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') }
        ]);

      } catch (error) {
        setLoading(false);
        Alert.alert('Error', 'Something went wrong');
      }
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        
        {/* 🌿 LOGO SECTION */}
        <View style={styles.logoContainer}>
            {/* Palitan mo ito ng <Image source={require('../../assets/logo.png')} /> kung may image file ka */}
            <MaterialCommunityIcons name="recycle-variant" size={80} color="#00C853" />
            <Text style={styles.logoText}>GREENSORT</Text>
        </View>

        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Sign in to continue to GreenSort</Text>

        {/* INPUTS */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="email@domain.com" 
            placeholderTextColor="#AAA"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter Password" 
            placeholderTextColor="#AAA"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>LOGIN</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={{ color: '#888' }}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={styles.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center' },
  content: { paddingHorizontal: 30 },
  
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  logoText: { fontSize: 24, fontWeight: 'bold', color: '#00C853', marginTop: 10, letterSpacing: 2 },

  title: { fontSize: 28, fontWeight: 'bold', color: '#00C853', marginBottom: 5, textAlign: 'left' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 30, textAlign: 'left' },

  inputContainer: { marginBottom: 15 },
  label: { fontSize: 12, color: '#333', fontWeight: '600', marginBottom: 5, marginLeft: 5 },
  input: { backgroundColor: '#F5F5F5', paddingVertical: 15, paddingHorizontal: 20, borderRadius: 10, fontSize: 14, color: '#333' },

  button: { backgroundColor: '#00C853', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10, shadowColor: '#00C853', shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  link: { color: '#00C853', fontWeight: 'bold' },
});