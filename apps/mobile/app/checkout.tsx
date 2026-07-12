import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { useTenant } from '../lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '../lib/theme';
import { ecommerceApi } from '../lib/api';

type PaymentMethod = 'COD' | 'PREPAID';

export default function CheckoutScreen() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any>(null);

  const [fullName, setFullName] = useState(user ? `${user.firstName} ${user.lastName}` : '');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await ecommerceApi.cart.get();
    if (res.error) setError(res.error);
    else setCart(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }
    load();
  }, [isAuthenticated, load, router]);

  const items: any[] = cart?.items ?? [];
  const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  const taxTotal = items.reduce((s, i) => s + (Number(i.unitPrice) * i.quantity * Number(i.product?.taxRatePercent || 0)) / 100, 0);
  const total = subtotal + taxTotal;

  async function handlePlaceOrder() {
    if (!line1.trim() || !city.trim() || !fullName.trim()) {
      setError('Please fill in your name, address and city');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await ecommerceApi.checkout.create({
      shippingAddress: { line1, city, state, postalCode, country },
      paymentMethod,
      customerName: fullName,
      customerPhone: phone,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOrder(res.data);
  }

  if (order) {
    return (
      <View style={styles.center}>
        <View style={[styles.successCircle, { backgroundColor: Colors.success }]}>
          <Ionicons name="checkmark" size={48} color="#fff" />
        </View>
        <Text style={styles.successTitle}>Order placed!</Text>
        <Text style={styles.successSub}>Order #{order.orderNumber || order.id}</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary }]} onPress={() => router.replace('/orders')}>
          <Text style={styles.primaryBtnText}>View my orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => router.replace('/shop')}>
          <Text style={styles.ghostBtnText}>Continue shopping</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Checkout</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xxl }}>
        <Text style={styles.sectionTitle}>Shipping address</Text>
        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={Colors.textLight} value={fullName} onChangeText={setFullName} />
          <TextInput style={styles.input} placeholder="Phone" placeholderTextColor={Colors.textLight} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Address line" placeholderTextColor={Colors.textLight} value={line1} onChangeText={setLine1} />
          <TextInput style={styles.input} placeholder="City" placeholderTextColor={Colors.textLight} value={city} onChangeText={setCity} />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="State" placeholderTextColor={Colors.textLight} value={state} onChangeText={setState} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Postal code" placeholderTextColor={Colors.textLight} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" />
          </View>
          <TextInput style={styles.input} placeholder="Country" placeholderTextColor={Colors.textLight} value={country} onChangeText={setCountry} />
        </View>

        <Text style={styles.sectionTitle}>Payment method</Text>
        <View style={styles.paymentRow}>
          {(['COD', 'PREPAID'] as PaymentMethod[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.paymentOption, paymentMethod === m && { borderColor: primary, backgroundColor: primary + '10' }]}
              onPress={() => setPaymentMethod(m)}
            >
              <Ionicons
                name={m === 'COD' ? 'cash-outline' : 'card-outline'}
                size={20}
                color={paymentMethod === m ? primary : Colors.textSecondary}
              />
              <Text style={[styles.paymentText, paymentMethod === m && { color: primary }]}>
                {m === 'COD' ? 'Cash on delivery' : 'Pay online'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Order summary</Text>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${taxTotal.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, { marginTop: 4 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={[styles.totalValue, { color: primary }]}>${total.toFixed(2)}</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.placeBtn, { backgroundColor: primary }]}
          onPress={handlePlaceOrder}
          disabled={submitting || items.length === 0}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.placeBtnText}>Place order</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },

  sectionTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl2, padding: Spacing.md, gap: Spacing.sm, ...Shadows.sm },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSize.sm },

  paymentRow: { flexDirection: 'row', gap: Spacing.sm },
  paymentOption: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, padding: Spacing.md, backgroundColor: Colors.surface },
  paymentText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  summaryLabel: { color: Colors.textSecondary, fontSize: FontSize.sm },
  summaryValue: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  totalLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: '800' },
  totalValue: { fontSize: FontSize.md, fontWeight: '800' },

  errorBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.errorBg, padding: Spacing.md, borderRadius: BorderRadius.md, gap: 8, marginTop: Spacing.md },
  errorText: { color: Colors.error, flex: 1, fontWeight: '600' },

  placeBtn: { borderRadius: BorderRadius.full, paddingVertical: Spacing.md + 2, alignItems: 'center', marginTop: Spacing.xl },
  placeBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  successCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', ...Shadows.lg },
  successTitle: { fontSize: FontSize.title, fontWeight: '800', color: Colors.text, marginTop: Spacing.lg },
  successSub: { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 4 },
  primaryBtn: { borderRadius: BorderRadius.full, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, marginTop: Spacing.xl },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },
  ghostBtn: { paddingVertical: Spacing.md },
  ghostBtnText: { color: Colors.textSecondary, fontWeight: '700' },
});
