/**
 * EmergencyMonitorScreen.tsx
 *
 * Used by both Admins and Workers.
 * - Admins see all emergencies for their hostel / all hostels.
 * - Workers see emergencies assigned to them or in their hostel.
 *
 * Features:
 *  - Real-time refresh (auto-polls every 15 s while screen is visible)
 *  - Acknowledge / Resolve / Escalate actions
 *  - Clickable rows → full detail modal
 *  - Escalation level badge (Level 1–4 + UNACKNOWLEDGED alert)
 */
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Linking,
  Alert,
  Animated,
  Easing,
  StatusBar,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { Emergency } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Theme } from "../../constants/theme";
import { useBackHandler } from "../../hooks/useBackHandler";

interface EmergencyMonitorScreenProps {
  onBack: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────
const AUTO_REFRESH_MS = 15_000;

const EMERGENCY_LABELS: Record<string, string> = {
  stuck_lift:    "🛗 Stuck in Lift",
  fire:          "🔥 Fire Emergency",
  medical:       "🏥 Medical Emergency",
  electrical:    "⚡ Electrical Hazard",
  water_leakage: "💧 Water Leakage/Flood",
  security:      "🔒 Security Threat",
  locked_room:   "🚪 Locked in Room",
  other:         "🚨 Other Emergency",
};

const STATUS_COLOR: Record<string, string> = {
  active:       "#DC2626",
  acknowledged: "#D97706",
  resolved:     "#16A34A",
  cancelled:    "#6B7280",
};
const STATUS_LABEL: Record<string, string> = {
  active:       "ACTIVE",
  acknowledged: "ACKNOWLEDGED",
  resolved:     "RESOLVED",
  cancelled:    "CANCELLED",
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit",
    }) + " · " + new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short",
    });
  } catch { return iso; }
}

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ─── Pulsing dot for active emergencies ──────────────────────────────────────
function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.5, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
        Animated.timing(scale, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <View style={{ width: 14, height: 14, justifyContent: "center", alignItems: "center" }}>
      <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, transform: [{ scale }] }} />
    </View>
  );
}

// ─── Emergency Row ────────────────────────────────────────────────────────────
function EmergencyRow({
  item,
  onPress,
}: {
  item: Emergency;
  onPress: () => void;
}) {
  const sc = STATUS_COLOR[item.status] ?? "#6B7280";
  const isActive = item.status === "active";

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={{ marginBottom: 10 }}>
      <Card
        style={[
          rowStyles.card,
          isActive && { borderColor: "#DC2626", borderWidth: 1.5 },
        ]}
        elevation="low"
      >
        {/* Header row */}
        <View style={rowStyles.headerRow}>
          <View style={rowStyles.ticketBadge}>
            {isActive && <PulseDot color="#DC2626" />}
            <Text style={[rowStyles.ticketText, { color: isActive ? "#DC2626" : Theme.colors.primary }]}>
              {item.ticket_number}
            </Text>
          </View>

          <View style={[rowStyles.statusPill, { backgroundColor: sc + "18", borderColor: sc }]}>
            <Text style={[rowStyles.statusText, { color: sc }]}>
              {STATUS_LABEL[item.status] ?? item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Emergency type */}
        <Text style={rowStyles.typeText}>
          {EMERGENCY_LABELS[item.emergency_type] ?? item.emergency_type}
        </Text>

        {/* Location */}
        <View style={rowStyles.metaRow}>
          <Ionicons name="business-outline" size={13} color={Theme.colors.textLight} />
          <Text style={rowStyles.metaText}>{item.hostel_name}, Room {item.room_number}</Text>
        </View>
        <View style={rowStyles.metaRow}>
          <Ionicons name="person-outline" size={13} color={Theme.colors.textLight} />
          <Text style={rowStyles.metaText}>{item.student?.full_name ?? "Unknown student"}</Text>
        </View>

        {/* Footer */}
        <View style={rowStyles.footerRow}>
          <Text style={rowStyles.timeText}>{timeSince(item.created_at)}</Text>
          {item.escalation_level > 0 && (
            <View style={rowStyles.escalationBadge}>
              <Ionicons name="arrow-up-circle" size={13} color="#DC2626" />
              <Text style={rowStyles.escalationText}>Level {item.escalation_level}</Text>
            </View>
          )}
          <View style={rowStyles.tapHint}>
            <Text style={rowStyles.tapHintText}>View details</Text>
            <Ionicons name="chevron-forward" size={12} color={Theme.colors.textLight} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  card: { width: "100%" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  ticketBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  ticketText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1.5 },
  statusText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  typeText: { fontSize: 16, fontWeight: "800", color: Theme.colors.text, marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  metaText: { fontSize: 12, color: Theme.colors.textLight, fontWeight: "500" },
  footerRow: { flexDirection: "row", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Theme.colors.border, gap: 6 },
  timeText: { fontSize: 11, color: Theme.colors.textLight, fontWeight: "500", flex: 1 },
  escalationBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FECACA", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  escalationText: { fontSize: 11, fontWeight: "800", color: "#DC2626" },
  tapHint: { flexDirection: "row", alignItems: "center", gap: 2 },
  tapHintText: { fontSize: 11, color: Theme.colors.textLight, fontWeight: "500" },
});

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({
  emergency,
  visible,
  onClose,
  onAcknowledge,
  onResolve,
  onEscalate,
  isActing,
}: {
  emergency: Emergency | null;
  visible: boolean;
  onClose: () => void;
  onAcknowledge: (id: number) => void;
  onResolve:     (id: number) => void;
  onEscalate:    (id: number) => void;
  isActing: boolean;
}) {
  if (!emergency) return null;
  const sc = STATUS_COLOR[emergency.status] ?? "#6B7280";

  const callNumber = (phone: string | null | undefined, label: string) => {
    if (!phone) { Alert.alert("Not available", `No ${label} contact info on record.`); return; }
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={dmStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={dmStyles.sheet}>
          {/* Handle */}
          <View style={dmStyles.handle} />

          {/* Header */}
          <View style={dmStyles.sheetHeader}>
            <View>
              <Text style={dmStyles.sheetTicket}>{emergency.ticket_number}</Text>
              <Text style={dmStyles.sheetType}>
                {EMERGENCY_LABELS[emergency.emergency_type] ?? emergency.emergency_type}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={dmStyles.closeBtn}>
              <Ionicons name="close" size={20} color={Theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={dmStyles.body} showsVerticalScrollIndicator={false}>
            {/* Status */}
            <View style={[dmStyles.statusBadge, { backgroundColor: sc + "18", borderColor: sc }]}>
              <View style={[dmStyles.statusDot, { backgroundColor: sc }]} />
              <Text style={[dmStyles.statusTxt, { color: sc }]}>
                {STATUS_LABEL[emergency.status] ?? emergency.status}
              </Text>
              {emergency.escalation_level > 0 && (
                <Text style={dmStyles.escalLabel}> · Level {emergency.escalation_level} Escalation</Text>
              )}
            </View>

            {/* Student info */}
            <SectionHead title="Student Information" />
            <DRow icon="person-outline"   label="Name"   value={emergency.student?.full_name ?? "—"} />
            <DRow icon="card-outline"     label="ID"     value={`USR-${String(emergency.student_id).padStart(4,"0")}`} />
            <DRow icon="call-outline"     label="Phone"  value={emergency.student?.phone_number ?? "Not provided"} />
            <DRow icon="business-outline" label="Hostel" value={emergency.hostel_name} />
            <DRow icon="bed-outline"      label="Room"   value={emergency.room_number} />
            <DRow icon="calendar-outline" label="Filed"  value={formatTime(emergency.created_at)} />

            {/* Technician info */}
            {emergency.assigned_technician && (
              <>
                <SectionHead title="Assigned Technician" />
                <DRow icon="person-circle-outline" label="Name"  value={emergency.assigned_technician.full_name} />
                <DRow icon="call-outline"          label="Phone" value={emergency.assigned_technician.phone_number ?? "—"} />
              </>
            )}

            {/* Timeline */}
            <SectionHead title="Timeline" />
            <DRow icon="time-outline"           label="Created"      value={formatTime(emergency.created_at)} />
            {emergency.acknowledged_at && (
              <DRow icon="checkmark-circle-outline" label="Acknowledged" value={formatTime(emergency.acknowledged_at)} />
            )}
            {emergency.resolved_at && (
              <DRow icon="checkmark-done-outline"   label="Resolved"     value={formatTime(emergency.resolved_at)} />
            )}

            {/* Actions */}
            <SectionHead title="Actions" />
            <View style={dmStyles.actionsGrid}>
              {/* Call student */}
              <TouchableOpacity
                style={[dmStyles.actionBtn, { backgroundColor: Theme.colors.secondary }]}
                onPress={() => callNumber(emergency.student?.phone_number, "student")}
              >
                <Ionicons name="call" size={18} color="#FFF" />
                <Text style={dmStyles.actionBtnText}>Call Student</Text>
              </TouchableOpacity>

              {/* Acknowledge */}
              {emergency.status === "active" && (
                <TouchableOpacity
                  style={[dmStyles.actionBtn, { backgroundColor: "#16A34A" }]}
                  onPress={() => onAcknowledge(emergency.id)}
                  disabled={isActing}
                >
                  {isActing ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                      <Text style={dmStyles.actionBtnText}>Acknowledge</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Resolve */}
              {(emergency.status === "active" || emergency.status === "acknowledged") && (
                <TouchableOpacity
                  style={[dmStyles.actionBtn, { backgroundColor: Theme.colors.primary }]}
                  onPress={() => onResolve(emergency.id)}
                  disabled={isActing}
                >
                  {isActing ? <ActivityIndicator color="#FFF" size="small" /> : (
                    <>
                      <Ionicons name="checkmark-done" size={18} color="#FFF" />
                      <Text style={dmStyles.actionBtnText}>Mark Resolved</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Escalate */}
              {(emergency.status === "active" || emergency.status === "acknowledged") && emergency.escalation_level < 4 && (
                <TouchableOpacity
                  style={[dmStyles.actionBtn, { backgroundColor: "#DC2626" }]}
                  onPress={() => onEscalate(emergency.id)}
                  disabled={isActing}
                >
                  <Ionicons name="arrow-up-circle" size={18} color="#FFF" />
                  <Text style={dmStyles.actionBtnText}>Escalate</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <View style={dmStyles.secHead}>
      <Text style={dmStyles.secHeadText}>{title}</Text>
      <View style={dmStyles.secLine} />
    </View>
  );
}
function DRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={dmStyles.drow}>
      <View style={dmStyles.drowIcon}>
        <Ionicons name={icon} size={14} color={Theme.colors.primary} />
      </View>
      <Text style={dmStyles.drowLabel}>{label}</Text>
      <Text style={dmStyles.drowValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const dmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(10,42,102,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFF", borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", paddingTop: 8 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 12 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 22, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F0F4FC" },
  sheetTicket: { fontSize: 11, fontWeight: "800", color: "#DC2626", letterSpacing: 1, marginBottom: 4 },
  sheetType:   { fontSize: 18, fontWeight: "900", color: Theme.colors.text },
  closeBtn:    { padding: 6, borderRadius: 20, backgroundColor: "#F0F4FC" },
  body: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 40 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, gap: 6, alignSelf: "flex-start", marginBottom: 14 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4 },
  escalLabel: { fontSize: 11, fontWeight: "700", color: "#DC2626" },
  secHead: { flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 8, gap: 8 },
  secHeadText: { fontSize: 10, fontWeight: "800", color: Theme.colors.secondary, textTransform: "uppercase", letterSpacing: 1 },
  secLine: { flex: 1, height: 1, backgroundColor: Theme.colors.border },
  drow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F3F4F6", gap: 8 },
  drowIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: Theme.colors.primary + "14", justifyContent: "center", alignItems: "center" },
  drowLabel: { fontSize: 11, fontWeight: "700", color: Theme.colors.textLight, textTransform: "uppercase", letterSpacing: 0.4, width: 82 },
  drowValue: { fontSize: 13, fontWeight: "600", color: Theme.colors.text, flex: 1 },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Theme.roundness.md },
  actionBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EmergencyMonitorScreen({ onBack }: EmergencyMonitorScreenProps) {
  const [emergencies, setEmergencies]     = useState<Emergency[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [activeTab, setActiveTab]         = useState<"active" | "history">("active");
  const [selected, setSelected]           = useState<Emergency | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [isActing, setIsActing]           = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useBackHandler(useCallback(() => { onBack(); return true; }, [onBack]));

  // Cleanup on unmount
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const fetch = useCallback(async (refreshing = false) => {
    if (!refreshing) setIsLoading(true);
    setError(null);
    try {
      const endpoint = activeTab === "active" ? "/emergency/active" : "/emergency/history";
      const data = await apiService.get<Emergency[]>(endpoint);
      setEmergencies(data);
    } catch (err: any) {
      setError(err.message || "Could not load emergency data.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetch();
    // Auto-poll only on active tab
    if (activeTab === "active") {
      pollRef.current = setInterval(() => fetch(), AUTO_REFRESH_MS);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetch, activeTab]);

  // Actions
  const act = async (label: string, request: () => Promise<Emergency>) => {
    setIsActing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updated = await request();
      setEmergencies(prev => prev.map(e => e.id === updated.id ? updated : e));
      setSelected(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert(`${label} failed`, err.message || "Please try again.");
    } finally {
      setIsActing(false);
    }
  };

  const handleAcknowledge = (id: number) =>
    act("Acknowledge", () => apiService.put<Emergency>(`/emergency/${id}/acknowledge`, {}));

  const handleResolve = (id: number) =>
    act("Resolve", () => apiService.put<Emergency>(`/emergency/${id}/resolve`, {}));

  const handleEscalate = (id: number) =>
    act("Escalate", () => apiService.post<Emergency>(`/emergency/${id}/escalate`, {}));

  const activeCount = emergencies.filter(e => e.status === "active").length;

  // ── Tab headers ──────────────────────────────────────────────────────────────
  const renderTabBar = () => (
    <View style={mainStyles.tabBar}>
      {(["active", "history"] as const).map(tab => (
        <TouchableOpacity
          key={tab}
          style={[mainStyles.tab, activeTab === tab && mainStyles.activeTab]}
          onPress={() => { setActiveTab(tab); }}
        >
          {tab === "active" && activeCount > 0 && (
            <View style={mainStyles.tabBadge}>
              <Text style={mainStyles.tabBadgeText}>{activeCount}</Text>
            </View>
          )}
          <Text style={[mainStyles.tabText, activeTab === tab && mainStyles.activeTabText]}>
            {tab === "active" ? "🚨 Active" : "📋 History"}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={mainStyles.container}>
      <StatusBar barStyle="light-content" />
      <Header
        title="Emergency Monitor"
        showBackButton
        onBack={onBack}
      />


      {/* Active count banner */}
      {activeCount > 0 && (
        <View style={mainStyles.alertBanner}>
          <Ionicons name="alert-circle" size={18} color="#FFFFFF" />
          <Text style={mainStyles.alertBannerText}>
            {activeCount} ACTIVE EMERGENCY{activeCount > 1 ? "IES" : ""} — Immediate response required
          </Text>
        </View>
      )}

      {renderTabBar()}

      {isLoading ? (
        <View style={mainStyles.center}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={mainStyles.loadingText}>Loading emergencies…</Text>
        </View>
      ) : error && emergencies.length === 0 ? (
        <View style={mainStyles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color={Theme.colors.textLight} />
          <Text style={mainStyles.errorText}>{error}</Text>
          <TouchableOpacity style={mainStyles.retryBtn} onPress={() => fetch()}>
            <Text style={mainStyles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={emergencies}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={mainStyles.list}
          renderItem={({ item }) => (
            <EmergencyRow
              item={item}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelected(item);
                setDetailVisible(true);
              }}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); fetch(true); }}
              colors={["#DC2626"]}
              tintColor="#DC2626"
            />
          }
          ListEmptyComponent={
            <View style={mainStyles.center}>
              <Ionicons
                name={activeTab === "active" ? "checkmark-circle-outline" : "document-outline"}
                size={56}
                color={Theme.colors.textLight}
                style={{ opacity: 0.3 }}
              />
              <Text style={mainStyles.emptyTitle}>
                {activeTab === "active" ? "No Active Emergencies" : "No Emergency History"}
              </Text>
              <Text style={mainStyles.emptyDesc}>
                {activeTab === "active"
                  ? "All clear. No emergencies right now."
                  : "No emergency records found."}
              </Text>
            </View>
          }
        />
      )}

      {/* Detail Modal */}
      <DetailModal
        emergency={selected}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
        onEscalate={handleEscalate}
        isActing={isActing}
      />
    </View>
  );
}

const mainStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.background },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  alertBannerText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13, flex: 1 },
  tabBar: { flexDirection: "row", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: "#DC2626" },
  tabText: { fontSize: 14, fontWeight: "700", color: Theme.colors.textLight },
  activeTabText: { color: "#DC2626" },
  tabBadge: { backgroundColor: "#DC2626", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  tabBadgeText: { fontSize: 11, fontWeight: "800", color: "#FFF" },
  list: { padding: Theme.spacing.lg, paddingBottom: Theme.spacing.xxl },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadingText: { color: Theme.colors.textLight, marginTop: 12, fontWeight: "500" },
  errorText: { color: Theme.colors.textLight, textAlign: "center", marginTop: 12, lineHeight: 20 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: "#DC2626",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Theme.roundness.md,
  },
  retryText: { color: "#FFF", fontWeight: "700" },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: Theme.colors.text, marginTop: 14 },
  emptyDesc: { fontSize: 13, color: Theme.colors.textLight, textAlign: "center", marginTop: 6, lineHeight: 20 },
});
