import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { apiService } from "../../services/api";
import { Complaint, Comment } from "../../types";
import { Header } from "../../components/ui/Header";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { StatusTimeline } from "../../components/ui/StatusTimeline";
import { ResponsiveContainer } from "../../components/ui/ResponsiveContainer";
import { Theme } from "../../constants/theme";

interface ComplaintDetailProps {
  complaintId?: number;
  onBack?: () => void;
}

export default function ComplaintDetailScreen({ complaintId, onBack }: ComplaintDetailProps = {}) {
  const params = useLocalSearchParams<{ id: string }>();
  const id = complaintId || (params.id ? Number(params.id) : undefined);
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  
  const router = useRouter();

  const loadData = async () => {
    if (!id) return;
    try {
      const compData = await apiService.get<Complaint>(`/complaints/${id}`);
      setComplaint(compData);
      
      const commData = await apiService.get<Comment[]>(`/complaints/${id}/comments`);
      setComments(commData);
    } catch (err) {
      console.error("Failed to load complaint detail:", err);
      Alert.alert("Error", "Could not load complaint details.");
      if (onBack) {
        onBack();
      } else {
        router.back();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !id) return;
    setIsPosting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const addedComment = await apiService.post<Comment>(`/complaints/${id}/comments`, {
        text: newComment.trim(),
      });
      
      // Refresh comments
      setComments([...comments, addedComment]);
      setNewComment("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (Platform.OS === "web") {
        window.alert("Comment Added Successfully.");
      } else {
        Alert.alert("Success", "Comment Added.");
      }
    } catch (err: any) {
      Alert.alert("Comment Failed", err.message || "Failed to post your comment.");
    } finally {
      setIsPosting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
        <Text style={styles.loadingText}>Fetching details...</Text>
      </View>
    );
  }

  if (!complaint) return null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <Header title="Ticket Details" showBackButton onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <ResponsiveContainer>
        {/* Ticket Header Card */}
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.ticketId}>Ticket #{complaint.id}</Text>
            <Badge type="status" value={complaint.status} label={String(complaint.status || "").replace("_", " ")} />
          </View>

          <Text style={styles.title}>{complaint.title}</Text>
          <Text style={styles.desc}>{complaint.description}</Text>

          {complaint.image_url ? (
            <Image source={{ uri: complaint.image_url }} style={styles.attachedImage} />
          ) : null}

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color={Theme.colors.textLight} />
              <Text style={styles.infoText}>
                {complaint.hostel_name}, Room {complaint.room_number}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={18} color={Theme.colors.textLight} />
              <Text style={styles.infoText}>{complaint.category}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="alert-circle-outline" size={18} color={Theme.colors.textLight} />
              <Text style={styles.infoText}>
                Priority:{" "}
                <Text style={{ fontWeight: "700", color: Theme.colors[complaint.severity] }}>
                  {complaint.severity.toUpperCase()}
                </Text>
              </Text>
            </View>
          </View>
        </Card>

        {/* Worker Details Card */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Assigned Technician</Text>
          {complaint.worker ? (
            <View style={styles.workerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {complaint.worker.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.workerInfo}>
                <Text style={styles.workerName}>{complaint.worker.full_name}</Text>
                <Text style={styles.workerPhone}>
                  <Ionicons name="call" size={12} /> {complaint.worker.phone_number || "No contact info"}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.unassignedBox}>
              <Ionicons name="time-outline" size={24} color={Theme.colors.pending} />
              <Text style={styles.unassignedText}>
                Awaiting Admin dispatch. A technician will be assigned shortly.
              </Text>
            </View>
          )}
        </Card>

        {/* Timeline Activities */}
        <Card style={styles.card}>
          <StatusTimeline comments={comments} />
        </Card>

        {/* Post Comment Section */}
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Post a Message</Text>
          <Input
            placeholder="Type a message or instruction for the technician..."
            value={newComment}
            onChangeText={setNewComment}
            multiline
            numberOfLines={2}
            style={styles.commentInput}
          />
          <Button
            title="Send Message"
            onPress={handlePostComment}
            loading={isPosting}
            disabled={!newComment.trim()}
            variant="secondary"
          />
        </Card>
        </ResponsiveContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Theme.colors.background,
  },
  loadingText: {
    color: Theme.colors.textLight,
    marginTop: 10,
    fontWeight: "500",
  },
  scrollContainer: {
    padding: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
  },
  card: {
    marginBottom: Theme.spacing.md,
    width: "100%",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ticketId: {
    fontSize: 13,
    fontWeight: "700",
    color: Theme.colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: Theme.colors.text,
    marginBottom: 8,
  },
  desc: {
    fontSize: 15,
    color: Theme.colors.textLight,
    lineHeight: 22,
    marginBottom: 16,
  },
  attachedImage: {
    width: "100%",
    height: 180,
    borderRadius: Theme.roundness.md,
    marginBottom: 16,
    resizeMode: "cover",
  },
  infoGrid: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: Theme.colors.text,
    marginLeft: 10,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: 12,
  },
  workerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  workerInfo: {
    marginLeft: 12,
  },
  workerName: {
    fontSize: 15,
    fontWeight: "700",
    color: Theme.colors.text,
  },
  workerPhone: {
    fontSize: 13,
    color: Theme.colors.textLight,
    marginTop: 2,
    fontWeight: "500",
  },
  unassignedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF9F2",
    borderRadius: Theme.roundness.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FFEEDD",
  },
  unassignedText: {
    fontSize: 13,
    color: Theme.colors.textLight,
    marginLeft: 8,
    flex: 1,
    fontWeight: "500",
    lineHeight: 18,
  },
  commentInput: {
    height: 60,
    textAlignVertical: "top",
    paddingTop: 8,
    marginBottom: 12,
  },
});
