import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Location from "expo-location";
import { useCameraPermissions } from "expo-camera";
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from "expo-audio";

/**
 * Permisos de micrófono, ubicación y cámara, y la primera ubicación GPS.
 *
 * - Al montar: pide los permisos (sin volver a pedir los ya concedidos) y busca la ubicación.
 * - Al volver de Ajustes: revisa los permisos que faltaban sin volver a pedirlos;
 *   si ya están todos, completa la inicialización.
 * - Los mensajes al usuario los decide quien usa el hook, mediante los callbacks.
 *
 * @param {object} options
 * @param {boolean} options.hasLocationFix  Si ya hay una ubicación conocida (para el estado del GPS).
 * @param {(coords: {lat: number, lon: number}) => void} options.onLocation
 * @param {(missing: string[]) => void} options.onMissing  Falta micrófono y/o ubicación.
 * @param {() => void} options.onGpsOff  Permiso concedido pero GPS apagado en el teléfono.
 * @param {() => void} options.onReady  Permisos listos; la app puede dar la bienvenida.
 */
export default function usePermissions({ hasLocationFix, onLocation, onMissing, onGpsOff, onReady }) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [permissionsChecked, setPermissionsChecked] = useState(false);
  const [gpsStatusText, setGpsStatusText] = useState("Localizando GPS...");
  const [gpsServicesOff, setGpsServicesOff] = useState(false);

  // Callbacks y estado más recientes para las funciones asíncronas
  const latestRef = useRef(null);
  useEffect(() => {
    latestRef.current = {
      onLocation, onMissing, onGpsOff, onReady,
      cameraPermission, requestCameraPermission,
      permissionsChecked, hasMicPermission, hasLocationPermission,
    };
  });

  const requestAll = async () => {
    const latest = latestRef.current;
    try {
      // 1. Micrófono
      const audioStatus = await requestRecordingPermissionsAsync();
      const micOk = audioStatus.status === "granted";
      setHasMicPermission(micOk);

      // 2. Ubicación (verificar o solicitar)
      let locationStatus = await Location.getForegroundPermissionsAsync();
      if (locationStatus.status !== "granted") {
        locationStatus = await Location.requestForegroundPermissionsAsync();
      }
      const locOk = locationStatus.status === "granted";
      setHasLocationPermission(locOk);

      // 3. Cámara
      if (!latest.cameraPermission?.granted) {
        await latest.requestCameraPermission();
      }

      setPermissionsChecked(true);

      if (!micOk || !locOk) {
        const missing = [];
        if (!micOk) missing.push("micrófono");
        if (!locOk) missing.push("ubicación GPS");
        setGpsStatusText("Permiso de GPS pendiente");
        latestRef.current.onMissing(missing);
        return false;
      }

      // 4. Con permiso: verificar que el GPS esté encendido y capturar coordenadas
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        setGpsServicesOff(!servicesEnabled);
        if (!servicesEnabled) {
          setGpsStatusText("GPS desactivado en ajustes");
          latestRef.current.onGpsOff();
        } else {
          setGpsStatusText("Conectando con satélites GPS...");
          // Última ubicación conocida: inmediata
          const lastLoc = await Location.getLastKnownPositionAsync();
          if (lastLoc?.coords) {
            latestRef.current.onLocation({ lat: lastLoc.coords.latitude, lon: lastLoc.coords.longitude });
            setGpsStatusText("GPS Activo: Ubicación detectada");
            console.log("📍 GPS inicial (lastKnown):", lastLoc.coords.latitude, lastLoc.coords.longitude);
          }

          // En paralelo, actualizar con coordenadas actuales de alta precisión satelital
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
            .then(curLoc => {
              if (curLoc?.coords) {
                latestRef.current.onLocation({ lat: curLoc.coords.latitude, lon: curLoc.coords.longitude });
                setGpsStatusText("GPS Activo: Ubicación detectada");
                console.log("📍 GPS preciso actualizado (High):", curLoc.coords.latitude, curLoc.coords.longitude);
              }
            })
            .catch(err => {
              console.log("GPS alta precisión falló, intentando Balanced:", err);
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
                .then(bLoc => {
                  if (bLoc?.coords) {
                    latestRef.current.onLocation({ lat: bLoc.coords.latitude, lon: bLoc.coords.longitude });
                    setGpsStatusText("GPS Activo: Ubicación detectada");
                  }
                })
                .catch(bErr => console.log("GPS Balanced falló:", bErr));
            });
        }
      } catch (gpsErr) {
        console.warn("Error capturando GPS inicial:", gpsErr);
      }

      latestRef.current.onReady();
      return true;
    } catch (err) {
      console.warn("Error solicitando permisos:", err);
      return false;
    }
  };

  const requestAllRef = useRef(requestAll);
  useEffect(() => { requestAllRef.current = requestAll; });

  // Pedir permisos al arrancar
  useEffect(() => {
    const startupTimer = setTimeout(() => requestAllRef.current(), 0);
    return () => clearTimeout(startupTimer);
  }, []);

  // Al volver de Ajustes, revisar si el usuario concedió los permisos que faltaban (sin volver a pedirlos)
  useEffect(() => {
    const recheck = async () => {
      const latest = latestRef.current;
      if (!latest.permissionsChecked || (latest.hasMicPermission && latest.hasLocationPermission)) return;
      const [mic, loc] = await Promise.all([
        getRecordingPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
      ]);
      if (mic.status === "granted" && loc.status === "granted") {
        // Ya no pedirá nada: completa la inicialización (GPS y bienvenida)
        requestAllRef.current();
      } else {
        setHasMicPermission(mic.status === "granted");
        setHasLocationPermission(loc.status === "granted");
      }
    };
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        recheck().catch((e) => console.warn("Error revisando permisos:", e));
      }
    });
    return () => subscription.remove();
  }, []);

  const gpsState = hasLocationFix
    ? "active"
    : !permissionsChecked
      ? "pending"
      : !hasLocationPermission
        ? "denied"
        : gpsServicesOff
          ? "off"
          : "searching";

  return {
    hasMicPermission,
    hasLocationPermission,
    gpsStatusText,
    gpsState,
    cameraPermission,
    requestCameraPermission,
  };
}
