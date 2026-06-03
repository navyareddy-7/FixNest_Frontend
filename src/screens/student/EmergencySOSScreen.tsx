/**
 * EmergencySOSScreen.tsx
 *
 * Three-phase flow managed by a local `phase` state:
 *   "hold"      — Hold-to-Activate button (2-second press)
 *   "category"  — Pick emergency type then send
 *   "status"    — Post-submit status / call contacts
 *
 * Designed to work entirely within StudentDashboard's setActiveView pattern
 * (no expo-router navigation required).
 */
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  StatusBar,
  Platform,
  Animated,
  Easing,
  PanResponder,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { Emergency, EmergencyType } from "../../types";
import { Header } from "../../components/ui/Header";
import { Theme } from "../../constants/theme";
import { useBackHandler } from "../../hooks/useBackHandler";

// ─── Constants ────────────────────────────────────────────────────────────────
const HOLD_DURATION_MS = 2000;

// Emergency hotline — update to real hostel number
const EMERGENCY_HOTLINE = "tel:+917799999999";

interface EmergencyCategory {
  type: EmergencyType;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
}

const CATEGORIES: EmergencyCategory[] = [
  { type: "stuck_lift",   label: "Stuck in Lift",       icon: "layers-outline",         color: "#7C3AED" },
  { type: "fire",         label: "Fire Emergency",       icon: "flame-outline",          color: "#DC2626" },
  { type: "medical",      label: "Medical Emergency",    icon: "medkit-outline",         color: "#DB2777" },
  { type: "electrical",   label: "Electrical Hazard",    icon: "flash-outline",          color: "#D97706" },
  { type: "water_leakage",label: "Water Leakage/Flood",  icon: "water-outline",          color: "#2563EB" },
  { type: "security",     label: "Security Threat",      icon: "shield-outline",         color: "#059669" },
  { type: "locked_room",  label: "Locked in Room",       icon: "lock-closed-outline",    color: "#6B7280" },
  { type: "other",        label: "Other Emergency",      icon: "alert-circle-outline",   color: "#EF4444" },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface EmergencySOSScreenProps {
  onBack: () => void;
}

// ─── Phase type ───────────────────────────────────────────────────────────────
type Phase = "hold" | "category" | "status" | "offline";

// ─── Circular progress ring ───────────────────────────────────────────────────
function ProgressRing({ progress }: { progress: Animated.Value }) {
  const SIZE = 180;
  const STROKE = 8;
  const R = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  // We fake the ring with a rotating arc overlay using border tricks —
  // no SVG dependency needed in bare RN.
  const rotate = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const scale = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.04, 1.08],
  });

  return (
    <Animated.View style={[ring.container, { transform: [{ scale }] }]}>
      {/* Background ring */}
      <View style={ring.bg} />
      {/* Animated foreground overlay — simplified via border rotation */}
      <Animated.View style={[ring.arc, { transform: [{ rotate }] }]} />
      {/* Inner circle with icon */}
      <View style={ring.inner}>
        <Ionicons name="warning" size={48} color="#FFFFFF" />
      </View>
    </Animated.View>
  );
}

const ring = StyleSheet.create({
  container: {
    width: 180,
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  bg: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: "rgba(255,255,255,0.25)",
  },
  arc: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 8,
    borderColor: "#FFFFFF",
    borderTopColor: "transparent",
    borderRightColor: "transparent",
  },
  inner: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
});

// ─── Hold Phase ───────────────────────────────────────────────────────────────
function HoldPhase({ onActivated }: { onActivated: () => void }) {
  const [holding, setHolding] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef<Animated.CompositeAnimation | null>(null);

  const startHold = () => {
    setHolding(true);
    setCancelled(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Animate progress ring 0→1 over HOLD_DURATION_MS
    progressAnim.current = Animated.timing(progress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    progressAnim.current.start();

    // Pulse haptics every 400ms while holding
    hapticTimer.current = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 400);

    // Trigger after full hold
    holdTimer.current = setTimeout(() => {
      cleanup();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onActivated();
    }, HOLD_DURATION_MS);
  };

  const endHold = () => {
    if (!holding) return;
    cleanup();
    setCancelled(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setTimeout(() => setCancelled(false), 2500);
  };

  const cleanup = () => {
    setHolding(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (hapticTimer.current) clearInterval(hapticTimer.current);
    progressAnim.current?.stop();
    progress.setValue(0);
  };

  useEffect(() => () => cleanup(), []);

  return (
    <View style={holdStyles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#B91C1C" />

      {/* Warning banner */}
      <View style={holdStyles.warningBanner}>
        <Ionicons name="alert-circle" size={16} color="#FFFFFF" />
        <Text style={holdStyles.warningText}>
          For genuine emergencies only. False alarms are penalised.
        </Text>
      </View>

      <Text style={holdStyles.headline}>EMERGENCY SOS</Text>
      <Text style={holdStyles.sub}>
        Hold the button below for 2 seconds to activate
      </Text>

      {/* Hold button */}
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={startHold}
        onPressOut={endHold}
        style={[holdStyles.sosBtn, holding && holdStyles.sosBtnHolding]}
        accessibilityLabel="Hold for 2 seconds to send SOS"
      >
        <ProgressRing progress={progress} />
        {holding ? (
          <View style={holdStyles.btnLabelBox}>
            <Text style={holdStyles.btnHoldLabel}>HOLD…</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Status feedback */}
      {cancelled ? (
        <View style={holdStyles.feedbackRow}>
          <Ionicons name="close-circle" size={18} color="#FCA5A5" />
          <Text style={holdStyles.cancelText}>SOS cancelled. Release detected early.</Text>
        </View>
      ) : holding ? (
        <View style={holdStyles.feedbackRow}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={holdStyles.holdingText}>Activating SOS…</Text>
        </View>
      ) : (
        <Text style={holdStyles.hintText}>
          Release before 2 seconds to cancel
        </Text>
      )}

      {/* Hotline */}
      <TouchableOpacity
        style={holdStyles.hotlineBtn}
        onPress={() => Linking.openURL(EMERGENCY_HOTLINE)}
      >
        <Ionicons name="call" size={18} color="#DC2626" />
        <Text style={holdStyles.hotlineBtnText}>📞 Emergency Hotline</Text>
      </TouchableOpacity>
    </View>
  );
}

const holdStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#991B1B",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  warningBanner: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  warningText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  headline: {
    fontSize: 30,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2,
    marginBottom: 8,
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 20,
  },
  sosBtn: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
  },
  sosBtnHolding: {
    backgroundColor: "#EF4444",
    borderColor: "#FFFFFF",
  },
  btnLabelBox: {
    position: "absolute",
    bottom: 24,
  },
  btnHoldLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 2,
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
    gap: 8,
  },
  holdingText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  cancelText: {
    color: "#FCA5A5",
    fontWeight: "600",
    fontSize: 14,
  },
  hintText: {
    color: "rgba(255,255,255,0.6)",
    marginTop: 28,
    fontSize: 13,
    fontWeight: "500",
  },
  hotlineBtn: {
    position: "absolute",
    bottom: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  hotlineBtnText: {
    color: "#DC2626",
    fontWeight: "800",
    fontSize: 15,
  },
});

// ─── Category Phase ───────────────────────────────────────────────────────────
function CategoryPhase({
  onSend,
  isSending,
}: {
  onSend: (type: EmergencyType, desc?: string) => void;
  isSending: boolean;
}) {
  const [selected, setSelected] = useState<EmergencyType | null>(null);

  const cat = CATEGORIES.find(c => c.type === selected);

  return (
    <ScrollView
      contentContainerStyle={catStyles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={catStyles.header}>
        <Text style={catStyles.headline}>🚨 Select Emergency Type</Text>
        <Text style={catStyles.sub}>Choose the category that best describes your emergency</Text>
      </View>

      <View style={catStyles.grid}>
        {CATEGORIES.map(item => {
          const isActive = selected === item.type;
          return (
            <TouchableOpacity
              key={item.type}
              style={[
                catStyles.categoryCard,
                isActive && { borderColor: item.color, backgroundColor: item.color + "14" },
              ]}
              onPress={() => {
                setSelected(item.type);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.82}
            >
              <View style={[catStyles.catIcon, { backgroundColor: item.color + "22" }]}>
                <Ionicons name={item.icon} size={26} color={item.color} />
              </View>
              <Text style={[catStyles.catLabel, isActive && { color: item.color, fontWeight: "800" }]}>
                {item.label}
              </Text>
              {isActive && (
                <View style={[catStyles.checkBadge, { backgroundColor: item.color }]}>
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected preview */}
      {cat && (
        <View style={[catStyles.selectedPreview, { borderColor: cat.color }]}>
          <Ionicons name={cat.icon} size={20} color={cat.color} />
          <Text style={[catStyles.selectedLabel, { color: cat.color }]}>
            Selected: {cat.label}
          </Text>
        </View>
      )}

      {/* Send button */}
      <TouchableOpacity
        style={[
          catStyles.sendBtn,
          !selected && catStyles.sendBtnDisabled,
        ]}
        disabled={!selected || isSending}
        onPress={() => selected && onSend(selected)}
        activeOpacity={0.85}
      >
        {isSending ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            <Ionicons name="send" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={catStyles.sendBtnText}>🚨 SEND SOS ALERT</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Hotline */}
      <TouchableOpacity
        style={catStyles.hotlineRow}
        onPress={() => Linking.openURL(EMERGENCY_HOTLINE)}
      >
        <Ionicons name="call-outline" size={16} color="#DC2626" />
        <Text style={catStyles.hotlineText}>📞 Emergency Hotline (direct call)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const catStyles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
    backgroundColor: Theme.colors.background,
  },
  header: {
    backgroundColor: "#991B1B",
    borderRadius: Theme.roundness.lg,
    padding: 20,
    marginBottom: 20,
  },
  headline: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  sub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    lineHeight: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  categoryCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.roundness.md,
    padding: 14,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    alignItems: "center",
    shadowColor: "#0A2A66",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  catIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Theme.colors.text,
    textAlign: "center",
    lineHeight: 17,
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.roundness.md,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 14,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  sendBtn: {
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: Theme.roundness.md,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 16,
  },
  sendBtnDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 17,
    letterSpacing: 0.5,
  },
  hotlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  hotlineText: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 14,
  },
});

// ─── Status Phase ─────────────────────────────────────────────────────────────
function StatusPhase({
  emergency,
  onCancel,
  isCancelling,
}: {
  emergency: Emergency;
  onCancel: () => void;
  isCancelling: boolean;
}) {
  const catMeta = CATEGORIES.find(c => c.type === emergency.emergency_type);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (emergency.status === "active") {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [emergency.status]);

  const statusColor: Record<string, string> = {
    active:       "#DC2626",
    acknowledged: "#D97706",
    resolved:     "#16A34A",
    cancelled:    "#6B7280",
  };
  const statusLabel: Record<string, string> = {
    active:       "🔴 ACTIVE — Awaiting Response",
    acknowledged: "🟡 ACKNOWLEDGED — Help on the way",
    resolved:     "🟢 RESOLVED — Emergency closed",
    cancelled:    "⚫ CANCELLED",
  };

  const callNumber = (phone: string | null | undefined, label: string) => {
    if (!phone) {
      Alert.alert("Not available", `No ${label} contact info on file.`);
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <ScrollView
      contentContainerStyle={statStyles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Alert sent confirmation */}
      <View style={statStyles.sentBanner}>
        <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
        <Text style={statStyles.sentTitle}>Emergency Alert Sent!</Text>
        <Text style={statStyles.sentSub}>All available staff have been notified.</Text>
      </View>

      {/* Ticket card */}
      <View style={statStyles.ticketCard}>
        <View style={statStyles.ticketRow}>
          <Text style={statStyles.ticketLabel}>EMERGENCY TICKET</Text>
          <Text style={statStyles.ticketNum}>{emergency.ticket_number}</Text>
        </View>

        {/* Status badge */}
        <Animated.View
          style={[
            statStyles.statusBadge,
            {
              backgroundColor: statusColor[emergency.status] + "18",
              borderColor: statusColor[emergency.status],
              transform: emergency.status === "active" ? [{ scale: pulse }] : [],
            },
          ]}
        >
          <View style={[statStyles.statusDot, { backgroundColor: statusColor[emergency.status] }]} />
          <Text style={[statStyles.statusText, { color: statusColor[emergency.status] }]}>
            {statusLabel[emergency.status] ?? emergency.status.toUpperCase()}
          </Text>
        </Animated.View>

        <View style={statStyles.infoGrid}>
          <InfoItem icon="construct-outline" label="Emergency Type" value={catMeta?.label ?? emergency.emergency_type} />
          <InfoItem icon="business-outline"  label="Hostel"         value={emergency.hostel_name || "—"} />
          <InfoItem icon="bed-outline"       label="Room"           value={emergency.room_number  || "—"} />
          <InfoItem icon="calendar-outline"  label="Time"
            value={new Date(emergency.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          />
        </View>
      </View>

      {/* Assigned technician */}
      <View style={statStyles.sectionCard}>
        <Text style={statStyles.sectionTitle}>Assigned Technician</Text>
        {emergency.assigned_technician ? (
          <>
            <View style={statStyles.contactRow}>
              <View style={statStyles.avatar}>
                <Text style={statStyles.avatarText}>
                  {emergency.assigned_technician.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={statStyles.contactName}>{emergency.assigned_technician.full_name}</Text>
                <Text style={statStyles.contactPhone}>
                  {emergency.assigned_technician.phone_number ?? "No contact info"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={statStyles.callBtn}
              onPress={() => callNumber(emergency.assigned_technician?.phone_number, "technician")}
            >
              <Ionicons name="call" size={18} color="#FFFFFF" />
              <Text style={statStyles.callBtnText}>📞 Call Technician</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={statStyles.awaitingRow}>
            <Ionicons name="time-outline" size={20} color="#D97706" />
            <Text style={statStyles.awaitingText}>Assigning nearest technician…</Text>
          </View>
        )}
      </View>

      {/* Direct call buttons */}
      <View style={statStyles.sectionCard}>
        <Text style={statStyles.sectionTitle}>Emergency Contacts</Text>
        <TouchableOpacity
          style={[statStyles.callBtn, { backgroundColor: "#DC2626", marginBottom: 10 }]}
          onPress={() => Linking.openURL(EMERGENCY_HOTLINE)}
        >
          <Ionicons name="call" size={18} color="#FFFFFF" />
          <Text style={statStyles.callBtnText}>📞 Emergency Hotline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[statStyles.callBtn, { backgroundColor: "#7C3AED" }]}
          onPress={() => Linking.openURL(EMERGENCY_HOTLINE)}
        >
          <Ionicons name="call" size={18} color="#FFFFFF" />
          <Text style={statStyles.callBtnText}>📞 Call Security</Text>
        </TouchableOpacity>
      </View>

      {/* Cancel false alarm */}
      {emergency.status !== "resolved" && emergency.status !== "cancelled" && (
        <TouchableOpacity
          style={statStyles.cancelBtn}
          onPress={onCancel}
          disabled={isCancelling}
        >
          {isCancelling ? (
            <ActivityIndicator color="#6B7280" size="small" />
          ) : (
            <>
              <Ionicons name="close-circle-outline" size={18} color="#6B7280" />
              <Text style={statStyles.cancelBtnText}>❌ Cancel — False Alarm</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function InfoItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={statStyles.infoRow}>
      <Ionicons name={icon} size={15} color={Theme.colors.textLight} style={{ marginRight: 8 }} />
      <Text style={statStyles.infoLabel}>{label}:</Text>
      <Text style={statStyles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60, backgroundColor: Theme.colors.background },
  sentBanner: {
    backgroundColor: "#991B1B",
    borderRadius: Theme.roundness.lg,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  sentTitle: { fontSize: 20, fontWeight: "900", color: "#FFFFFF", marginTop: 8 },
  sentSub:   { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4, fontWeight: "500" },

  ticketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.roundness.lg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#FECACA",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  ticketRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  ticketLabel: { fontSize: 11, fontWeight: "800", color: "#DC2626", letterSpacing: 1, textTransform: "uppercase" },
  ticketNum:   { fontSize: 15, fontWeight: "900", color: Theme.colors.text, letterSpacing: 0.5 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 8,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  infoGrid: { gap: 2 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  infoLabel: { fontSize: 13, color: Theme.colors.textLight, fontWeight: "600", marginRight: 6 },
  infoValue: { fontSize: 13, fontWeight: "700", color: Theme.colors.text, flex: 1 },

  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.roundness.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", color: Theme.colors.text, marginBottom: 12 },

  contactRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.primary + "22",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText:   { fontSize: 18, fontWeight: "700", color: Theme.colors.primary },
  contactName:  { fontSize: 15, fontWeight: "700", color: Theme.colors.text },
  contactPhone: { fontSize: 12, color: Theme.colors.textLight, marginTop: 2 },

  callBtn: {
    backgroundColor: Theme.colors.resolved,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: Theme.roundness.md,
  },
  callBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },

  awaitingRow: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8, backgroundColor: "#FFFBEB", borderRadius: 8 },
  awaitingText: { fontSize: 13, color: "#D97706", fontWeight: "600", flex: 1 },

  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Theme.roundness.md,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  cancelBtnText: { color: "#6B7280", fontWeight: "700", fontSize: 14 },
});

// ─── Offline Fallback Phase ───────────────────────────────────────────────────
// Shown when the SOS API is unreachable. Student can still call directly.
function OfflineFallbackPhase({
  errorMessage,
  onRetry,
  selectedType,
}: {
  errorMessage: string;
  onRetry: () => void;
  selectedType: string;
}) {
  return (
    <ScrollView contentContainerStyle={offlineStyles.container}>
      {/* Error banner */}
      <View style={offlineStyles.errorBanner}>
        <Ionicons name="cloud-offline-outline" size={32} color="#FFFFFF" />
        <Text style={offlineStyles.errorTitle}>Emergency Alert Could Not Be Sent</Text>
        <Text style={offlineStyles.errorDetail}>{errorMessage}</Text>
      </View>

      {/* What to do box */}
      <View style={offlineStyles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color="#D97706" />
        <Text style={offlineStyles.infoText}>
          The app server could not be reached. Please call for help directly — these numbers work without internet.
        </Text>
      </View>

      {/* Direct call buttons */}
      <Text style={offlineStyles.sectionLabel}>CALL FOR HELP NOW</Text>

      <TouchableOpacity
        style={[offlineStyles.callBtn, { backgroundColor: "#DC2626" }]}
        onPress={() => Linking.openURL(EMERGENCY_HOTLINE)}
      >
        <Ionicons name="call" size={20} color="#FFFFFF" />
        <Text style={offlineStyles.callBtnText}>📞 Emergency Hotline</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[offlineStyles.callBtn, { backgroundColor: "#7C3AED" }]}
        onPress={() => Linking.openURL(EMERGENCY_HOTLINE)}
      >
        <Ionicons name="call" size={20} color="#FFFFFF" />
        <Text style={offlineStyles.callBtnText}>📞 Call Security</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[offlineStyles.callBtn, { backgroundColor: "#059669" }]}
        onPress={() => Linking.openURL(EMERGENCY_HOTLINE)}
      >
        <Ionicons name="call" size={20} color="#FFFFFF" />
        <Text style={offlineStyles.callBtnText}>📞 Call Warden</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[offlineStyles.callBtn, { backgroundColor: Theme.colors.secondary }]}
        onPress={() => Linking.openURL(EMERGENCY_HOTLINE)}
      >
        <Ionicons name="call" size={20} color="#FFFFFF" />
        <Text style={offlineStyles.callBtnText}>📞 Call Technician</Text>
      </TouchableOpacity>

      {/* Retry */}
      <TouchableOpacity style={offlineStyles.retryBtn} onPress={onRetry}>
        <Ionicons name="refresh-outline" size={18} color={Theme.colors.primary} />
        <Text style={offlineStyles.retryText}>Retry Sending SOS Alert</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const offlineStyles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60, backgroundColor: Theme.colors.background },
  errorBanner: {
    backgroundColor: "#991B1B",
    borderRadius: Theme.roundness.lg,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  errorTitle: { fontSize: 18, fontWeight: "900", color: "#FFFFFF", textAlign: "center", marginTop: 4 },
  errorDetail: { fontSize: 13, color: "rgba(255,255,255,0.8)", textAlign: "center", lineHeight: 18, marginTop: 4 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderRadius: Theme.roundness.md,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 14,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 13, color: "#92400E", fontWeight: "600", lineHeight: 18 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Theme.colors.textLight,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: Theme.roundness.md,
    marginBottom: 10,
  },
  callBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: Theme.roundness.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.primary,
    backgroundColor: "#FFFFFF",
  },
  retryText: { color: Theme.colors.primary, fontWeight: "700", fontSize: 15 },
});

// ─── Root component ───────────────────────────────────────────────────────────
export default function EmergencySOSScreen({ onBack }: EmergencySOSScreenProps) {
  const [phase, setPhase]           = useState<Phase>("hold");
  const [isSending, setIsSending]   = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [emergency, setEmergency]   = useState<Emergency | null>(null);
  const [offlineError, setOfflineError] = useState("");
  const [pendingType, setPendingType]   = useState<EmergencyType | null>(null);
  const { } = useAuth(); // keep context subscription for future use

  // Android back button
  useBackHandler(
    useCallback(() => {
      if (phase === "status")   { return true; } // block back on status
      if (phase === "offline")  { setPhase("category"); return true; }
      if (phase === "category") { setPhase("hold"); return true; }
      onBack(); return true;
    }, [phase, onBack])
  );

  const handleActivated = () => setPhase("category");

  const handleSend = async (type: EmergencyType) => {
    setPendingType(type);
    setIsSending(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const endpoint = "/emergency/sos";
    const body     = { emergency_type: type };

    // ── Debug logging ──────────────────────────────────────────────────────
    console.log("[SOS] Sending emergency SOS");
    console.log("[SOS] Base URL:", apiService.getApiBaseUrl());
    console.log("[SOS] Endpoint:", endpoint);
    console.log("[SOS] Full URL:", `${apiService.getApiBaseUrl()}${endpoint}`);
    console.log("[SOS] Payload:", JSON.stringify(body));

    try {
      const em = await apiService.post<Emergency>(endpoint, body);

      console.log("[SOS] Success! Emergency created:", JSON.stringify(em));
      setEmergency(em);
      setPhase("status");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      const rawMsg: string = err?.message ?? "Unknown error";
      console.error("[SOS] FAILED:", rawMsg);

      // ── Map technical errors to user-friendly messages ───────────────────
      let displayMsg = rawMsg;
      if (rawMsg.toLowerCase().includes("not found") || rawMsg.includes("404")) {
        displayMsg =
          "Emergency service endpoint not found (404). " +
          "The server may not have restarted yet after the latest update. " +
          "Please use the direct call buttons below.";
      } else if (
        rawMsg.toLowerCase().includes("network") ||
        rawMsg.toLowerCase().includes("failed to fetch") ||
        rawMsg.toLowerCase().includes("sleeping")
      ) {
        displayMsg =
          "Cannot reach the server. Check your internet connection " +
          "or the server may be starting up. Use the direct call buttons.";
      } else if (rawMsg.includes("500")) {
        displayMsg =
          "Server error while creating emergency ticket. " +
          "Your SOS could not be recorded. Please call directly.";
      } else if (rawMsg.includes("401") || rawMsg.includes("403")) {
        displayMsg =
          "Session expired. Please log out and log back in, " +
          "then try the SOS again. Use direct call buttons for now.";
      }

      setOfflineError(displayMsg);
      setPhase("offline"); // Always show the offline fallback — never block the student
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = () => {
    if (pendingType) {
      setPhase("category");
    } else {
      setPhase("hold");
    }
  };

  const handleCancel = async () => {
    if (!emergency) return;
    setIsCancelling(true);
    try {
      const updated = await apiService.put<Emergency>(
        `/emergency/${emergency.id}/cancel`,
        { reason: "False alarm" }
      );
      setEmergency(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Cancelled", "False alarm cancelled successfully.", [
        { text: "OK", onPress: onBack },
      ]);
    } catch (err: any) {
      Alert.alert(
        "Cancel failed",
        err.message || "Could not cancel the emergency. It will expire automatically.",
        [{ text: "OK" }]
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // Background colour adapts: red for hold, white for category/status/offline
  const bgColor =
    phase === "hold" ? "#991B1B" : Theme.colors.background;

  return (
    <View style={[rootStyles.root, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor="#991B1B" />
      <Header
        title={
          phase === "hold"     ? "🚨 EMERGENCY SOS"      :
          phase === "category" ? "Select Emergency Type"  :
          phase === "status"   ? "Emergency Status"       :
                                 "⚠️ Emergency — Call Now"
        }
        showBackButton={phase !== "status"}
        onBack={
          phase === "category" ? () => setPhase("hold")     :
          phase === "offline"  ? () => setPhase("category") :
          onBack
        }
      />

      {phase === "hold" && (
        <HoldPhase onActivated={handleActivated} />
      )}

      {phase === "category" && (
        <CategoryPhase onSend={handleSend} isSending={isSending} />
      )}

      {phase === "status" && emergency && (
        <StatusPhase
          emergency={emergency}
          onCancel={handleCancel}
          isCancelling={isCancelling}
        />
      )}

      {phase === "offline" && (
        <OfflineFallbackPhase
          errorMessage={offlineError}
          onRetry={handleRetry}
          selectedType={pendingType ?? "other"}
        />
      )}
    </View>
  );
}

const rootStyles = StyleSheet.create({
  root: { flex: 1 },
});
