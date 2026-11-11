import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { Magnetometer } from "expo-sensors";
import {
  COMPASS_ALIGNED_DEG,
  COMPASS_HINT_INTERVAL_MS,
  COMPASS_INTRO_QUIET_MS,
} from "../../config/timing";

const { headingDifference, describeCompassTurn } = require("../../utils/compassGuidance");

// Vibración de confirmación mientras se mantiene el rumbo
const ALIGNED_HAPTIC_INTERVAL_MS = 1100;
const MAGNETOMETER_INTERVAL_MS = 150;

/**
 * Brújula sonora y háptica hacia el paradero.
 * Habla solo cuando la indicación cambia (con pausa mínima) y vibra mientras el rumbo es correcto.
 *
 * @param {object} options
 * @param {(text: string, priority?: boolean) => void} options.speak
 */
export default function useCompass({ speak }) {
  const [compassHeading, setCompassHeading] = useState(0);
  const [targetBearing, setTargetBearing] = useState(0);
  const [compassAligned, setCompassAligned] = useState(false);
  const [compassAdvice, setCompassAdvice] = useState("Gira con tu teléfono...");

  const subscriptionRef = useRef(null);
  const lastHapticTimeRef = useRef(0);
  const wasAlignedRef = useRef(false);
  const lastHintRef = useRef({ key: null, at: 0 });

  const speakRef = useRef(speak);
  useEffect(() => { speakRef.current = speak; });

  const stop = useCallback(() => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  }, []);

  /** @param {number} bearing Rumbo objetivo en grados */
  const start = useCallback((bearing) => {
    subscriptionRef.current?.remove();
    setTargetBearing(Math.round(bearing));

    // No hablar indicaciones mientras se lee la instrucción inicial
    wasAlignedRef.current = false;
    lastHintRef.current = { key: null, at: Date.now() + COMPASS_INTRO_QUIET_MS - COMPASS_HINT_INTERVAL_MS };

    Magnetometer.setUpdateInterval(MAGNETOMETER_INTERVAL_MS);
    subscriptionRef.current = Magnetometer.addListener(({ x, y }) => {
      let angle = Math.atan2(-x, y) * 180 / Math.PI;
      angle = (angle + 360) % 360;
      const heading = Math.round(angle);
      setCompassHeading(heading);

      const diff = headingDifference(bearing, heading);
      const now = Date.now();
      if (Math.abs(diff) <= COMPASS_ALIGNED_DEG) {
        setCompassAligned(true);
        setCompassAdvice("¡Rumbo correcto! Camina recto en esta dirección.");

        // Decirlo solo al alinearse; mientras siga alineado, solo vibración
        if (!wasAlignedRef.current) {
          wasAlignedRef.current = true;
          lastHintRef.current = { key: "aligned", at: now };
          speakRef.current("Rumbo correcto. Camina recto.", true);
        }
        if (now - lastHapticTimeRef.current > ALIGNED_HAPTIC_INTERVAL_MS) {
          lastHapticTimeRef.current = now;
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        wasAlignedRef.current = false;
        setCompassAligned(false);
        const turn = describeCompassTurn(diff);
        setCompassAdvice(turn.text);

        // Hablar solo si la indicación cambió y pasó la pausa mínima
        const last = lastHintRef.current;
        if (turn.key !== last.key && now - last.at >= COMPASS_HINT_INTERVAL_MS) {
          lastHintRef.current = { key: turn.key, at: now };
          speakRef.current(turn.text, true);
        }
      }
    });
  }, []);

  // Al desmontar, soltar el magnetómetro
  useEffect(() => () => subscriptionRef.current?.remove(), []);

  return { compassHeading, targetBearing, compassAligned, compassAdvice, start, stop };
}
