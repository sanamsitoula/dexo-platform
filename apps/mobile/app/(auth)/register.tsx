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
import { tenantsApi } from '../../lib/api';
import { Colors, Spacing, BorderRadius, FontSize } from '../../lib/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Business (tenant) picker — a customer must pick which business they're
  // joining so the account is created under the right tenant.
  const [tenantSubdomain, setTenantSubdomain] = useState('');
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

  const filteredTenants = allTenants.filter(
    (t) =>
      !tenantQuery.trim() ||
      t.name?.toLowerCase().includes(tenantQuery.toLowerCase()) ||
      t.subdomain?.toLowerCase().includes(tenantQuery.toLowerCase())
  );
  const selectedTenant = allTenants.find((t) => t.subdomain === tenantSubdomain);

  async function handleRegister() {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (!tenantSubdomain) {
      Alert.alert('Error', 'Please select the business you want to join');
      return;
    }
    setLoading(true);
    const result = await register({ firstName, lastName, email, password, tenantSubdomain });
    setLoading(false);
    if (result.error) {
      Alert.alert('Registration Failed', result.error);
    } else {
      router.replace('/tenant-select');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join your team on Dexo</Text>

        <View style={styles.form}>
          {/* Business picker */}
          <View>
            <Text style={styles.label}>Select your business *</Text>
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
                    <Text style={styles.tenantSub}>{selectedTenant.subdomain}.onedexo.com</Text>
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
                <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {tenantsLoading ? (
                    <View style={{ padding: Spacing.md, alignItems: 'center' }}>
                      <ActivityIndicator color={Colors.primary} />
                    </View>
                  ) : filteredTenants.length === 0 ? (
                    <Text style={styles.emptyText}>No business found.</Text>
                  ) : (
                    filteredTenants.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.tenantItem, tenantSubdomain === t.subdomain && { backgroundColor: '#eef2ff' }]}
                        onPress={() => {
                          setTenantSubdomain(t.subdomain);
                          setTenantQuery('');
                          setShowTenantList(false);
                        }}
                      >
                        <View style={[styles.tenantIcon, { backgroundColor: t.primaryColor || Colors.primary }]}>
                          <Text style={styles.tenantIconText}>{t.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tenantName}>{t.name}</Text>
                          <Text style={styles.tenantSub}>{t.subdomain}.onedexo.com</Text>
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

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={Colors.textLight}
              />
            </View>
          </View>

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

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            placeholderTextColor={Colors.textLight}
            secureTextEntry
            autoComplete="new-password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  title: {
    fontSize: FontSize.hero,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
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
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm + 6,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  footerText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  link: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
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
    marginTop: 6,
  },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, paddingVertical: Spacing.xs },
  pickerPlaceholder: { flex: 1, fontSize: FontSize.md, color: Colors.textLight, paddingVertical: Spacing.sm + 2 },
  chevron: { fontSize: 12, color: Colors.textSecondary },
  tenantList: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.border,
    borderBottomLeftRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
  },
  dropdownSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownSearchInput: { flex: 1, fontSize: FontSize.sm, color: Colors.text, paddingVertical: 2 },
  tenantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
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
  emptyText: { color: Colors.textMuted, fontSize: FontSize.sm, padding: Spacing.md, fontStyle: 'italic' },
});
