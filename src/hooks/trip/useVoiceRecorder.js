import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import * as FileSystem from "expo-file-system/legacy";
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync
} from "expo-audio";
import { SCREEN_READER_RECORD_DELAY_MS } from "../../config/timing";

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
  android: {
    ...RecordingPresets.HIGH_QUALITY.android,
    // Activa la cancelación acústica de eco y el supresor de ruido DSP nativo de Android
    audioSource: "voice_recognition",
  },
};

// Detección inteligente de fin de frase y silencio (inmune a interferencias y ruido)
const MONITOR_INTERVAL_MS = 150;           // intervalo de muestreo reactivo (150 ms)
const SILENCE_AFTER_SPEECH_MS = 4000;      // 4 segundos exactos de silencio tras hablar (pedido por el usuario)
const MIN_SPEECH_ABSOLUTE_DB = -29;        // umbral mínimo absoluto para voz humana (filtra interferencia y ruido de fondo)
const NOISE_MARGIN_SNR_DB = 7.0;           // la voz debe superar el ruido ambiental detectado por 7 dB
const REQUIRED_SPEECH_FRAMES = 2;          // requiere al menos 2 tramas consecutivas (~300ms) para considerar voz real (evita clics, toques o picos de ruido)
const INITIAL_GRACE_MS = 8000;             // espera máxima si aún no habló nada
const NO_METERING_LIMIT_MS = 6000;         // fallback si el sensor no soporta medición
const MAX_RECORDING_MS = 25000;            // límite máximo de seguridad
const MIN_AUDIO_BASE64_LENGTH = 50;

/**
 * Grabación de voz con envío automático tras una pausa.
 * No decide qué decirle al usuario: avisa con callbacks y entrega el audio en base64.
 *
 * @param {object} options
 * @param {{ current: boolean }} options.screenReaderRef  Con lector, espera antes de grabar para no captar su voz.
 * @param {() => void} options.onPermissionDenied
 * @param {() => void} options.onStarted     La grabación empezó (el usuario puede hablar).
 * @param {() => void} options.onProcessing  Se dejó de grabar y se va a procesar el audio.
 * @param {(audioBase64: string) => Promise<void>} options.onAudio  Audio listo; debe manejar sus propios errores.
 * @param {(kind: "no_audio" | "empty" | "error") => void} options.onCaptureError
 * @param {() => void} options.onCancelled
 * @param {(error: unknown) => void} options.onStartError
 */
export default function useVoiceRecorder(options) {
  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
  const [isRecording, setIsRecording] = useState(false);

  const monitorIntervalRef = useRef(null);
  const recordingStartTimeRef = useRef(0);
  const lastSpeechTimeRef = useRef(0);
  const hasSpokenRef = useRef(false);
  const consecutiveSpeechFramesRef = useRef(0);
  const ambientNoiseDbRef = useRef(-48);
  const isStoppingRef = useRef(false);
  const isStartingRef = useRef(false);

  const latestRef = useRef(options);
  useEffect(() => { latestRef.current = options; });

  const clearMonitor = () => {
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }
  };

  // Detener y entregar el audio (por pausa del usuario o al tocar el botón)
  const finish = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    const callbacks = latestRef.current;

    try {
      clearMonitor();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRecording(false);
      callbacks.onProcessing();

      await audioRecorder.stop();
      let uri = audioRecorder.uri;
      if (!uri) {
        const st = audioRecorder.getStatus();
        uri = st?.url;
      }

      if (!uri) {
        isStoppingRef.current = false;
        callbacks.onCaptureError("no_audio");
        return;
      }

      // Leer el audio grabado en base64
      let base64Audio = "";
      try {
        base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
        console.log("🎙️ Audio capturado OK, tamaño base64:", base64Audio.length);
      } catch (fsErr) {
        console.warn("Error leyendo audio con FileSystem:", fsErr);
      }

      if (!base64Audio || base64Audio.length < MIN_AUDIO_BASE64_LENGTH) {
        isStoppingRef.current = false;
        callbacks.onCaptureError("empty");
        return;
      }

      await callbacks.onAudio(base64Audio);
      isStoppingRef.current = false;
    } catch (err) {
      setIsRecording(false);
      isStoppingRef.current = false;
      console.warn("Error deteniendo grabación:", err);
      callbacks.onCaptureError("error");
    }
  };

  const finishRef = useRef(finish);
  useEffect(() => { finishRef.current = finish; });

  // Iniciar grabación (al tocar el botón o por escucha automática)
  const start = async () => {
    if (isRecording || isStartingRef.current) return;
    isStartingRef.current = true;
    try {
      isStoppingRef.current = false;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      Speech.stop();

      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        latestRef.current.onPermissionDenied();
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      try {
        await audioRecorder.prepareToRecordAsync();
      } catch (_prepErr) {
        // Ya estaba preparado por el hook
      }

      // Con lector de pantalla, esperar a que termine de leer el botón para no grabar su voz.
      // La vibración de éxito de abajo marca el momento de empezar a hablar.
      if (latestRef.current.screenReaderRef.current) {
        await new Promise((resolve) => setTimeout(resolve, SCREEN_READER_RECORD_DELAY_MS));
      }

      audioRecorder.record();
      setIsRecording(true);
      latestRef.current.onStarted();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      clearMonitor();
      const now = Date.now();
      recordingStartTimeRef.current = now;
      lastSpeechTimeRef.current = now;
      hasSpokenRef.current = false;
      consecutiveSpeechFramesRef.current = 0;
      ambientNoiseDbRef.current = -48; // Calibración de ruido base inicial

      // Monitor inteligente de voz y silencio con discriminación de ruido ambiental
      monitorIntervalRef.current = setInterval(() => {
        try {
          const st = audioRecorder.getStatus();
          if (!st || !st.isRecording) return;

          const currentTime = Date.now();
          const metering = st.metering;
          const meteringSupported = typeof metering === "number" && !isNaN(metering);

          if (meteringSupported) {
            // Normalizar valores de silencio total (-160 en Android)
            const level = metering <= -120 ? -60 : metering;

            // Umbral dinámico adaptativo:
            // La voz humana debe superar el piso de ruido ambiental actual por NOISE_MARGIN_SNR_DB y el mínimo de -29 dBFS
            const dynamicThreshold = Math.max(MIN_SPEECH_ABSOLUTE_DB, ambientNoiseDbRef.current + NOISE_MARGIN_SNR_DB);
            const isSpeechEnergy = level >= dynamicThreshold;

            if (isSpeechEnergy) {
              consecutiveSpeechFramesRef.current += 1;
              // Para considerar voz humana real y no un ruido aislado (clic, roce de ropa, bocina lejana):
              if (consecutiveSpeechFramesRef.current >= REQUIRED_SPEECH_FRAMES) {
                hasSpokenRef.current = true;
                lastSpeechTimeRef.current = currentTime; // Momento de voz activa del usuario
              }
            } else {
              consecutiveSpeechFramesRef.current = 0;
              // Calibración adaptativa del piso de ruido ambiental (calle, ventilador, habitación)
              if (level < ambientNoiseDbRef.current) {
                ambientNoiseDbRef.current = level;
              } else if (level < -25) {
                // Adaptación suave cuando no hay habla
                ambientNoiseDbRef.current = ambientNoiseDbRef.current * 0.9 + level * 0.1;
              }
            }
          }

          let reason = null;
          if (meteringSupported) {
            if (hasSpokenRef.current) {
              const silenceElapsed = currentTime - lastSpeechTimeRef.current;
              if (silenceElapsed >= SILENCE_AFTER_SPEECH_MS) {
                reason = `🤫 4 segundos de silencio detectados tras hablar (${silenceElapsed}ms). Enviando consulta automáticamente...`;
              }
            } else if (currentTime - recordingStartTimeRef.current >= INITIAL_GRACE_MS) {
              reason = "⌛ 8s sin voz inicial detectada. Procesando...";
            }
          } else if (currentTime - recordingStartTimeRef.current >= NO_METERING_LIMIT_MS) {
            reason = "⏱️ Tiempo límite de grabación en fallback (6s). Procesando...";
          }
          if (!reason && currentTime - recordingStartTimeRef.current >= MAX_RECORDING_MS) {
            reason = "⏱️ Límite máximo de seguridad (25s). Procesando...";
          }

          if (reason) {
            console.log(reason);
            clearMonitor();
            finishRef.current();
          }
        } catch (monitorErr) {
          console.warn("Error en monitor de voz:", monitorErr);
        }
      }, MONITOR_INTERVAL_MS);
    } catch (err) {
      console.warn("Error iniciando grabación:", err);
      latestRef.current.onStartError(err);
    } finally {
      isStartingRef.current = false;
    }
  };

  // Cancelar sin enviar al servidor
  const cancel = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    clearMonitor();
    try {
      await audioRecorder.stop();
    } catch (e) {
      console.warn("Error cancelando grabación:", e);
    }
    setIsRecording(false);
    isStoppingRef.current = false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    latestRef.current.onCancelled();
  };

  // Cortar todo sin avisos (al reiniciar el viaje)
  const abort = () => {
    clearMonitor();
    if (isRecording) {
      audioRecorder.stop().catch(() => {});
      setIsRecording(false);
      isStoppingRef.current = false;
    }
  };

  // Al desmontar, detener el monitor
  useEffect(() => () => clearMonitor(), []);

  return { isRecording, start, finish, cancel, abort };
}
