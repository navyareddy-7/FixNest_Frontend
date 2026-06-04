import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "../../../constants/theme";

interface TimelineStep {
  title: string;
  subtitle?: string;
  isCompleted: boolean;
  isCurrent: boolean;
  time?: string;
}

interface EmergencyTimelineProps {
  status: string; // active, acknowledged, resolved, cancelled
  createdAt: string;
  assignedAt?: string;
  resolvedAt?: string;
}

export function EmergencyTimeline({ status, createdAt, assignedAt, resolvedAt }: EmergencyTimelineProps) {
  const isCancelled = status === "cancelled";
  const isResolved = status === "resolved";
  const isAssigned = status === "acknowledged" || isResolved || !!assignedAt;

  const steps: TimelineStep[] = [
    {
      title: "SOS Created",
      isCompleted: true,
      isCurrent: status === "active",
      time: new Date(createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    },
    {
      title: "Technician Assigned",
      subtitle: isAssigned ? "Help is on the way" : "Finding nearest available...",
      isCompleted: isAssigned,
      isCurrent: status === "acknowledged",
      time: assignedAt ? new Date(assignedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : undefined,
    },
    {
      title: isCancelled ? "Emergency Cancelled" : "Resolved",
      isCompleted: isResolved || isCancelled,
      isCurrent: isResolved || isCancelled,
      time: resolvedAt ? new Date(resolvedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : undefined,
    }
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Emergency Timeline</Text>
      <View style={styles.timelineContainer}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const color = step.isCompleted ? Theme.colors.primary : "#D1D5DB";
          const icon = step.isCompleted ? "checkmark-circle" : (step.isCurrent ? "time" : "ellipse-outline");
          const iconColor = step.isCompleted ? Theme.colors.primary : (step.isCurrent ? "#D97706" : "#D1D5DB");

          return (
            <View key={index} style={styles.stepRow}>
              {/* Left timeline graphics */}
              <View style={styles.graphicsColumn}>
                <Ionicons name={icon} size={22} color={iconColor} style={styles.icon} />
                {!isLast && (
                  <View style={[styles.line, { backgroundColor: color }]} />
                )}
              </View>

              {/* Right content */}
              <View style={[styles.contentColumn, !isLast && { paddingBottom: 24 }]}>
                <View style={styles.titleRow}>
                  <Text style={[
                    styles.title,
                    step.isCompleted && styles.titleCompleted,
                    step.isCurrent && styles.titleCurrent,
                  ]}>
                    {step.title}
                  </Text>
                  {step.time && <Text style={styles.time}>{step.time}</Text>}
                </View>
                {step.subtitle && (
                  <Text style={styles.subtitle}>{step.subtitle}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: Theme.roundness.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Theme.colors.text,
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: "row",
  },
  graphicsColumn: {
    alignItems: "center",
    width: 32,
  },
  icon: {
    backgroundColor: "#FFFFFF",
    zIndex: 2,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: -4,
    marginBottom: -4,
    zIndex: 1,
  },
  contentColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 2,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  titleCompleted: {
    color: Theme.colors.text,
    fontWeight: "700",
  },
  titleCurrent: {
    color: "#D97706",
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    color: Theme.colors.textLight,
    marginTop: 4,
  },
  time: {
    fontSize: 11,
    color: Theme.colors.textLight,
    fontWeight: "600",
  },
});
