import { Stack } from 'expo-router';
import { useTenant } from '@dexo/mobile-core/lib/tenant-context';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function AuthLayout() {
  const { tenant } = useTenant();
  const router = useRouter();

  useEffect(() => {
    // If user opens the app and we have a saved tenant, go to tabs
    // (handled by root layout)
  }, [tenant]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
