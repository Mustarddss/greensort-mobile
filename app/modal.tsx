import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal Screen</Text>
      <View style={styles.separator} />
      
      {/* Simple Link pabalik, walang error */}
      <Link href="../" style={styles.link}>
        <Text style={styles.linkText}>Close Modal</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
    backgroundColor: '#eee',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    color: '#00C853', // GreenSort color
    fontWeight: 'bold',
  }
});