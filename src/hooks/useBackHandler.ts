/**
 * useBackHandler.ts
 *
 * A reusable hook that registers an Android BackHandler listener on mount
 * and removes it on unmount.
 *
 * On iOS and Web this is a no-op (BackHandler events never fire).
 *
 * Usage:
 *   useBackHandler(() => {
 *     if (modalVisible) { setModalVisible(false); return true; } // handled
 *     return false; // propagate — let the OS handle it
 *   });
 *
 * BackHandler listeners are called in REVERSE registration order (LIFO),
 * so the most recently mounted screen gets first chance to handle the event.
 *
 * Return `true`  → event consumed, no further handlers called, no default behaviour
 * Return `false` → passes to the next registered handler (or OS default)
 */

import { useEffect } from "react";
import { BackHandler } from "react-native";

export function useBackHandler(handler: () => boolean): void {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handler
    );
    return () => subscription.remove();
  }, [handler]);
}
