import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; 

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
      
      {/* Optional: Top design element if needed, otherwise white */}
      <View style={styles.content}>
        
        {/* 🌿 LOGO SECTION (Updated to Image) */}
        <View style={styles.logoContainer}>
            {/* Make sure 'logo.png' exists in 'mobile/assets/' folder */}
            <Image 
                source={require('../assets/images/logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain"
            />
        </View>

        {/* Text Section - Left Aligned */}
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Sign in to continue to GreenSort</Text>

        {/* INPUTS */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="" 
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
            placeholder="" 
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
  
  // 🌿 LOGO STYLES
  logoContainer: { 
      alignItems: 'flex-start', // Aligns logo to the left
      marginBottom: 20 
  },
  logoImage: { 
      width: 120, // Adjust size as needed
      height: 120, 
      marginLeft: -10 // Slight adjustment to align with text
  },

  // 📝 TEXT STYLES
  title: { fontSize: 28, fontWeight: 'bold', color: '#00C853', marginBottom: 5, textAlign: 'left' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 40, textAlign: 'left' },

  // ⌨️ INPUT STYLES
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 13, color: '#333', fontWeight: '500', marginBottom: 8 },
  input: { backgroundColor: '#F5F5F5', paddingVertical: 16, paddingHorizontal: 15, borderRadius: 8, fontSize: 14, color: '#333' },

  // 🟢 BUTTON STYLES
  button: { backgroundColor: '#00C853', padding: 18, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  link: { color: '#00C853', fontWeight: 'bold' },
});