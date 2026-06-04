import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  const lowerStatus = status.toLowerCase();

  useEffect(() => {
    if (lowerStatus === "active") {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [lowerStatus, pulse]);

  const statusConfig: Record<string, { color: string; label: string }> = {
    active: { color: "#DC2626", label: "ACTIVE — AWAITING RESPONSE" },
    acknowledged: { color: "#D97706", label: "ACKNOWLEDGED — HELP ON THE WAY" },
    resolved: { color: "#16A34A", label: "RESOLVED — CLOSED" },
    cancelled: { color: "#6B7280", label: "CANCELLED" },
    escalated: { color: "#EA580C", label: "ESCALATED — HIGH PRIORITY" },
  };

  const config = statusConfig[lowerStatus] || {
    color: "#6B7280",
    label: lowerStatus.toUpperCase(),
  };

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: config.color + "18",
          borderColor: config.color,
          transform: lowerStatus === "active" ? [{ scale: pulse }] : [],
        },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    alignSelf: "flex-start",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
