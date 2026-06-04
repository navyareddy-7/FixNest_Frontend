/**
 * AdminComplaintListScreen.tsx
 *
 * A reusable list screen driven by the four stat-card filters:
 *   "all"         → Tickets Filed
 *   "pending"     → Awaiting Review
 *   "in_progress" → Active Repairs
 *   "resolved"    → Solved Issues
 *
 * Props:
 *   filter        – complaint status to fetch (or "all")
 *   title         – screen heading
 *   accentColor   – tint colour for the badge / header icon
 *   onBack        – navigate back to dashboard
 *   onSelectComplaint – open detail view for a complaint
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Complaint } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";
import { useBackHandler } from "../../hooks/useBackHandler";

export type ComplaintFilter = "all" | "pending" | "in_progress" | "resolved";

interface AdminComplaintListScreenProps {
  filter: ComplaintFilter;
  title: string;
  accentColor: string;
  onBack: () => void;
  onSelectComplaint: (complaint: Complaint) => void;
}

// ─── Status display helpers ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; color: string }
> = {
  pending:     { label: "Pending",     icon: "time-outline",       color: Theme.colors.pending },
  in_progress: { label: "In Progress", icon: "construct-outline",  color: Theme.colors.in_progress },
  resolved:    { label: "Resolved",    icon: "checkmark-circle-outline", color: Theme.colors.resolved },
};

const SEVERITY_COLORS: Record<string, string> = {
  low:    Theme.colors.resolved,
  medium: "#F59E0B",
  high:   Theme.colors.high,
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Single complaint row card ─────────────────────────────────────────────────
function ComplaintRow({
  item,
  accentColor,
  onPress,
}: {
  item: Complaint;
  accentColor: string;
  onPress: () => void;
}) {
  const statusCfg = STATUS_CONFIG[item.status] ?? {
    label: item.status,
    icon: "ellipse-outline",
    color: Theme.colors.textLight,
  };
  const sevColor = SEVERITY_COLORS[item.severity] ?? Theme.colors.textLight;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      accessibilityLabel={`Ticket ${item.id}: ${item.title}`}
    >
      <Card style={styles.card} elevation="low">
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.ticketBadge, { backgroundColor: accentColor + "18" }]}>
            <Text style={[styles.ticketBadgeText, { color: accentColor }]}>#{item.id}</Text>
          </View>
          <View style={styles.badgeRow}>
            <Badge
              type="status"
              value={item.status}
              label={statusCfg.label}
              style={{ marginRight: 6 }}
            />
            <View style={[styles.sevPill, { backgroundColor: sevColor + "22", borderColor: sevColor }]}>
              <Text style={[styles.sevText, { color: sevColor }]}>
                {item.severity.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        {/* Meta chips */}
        <View style={styles.metaRow}>
          <MetaChip icon="construct-outline" label={item.category} />
          <MetaChip icon="location-outline" label={`${item.hostel_name}, Rm ${item.room_number}`} />
          {item.student && <MetaChip icon="person-outline" label={item.student.full_name} />}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Ionicons
              name={item.worker ? "person-circle-outline" : "alert-circle-outline"}
              size={14}
              color={item.worker ? Theme.colors.resolved : Theme.colors.pending}
            />
            <Text
              style={[
                styles.workerText,
                { color: item.worker ? Theme.colors.text : Theme.colors.pending },
              ]}
              numberOfLines={1}
            >
              {item.worker ? `Assigned: ${item.worker.full_name}` : "Awaiting Dispatch"}
            </Text>
          </View>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={12} color={Theme.colors.textLight} />
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        </View>

        {/* Tap hint */}
        <View style={styles.tapHint}>
          <Ionicons name="chevron-forward" size={14} color={Theme.colors.textLight} />
          <Text style={styles.tapHintText}>Tap for full details</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function MetaChip({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }) {
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={11} color={Theme.colors.textLight} />
      <Text style={styles.metaChipText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminComplaintListScreen({
  filter,
  title,
  accentColor,
  onBack,
  onSelectComplaint,
}: AdminComplaintListScreenProps) {
  const [allComplaints, setAllComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local search within this list
  const [searchQuery, setSearchQuery] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();

  // ─── Android back button ────────────────────────────────────────────────────
  useBackHandler(useCallback(() => { onBack(); return true; }, [onBack]));

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchComplaints = useCallback(async (refreshing = false) => {
    if (!refreshing) setIsLoading(true);
    setError(null);
    try {
      // Build query: status_filter is only sent when not "all"
      const endpoint = filter === "all"
        ? "/complaints"
        : `/complaints?status_filter=${filter}`;

      const data = await apiService.get<Complaint[]>(endpoint);

      // Additional hostel_admin scoping (same logic as every other admin screen)
      const scoped = user?.role === "hostel_admin" && user?.hostel_id
        ? data.filter(
            c => c.hostel_id === user.hostel_id || c.student?.hostel_id === user.hostel_id
          )
        : data;

      setAllComplaints(scoped);
    } catch (err: any) {
      console.error("[AdminComplaintListScreen] fetch error:", err);
      setError(err.message || "Could not load complaints. Check your connection.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filter, user]);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  // ─── Local search filter ─────────────────────────────────────────────────────
  const displayed = useCallback((): Complaint[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allComplaints;
    return allComplaints.filter(
      c =>
        String(c.id).startsWith(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.student?.full_name ?? "").toLowerCase().includes(q) ||
        c.room_number.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [searchQuery, allComplaints])();

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Header title={title} showBackButton onBack={onBack} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.loadingText}>Loading tickets…</Text>
        </View>
      </View>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────────
  if (error && allComplaints.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <Header title={title} showBackButton onBack={onBack} />
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={56} color={Theme.colors.textLight} />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: accentColor }]} onPress={() => fetchComplaints()}>
            <Ionicons name="refresh-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header title={title} showBackButton onBack={onBack} />

      <ResponsiveContainer>
        {/* Sub-banner */}
        <View style={styles.subBanner}>
          <View style={[styles.accentDot, { backgroundColor: accentColor }]} />
          <View>
            <Text style={styles.bannerTitle}>{title}</Text>
            <Text style={styles.bannerSub}>
              {searchQuery.trim()
                ? `${displayed.length} of ${allComplaints.length} tickets`
                : `${allComplaints.length} ticket${allComplaints.length !== 1 ? "s" : ""}`}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Ionicons
            name="search-outline"
            size={17}
            color={searchQuery ? accentColor : Theme.colors.textLight}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ticket #, title, student, room…"
            placeholderTextColor="#A0AEC0"
            value={searchQuery}
            onChangeText={t => {
              setSearchQuery(t);
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            }}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={17} color={Theme.colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        <FlatList
          data={displayed}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <ComplaintRow
              item={item}
              accentColor={accentColor}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectComplaint(item);
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); fetchComplaints(true); }}
              colors={[accentColor]}
              tintColor={accentColor}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={searchQuery.trim() ? "search-outline" : "checkmark-done-outline"}
                size={60}
                color={Theme.colors.textLight}
                style={{ opacity: 0.35 }}
              />
              <Text style={styles.emptyTitle}>
                {searchQuery.trim() ? "No Matching Tickets" : "No Tickets Here"}
              </Text>
              <Text style={styles.emptyDesc}>
                {searchQuery.trim()
                  ? `Nothing matched "${searchQuery.trim()}". Try a different term.`
                  : filter === "all"
                  ? "No maintenance tickets have been filed yet."
                  : `No tickets with status "${filter.replace("_", " ")}" found.`}
              </Text>
              {searchQuery.trim() && (
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: accentColor }]}
                  onPress={() => setSearchQuery("")}
                >
                  <Text style={[styles.clearBtnText, { color: accentColor }]}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </ResponsiveContainer>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadingText: { marginTop: 12, color: Theme.colors.textLight, fontWeight: "500" },
  errorTitle: { fontSize: 18, fontWeight: "700", color: Theme.colors.text, marginTop: 16 },
  errorDesc: { fontSize: 14, color: Theme.colors.textLight, marginTop: 8, textAlign: "center", lineHeight: 20 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Theme.roundness.md,
    marginTop: 20,
  },
  retryBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },

  subBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    gap: 12,
  },
  accentDot: { width: 4, height: 44, borderRadius: 2 },
  bannerTitle: { fontSize: 18, fontWeight: "800", color: Theme.colors.text },
  bannerSub: { fontSize: 12, color: Theme.colors.textLight, fontWeight: "500", marginTop: 2 },

  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
    backgroundColor: "#F0F4FC",
    borderRadius: Theme.roundness.md,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Theme.colors.text,
    paddingVertical: 0,
    outlineStyle: "none" as any,
  },

  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },

  // Cards
  card: { marginBottom: Theme.spacing.md, width: "100%" },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ticketBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ticketBadgeText: { fontSize: 12, fontWeight: "800" },
  badgeRow: { flexDirection: "row", alignItems: "center" },
  sevPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  sevText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: Theme.colors.text, marginBottom: 3 },
  cardDesc: { fontSize: 13, color: Theme.colors.textLight, lineHeight: 18, marginBottom: 8 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FC",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 3,
  },
  metaChipText: { fontSize: 11, color: Theme.colors.textLight, fontWeight: "500", maxWidth: 110 },

  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1 },
  workerText: { fontSize: 12, fontWeight: "600", flex: 1 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  dateText: { fontSize: 11, color: Theme.colors.textLight, fontWeight: "500" },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 6,
    gap: 2,
  },
  tapHintText: { fontSize: 11, color: Theme.colors.textLight, fontWeight: "500" },

  // Empty
  emptyContainer: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: Theme.colors.text, marginTop: 14 },
  emptyDesc: {
    fontSize: 13,
    color: Theme.colors.textLight,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  clearBtn: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: Theme.roundness.md,
    borderWidth: 1.5,
  },
  clearBtnText: { fontWeight: "700", fontSize: 13 },
});
