import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth-context';
import { TenantProvider, useTenant } from '../lib/tenant-context';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../lib/theme';

function RootLayoutNav() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { tenant, isLoading: tenantLoading } = useTenant();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || tenantLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTenantGroup = segments[0] === 'tenant-select';
    const inTabsGroup = segments[0] === '(tabs)';

    // Not authenticated → go to tenant select
    if (!isAuthenticated && !inAuthGroup && !inTenantGroup) {
      router.replace('/tenant-select');
      return;
    }

    // Authenticated but no tenant → go to tenant select
    if (isAuthenticated && !tenant && !inTenantGroup) {
      router.replace('/tenant-select');
      return;
    }

    // Tenant selected → go to tabs
    if (isAuthenticated && tenant && (inAuthGroup || inTenantGroup)) {
      router.replace('/(tabs)');
      return;
    }
  }, [isAuthenticated, authLoading, tenant, tenantLoading, segments, user]);

  if (authLoading || tenantLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="tenant-select" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="classes" />
      <Stack.Screen name="checkin" />
      <Stack.Screen name="badges" />
      <Stack.Screen name="referrals" />
      <Stack.Screen name="my-membership" />
      <Stack.Screen name="workout-log" />
      <Stack.Screen name="diet-log" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <TenantProvider>
        <StatusBar style="dark" />
        <RootLayoutNav />
      </TenantProvider>
    </AuthProvider>
  );
}
