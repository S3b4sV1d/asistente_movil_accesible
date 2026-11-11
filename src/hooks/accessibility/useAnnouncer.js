import { useCallback, useEffect, useRef } from "react";
import { AccessibilityInfo } from "react-native";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import useScreenReader from "./useScreenReader";
import { SCREEN_READER_ANNOUNCE_DELAY_MS } from "../../config/timing";

// Pausa tras la voz de la app antes de escuchar, para no grabar el eco del altavoz
const AUTO_LISTEN_DELAY_MS = 450;

/**
 * Canal único de voz de la app.
 * - Sin lector de pantalla: síntesis de voz (expo-speech) y, si se pide, escucha automática al terminar.
 * - Con lector de pantalla: solo el lector (respeta su velocidad) y sin escucha automática,
 *   porque el micrófono grabaría la voz de TalkBack o VoiceOver.
 *
 * @param {{ autoListenRef: { current: null | ((isAuto: boolean) => void) } }} options
 *   Ref a la función que inicia la grabación; se usa para la escucha automática.
 */
export default function useAnnouncer({ autoListenRef }) {
  const screenReaderOn = useScreenReader();
  const screenReaderRef = useRef(false);
  useEffect(() => { screenReaderRef.current = screenReaderOn; }, [screenReaderOn]);

  const speak = useCallback((text, priority = false, autoListenAfter = false) => {
    if (screenReaderRef.current) {
      const message = autoListenAfter
        ? `${text} Toca dos veces el botón de abajo para hablar.`
        : text;
      // Pequeño retraso para no cortar la lectura del foco cuando cambia la fase
      setTimeout(() => {
        AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
      }, SCREEN_READER_ANNOUNCE_DELAY_MS);
      return;
    }
    if (priority) {
      Speech.stop();
    }
    Speech.speak(text, {
      language: "es-PE",
      pitch: 1.0,
      rate: 1.2,
      onDone: () => {
        if (autoListenAfter && autoListenRef.current) {
          setTimeout(() => {
            autoListenRef.current?.(true);
          }, AUTO_LISTEN_DELAY_MS);
        }
      }
    });
  }, [autoListenRef]);

  const stopSpeaking = useCallback(() => {
    Haptics.selectionAsync();
    Speech.stop();
  }, []);

  // Al desmontar, no dejar la voz hablando
  useEffect(() => () => Speech.stop(), []);

  return { speak, stopSpeaking, screenReaderOn, screenReaderRef };
}
