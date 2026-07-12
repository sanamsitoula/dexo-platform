import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize } from '@dexo/mobile-core/lib/theme';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const sampleNotifications: Notification[] = [
  { id: '1', title: 'Workout Reminder', message: 'Your HIIT session is scheduled for tomorrow at 7 AM', time: '2h ago', read: false },
  { id: '2', title: 'Progress Update', message: 'You completed 4 workouts this week. Great job!', time: '1d ago', read: true },
  { id: '3', title: 'New Feature', message: 'Check out our new nutrition tracking feature', time: '3d ago', read: true },
  { id: '4', title: 'Team Update', message: 'A new member joined your team', time: '5d ago', read: true },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(sampleNotifications);
  const [refreshing, setRefreshing] = useState(false);

  function markAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  function onRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}>
          <Text style={styles.markAll}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.cardUnread]}
            onPress={() => markAsRead(item.id)}
          >
            <View style={styles.iconContainer}>
              <Ionicons
                name={item.read ? 'notifications-outline' : 'notifications'}
                size={20}
                color={item.read ? Colors.textLight : Colors.primary}
              />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]}>{item.title}</Text>
              <Text style={styles.cardMessage}>{item.message}</Text>
              <Text style={styles.cardTime}>{item.time}</Text>
            </View>
            {!item.read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 60,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  markAll: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardUnread: {
    backgroundColor: Colors.primary + '08',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: Colors.text,
  },
  cardTitleUnread: {
    fontWeight: '600',
  },
  cardMessage: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardTime: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
  },
});
