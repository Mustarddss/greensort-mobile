import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  Image,
  KeyboardAvoidingView, // 👈 Import 1: Para sa Keyboard
  Platform // 👈 Import 2: Para malaman kung Android o iOS
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar'; // 👈 Import 3: Para sa Oras/Battery color
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Signup() {
  const router = useRouter();
  
  // STATES
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // SIGNUP FUNCTION
  const handleSignup = async () => {
    if (!fullName || !email || !address || !password || !confirmPassword) {
      Alert.alert('Missing Info', 'Please fill all text fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
        setLoading(false);
        Alert.alert('Account Created!', 'Welcome to GreenSort revolution!', [
            { text: 'Login Now', onPress: () => router.replace('/login') }
        ]);
    }, 2000);
  };
  
  return (
    // 🟢 FIX 1: Gawing White ang buong background ng SafeAreaView para walang itim sa taas/baba
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      
      {/* 🟢 FIX 2: StatusBar "dark" para maging kulay black ang oras/battery at hindi matakpan ng white bg */}
      <StatusBar style="dark" backgroundColor="#ffffff" />

      {/* 🟢 FIX 3: KeyboardAvoidingView para umangat kusa pag nagta-type */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" // Para pwede pa rin pumindot kahit labas keyboard
        >
          
          {/* 🌿 LOGO HEADER */}
          <View style={styles.centerHeader}>
              <Image 
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

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput 
                style={styles.input} 
                placeholder="Re-enter your password" 
                secureTextEntry 
                value={confirmPassword} 
                onChangeText={setConfirmPassword} 
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
                <Text style={{color: '#888'}}>Already have an Account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                    <Text style={styles.link}>Login</Text>
                </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { 
    flexGrow: 1, 
    paddingHorizontal: 30, 
    paddingTop: 20, 
    paddingBottom: 50 
  },
  
  centerHeader: { 
    alignItems: 'center', 
    marginBottom: 10 
  },
  logoImage: {
    width: 200, 
    height: 200, 
  },

  headerTextContainer: { 
    marginBottom: 25,
    alignItems: 'flex-start' 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#00C853', 
    marginBottom: 5
  },
  subtitle: { 
    fontSize: 14, 
    color: '#888' 
  },

  form: { 
    width: '100%' 
  },
  label: { 
    fontSize: 14, 
    color: '#333', 
    fontWeight: '500', 
    marginBottom: 8, 
    marginTop: 15 
  },
  input: { 
    backgroundColor: '#F5F5F5', 
    paddingVertical: 14, 
    paddingHorizontal: 15, 
    borderRadius: 8, 
    fontSize: 14, 
    color: '#333',
    borderWidth: 1,
    borderColor: '#EEEEEE'
  },

  button: { 
    backgroundColor: '#00C853', 
    paddingVertical: 16, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 30, 
    marginBottom: 10,
    shadowColor: '#000', 
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
    marginTop: 15, 
    marginBottom: 20 
  },
  link: { 
    color: '#00C853', 
    fontWeight: 'bold' 
  },
});