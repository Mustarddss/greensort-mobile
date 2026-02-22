import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  Image, 
  KeyboardAvoidingView, // 👈 Import for Keyboard fix
  Platform,             // 👈 Import for OS check
  ScrollView            // 👈 Import for scrolling
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { StatusBar } from 'expo-status-bar'; // 👈 Import for Status Bar color
import { SafeAreaView } from 'react-native-safe-area-context';

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
    // 🟢 FIX 1: SafeAreaView with White Background
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      
      {/* 🟢 FIX 2: Dark Status Bar Text */}
      <StatusBar style="dark" backgroundColor="#ffffff" />

      {/* 🟢 FIX 3: Keyboard Handling */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          {/* 🌿 LOGO SECTION */}
          <View style={styles.logoContainer}>
              <Image 
                  source={require('../assets/images/logo.png')} 
                  style={styles.logoImage} 
                  resizeMode="contain"
              />
          </View>

          {/* Text Section */}
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to continue to GreenSort</Text>

          {/* INPUTS */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput 
                style={styles.input} 
                placeholder="email@gmail.com" 
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
                {loading ? (
                    <ActivityIndicator color="white" /> 
                ) : (
                    <Text style={styles.buttonText}>LOGIN</Text>
                )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={{ color: '#888' }}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/signup')}>
                <Text style={styles.link}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 🟢 Updated Container Style for ScrollView
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    paddingHorizontal: 30,
    paddingBottom: 20
  },
  
  // 🌿 LOGO STYLES
  logoContainer: { 
      alignItems: 'flex-start', 
      marginBottom: 20,
      marginTop: 20 // Added konting margin sa taas
  },
  logoImage: { 
      width: 120, 
      height: 120, 
      marginLeft: -10 
  },

  // 📝 TEXT STYLES
  title: { 
      fontSize: 28, 
      fontWeight: 'bold', 
      color: '#00C853', 
      marginBottom: 5, 
      textAlign: 'left' 
  },
  subtitle: { 
      fontSize: 14, 
      color: '#888', 
      marginBottom: 40, 
      textAlign: 'left' 
  },

  // ⌨️ INPUT STYLES
  formContainer: {
      width: '100%'
  },
  inputContainer: { 
      marginBottom: 20 
  },
  label: { 
      fontSize: 13, 
      color: '#333', 
      fontWeight: '500', 
      marginBottom: 8 
  },
  input: { 
      backgroundColor: '#F5F5F5', 
      paddingVertical: 16, 
      paddingHorizontal: 15, 
      borderRadius: 8, 
      fontSize: 14, 
      color: '#333',
      borderWidth: 1,
      borderColor: '#EEEEEE' // Added subtle border
  },

  // 🟢 BUTTON STYLES
  button: { 
      backgroundColor: '#00C853', 
      padding: 18, 
      borderRadius: 8, 
      alignItems: 'center', 
      marginTop: 10,
      shadowColor: '#0000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3
  },
  buttonText: { 
      color: '#fff', 
      fontSize: 16, 
      fontWeight: 'bold', 
      letterSpacing: 0.5 
  },

  footer: { 
      flexDirection: 'row', 
      justifyContent: 'center', 
      marginTop: 30 
  },
  link: { 
      color: '#00C853', 
      fontWeight: 'bold' 
  },
});