import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage'; // 👈 IMPORTANTE: Para ma-save ang user

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ⚠️ UPDATE YOUR NGROK LINK HERE
  const API_URL = 'https://jumpier-michale-identical.ngrok-free.dev'; 

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password
      });

      if (response.data.success) {
        // ✅ SAVE USER DATA SA PHONE STORAGE
        // Ito ang kailangan ng Profile.js at Rewards.js para gumana
        await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Redirect sa Dashboard
        Alert.alert('Success', 'Welcome back!', [
            { text: 'OK', onPress: () => router.replace('/(tabs)/dashboard') }
        ]);
      }
    } catch (error) {
      console.log(error);
      Alert.alert('Login Failed', error.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.circle} />

      <View style={styles.content}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Sign in to continue to GreenSort</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Enter your email" 
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
            placeholder="Enter your password" 
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>LOGIN</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={{ color: '#666' }}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <Text style={styles.link}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  circle: { width: 400, height: 400, borderRadius: 200, backgroundColor: '#e8f5e9', position: 'absolute', top: -150, left: -50 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 30, marginTop: 50 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#00C853', marginBottom: 5 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 40 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 5 },
  input: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee', fontSize: 16 },
  button: { backgroundColor: '#00C853', padding: 18, borderRadius: 15, alignItems: 'center', elevation: 5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  link: { color: '#00C853', fontWeight: 'bold' },
});