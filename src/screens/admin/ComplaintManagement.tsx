import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { Complaint, User } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";

interface ComplaintManagementProps {
  onBack?: () => void;
}

export default function ComplaintManagementScreen({ onBack }: ComplaintManagementProps = {}) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Assignment Modal State
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const compData = await apiService.get<Complaint[]>("/complaints");
      setComplaints(compData);
      
      const workerData = await apiService.get<User[]>("/admin/workers");
      setWorkers(workerData);
    } catch (err) {
      console.error("Failed to load dispatch board data:", err);
      Alert.alert("Error", "Could not load dispatch data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignWorker = async (workerId: number, workerName: string) => {
    if (!selectedComplaint) return;
    setIsAssigning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await apiService.post(`/admin/complaints/${selectedComplaint.id}/assign`, {
        worker_id: workerId,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Worker Dispatched", `Complaint has been successfully assigned to: ${workerName}`);
      setModalVisible(false);
      setSelectedComplaint(null);
      
      // Reload complaints list
      const compData = await apiService.get<Complaint[]>("/complaints");
      setComplaints(compData);
    } catch (err: any) {
      Alert.alert("Dispatch Failed", err.message || "Failed to assign worker.");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOpenAssignModal = (complaint: Complaint) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedComplaint(complaint);
    setModalVisible(true);
  };

  const renderComplaintCard = ({ item }: { item: Complaint }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.ticketId}>Ticket #{item.id}</Text>
        <View style={styles.row}>
          <Badge type="status" value={item.status} label={String(item.status || "").replace("_", " ")} style={{ marginRight: 6 }} />
          <Badge type="severity" value={item.severity} label={item.severity} />
        </View>
      </View>

      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardDesc}>{item.description}</Text>

      <View style={styles.cardLocationRow}>
        <Ionicons name="location-outline" size={14} color={Theme.colors.textLight} />
        <Text style={styles.locationText}>
          {item.hostel_name}, Room {item.room_number}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.workerAssignRow}>
          <Ionicons
            name={item.worker ? "person" : "alert-circle"}
            size={16}
            color={item.worker ? Theme.colors.resolved : Theme.colors.pending}
          />
          <Text
            style={[
              styles.workerAssignText,
              { color: item.worker ? Theme.colors.text : Theme.colors.pending, fontWeight: "600" },
            ]}
          >
            {item.worker ? `Technician: ${item.worker.full_name}` : "Awaiting Dispatch"}
          </Text>
        </View>

        {item.status !== "resolved" && (
          <TouchableOpacity
            style={styles.dispatchBtn}
            onPress={() => handleOpenAssignModal(item)}
          >
            <Text style={styles.dispatchBtnText}>
              {item.worker ? "Reassign" : "Assign Staff"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header title="Dispatch Control Board" showBackButton onBack={onBack} />

      <ResponsiveContainer>
      <View style={styles.subBanner}>
        <Text style={styles.title}>All Tickets</Text>
        <Text style={styles.subtitle}>{complaints.length} maintenance tickets logged</Text>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={complaints}
          renderItem={renderComplaintCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="clipboard-outline" size={64} color={Theme.colors.textLight} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyTitle}>Zero Tickets Logged</Text>
              <Text style={styles.emptyDesc}>Students haven't submitted any complaints yet.</Text>
            </View>
          }
        />
      )}
      </ResponsiveContainer>

      {/* Dispatch Assignment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Dispatch Technician</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalList} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalSectionTitle}>
                Select worker to assign to Ticket #{selectedComplaint?.id}
              </Text>

              {isAssigning ? (
                <ActivityIndicator size="small" color={Theme.colors.primary} style={{ padding: 20 }} />
              ) : workers.length === 0 ? (
                <Text style={styles.emptyWorkersText}>
                  No active workers registered in directory. Please create a worker account first!
                </Text>
              ) : (
                workers.map((worker) => (
                  <TouchableOpacity
                    key={worker.id}
                    onPress={() => handleAssignWorker(worker.id, worker.full_name)}
                    style={styles.workerSelectBtn}
                  >
                    <View style={styles.workerRow}>
                      <View style={styles.workerAvatar}>
                        <Text style={styles.workerAvatarText}>
                          {worker.full_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.workerInfo}>
                        <Text style={styles.workerSelectName}>{worker.full_name}</Text>
                        <Text style={styles.workerSelectEmail}>{worker.email}</Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Theme.colors.textLight} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  subBanner: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    width: "100%",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Theme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.textLight,
    fontWeight: "500",
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  card: {
    marginBottom: Theme.spacing.md,
    width: "100%",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  ticketId: {
    fontSize: 13,
    fontWeight: "700",
    color: Theme.colors.textLight,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: Theme.colors.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: Theme.colors.textLight,
    marginLeft: 6,
    fontWeight: "500",
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workerAssignRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  workerAssignText: {
    fontSize: 13,
    marginLeft: 6,
  },
  dispatchBtn: {
    backgroundColor: Theme.colors.primary + "15",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Theme.colors.primary,
  },
  dispatchBtnText: {
    color: Theme.colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Theme.colors.text,
    marginTop: 16,
  },
  emptyDesc: {
    fontSize: 14,
    color: Theme.colors.textLight,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 42, 102, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: Theme.roundness.xl,
    borderTopRightRadius: Theme.roundness.xl,
    paddingTop: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Theme.colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  modalList: {
    padding: 24,
    paddingBottom: 40,
  },
  modalSectionTitle: {
    fontSize: 14,
    color: Theme.colors.textLight,
    fontWeight: "600",
    marginBottom: 16,
  },
  emptyWorkersText: {
    color: Theme.colors.high,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    padding: 20,
    lineHeight: 20,
  },
  workerSelectBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  workerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  workerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  workerAvatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  workerInfo: {
    marginLeft: 12,
  },
  workerSelectName: {
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.text,
  },
  workerSelectEmail: {
    fontSize: 12,
    color: Theme.colors.textLight,
    marginTop: 2,
  },
});
