import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Signup() {
  const router = useRouter();
  
  // STATES (Text fields na lang)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState(''); 
  const [loading, setLoading] = useState(false);

  // MOCK SIGNUP FUNCTION
  const handleSignup = async () => {
    // Validation: Check kung may laman lahat
    if (!fullName || !email || !password || !address) {
      Alert.alert('Missing Info', 'Please fill all text fields.');
      return;
    }

    setLoading(true);

    // 👇 OFFLINE SIMULATION (Fake Loading)
    setTimeout(() => {
        setLoading(false);
        Alert.alert('Account Created!', 'Welcome to GreenSort revolution!', [
            { text: 'Login Now', onPress: () => router.replace('/login') }
        ]);
    }, 2000);
  };
  
  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* 🌿 LOGO HEADER (Updated to Image) */}
      <View style={styles.centerHeader}>
          <Image 
              // 👇 Make sure this path matches where your file is!
              source={require('../assets/images/signup logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
          />
      </View>

      <View style={styles.headerTextContainer}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the GreenSort revolution!</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput 
            style={styles.input} 
            placeholder="Juan Dela Cruz" 
            value={fullName} 
            onChangeText={setFullName} 
        />

        <Text style={styles.label}>Email</Text>
        <TextInput 
            style={styles.input} 
            placeholder="email@gmail.com" 
            keyboardType="email-address" 
            autoCapitalize="none"
            value={email} 
            onChangeText={setEmail} 
        />

        <Text style={styles.label}>Barangay Address</Text>
        <TextInput 
            style={styles.input} 
            placeholder="e.g. Brgy. Sampaloc I" 
            value={address} 
            onChangeText={setAddress} 
        />

        <Text style={styles.label}>Password</Text>
        <TextInput 
            style={styles.input} 
            placeholder="Min. 8 characters" 
            secureTextEntry 
            value={password} 
            onChangeText={setPassword} 
        />

        {/* SIGN UP BUTTON */}
        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
          {loading ? (
             <ActivityIndicator color="white" /> 
          ) : (
             <Text style={styles.buttonText}>SIGN UP</Text>
          )}
        </TouchableOpacity>

        {/* LOGIN LINK */}
        <View style={styles.footer}>
            <Text style={{color: '#888'}}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.link}>Login</Text>
            </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#ffffff', padding: 30, paddingTop: 60, justifyContent: 'center' },
  
  centerHeader: { alignItems: 'center', marginBottom: 20 },
  brandTitle: { fontSize: 18, fontWeight: 'bold', color: '#00C853', letterSpacing: 2 },

  headerTextContainer: { marginBottom: 30 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#00C853' },
  subtitle: { fontSize: 14, color: '#888' },

  form: { width: '100%' },
  label: { fontSize: 12, color: '#333', fontWeight: '600', marginBottom: 5, marginTop: 15, marginLeft: 5 },
  input: { backgroundColor: '#F5F5F5', paddingVertical: 15, paddingHorizontal: 15, borderRadius: 10, fontSize: 14, color: '#333' },

  button: { backgroundColor: '#00C853', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 40, shadowColor: '#00C853', shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, marginBottom: 20 },
  link: { color: '#00C853', fontWeight: 'bold' },
});