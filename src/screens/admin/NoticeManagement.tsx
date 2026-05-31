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
import { Notice } from "../../types";
import { Header } from "../../components/ui/Header";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";

interface NoticeManagementProps {
  onBack?: () => void;
}

export default function NoticeManagementScreen({ onBack }: NoticeManagementProps = {}) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hostelName, setHostelName] = useState("All Hostels");

  const fetchNotices = async () => {
    setIsLoading(true);
    try {
      const noticesData = await apiService.get<Notice[]>("/notices");
      setNotices(noticesData);
    } catch (e) {
      console.error("Failed to load notices:", e);
      Alert.alert("Error", "Could not load notices board from server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handlePublishNotice = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Required Fields", "Title and announcement content are required.");
      return;
    }

    setIsPublishing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newNotice = await apiService.post<Notice>("/notices", {
        title: title.trim(),
        content: content.trim(),
        hostel_name: hostelName === "All Hostels" ? null : hostelName.trim(),
      });

      setNotices([newNotice, ...notices]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Notice Published", "Your announcement is now live for relevant students.");
      
      // Reset form
      setTitle("");
      setContent("");
      setHostelName("All Hostels");
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to publish notice.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteNotice = (id: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Remove Announcement",
      "Are you sure you want to permanently delete this notice?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            try {
              await apiService.delete(`/notices/${id}`);
              setNotices(notices.filter((n) => n.id !== id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete notice from database.");
            }
          },
        },
      ]
    );
  };

  const renderNoticeCard = ({ item }: { item: Notice }) => {
    const formattedDate = new Date(item.created_at).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, item.hostel_name ? styles.badgeSpecific : styles.badgeGlobal]}>
              <Text style={styles.badgeText}>
                {item.hostel_name ? item.hostel_name.toUpperCase() : "GLOBAL ALERT"}
              </Text>
            </View>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteNotice(item.id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={18} color={Theme.colors.high} />
          </TouchableOpacity>
        </View>

        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardContent}>{item.content}</Text>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header title="Notice Board Admin" showBackButton onBack={onBack} />

      <ResponsiveContainer>
      <View style={styles.bannerRow}>
        <View>
          <Text style={styles.title}>Hostel Notices</Text>
          <Text style={styles.subtitle}>{notices.length} active announcements</Text>
        </View>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setModalVisible(true);
          }}
        >
          <Ionicons name="megaphone-outline" size={16} color="#FFFFFF" />
          <Text style={styles.publishBtnText}>Publish Notice</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notices}
          renderItem={renderNoticeCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={64} color={Theme.colors.textLight} style={{ opacity: 0.4 }} />
              <Text style={styles.emptyTitle}>Notice Board Empty</Text>
              <Text style={styles.emptyDesc}>Hostel alerts will be visible to students once published.</Text>
            </View>
          }
        />
      )}
      </ResponsiveContainer>

      {/* Publish Notice Modal */}
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
              <Text style={styles.modalTitle}>Publish Announcement</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <Input
                label="Alert Title *"
                placeholder="e.g. Scheduled Power Shutdown"
                value={title}
                onChangeText={setTitle}
                iconName="bookmark-outline"
              />

              <Input
                label="Hostel Scope *"
                placeholder="e.g. Block A, or type All Hostels"
                value={hostelName}
                onChangeText={setHostelName}
                iconName="business-outline"
              />

              <Input
                label="Announcement Content *"
                placeholder="Write full details about the notice here..."
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
                style={styles.textArea}
              />

              <Button
                title="Publish Announcement"
                onPress={handlePublishNotice}
                loading={isPublishing}
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
  publishBtn: {
    backgroundColor: Theme.colors.accent,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Theme.roundness.md,
    shadowColor: Theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  publishBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.roundness.sm,
    marginRight: 10,
  },
  badgeGlobal: {
    backgroundColor: "#FFF3E0",
  },
  badgeSpecific: {
    backgroundColor: "#E3F2FD",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Theme.colors.primary,
  },
  dateText: {
    fontSize: 12,
    color: Theme.colors.textLight,
    fontWeight: "500",
  },
  deleteBtn: {
    padding: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: 6,
  },
  cardContent: {
    fontSize: 14,
    color: Theme.colors.textLight,
    lineHeight: 20,
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
    textAlign: "center",
    paddingHorizontal: 32,
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
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 8,
    marginBottom: 16,
  },
  modalSubmitBtn: {
    marginTop: 12,
  },
});
