/**
 * Pantalla única del viaje. Orquesta las fases (destino → ruta → paradero → vehículo → a bordo):
 * decide qué se le dice al usuario y a qué fase pasar, y delega la mecánica en los hooks
 * (voz, brújula, radar de cámara, GPS a bordo, permisos y accesibilidad).
 */
import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Speech from "expo-speech";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";

import HeaderBar from "../components/layout/HeaderBar";
import VoiceCard from "../components/cards/VoiceCard";
import ConfirmOriginCard from "../components/cards/ConfirmOriginCard";
import RouteCard from "../components/cards/RouteCard";
import CompassCard from "../components/cards/CompassCard";
import RadarCameraCard from "../components/cards/RadarCameraCard";
import OnboardCard from "../components/cards/OnboardCard";
import BottomDock from "../components/layout/BottomDock";
import StepIndicator from "../components/ui/StepIndicator";
import TextQueryCard from "../components/cards/TextQueryCard";
import KeepScreenOn from "../components/ui/KeepScreenOn";
import useAnnouncer from "../hooks/accessibility/useAnnouncer";
import usePhaseFocus from "../hooks/accessibility/usePhaseFocus";
import useAppActive from "../hooks/device/useAppActive";
import useHardwareBack from "../hooks/device/useHardwareBack";
import usePermissions from "../hooks/device/usePermissions";
import useVoiceRecorder from "../hooks/trip/useVoiceRecorder";
import useCompass from "../hooks/trip/useCompass";
import useVehicleRadar from "../hooks/trip/useVehicleRadar";
import useOnboardTracking from "../hooks/trip/useOnboardTracking";
import { Colors, Spacing } from "../theme/tokens";

import { PHASES, KEEP_AWAKE_PHASES, QUERY_PHASES } from "../config/phases";
import {
  newSession,
  resetSession,
  sendQuery,
  transcribeVoice,
} from "../services/assistantApi";
import { BACK_CONFIRM_WINDOW_MS } from "../config/timing";

const { walkingBearing } = require("../utils/geo");

// Mensajes de error de captura de audio
const CAPTURE_ERROR_MESSAGES = {
  no_audio: "Hubo un problema al capturar el audio. Por favor toca nuevamente el botón grande de abajo.",
  error: "Hubo un problema al capturar el audio. Por favor toca nuevamente el botón grande de abajo.",
  empty: "No se detectó audio en la grabación. Por favor habla tu destino.",
};

export default function TripScreen() {
  // Fases: IDLE -> (CONFIRM_ORIGIN) -> ROUTE_FOUND -> (COMPASS_WALKING) -> CAMERA_DETECTION -> ONBOARD_GPS
  const [appPhase, setAppPhase] = useState(PHASES.IDLE);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [pendingOrigin, setPendingOrigin] = useState(null);
  const [speechText, setSpeechText] = useState("Toca el botón grande de abajo para decir a dónde deseas viajar.");
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  // Entrada escrita del destino (alternativa a la voz)
  const [showTextInput, setShowTextInput] = useState(false);

  // Canal único de voz (TTS o lector de pantalla). La escucha automática llama a startRecordingRef.
  const startRecordingRef = useRef(null);
  const {
    speak: speakAccessible,
    stopSpeaking,
    screenReaderOn,
    screenReaderRef,
  } = useAnnouncer({ autoListenRef: startRecordingRef });
  // Título de la tarjeta de la fase actual; recibe el foco del lector al cambiar de fase
  const phaseHeadingRef = usePhaseFocus(appPhase, screenReaderRef);
  const appIsActive = useAppActive();

  // Permisos y primera ubicación GPS; los mensajes al usuario se deciden aquí
  const gpsOffWarnedRef = useRef(false);
  const {
    hasMicPermission,
    hasLocationPermission,
    gpsStatusText,
    gpsState,
    cameraPermission,
    requestCameraPermission,
  } = usePermissions({
    hasLocationFix: !!userLocation,
    onLocation: setUserLocation,
    onMissing: (missing) => {
      const warnSpeech = `Atención: Falta conceder el permiso de ${missing.join(" ni de ")}. Sin estos permisos la aplicación no puede escucharte ni saber desde dónde sales. Por favor actívalos.`;
      setSpeechText(warnSpeech);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      speakAccessible(warnSpeech, true);
    },
    onGpsOff: () => {
      gpsOffWarnedRef.current = true;
      speakAccessible("El GPS de tu teléfono está apagado. Actívalo en la barra superior de tu celular para que sepamos automáticamente desde dónde viajas.");
    },
    onReady: () => {
      const welcome = "Bienvenido a Transporte Trujillo. ¿A dónde deseas viajar hoy? Dime tu destino.";
      setSpeechText(welcome);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Si se acaba de avisar del GPS apagado, ponerse en cola en lugar de cortar ese aviso
      speakAccessible(welcome, !gpsOffWarnedRef.current, true);
      gpsOffWarnedRef.current = false;
    },
  });

  // Monitoreo continuo de ubicación en vivo mientras la app tenga permiso y esté activa
  useEffect(() => {
    let sub = null;
    let isMounted = true;

    async function startContinuousGps() {
      if (!hasLocationPermission || !appIsActive) return;
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) return;

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 3,
          },
          (loc) => {
            if (isMounted && loc?.coords) {
              const { latitude, longitude, accuracy } = loc.coords;
              setUserLocation({ lat: latitude, lon: longitude, accuracy });
            }
          }
        );
      } catch (err) {
        console.warn("Error en watchPosition continuo de TripScreen:", err);
      }
    }

    startContinuousGps();

    return () => {
      isMounted = false;
      if (sub) {
        sub.remove();
      }
    };
  }, [hasLocationPermission, appIsActive]);

  // =========================================================================
  // PASO 1: CONSULTA POR VOZ O TEXTO
  // =========================================================================
  const coordsOrNull = () => (userLocation ? [userLocation.lat, userLocation.lon] : null);

  // Coordenadas para la consulta por voz; si aún no hay, intentar obtenerlas rápido
  const resolveQueryCoords = async () => {
    const coords = coordsOrNull();
    if (coords) return coords;
    try {
      const lastLoc = await Location.getLastKnownPositionAsync();
      if (lastLoc?.coords) {
        setUserLocation({ lat: lastLoc.coords.latitude, lon: lastLoc.coords.longitude });
        return [lastLoc.coords.latitude, lastLoc.coords.longitude];
      }
      const locPromise = Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("GPS timeout")), 6000));
      const curLoc = await Promise.race([locPromise, timeoutPromise]);
      if (curLoc?.coords) {
        setUserLocation({ lat: curLoc.coords.latitude, lon: curLoc.coords.longitude });
        return [curLoc.coords.latitude, curLoc.coords.longitude];
      }
    } catch (e) {
      console.warn("GPS High no disponible al transcribir, intentando Balanced:", e);
      try {
        const bLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (bLoc?.coords) {
          setUserLocation({ lat: bLoc.coords.latitude, lon: bLoc.coords.longitude });
          return [bLoc.coords.latitude, bLoc.coords.longitude];
        }
      } catch (_bErr) {}
    }
    return null;
  };

  const voice = useVoiceRecorder({
    screenReaderRef,
    onPermissionDenied: () => {
      const noMic = "No se puede escuchar sin el permiso de micrófono. Por favor actívalo en los ajustes de tu celular.";
      setSpeechText(noMic);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      speakAccessible(noMic, true);
    },
    onStarted: () => {
      setSpeechText(appPhase === PHASES.CONFIRM_ORIGIN
        ? "Te escucho: di 'Sí' para confirmar o dicta tu calle de salida."
        : "Te escucho... Di a dónde deseas viajar.");
    },
    onProcessing: () => {
      setIsLoading(true);
      setSpeechText("Buscando las mejores rutas hacia tu destino...");
      speakAccessible("Procesando tu consulta...");
    },
    onAudio: async (audioBase64) => {
      const coords = await resolveQueryCoords();
      console.log("📍 Coordenadas a enviar en la consulta:", coords);
      try {
        const data = await transcribeVoice(audioBase64, coords);
        setIsLoading(false);
        handleAssistantReply(data, { autoListen: true });
      } catch (_e) {
        setIsLoading(false);
        const errNet = "No se pudo conectar con el servidor de rutas. Intenta nuevamente.";
        setSpeechText(errNet);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        speakAccessible(errNet, true, true);
      }
    },
    onCaptureError: (kind) => {
      setIsLoading(false);
      const msg = CAPTURE_ERROR_MESSAGES[kind];
      setSpeechText(msg);
      speakAccessible(msg, true, true);
    },
    onCancelled: () => {
      const msg = "Grabación cancelada. Toca el botón grande de abajo cuando quieras hablar.";
      setSpeechText(msg);
      speakAccessible(msg, true);
    },
    onStartError: () => {
      const errRec = "No se pudo iniciar el micrófono. Por favor verifica los permisos en tu celular.";
      setSpeechText(errRec);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      speakAccessible(errRec, true);
    },
  });

  useEffect(() => {
    startRecordingRef.current = voice.start;
  });

  // Interpretar la respuesta del asistente (voz o texto) y pasar a la fase que corresponda.
  // `autoListen`: volver a escuchar tras la respuesta (solo tiene sentido en el flujo por voz).
  const handleAssistantReply = (data, { autoListen }) => {
    if (data.type === "confirm_origin" && data.pending_origin) {
      setPendingOrigin(data.pending_origin);
      setSpeechText(data.speech_text);
      setAppPhase(PHASES.CONFIRM_ORIGIN);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      speakAccessible(data.speech_text, true, autoListen);
    } else if (data.type === "companion_accepted") {
      setSpeechText(data.speech_text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      speakAccessible(data.speech_text, true);
    } else if (data.type === "companion_declined") {
      setSpeechText(data.speech_text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      speakAccessible(data.speech_text, true);
    } else if ((data.status === "success" || data.type === "route_found" || data.type === "transfer_route_found" || data.best_route) && data.best_route) {
      setPendingOrigin(null);
      const routePayload = data.is_transfer && data.transfer_data
        ? { ...data.best_route, is_transfer: true, transfer_data: data.transfer_data }
        : data.best_route;
      setCurrentRoute(routePayload);
      setSpeechText(data.speech_text);
      setShowTextInput(false);
      setAppPhase(PHASES.ROUTE_FOUND);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      speakAccessible(data.speech_text, true, autoListen);
    } else if (data.type === "session_reset") {
      resetSessionAndReturn();
    } else if (data.type === "awaiting_origin" || data.type === "awaiting_destination" || data.type === "origin_not_found") {
      setPendingOrigin(null);
      setAppPhase(PHASES.IDLE);
      const reply = data.speech_text || "Por favor indícame la calle o lugar exacto desde donde estás saliendo.";
      setSpeechText(reply);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      speakAccessible(reply, true, autoListen);
    } else {
      setPendingOrigin(null);
      const reply = data.speech_text || "No alcancé a entenderte bien. Dime tu destino o calle de salida.";
      setSpeechText(reply);
      speakAccessible(reply, true, autoListen);
    }
  };

  // Consulta escrita: alternativa a la voz (personas sordas o sin habla, lugares ruidosos)
  const sendTextQuery = async (query) => {
    const text = query.trim();
    if (!text || isLoading) return false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Speech.stop();
    setIsLoading(true);
    setSpeechText("Buscando las mejores rutas hacia tu destino...");
    try {
      const data = await sendQuery(text, coordsOrNull());
      setIsLoading(false);
      handleAssistantReply(data, { autoListen: false });
      return true;
    } catch (e) {
      setIsLoading(false);
      console.warn("Error en consulta escrita:", e);
      const errNet = "No se pudo conectar con el servidor de rutas. Intenta nuevamente.";
      setSpeechText(errNet);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      speakAccessible(errNet, true);
      return false;
    }
  };

  // Confirmar origen por botón táctil accesible
  const confirmPendingOrigin = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsLoading(true);
      const waitMsg = "Confirmando origen. Buscando el carro recomendado...";
      setSpeechText(waitMsg);
      speakAccessible(waitMsg);

      const data = await sendQuery("sí, es correcto", coordsOrNull());
      setIsLoading(false);

      if (data.status === "success" && data.best_route) {
        setPendingOrigin(null);
        setCurrentRoute(data.best_route);
        setSpeechText(data.speech_text);
        setAppPhase(PHASES.ROUTE_FOUND);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        speakAccessible(data.speech_text, true);
      } else {
        const reply = data.speech_text || "No se pudo confirmar. Inténtalo de nuevo.";
        setSpeechText(reply);
        speakAccessible(reply, true);
      }
    } catch (e) {
      setIsLoading(false);
      console.warn("Error confirmando origen:", e);
      const errNet = "Error conectando con el servidor. Toca el botón nuevamente.";
      setSpeechText(errNet);
      speakAccessible(errNet, true);
    }
  };

  // =========================================================================
  // PASOS 2–4: BRÚJULA, RADAR DE CÁMARA Y SEGUIMIENTO A BORDO
  // =========================================================================
  const compass = useCompass({ speak: speakAccessible });

  const radar = useVehicleRadar({
    enabled: appPhase === PHASES.CAMERA_DETECTION && appIsActive,
    routeId: currentRoute?.route_id || null,
    speak: speakAccessible,
  });

  const onboard = useOnboardTracking({
    speak: speakAccessible,
    onLocation: setUserLocation,
    onStarted: () => setAppPhase(PHASES.ONBOARD_GPS),
    onFailed: () => {
      radar.resetCameraReady();
      setAppPhase(PHASES.CAMERA_DETECTION);
    },
  });

  const startCompassModule = () => {
    if (!currentRoute) return;
    const walk = currentRoute.walking_origin;
    const bearing = walkingBearing(walk, userLocation);

    // Sin rumbo válido la brújula apuntaría al norte sin motivo: avisar y no entrar en la fase
    if (bearing === null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const noBearing = "No tengo la ubicación exacta del paradero para guiarte con la brújula. Pide orientación a una persona cercana y, al llegar al paradero, toca el botón Ver carro.";
      setSpeechText(noBearing);
      speakAccessible(noBearing, true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setAppPhase(PHASES.COMPASS_WALKING);
    const destination = walk?.reference ? `: ${walk.reference}` : "";
    speakAccessible(`Brújula sonora de caminata activa. Sostén tu teléfono frente a ti y gira tu cuerpo lentamente. Cuando sientas una vibración firme, habrás encontrado la dirección hacia tu paradero${destination}.`, true);
    compass.start(bearing);
  };

  const startCameraModule = async () => {
    if (!cameraPermission?.granted) {
      const { granted } = await requestCameraPermission();
      if (!granted) {
        speakAccessible("Se requiere permiso de cámara para reconocer los vehículos.");
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    radar.begin();
    setAppPhase(PHASES.CAMERA_DETECTION);
    speakAccessible("Radar continuo activado con cámara trasera. Sostén tu teléfono apuntando hacia la pista. El sistema intentará identificar empresas y líneas visibles y te avisará por voz. Confirma siempre la línea y el sentido con el conductor.", true);
  };

  // Volver a la ficha de la ruta desde brújula, cámara o modo a bordo, sin perder la ruta
  const returnToRoute = () => {
    if (!currentRoute) return;
    compass.stop();
    onboard.stop();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAppPhase(PHASES.ROUTE_FOUND);
    const msg = `Volviste a tu ruta: ${currentRoute.company_name}, ${currentRoute.route_code}.`;
    setSpeechText(msg);
    speakAccessible(msg, true);
  };

  // Reiniciar viaje / Regresar al inicio en cualquier momento.
  // También se usa al finalizar el viaje, con su propio mensaje y sin escucha automática.
  const resetSessionAndReturn = async ({
    message = "Ruta reiniciada. ¿A dónde deseas viajar? Dime tu destino.",
    offlineMessage = "Viaje cancelado en el teléfono. No hay conexión con el servidor; vuelve a intentarlo cuando se restablezca.",
    autoListen = true,
  } = {}) => {
    // Un viaje cancelado nunca reutiliza el estado del servidor, aunque el reinicio falle sin conexión
    newSession();
    try {
      onboard.stop();
      radar.abort();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Speech.stop();
      voice.abort();
      compass.stop();
      setAppPhase(PHASES.IDLE);
      setCurrentRoute(null);
      setPendingOrigin(null);
      setSpeechText(message);
      await resetSession();
      speakAccessible(message, true, autoListen);
    } catch (e) {
      setSpeechText(offlineMessage);
      speakAccessible(offlineMessage, true);
      console.warn("Error reiniciando sesión:", e);
    }
  };

  // =========================================================================
  // CONTROLES DE APOYO: REPETIR Y BOTÓN ATRÁS DE ANDROID
  // =========================================================================
  // Repetir el mensaje relevante de la fase actual
  const repeatLastMessage = () => {
    Haptics.selectionAsync();
    let text = speechText;
    if (appPhase === PHASES.COMPASS_WALKING) {
      text = compass.compassAdvice;
    } else if (appPhase === PHASES.CAMERA_DETECTION) {
      text = radar.analysisText;
    } else if (appPhase === PHASES.ONBOARD_GPS) {
      text = onboard.distanceRemaining !== null
        ? `Faltan unos ${onboard.distanceRemaining} metros en línea recta para tu paradero.`
        : "Todavía buscando señal GPS.";
    }
    speakAccessible(text, true);
  };

  // Atrás retrocede una fase en lugar de cerrar la app.
  // Las acciones que pierden progreso piden un segundo toque para confirmar.
  const backArmedAtRef = useRef(0);
  useHardwareBack(() => {
    if (showTextInput) {
      setShowTextInput(false);
      return true;
    }
    if (voice.isRecording) {
      voice.cancel();
      return true;
    }
    if (appPhase === PHASES.COMPASS_WALKING || appPhase === PHASES.CAMERA_DETECTION) {
      returnToRoute();
      return true;
    }
    if (appPhase === PHASES.ONBOARD_GPS || appPhase === PHASES.ROUTE_FOUND || appPhase === PHASES.CONFIRM_ORIGIN) {
      const now = Date.now();
      if (now - backArmedAtRef.current < BACK_CONFIRM_WINDOW_MS) {
        backArmedAtRef.current = 0;
        if (appPhase === PHASES.ONBOARD_GPS) returnToRoute();
        else resetSessionAndReturn();
        return true;
      }
      backArmedAtRef.current = now;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      speakAccessible(
        appPhase === PHASES.ONBOARD_GPS
          ? "¿Detener el seguimiento a bordo? Pulsa atrás otra vez para confirmar."
          : "¿Cancelar la ruta? Pulsa atrás otra vez para volver al inicio.",
        true
      );
      return true;
    }
    return false; // IDLE: comportamiento normal del sistema
  });

  const textInputAvailable = QUERY_PHASES.includes(appPhase);

  // Arriba y abajo los insets los aplican HeaderBar y BottomDock con su propio fondo
  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar barStyle="light-content" />
      {KEEP_AWAKE_PHASES.includes(appPhase) && <KeepScreenOn />}

      <HeaderBar
        gpsState={gpsState}
        gpsStatusText={userLocation ? "Ubicación GPS activa" : gpsStatusText}
        hasLocationPermission={hasLocationPermission}
        requireResetConfirm={appPhase !== PHASES.IDLE}
        onResetArmed={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          speakAccessible("¿Reiniciar? Se cancelará el viaje actual. Toca otra vez el botón Reiniciar para confirmar.", true);
        }}
        onResetSession={() => resetSessionAndReturn()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator appPhase={appPhase} />

        {/* Guía conversacional */}
        <VoiceCard
          speechText={speechText}
          isRecording={voice.isRecording}
          hasMicPermission={hasMicPermission}
          hasLocationPermission={hasLocationPermission}
          currentRoute={currentRoute}
          appPhase={appPhase}
          headingRef={appPhase === PHASES.IDLE ? phaseHeadingRef : undefined}
        />

        {/* Entrada escrita: alternativa a la voz */}
        {textInputAvailable && showTextInput && (
          <TextQueryCard
            appPhase={appPhase}
            isLoading={isLoading}
            onSubmit={sendTextQuery}
            onClose={() => setShowTextInput(false)}
          />
        )}

        {/* Confirmación del origen detectado por GPS */}
        {appPhase === PHASES.CONFIRM_ORIGIN && pendingOrigin && (
          <ConfirmOriginCard
            pendingOrigin={pendingOrigin}
            headingRef={phaseHeadingRef}
            onConfirm={confirmPendingOrigin}
            onDictateDifferent={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              Speech.stop();
              const prompt = "Te escucho: dicta desde qué calle o punto estás saliendo.";
              setSpeechText(prompt);
              speakAccessible(prompt, true, true);
            }}
          />
        )}

        {/* Ruta recomendada */}
        {appPhase === PHASES.ROUTE_FOUND && currentRoute && (
          <RouteCard
            currentRoute={currentRoute}
            headingRef={phaseHeadingRef}
            onResetRoute={() => resetSessionAndReturn()}
          />
        )}

        {/* Brújula hacia el paradero */}
        {appPhase === PHASES.COMPASS_WALKING && (
          <CompassCard
            compassHeading={compass.compassHeading}
            targetBearing={compass.targetBearing}
            compassAligned={compass.compassAligned}
            compassAdvice={compass.compassAdvice}
            remainingMeters={currentRoute?.walking_origin?.distance_meters}
            headingRef={phaseHeadingRef}
          />
        )}

        {/* Radar de cámara trasera */}
        {appPhase === PHASES.CAMERA_DETECTION && (
          <RadarCameraCard
            cameraRef={radar.cameraRef}
            radarActive={radar.radarActive}
            cameraAnalysisText={radar.analysisText}
            headingRef={phaseHeadingRef}
            onCameraReady={radar.onCameraReady}
            onMountError={radar.onMountError}
            onToggleRadar={radar.toggle}
          />
        )}

        {/* Seguimiento a bordo */}
        {appPhase === PHASES.ONBOARD_GPS && (
          <OnboardCard
            distanceRemaining={onboard.distanceRemaining}
            gpsAccuracy={onboard.gpsAccuracy}
            weakSignal={onboard.weakSignal}
            alert300Triggered={onboard.alert300Triggered}
            alert45Triggered={onboard.alert45Triggered}
            headingRef={phaseHeadingRef}
          />
        )}
      </ScrollView>

      <BottomDock
        appPhase={appPhase}
        isRecording={voice.isRecording}
        isLoading={isLoading}
        screenReaderOn={screenReaderOn}
        textInputAvailable={textInputAvailable}
        showTextInput={showTextInput}
        onToggleTextInput={() => setShowTextInput((v) => !v)}
        onRepeat={repeatLastMessage}
        onStopSpeaking={stopSpeaking}
        onCancelRecording={voice.cancel}
        onReturnToRoute={returnToRoute}
        onPressMic={voice.isRecording ? voice.finish : voice.start}
        onStartCompass={startCompassModule}
        onStartCamera={startCameraModule}
        onStopCompassAndCamera={() => {
          compass.stop();
          startCameraModule();
        }}
        onStartOnboard={() => onboard.start(currentRoute)}
        onFinishTrip={() => {
          // Libera GPS y brújula, y limpia la ruta, igual que un reinicio
          const finishMsg = "Viaje finalizado. Toca el botón de abajo cuando quieras planear otro viaje.";
          resetSessionAndReturn({ message: finishMsg, offlineMessage: finishMsg, autoListen: false });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.appBg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
});
