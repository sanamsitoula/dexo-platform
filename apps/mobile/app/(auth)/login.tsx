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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-context';
import { Colors, Spacing, BorderRadius, FontSize } from '../../lib/theme';
import SocialLoginButtons from '../../components/SocialLoginButtons';
import { tenantsApi } from '../../lib/api';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSubdomain, setTenantSubdomain] = useState('');
  const [loading, setLoading] = useState(false);

  // Tenant picker: fetch ALL active businesses once, then filter client-side so
  // the dropdown shows every available business immediately (no typing needed).
  const [tenantQuery, setTenantQuery] = useState('');
  const [allTenants, setAllTenants] = useState<any[]>([]);
  const [showTenantList, setShowTenantList] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setTenantsLoading(true);
      const res = await tenantsApi.publicSearch('', 50);
      const payload: any = res.data;
      const list: any[] = Array.isArray(payload) ? payload : payload?.data ?? [];
      setAllTenants(list);
      setTenantsLoading(false);
    })();
  }, []);

  const filteredTenants = allTenants.filter((t) =>
    !tenantQuery.trim() ||
    t.name?.toLowerCase().includes(tenantQuery.toLowerCase()) ||
    t.subdomain?.toLowerCase().includes(tenantQuery.toLowerCase())
  );

  function selectTenant(t: any) {
    setTenantSubdomain(t.subdomain);
    setTenantQuery('');
    setShowTenantList(false);
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!tenantSubdomain) {
      Alert.alert('Error', 'Please select your business');
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

  const selectedTenant = allTenants.find((t) => t.subdomain === tenantSubdomain);

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
            {/* Tenant Selector — server-side search, top 10 results */}
            <View>
              <Text style={styles.label}>Select your business *</Text>

              {/* Tap to open — shows ALL available businesses immediately */}
              <TouchableOpacity
                style={[styles.searchBox, showTenantList && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}
                activeOpacity={0.7}
                onPress={() => setShowTenantList((s) => !s)}
              >
                {selectedTenant ? (
                  <View style={styles.pickerRow}>
                    <View style={[styles.tenantIcon, { backgroundColor: selectedTenant.primaryColor || Colors.primary }]}>
                      <Text style={styles.tenantIconText}>{selectedTenant.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tenantName}>{selectedTenant.name}</Text>
                      <Text style={styles.tenantSub}>{selectedTenant.subdomain}.dexo.app</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.pickerPlaceholder}>
                    {tenantsLoading ? 'Loading businesses…' : 'Tap to choose your gym / business'}
                  </Text>
                )}
                <Text style={styles.chevron}>{showTenantList ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showTenantList && (
                <View style={styles.tenantList}>
                  <View style={styles.dropdownSearch}>
                    <Ionicons name="search-outline" size={16} color={Colors.textLight} />
                    <TextInput
                      style={styles.dropdownSearchInput}
                      value={tenantQuery}
                      onChangeText={setTenantQuery}
                      placeholder="Search businesses…"
                      placeholderTextColor={Colors.textLight}
                    />
                  </View>
                  <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {tenantsLoading ? (
                      <View style={{ padding: Spacing.md, alignItems: 'center' }}>
                        <ActivityIndicator color={Colors.primary} />
                      </View>
                    ) : filteredTenants.length === 0 ? (
                      <Text style={styles.emptyText}>
                        No business found. If your gym isn't listed, ask them to sign up at onedexo.com.
                      </Text>
                    ) : (
                      filteredTenants.map((t) => (
                        <TouchableOpacity
                          key={t.id}
                          style={[styles.tenantItem, tenantSubdomain === t.subdomain && { backgroundColor: '#eef2ff' }]}
                          onPress={() => selectTenant(t)}
                        >
                          <View style={[styles.tenantIcon, { backgroundColor: t.primaryColor || Colors.primary }]}>
                            <Text style={styles.tenantIconText}>{t.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.tenantName}>{t.name}</Text>
                            <Text style={styles.tenantSub}>{t.subdomain}.dexo.app</Text>
                          </View>
                          {tenantSubdomain === t.subdomain && (
                            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))
                    )}
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 2,
  },
  searchInput: { flex: 1, fontSize: FontSize.md, color: Colors.text, paddingVertical: Spacing.sm + 2 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, paddingVertical: Spacing.xs },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textLight, paddingVertical: Spacing.sm + 2 },
  dropdownSearch: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropdownSearchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 2 },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  changeBtn: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '700' },
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
    borderTopWidth: 0,
    borderColor: Colors.border,
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    marginTop: 0,
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
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, padding: Spacing.md, fontStyle: 'italic' },
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
