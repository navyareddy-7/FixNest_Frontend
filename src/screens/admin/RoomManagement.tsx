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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { Room } from "../../types";
import { Header } from "../../components/ui/Header";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";

interface RoomManagementProps {
  onBack?: () => void;
}

export default function RoomManagementScreen({ onBack }: RoomManagementProps = {}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "available" | "full" | "maintenance">("all");

  // Room Form State
  const [roomNumber, setRoomNumber] = useState("");
  const [capacity, setCapacity] = useState("4");
  const [hostelId, setHostelId] = useState("1");

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const roomsData = await apiService.get<Room[]>("/rooms");
      setRooms(roomsData);
      applyFilter(roomsData, activeFilter);
    } catch (e) {
      console.error("Failed to load rooms:", e);
      Alert.alert("Error", "Could not load rooms directory from server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const applyFilter = (list: Room[], filter: typeof activeFilter) => {
    if (filter === "all") {
      setFilteredRooms(list);
    } else {
      setFilteredRooms(list.filter((r) => r.status === filter));
    }
  };

  const handleFilterPress = (filter: typeof activeFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(filter);
    applyFilter(rooms, filter);
  };

  const handleRegisterRoom = async () => {
    if (!roomNumber.trim()) {
      Alert.alert("Required Field", "Room number is required.");
      return;
    }

    setIsRegistering(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newRoom = await apiService.post<Room>("/rooms", {
        room_number: roomNumber.trim(),
        hostel_id: Number(hostelId),
        capacity: Number(capacity),
      });

      const updated = [newRoom, ...rooms];
      setRooms(updated);
      applyFilter(updated, activeFilter);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === "web") {
        window.alert(`Room Added\n\nRoom ${roomNumber} has been successfully registered.`);
      } else {
        Alert.alert("Room Added", `Room ${roomNumber} has been successfully registered.`);
      }
      
      // Reset form
      setRoomNumber("");
      setCapacity("4");
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not register room.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleToggleMaintenance = (room: Room) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    const inMaintenance = room.status === "maintenance";
    const nextStatus = (inMaintenance ? "available" : "maintenance") as Room["status"];

    if (Platform.OS === "web") {
      if (window.confirm(`${inMaintenance ? "Resolve" : "Flag"} Maintenance\n\nAre you sure you want to ${inMaintenance ? "remove room from" : "flag room as"} maintenance mode?`)) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        apiService.put<Room>(`/rooms/${room.id}`, {
          status: nextStatus,
          occupied: nextStatus === "maintenance" ? 0 : room.occupied,
        }).then((updatedRoom) => {
          const updated = rooms.map((r) => (r.id === room.id ? updatedRoom : r));
          setRooms(updated);
          applyFilter(updated, activeFilter);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          window.alert("Success: Maintenance status updated.");
        }).catch((err: any) => {
          window.alert("Error: " + (err.message || "Could not update room maintenance status."));
        });
      }
    } else {
      Alert.alert(
        `${inMaintenance ? "Resolve" : "Flag"} Maintenance`,
        `Are you sure you want to ${inMaintenance ? "remove room from" : "flag room as"} maintenance mode?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: inMaintenance ? "Restore" : "Flag",
            style: inMaintenance ? "default" : "destructive",
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              try {
                const updatedRoom = await apiService.put<Room>(`/rooms/${room.id}`, {
                  status: nextStatus,
                  occupied: nextStatus === "maintenance" ? 0 : room.occupied,
                });
                const updated = rooms.map((r) =>
                  r.id === room.id ? updatedRoom : r
                );
                setRooms(updated);
                applyFilter(updated, activeFilter);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (err: any) {
                Alert.alert("Error", err.message || "Could not update room maintenance status.");
              }
            },
          },
        ]
      );
    }
  };

  const renderFilterPill = (filter: typeof activeFilter, label: string) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        onPress={() => handleFilterPress(filter)}
        style={[styles.filterPill, isActive && styles.activeFilterPill]}
      >
        <Text style={[styles.filterPillText, isActive && styles.activeFilterPillText]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRoomCard = ({ item }: { item: Room }) => {
    const isMaintenance = item.status === "maintenance";
    const percentFilled = (item.occupied / item.capacity) * 100;

    return (
      <Card style={StyleSheet.flatten([styles.card, isMaintenance && styles.cardMaintenance])}>
        <View style={styles.roomRow}>
          <View style={[styles.roomAvatar, isMaintenance && styles.roomAvatarMaintenance]}>
            <Text style={styles.roomAvatarText}>{item.room_number}</Text>
          </View>
          
          <View style={styles.roomMeta}>
            <View style={styles.titleRow}>
              <Text style={styles.roomLabel}>Block A • Room {item.room_number}</Text>
              <View style={[styles.statusBadge, styles[`statusBadge_${item.status}`]]}>
                <Text style={styles.statusBadgeText}>{item.status.toUpperCase()}</Text>
              </View>
            </View>

            {isMaintenance ? (
              <Text style={styles.maintenanceDesc}>
                <Ionicons name="construct" size={12} /> Out of service for repairs.
              </Text>
            ) : (
              <View style={styles.occupancyContainer}>
                <Text style={styles.occupancyText}>
                  Occupancy: {item.occupied} / {item.capacity} students
                </Text>
                {/* Visual bar */}
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { width: `${percentFilled}%`, backgroundColor: percentFilled === 100 ? Theme.colors.high : Theme.colors.primary }]} />
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, isMaintenance ? styles.actionBtnRestore : styles.actionBtnFlag]}
            onPress={() => handleToggleMaintenance(item)}
          >
            <Ionicons
              name={isMaintenance ? "checkmark-circle-outline" : "hammer-outline"}
              size={18}
              color={isMaintenance ? Theme.colors.resolved : Theme.colors.pending}
            />
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header title="Room Allocations" showBackButton onBack={onBack} />

      <ResponsiveContainer>
      {/* Filters */}
      <View style={styles.filterContainer}>
        {renderFilterPill("all", "All Rooms")}
        {renderFilterPill("available", "Available")}
        {renderFilterPill("full", "Full")}
        {renderFilterPill("maintenance", "Under Repair")}
      </View>

      <View style={styles.bannerRow}>
        <View>
          <Text style={styles.title}>Block Directory</Text>
          <Text style={styles.subtitle}>{filteredRooms.length} room(s) listed</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add Room</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          renderItem={renderRoomCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="business-outline" size={64} color={Theme.colors.textLight} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyTitle}>No Rooms Discovered</Text>
              <Text style={styles.emptyDesc}>Hostel rooms will be loaded here.</Text>
            </View>
          }
        />
      )}
      </ResponsiveContainer>

      {/* Add Room Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Room Profile</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <Input
                label="Room Number *"
                placeholder="e.g. 104"
                value={roomNumber}
                onChangeText={setRoomNumber}
                iconName="business-outline"
                keyboardType="numeric"
              />

              <Input
                label="Total Capacity (Beds) *"
                placeholder="e.g. 4"
                value={capacity}
                onChangeText={setCapacity}
                iconName="people-outline"
                keyboardType="numeric"
              />

              <Button
                title="Register Room Profile"
                onPress={handleRegisterRoom}
                loading={isRegistering}
                variant="primary"
                style={styles.modalSubmitBtn}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.md,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.roundness.full,
    backgroundColor: "#FFFFFF",
    marginRight: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  activeFilterPill: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    color: Theme.colors.textLight,
    fontWeight: "600",
  },
  activeFilterPillText: {
    color: "#FFFFFF",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  addBtn: {
    backgroundColor: Theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Theme.roundness.md,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },
  card: {
    marginBottom: Theme.spacing.md,
    width: "100%",
  },
  cardMaintenance: {
    backgroundColor: "#FFF9F2",
    borderColor: "#FFEEDD",
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  roomAvatar: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#F0F4FC",
    justifyContent: "center",
    alignItems: "center",
  },
  roomAvatarMaintenance: {
    backgroundColor: "#FFEEDD",
  },
  roomAvatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: Theme.colors.primary,
  },
  roomMeta: {
    marginLeft: 16,
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  roomLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: Theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadge_available: {
    backgroundColor: "#E8F5E9",
  },
  statusBadge_full: {
    backgroundColor: "#FFEBEE",
  },
  statusBadge_maintenance: {
    backgroundColor: "#FFF3E0",
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: Theme.colors.primary,
  },
  maintenanceDesc: {
    fontSize: 13,
    color: Theme.colors.pending,
    fontWeight: "500",
    marginTop: 4,
  },
  occupancyContainer: {
    marginTop: 4,
  },
  occupancyText: {
    fontSize: 12,
    color: Theme.colors.textLight,
    fontWeight: "500",
  },
  barBg: {
    height: 6,
    backgroundColor: "#F0F4FC",
    borderRadius: 3,
    marginTop: 6,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  actionBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 10,
  },
  actionBtnFlag: {
    backgroundColor: "#FFF9F2",
    borderColor: "#FFEEDD",
  },
  actionBtnRestore: {
    backgroundColor: "#E8F5E9",
    borderColor: "#C8E6C9",
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
  modalForm: {
    padding: 24,
    paddingBottom: 40,
  },
  modalSubmitBtn: {
    marginTop: 12,
  },
});
