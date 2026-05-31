import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "../../constants/theme";
import { Comment } from "../../types";

interface StatusTimelineProps {
  comments: Comment[];
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ comments }) => {
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const renderItem = ({ item, index }: { item: Comment; index: number }) => {
    const isSystem = item.is_system_action;
    const isLast = index === comments.length - 1;

    return (
      <View style={styles.timelineItem}>
        {/* Track Line */}
        <View style={styles.trackColumn}>
          <View
            style={[
              styles.bullet,
              {
                backgroundColor: isSystem ? Theme.colors.secondary : Theme.colors.accent,
                borderColor: "#FFFFFF",
              },
            ]}
          >
            <Ionicons
              name={isSystem ? "cog-outline" : "chatbubble-ellipses-outline"}
              size={12}
              color="#FFFFFF"
            />
          </View>
          {!isLast && <View style={styles.line} />}
        </View>

        {/* Content Box */}
        <View style={styles.contentColumn}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentAuthor}>
              {isSystem ? "System Update" : item.user?.full_name || "User Comment"}
            </Text>
            <Text style={styles.commentTime}>{formatTime(item.created_at)}</Text>
          </View>
          <Text
            style={[
              styles.commentText,
              {
                color: isSystem ? Theme.colors.textLight : Theme.colors.text,
                fontStyle: isSystem ? "italic" : "normal",
              },
            ]}
          >
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Activity Timeline & Logs</Text>
      
      {comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No activity recorded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={comments}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  title: {
    fontSize: Theme.typography.h3.fontSize,
    fontWeight: "700",
    color: Theme.colors.text,
    marginBottom: Theme.spacing.md,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  trackColumn: {
    width: 32,
    alignItems: "center",
  },
  bullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    zIndex: 1,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Theme.colors.border,
    position: "absolute",
    top: 26,
    bottom: -8,
  },
  contentColumn: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: Theme.spacing.md,
    borderRadius: Theme.roundness.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: "700",
    color: Theme.colors.text,
  },
  commentTime: {
    fontSize: 11,
    color: Theme.colors.textLight,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 16,
  },
  emptyText: {
    color: Theme.colors.textLight,
    fontStyle: "italic",
  },
});
