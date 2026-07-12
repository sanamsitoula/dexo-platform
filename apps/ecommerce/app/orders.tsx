import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@dexo/mobile-core/lib/auth-context';
import { useTenant } from '@dexo/mobile-core/lib/tenant-context';
import { Colors, Spacing, BorderRadius, FontSize, Shadows } from '@dexo/mobile-core/lib/theme';
import { ecommerceApi } from '@dexo/mobile-core/lib/api';

function statusColor(status: string) {
  const s = (status || '').toUpperCase();
  if (s.includes('CANCEL')) return Colors.error;
  if (s.includes('DELIVER') || s.includes('COMPLETE') || s.includes('PAID')) return Colors.success;
  if (s.includes('SHIP')) return Colors.info;
  return Colors.warning;
}

export default function OrdersScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { tenant } = useTenant();
  const primary = tenant?.primaryColor || Colors.primary;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await ecommerceApi.orders.list(true);
    if (res.error) setError(res.error);
    else setOrders(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
    else setLoading(false);
  }, [isAuthenticated, load]);

  if (!isAuthenticated) {
    return (
      <View style={styles.center}>
        <Ionicons name="lock-closed-outline" size={48} color={Colors.textLight} />
        <Text style={styles.emptyTitle}>Sign in to view your orders</Text>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary }]} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryBtnText}>Sign in</Text>
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
        <Text style={styles.title}>Your Orders</Text>
        <View style={{ width: 26 }} />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primary }]} onPress={() => router.push('/shop')}>
              <Text style={styles.primaryBtnText}>Browse shop</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderNumber}>{item.orderNumber || `#${item.id.slice(0, 8)}`}</Text>
              <Text style={styles.orderDate}>{item.placedAt ? new Date(item.placedAt).toLocaleDateString() : ''}</Text>
              <Text style={styles.orderItemsCount}>{item.items?.length || 0} item(s)</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.orderTotal, { color: primary }]}>${Number(item.grandTotal ?? item.total ?? 0).toFixed(2)}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{item.status}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setSelected(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={26} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.title}>{selected.orderNumber || 'Order'}</Text>
              <View style={{ width: 26 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor(selected.status) + '20', alignSelf: 'flex-start' }]}>
                <Text style={[styles.statusText, { color: statusColor(selected.status) }]}>{selected.status}</Text>
              </View>
              <Text style={styles.sectionTitle}>Items</Text>
              {(selected.items ?? []).map((it: any) => (
                <View key={it.id} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={2}>{it.product?.name || 'Product'} × {it.quantity}</Text>
                  <Text style={styles.itemPrice}>${(Number(it.unitPrice) * it.quantity).toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={[styles.totalValue, { color: primary }]}>${Number(selected.grandTotal ?? selected.total ?? 0).toFixed(2)}</Text>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md },
  title: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },

  errorBox: { backgroundColor: Colors.errorBg, marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  errorText: { color: Colors.error, fontWeight: '600' },

  list: { padding: Spacing.lg, paddingTop: 0, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: BorderRadius.xl2, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.sm },
  orderNumber: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  orderDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  orderItemsCount: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  orderTotal: { fontSize: FontSize.md, fontWeight: '800' },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full, marginTop: 4 },
  statusText: { fontSize: FontSize.xs, fontWeight: '800' },

  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.text },
  primaryBtn: { borderRadius: BorderRadius.full, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  sectionTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  itemName: { flex: 1, fontSize: FontSize.sm, color: Colors.text, marginRight: Spacing.sm },
  itemPrice: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: FontSize.md, fontWeight: '800', color: Colors.text },
  totalValue: { fontSize: FontSize.md, fontWeight: '800' },
});
