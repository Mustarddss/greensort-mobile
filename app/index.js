import { Redirect } from 'expo-router';

export default function Index() {
  // Pagbukas ng app, automatic lilipat sa Login Page
  return <Redirect href="/login" />;
}