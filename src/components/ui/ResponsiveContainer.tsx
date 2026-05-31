import React from "react";
import { View, StyleSheet, ViewProps, Platform } from "react-native";
import { Theme } from "../../constants/theme";

interface ResponsiveContainerProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({ 
  children, 
  padded = false,
  style, 
  ...props 
}) => {
  return (
    <View style={styles.wrapper}>
      <View 
        style={[
          styles.container, 
          padded && styles.padded,
          style
        ]} 
        {...props}
      >
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: "100%",
    alignItems: "center", // Center the container horizontally
  },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: Theme.layout.maxWidth,
  },
  padded: {
    paddingHorizontal: Theme.layout.screenPadding,
  }
});
