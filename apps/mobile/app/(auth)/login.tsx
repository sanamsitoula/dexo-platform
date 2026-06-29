import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../../lib/theme';
import SocialLoginButtons from '../../components/SocialLoginButtons';
import { tenantsApi } from '../../lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState('fitnessapp');
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [showTenantList, setShowTenantList] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  async function loadTenants() {
    const res = await tenantsApi.list({ limit: 50 });
    if (res.error) {
      console.warn('[login] tenantsApi.list error:', res.error);
      return;
    }
    const payload: any = res.data;
    const list: any[] = Array.isArray(payload) ? payload : (payload?.data ?? []);
    console.log('[login] loaded', list.length, 'tenants');
    setTenants(list);
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const result = await login(email, password, tenantSubdomain);
    setLoading(false);
    if (result.error) {
      Alert.alert('Login Failed', result.error);
    } else {
      router.replace('/tenant-select');
    }
  }

  const selectedTenant = tenants.find((t) => t.subdomain === tenantSubdomain);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>D</Text>
            </View>
            <Text style={styles.title}>Welcome to Dexo</Text>
            <Text style={styles.subtitle}>Sign in to your business</Text>
          </View>

          <View style={styles.form}>
            {/* Tenant Selector */}
            <View>
              <Text style={styles.label}>Business *</Text>
              <TouchableOpacity
                style={styles.tenantSelector}
                onPress={() => setShowTenantList(!showTenantList)}
              >
                <View style={styles.tenantSelectorLeft}>
                  {selectedTenant ? (
                    <>
                      <View
                        style={[
                          styles.tenantIcon,
                          { backgroundColor: selectedTenant.primaryColor || Colors.primary },
                        ]}
                      >
                        <Text style={styles.tenantIconText}>
                          {selectedTenant.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.tenantName}>{selectedTenant.name}</Text>
                        <Text style={styles.tenantSub}>
                          {selectedTenant.subdomain}.dexo.app
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.placeholderText}>Select a business</Text>
                  )}
                </View>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>

              {showTenantList && (
                <View style={styles.tenantList}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {tenants.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={styles.tenantItem}
                        onPress={() => {
                          setTenantSubdomain(t.subdomain);
                          setShowTenantList(false);
                        }}
                      >
                        <View
                          style={[
                            styles.tenantIcon,
                            { backgroundColor: t.primaryColor || Colors.primary },
                          ]}
                        >
                          <Text style={styles.tenantIconText}>
                            {t.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tenantName}>{t.name}</Text>
                          <Text style={styles.tenantSub}>{t.subdomain}.dexo.app</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <SocialLoginButtons tenantId={tenantSubdomain} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.link}>Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flexGrow: 1 },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl },
  logoContainer: { alignItems: 'center', marginBottom: Spacing.xl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoText: { fontSize: 32, fontWeight: 'bold', color: Colors.white },
  title: { fontSize: FontSize.xxl, fontWeight: 'bold', color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  form: { gap: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    fontSize: FontSize.md,
    color: Colors.text,
  },
  tenantSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tenantSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  tenantIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tenantIconText: { fontSize: FontSize.md, color: Colors.white, fontWeight: 'bold' },
  tenantName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  tenantSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  chevron: { fontSize: 12, color: Colors.textSecondary },
  tenantList: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    marginTop: 4,
  },
  tenantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  placeholderText: { color: Colors.textLight, fontSize: FontSize.md },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 6,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.md },
  footerText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  link: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600' },
});
