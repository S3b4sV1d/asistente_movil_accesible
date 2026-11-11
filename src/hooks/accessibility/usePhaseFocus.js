import { useEffect, useRef } from "react";
import { AccessibilityInfo } from "react-native";
import { PHASE_FOCUS_DELAY_MS } from "../../config/timing";

/**
 * Al cambiar de fase, lleva el foco del lector de pantalla al título de la tarjeta nueva.
 * En el primer render no se mueve, para no interrumpir la lectura inicial de la pantalla.
 * Devuelve la ref que debe asignarse al título de la tarjeta de la fase actual.
 *
 * @param {string} appPhase
 * @param {{ current: boolean }} screenReaderRef
 */
export default function usePhaseFocus(appPhase, screenReaderRef) {
  const headingRef = useRef(null);
  const isFirstPhaseRef = useRef(true);

  useEffect(() => {
    if (isFirstPhaseRef.current) {
      isFirstPhaseRef.current = false;
      return;
    }
    if (!screenReaderRef.current) return;
    const timer = setTimeout(() => {
      if (headingRef.current) {
        AccessibilityInfo.sendAccessibilityEvent(headingRef.current, "focus");
      }
    }, PHASE_FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [appPhase, screenReaderRef]);

  return headingRef;
}
