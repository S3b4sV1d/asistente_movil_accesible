import { useEffect, useRef } from "react";
import { BackHandler } from "react-native";

/**
 * Registra el botón atrás de Android una sola vez y siempre llama al handler más reciente.
 * El handler devuelve `true` si consumió el evento y `false` para el comportamiento normal del sistema.
 *
 * @param {() => boolean} handler
 */
export default function useHardwareBack(handler) {
  const handlerRef = useRef(handler);
  useEffect(() => { handlerRef.current = handler; });

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => handlerRef.current?.() ?? false);
    return () => sub.remove();
  }, []);
}
