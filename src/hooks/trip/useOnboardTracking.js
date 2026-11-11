import { useCallback, useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

const { nextArrivalAlert, MAX_ALERT_ACCURACY_M } = require("../../utils/travelSafety");
const { calculateHaversine } = require("../../utils/geo");

// Aviso de señal débil como máximo una vez por minuto
const WEAK_SIGNAL_WARN_INTERVAL_MS = 60000;
// Ignorar lecturas GPS más viejas que esto
const MAX_FIX_AGE_MS = 15000;

/**
 * Seguimiento GPS a bordo: distancia en línea recta al paradero de bajada y avisos de llegada.
 * Requiere la app abierta (no hay seguimiento en segundo plano).
 *
 * @param {object} options
 * @param {(text: string, priority?: boolean) => void} options.speak
 * @param {(coords: {lat: number, lon: number}) => void} options.onLocation  Cada lectura válida.
 * @param {() => void} options.onStarted  Validado el paradero; entrar en la fase a bordo.
 * @param {() => void} options.onFailed   No se pudo iniciar el GPS.
 */
export default function useOnboardTracking({ speak, onLocation, onStarted, onFailed }) {
  const [distanceRemaining, setDistanceRemaining] = useState(null);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [alert300Triggered, setAlert300Triggered] = useState(false);
  const [alert45Triggered, setAlert45Triggered] = useState(false);

  const subscriptionRef = useRef(null);
  const generationRef = useRef(0);
  const arrivalFlagsRef = useRef({ prepare: false, near: false });
  const weakSignalWarnedAtRef = useRef(0);

  const latestRef = useRef(null);
  useEffect(() => { latestRef.current = { speak, onLocation, onStarted, onFailed }; });

  // Detener el seguimiento y limpiar su estado
  const stop = useCallback(() => {
    generationRef.current += 1;
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
    arrivalFlagsRef.current = { prepare: false, near: false };
    weakSignalWarnedAtRef.current = 0;
    setDistanceRemaining(null);
    setGpsAccuracy(null);
    setAlert300Triggered(false);
    setAlert45Triggered(false);
  }, []);

  const start = async (route) => {
    const { speak: say } = latestRef.current;
    const alight = route?.walking_destination?.alighting_coord;
    if (!Array.isArray(alight) || alight.length !== 2 || !alight.every(Number.isFinite)) {
      say("No hay un paradero de bajada válido para iniciar el seguimiento.", true);
      return;
    }
    stop();
    const generation = generationRef.current;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    latestRef.current.onStarted();

    const destRef = route?.walking_destination?.reference || "tu destino";
    say(`Modo a bordo iniciado. Monitoreando viaje hacia ${destRef}. Mantén la aplicación abierta; la pantalla se quedará encendida. Te avisaremos al estar cerca del paradero, según la precisión del GPS.`, true);

    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 2000
        },
        (loc) => {
          if (generation !== generationRef.current) return;
          if (!Number.isFinite(loc.timestamp) || Math.abs(Date.now() - loc.timestamp) > MAX_FIX_AGE_MS) return;
          const { speak: sayNow, onLocation: reportLocation } = latestRef.current;
          const lat = loc.coords.latitude;
          const lon = loc.coords.longitude;
          reportLocation({ lat, lon });
          setGpsAccuracy(Number.isFinite(loc.coords.accuracy) ? Math.round(loc.coords.accuracy) : null);

          // Con señal débil los avisos de bajada se retienen: decirlo
          if (Number.isFinite(loc.coords.accuracy) && loc.coords.accuracy > MAX_ALERT_ACCURACY_M
              && Date.now() - weakSignalWarnedAtRef.current > WEAK_SIGNAL_WARN_INTERVAL_MS) {
            weakSignalWarnedAtRef.current = Date.now();
            sayNow("Señal GPS débil. Los avisos de bajada se pausan hasta que mejore; mantente atento a tu paradero.");
          }

          const dist = calculateHaversine(lat, lon, alight[0], alight[1]);
          setDistanceRemaining(Math.round(dist));

          const arrival = nextArrivalAlert(arrivalFlagsRef.current, dist, loc.coords.accuracy);
          if (arrival === "prepare") {
            arrivalFlagsRef.current.prepare = true;
            setAlert300Triggered(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            sayNow(`Atención: estás a unos ${Math.round(dist)} metros en línea recta de tu paradero de bajada ${destRef}. Prepárate para timbrar o avisar al chofer.`, true);
          } else if (arrival === "near") {
            arrivalFlagsRef.current.near = true;
            setAlert45Triggered(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            sayNow(`Tu paradero está cerca, a unos ${Math.round(dist)} metros en línea recta. Confirma con el conductor dónde detenerse antes de descender.`, true);
          }
        }
      );
      if (generation !== generationRef.current) { sub.remove(); return; }
      subscriptionRef.current = sub;
    } catch (e) {
      if (generation !== generationRef.current) return;
      latestRef.current.onFailed();
      latestRef.current.speak("No se pudo iniciar el seguimiento GPS. Revisa los permisos y vuelve a intentarlo.", true);
      console.warn("GPS error:", e);
    }
  };

  // Al desmontar, soltar la suscripción GPS
  useEffect(() => () => {
    generationRef.current += 1;
    subscriptionRef.current?.remove();
  }, []);

  return {
    distanceRemaining,
    gpsAccuracy,
    weakSignal: gpsAccuracy !== null && gpsAccuracy > MAX_ALERT_ACCURACY_M,
    alert300Triggered,
    alert45Triggered,
    start,
    stop,
  };
}
