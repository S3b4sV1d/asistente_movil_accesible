import { useKeepAwake } from "expo-keep-awake";

// Mantiene la pantalla encendida mientras está montado.
// Se renderiza solo en las fases que dependen de GPS o sensores con la app abierta.
export default function KeepScreenOn() {
  useKeepAwake("trip");
  return null;
}
