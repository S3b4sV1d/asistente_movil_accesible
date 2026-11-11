import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * Indica si la app está en primer plano. La cámara y el radar se pausan cuando no lo está.
 */
export default function useAppActive() {
  const [appIsActive, setAppIsActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setAppIsActive(state === "active"));
    return () => subscription.remove();
  }, []);

  return appIsActive;
}
