import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import { predictVehicle } from "../../services/assistantApi";

const { updateEvidence } = require("../../utils/travelSafety");

const SCAN_INTERVAL_MS = 250;             // pausa mínima de 250 ms entre cuadros: reacción inmediata
const SAME_VEHICLE_QUIET_MS = 10000;      // no repetir el mismo vehículo antes de esto
const HEARTBEAT_INTERVAL_MS = 3500;       // vibración suave: el radar sigue vivo
const ERROR_ANNOUNCE_INTERVAL_MS = 15000; // no repetir el aviso de error antes de esto
const EMPTY_EVIDENCE = { classId: null, count: 0, at: 0 };

/**
 * Radar de cámara: toma un cuadro periódicamente, lo envía al reconocimiento y avisa
 * solo cuando el mismo vehículo se confirma en varios cuadros seguidos.
 *
 * @param {object} options
 * @param {boolean} options.enabled  Fase de cámara activa y app en primer plano.
 * @param {string | null} options.routeId  Ruta del usuario, para saber si el vehículo es el suyo.
 * @param {(text: string, priority?: boolean) => void} options.speak
 */
export default function useVehicleRadar({ enabled, routeId, speak }) {
  const cameraRef = useRef(null);
  const [radarActive, setRadarActive] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [analysisText, setAnalysisText] = useState("Apunta hacia la pista para ver el micro o combi.");

  const isProcessingFrameRef = useRef(false);
  const lastSpokenVehicleRef = useRef(null);
  const lastSpokenTimeRef = useRef(0);
  const lastHeartbeatTimeRef = useRef(0);
  const evidenceRef = useRef(EMPTY_EVIDENCE);
  const generationRef = useRef(0);
  const requestRef = useRef(null);
  const lastErrorRef = useRef(0);

  // Cancelar el cuadro en curso y descartar la evidencia acumulada
  const abort = () => {
    generationRef.current += 1;
    requestRef.current?.abort();
    evidenceRef.current = EMPTY_EVIDENCE;
  };

  // Preparar un escaneo nuevo al entrar en la fase de cámara
  const begin = () => {
    setRadarActive(true);
    lastSpokenVehicleRef.current = null;
    lastSpokenTimeRef.current = 0;
    lastHeartbeatTimeRef.current = 0;
    evidenceRef.current = EMPTY_EVIDENCE;
    setCameraReady(false);
    setAnalysisText("Radar activo: escaneando la calle en tiempo real...");
  };

  const toggle = () => {
    const next = !radarActive;
    if (!next) abort();
    setRadarActive(next);
    if (next) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      speak("Radar continuo reanudado. Escaneando la pista.");
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      speak("Radar continuo pausado.");
    }
  };

  const onCameraReady = () => setCameraReady(true);
  const onMountError = () => {
    setCameraReady(false);
    setAnalysisText("No se pudo iniciar la cámara.");
    speak("No se pudo iniciar la cámara.", true);
  };
  // La cámara se volverá a montar: esperar a que avise que está lista
  const resetCameraReady = () => setCameraReady(false);

  const scanFrame = async () => {
    if (!cameraRef.current || !cameraReady || isProcessingFrameRef.current) return;
    if (!enabled || !radarActive) return;

    const generation = generationRef.current;
    const controller = new AbortController();
    requestRef.current = controller;
    isProcessingFrameRef.current = true;
    let photo;
    try {
      photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: true,
        skipProcessing: false,
        shutterSound: false
      });

      if (!photo || !photo.base64) {
        isProcessingFrameRef.current = false;
        return;
      }

      if (generation !== generationRef.current || controller.signal.aborted) return;

      const result = await predictVehicle(photo.base64, routeId, { signal: controller.signal });
      if (generation !== generationRef.current || controller.signal.aborted) return;
      if (result.status !== "success") throw new Error(result.message || "Reconocimiento no disponible");
      const now = Date.now();
      evidenceRef.current = updateEvidence(evidenceRef.current, result, now);

      if (result.is_vehicle) {
        const letterOrLine = result.letter_or_number || result.route_code || "";
        const vehicleKey = `${result.class_id}`;
        const timeSinceLastSpoken = now - lastSpokenTimeRef.current;

        // Confirmación inmediata si coincide con la ruta esperada o si la certeza es alta (>= 80%)
        const isConfirmed = evidenceRef.current.confirmed || (result.matches_user_route || result.confidence >= 80);

        if (!isConfirmed) {
          setAnalysisText("Comprobando la identificación en varios cuadros...");
          return;
        }
        setAnalysisText(`Detectado: ${result.company_name} - ${letterOrLine} (${result.confidence}%)`);

        // Mismo vehículo hace poco: solo vibración suave, sin repetir audio
        if (lastSpokenVehicleRef.current === vehicleKey && timeSinceLastSpoken < SAME_VEHICLE_QUIET_MS) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          lastSpokenVehicleRef.current = vehicleKey;
          lastSpokenTimeRef.current = now;

          let msg;
          if (result.speech_text && result.speech_text.length > 5) {
            msg = result.speech_text;
          } else if (result.matches_user_route) {
            msg = `¡Atención! Este es tu vehículo: ${result.company_name}, ${letterOrLine}. Confirma la línea y el sentido con el conductor.`;
          } else {
            msg = `Identifico: ${result.company_name}, ${letterOrLine}. No es tu carro asignado.`;
          }
          speak(msg, true);
        }
      } else {
        // Calle, vereda o interiores: vibración suave periódica para saber que el radar sigue vivo
        if (now - lastHeartbeatTimeRef.current > HEARTBEAT_INTERVAL_MS) {
          Haptics.selectionAsync();
          lastHeartbeatTimeRef.current = now;
        }
        setAnalysisText(result.uncertain ? "No puedo identificar la línea con suficiente certeza." : "Radar activo: sin vehículo identificado.");
      }
    } catch (_e) {
      if (generation !== generationRef.current || controller.signal.aborted) return;
      evidenceRef.current = EMPTY_EVIDENCE;
      setAnalysisText("Reconocimiento no disponible. Comprobando conexión con el servidor.");
      if (Date.now() - lastErrorRef.current > ERROR_ANNOUNCE_INTERVAL_MS) {
        lastErrorRef.current = Date.now();
        speak("Reconocimiento no disponible. Revisa la conexión con el servidor.", true);
      }
    } finally {
      if (photo?.uri) FileSystem.deleteAsync(photo.uri, { idempotent: true }).catch(() => {});
      if (requestRef.current === controller) requestRef.current = null;
      isProcessingFrameRef.current = false;
    }
  };

  const scanFrameRef = useRef(scanFrame);
  useEffect(() => { scanFrameRef.current = scanFrame; });

  // Bucle del radar: se programa secuencialmente para evitar ráfagas y parpadeos
  useEffect(() => {
    let timerId = null;
    let isMounted = true;

    const scheduleNextScan = () => {
      if (!isMounted || !enabled || !radarActive || !cameraReady) return;
      timerId = setTimeout(async () => {
        if (!isMounted || !enabled || !radarActive || !cameraReady) return;
        try {
          await scanFrameRef.current?.();
        } finally {
          if (isMounted && enabled && radarActive && cameraReady) {
            scheduleNextScan();
          }
        }
      }, SCAN_INTERVAL_MS);
    };

    if (enabled && radarActive && cameraReady) {
      scheduleNextScan();
    }

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
      generationRef.current += 1;
      requestRef.current?.abort();
      evidenceRef.current = EMPTY_EVIDENCE;
    };
  }, [enabled, radarActive, routeId, cameraReady]);

  return {
    cameraRef,
    radarActive,
    analysisText,
    begin,
    abort,
    toggle,
    onCameraReady,
    onMountError,
    resetCameraReady,
  };
}
