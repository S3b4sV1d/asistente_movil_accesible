import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Indica si hay un lector de pantalla activo (TalkBack o VoiceOver)
 * y se actualiza cuando el usuario lo enciende o apaga.
 */
export default function useScreenReader() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => {
        if (mounted) setEnabled(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}
