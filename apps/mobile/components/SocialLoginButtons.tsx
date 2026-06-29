import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { socialAuthApi } from '../lib/api';
import { Colors, Spacing, FontSize } from '../lib/theme';

interface SocialLoginButtonsProps {
  tenantId: string;
  redirectUri?: string;
}

const PROVIDERS = [
  { name: 'google', label: 'Google', icon: 'logo-google' },
  { name: 'github', label: 'GitHub', icon: 'logo-github' },
  { name: 'apple', label: 'Apple', icon: 'logo-apple' },
  { name: 'facebook', label: 'Facebook', icon: 'logo-facebook' },
];

export default function SocialLoginButtons({ tenantId, redirectUri }: SocialLoginButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSocialLogin = async (provider: string) => {
    setLoadingProvider(provider);
    try {
      const finalRedirectUri = redirectUri || 'dexo://auth/callback';
      const response = await socialAuthApi.getTenantAuthUrl(tenantId, provider, finalRedirectUri);

      if (response.data?.url) {
        await Linking.openURL(response.data.url);
      } else {
        Alert.alert(
          'Sign-in Unavailable',
          `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in is not configured. Please contact your administrator.`,
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to initiate social login');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>Or continue with</Text>
        <View style={styles.line} />
      </View>

      <View style={styles.buttonContainer}>
        {PROVIDERS.map((provider) => {
          const isLoading = loadingProvider === provider.name;
          return (
            <TouchableOpacity
              key={provider.name}
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={() => handleSocialLogin(provider.name)}
              disabled={isLoading || loadingProvider !== null}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Ionicons name={provider.icon as any} size={20} color={Colors.text} />
                  <Text style={styles.buttonText}>Continue with {provider.label}</Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  buttonContainer: {
    gap: Spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.text,
  },
});
