# Plan de mejora del frontend: accesibilidad y UX

Plan de trabajo para que la app sea usable por personas ciegas o con baja visión (con y sin lector de pantalla), además de personas sordas o en entornos ruidosos.

**Alcance:** solo frontend (`App.js`, `src/components/`, `src/theme/`). No cambiar contratos con el backend (sesión, `/api/voice/transcribe`, `/api/query`, `/api/vision/predict`, `/api/session/reset`). El GPS sigue requiriendo la app abierta; no prometer seguimiento en segundo plano.

**Estado:** marcar `[x]` al completar cada tarea.

> **Rutas actualizadas (reorganización R1–R8, ver `PLAN_REORGANIZACION_FRONTEND.md`).** Las tareas de abajo mencionan las rutas de cuando se hicieron. Equivalencias actuales:
> - Lógica que estaba en `App.js` → `src/screens/TripScreen.js` (orquestación y mensajes) y `src/hooks/` (`accessibility/`, `device/`, `trip/`).
> - `speakAccessible` → `src/hooks/accessibility/useAnnouncer.js`; foco por fase → `usePhaseFocus.js`; `useScreenReader` → `src/hooks/accessibility/`.
> - Componentes → `src/components/ui/`, `layout/` y `cards/`.
> - Constantes de tiempo → `src/config/timing.js`; fases y pasos → `src/config/phases.js`.

---

## Fase 1: Correcciones críticas

Errores que impiden compilar, usar la app con lector de pantalla o que dejan recursos activos.

- [x] **1.1 HeaderBar: quitar `expo-linking`.** `src/components/HeaderBar.js` importa `expo-linking`, que no está en `package.json` ni en el lockfile; el bundle falla. Usar `Linking.openSettings()` de `react-native`.
- [x] **1.2 HeaderBar: arreglar el color del punto GPS.** Hoy busca `"Activo"` en el texto, pero App envía `"Ubicación GPS activa"`, así que el punto queda rojo con el GPS funcionando. Pasar un prop `gpsState` (`active` | `searching` | `off` | `denied` | `pending`) calculado en App en lugar de comparar textos. Quitar el emoji 📍 del texto.
- [x] **1.3 HeaderBar: botones de 48dp como mínimo.** "Reiniciar" (~30dp) y "Activar GPS" (~22dp) son demasiado pequeños. Altura mínima de 48dp, con `hitSlop`.
- [x] **1.4 Confirmar "Reiniciar" en dos pasos.** Si hay un viaje en curso (fase distinta de `IDLE`), el primer toque arma la acción y anuncia "Toca otra vez para confirmar"; el segundo toque, dentro de 4 s, reinicia. En `IDLE` reinicia directamente.
- [x] **1.5 ConfirmOriginCard: botones enfocables.** Quitar `accessible` del contenedor (agrupaba los botones "Sí" y "No" en un solo elemento). Agrupar solo el bloque informativo. Quitar los imports sin uso (`Haptics`, `Speech`).
- [x] **1.6 RouteCard: botón enfocable.** Igual que en 1.5, para el botón "Cambiar destino".
- [x] **1.7 "Finalizar viaje" libera recursos.** Hoy solo cambia a `IDLE`: el GPS sigue activo y `currentRoute` se conserva. Reutilizar la limpieza de `resetSessionAndReturn` con un mensaje propio y sin escucha automática.
- [x] **1.8 Brújula sin destino válido.** `startCompassModule` usa `walk.reference` sin comprobar `walk` (la app se cierra), y si no hay ruta peatonal ni coordenada del paradero apunta al norte (rumbo 0) sin avisar. Validar antes de entrar en la fase y avisar por voz si no se puede guiar.

**Verificación:** `npx expo lint`, `npm run test:safety`, abrir la app y recorrer el flujo.

> Fase 1 completada. `test:safety` pasa. Pendiente: `npx expo lint` (requiere `npm install`) y prueba manual en un dispositivo.

---

## Fase 2: Base del sistema de diseño

- [x] **2.1 `src/theme/tokens.js`.** Un solo origen de colores, tipografía, espaciado y tamaños de toque. Sustituye a `colors.js` (tema oscuro sin uso).
  - Colores que cumplan WCAG AA (4.5:1 para texto normal):
    - Ámbar de los botones: `#D97706` → `#B45309` (con blanco pasa de 3.2:1 a 5:1).
    - Verde de los botones: `#16A34A` → `#15803D`.
    - Subtexto sobre azul: `#E2E8F0` → `#FFFFFF`.
  - Tipografía: cuerpo de 16px como mínimo, texto auxiliar de 14px como mínimo (hoy hay textos de 11–13px).
  - `minTouch: 56` para acciones principales y 48 para secundarias.
- [x] **2.2 `src/components/AccessibleButton.js`.** Basado en `Pressable`: estado visual al presionar, altura mínima, `hitSlop`, `accessibilityRole="button"`, `accessibilityState` (`disabled`, `busy`) y una etiqueta obligatoria sin emojis. Variantes: `primary`, `success`, `warning`, `danger`, `neutral`, `dark`.
- [x] **2.3 Migrar los componentes a tokens y a `AccessibleButton`.** HeaderBar, VoiceCard, RouteCard, CompassCard, RadarCameraCard, OnboardCard, BottomDock y ConfirmOriginCard.
- [x] **2.4 Emojis decorativos.** Que no los lea el lector de pantalla: `accessibilityLabel` explícito en cada contenedor o emoji en un `Text` aparte con `accessibilityElementsHidden` / `importantForAccessibility="no"`.
- [x] **2.5 El dock deja de ser absoluto.** `BottomDock` pasa al flujo flex y respeta el área segura inferior (`useSafeAreaInsets`). Así se elimina el `paddingBottom: 120` fijo, que tapa contenido con el texto grande del sistema.
- [x] **2.6 Limpieza.** Quitar los imports sin uso de `App.js` (`TouchableOpacity`, `ActivityIndicator`, `Linking`, `Dimensions`/`width`) y `LogBox.ignoreAllLogs(true)` (oculta errores reales; dejarlo solo para advertencias concretas si hace falta).

**Verificación:** lint; probar con el tamaño de fuente del sistema al 200 %; revisar contraste con Accessibility Scanner (Android).

> Fase 2 completada. `eslint App.js src` y `test:safety` pasan. `colors.js` eliminado (sin uso) y `LEEME_INTERFAZ.md` actualizado. Extra: el encabezado y el dock aplican los insets de área segura (arriba y abajo) con su propio fondo, para que los íconos de la barra de estado se vean con edge-to-edge. Pendiente: reinstalar dependencias (`@expo/cli` falta en `node_modules`) y probar en un dispositivo con texto grande.

---

## Fase 3: Lector de pantalla y voz

- [x] **3.1 Hook `useScreenReader()`** (`src/hooks/useScreenReader.js`): `AccessibilityInfo.isScreenReaderEnabled()` más el evento `screenReaderChanged`.
- [x] **3.2 Un solo canal de anuncio.** Hoy `speakAccessible` habla por TTS, además llama a `announceForAccessibility`, y la `VoiceCard` tiene `accessibilityLiveRegion="assertive"`: con TalkBack el mensaje suena hasta tres veces.
  - Sin lector: solo TTS (`expo-speech`).
  - Con lector: solo `announceForAccessibility` (respeta la velocidad que configuró el usuario). Quitar el live region assertive (o dejarlo `polite` solo en Android si no se anuncia por otra vía).
- [x] **3.3 Escucha automática con lector activo.** Desactivarla: el micrófono grabaría la voz de TalkBack o VoiceOver. Grabar solo al tocar el botón.
- [x] **3.4 Foco al cambiar de fase.** Llevar el foco del lector al título de la tarjeta nueva con `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(ref))`, tras un breve retraso para que se monte.
- [x] **3.5 Encabezados.** `accessibilityRole="header"` en los títulos de cada tarjeta, para navegar por encabezados.
- [x] **3.6 Instrucciones sin depender del color.** Cambiar "Toca el botón azul" por "Toca el botón Hablar, abajo de la pantalla" (`App.js` y `VoiceCard.js`).
- [x] **3.7 Brújula más clara.**
  - Indicaciones por reloj o por escala: "un poco a tu derecha" (<45°), "a tu derecha" (45–135°), "date la vuelta" (>135°). Se puede añadir "a tus 3 en punto".
  - "Rumbo alineado" se dice una vez al alinearse y otra solo si se pierde y se recupera la alineación; mientras tanto, solo vibración.
  - Las indicaciones de giro se anuncian con un mínimo de 2–3 s entre una y otra.
- [x] **3.8 Estado del botón de micrófono.** `accessibilityState={{ busy: isLoading, disabled: isLoading }}` y bloquear el toque mientras se procesa (hoy se puede iniciar otra grabación a mitad de la petición). Mostrar el texto "Procesando…" junto al spinner.

**Verificación:** recorrer las 4 fases con TalkBack (Android) y VoiceOver (iOS) sin mirar la pantalla.

> Fase 3 completada (y 4.11). `eslint`, `test:safety` y `expo export` (Android) pasan. Decisiones: cada tarjeta tiene un título corto con rol de encabezado que recibe el foco (`sendAccessibilityEvent(ref, "focus")`, 350 ms tras el cambio de fase) y un bloque de detalles aparte; con lector activo los anuncios van con 800 ms de retraso y en cola, para no cortar la lectura del título; la grabación espera 1,2 s antes de empezar para no capturar la voz del lector. Los tiempos son estimados: **ajustarlos tras probar en un dispositivo real con TalkBack y VoiceOver.**

---

## Fase 4: Mejoras de uso

- [x] **4.1 Botón "Repetir".** Vuelve a decir el último mensaje (`speechText`). Siempre visible en el dock o en la `VoiceCard`.
- [x] **4.2 Botón "Callar".** `Speech.stop()`.
- [x] **4.3 "Cancelar grabación".** Detiene la grabación sin enviarla al backend.
- [x] **4.4 Escribir el destino.** Un `TextInput` alternativo a la voz (personas sordas o sin habla, lugares ruidosos). Envía a `/api/query` con `{ query, coords }`, igual que `confirmPendingOrigin`, y maneja la misma respuesta (`confirm_origin` o `success`).
- [x] **4.5 Indicador de paso.** "Paso 2 de 4: Ir al paradero", visible y leído por el lector.
  - Paso 1: Destino (`IDLE` y `CONFIRM_ORIGIN`)
  - Paso 2: Ruta / Caminar al paradero (`ROUTE_FOUND` y `COMPASS_WALKING`)
  - Paso 3: Identificar el vehículo (`CAMERA_DETECTION`)
  - Paso 4: A bordo (`ONBOARD_GPS`)
- [x] **4.6 Botón atrás de Android por fase** (`BackHandler`): `COMPASS_WALKING` → `ROUTE_FOUND` (detener la brújula); `CAMERA_DETECTION` → `ROUTE_FOUND`; `ONBOARD_GPS` → pedir confirmación; `IDLE` → comportamiento por defecto. Añadir también un botón visible "Volver a la ruta".
- [x] **4.7 Pantalla encendida a bordo.** `expo-keep-awake` (ya está en el lockfile como dependencia de `expo`; confirmar su API en la documentación de la v57 antes de usarlo). Activar en `ONBOARD_GPS` y opcionalmente en `CAMERA_DETECTION`/`COMPASS_WALKING`.
- [x] **4.8 Modo a bordo honesto.** Mostrar "en línea recta" junto a la distancia y la precisión del GPS (`±N m`). Si la precisión es mala, indicarlo.
- [x] **4.9 Cámara frontal.** Ocultar el botón para cambiar de cámara o moverlo a un control secundario: una persona ciega puede activarlo sin querer y quedar apuntando a su cara. El texto del botón ("Cámara Trasera") confunde estado con acción.
- [x] **4.10 Aviso de permisos con acción.** Añadir el botón "Abrir ajustes" en la tarjeta de permisos pendientes de `VoiceCard`, que cubra micrófono y GPS.
- [x] **4.11 Mensajes coherentes.** Los errores dicen "toca la pantalla nuevamente", pero solo funciona el botón. Unificar a "toca el botón Hablar".

**Verificación:** prueba en un dispositivo real (cámara, magnetómetro y GPS no funcionan bien en el emulador).

> Fase 4 completada. `eslint`, `test:safety`, `typecheck:safety`, `expo export` (Android) y `expo-doctor` (21/21) pasan. Extras: (a) al volver de Ajustes se revisan los permisos sin volver a pedirlos; (b) el modo a bordo avisa cuando la precisión del GPS supera `MAX_ALERT_ACCURACY_M` (35 m, ahora exportado desde `travelSafety.js`), porque en ese caso los avisos de bajada se retienen; (c) reiniciar durante una grabación ya la detiene; (d) atrás de Android: con grabación activa la cancela, en brújula o cámara vuelve a la ruta, y en ruta, origen o a bordo pide un segundo toque. Nueva dependencia: `expo-keep-awake` (instalada con `npx expo install`).

---

## Fase 5: Verificación final

- [ ] `npx expo lint`
- [ ] `npx tsc --noEmit` (o `npm run typecheck:safety`)
- [ ] `npm run test:safety`
- [ ] TalkBack: flujo completo sin mirar la pantalla.
- [ ] VoiceOver: flujo completo sin mirar la pantalla.
- [ ] Tamaño de fuente del sistema al máximo: nada cortado ni tapado.
- [ ] Accessibility Scanner (Android): sin errores de contraste ni de tamaño de toque.
- [ ] Prueba en la calle: ruido, sol directo (contraste) y una sola mano.

---

## Fuera de alcance por ahora

- **Migrar a Expo Router.** AGENTS.md lo pide, pero la app es una sola pantalla con una máquina de estados por fases; migrar ahora añade riesgo sin beneficio de accesibilidad. Revaluar cuando haya más pantallas (ajustes, historial).
- **Modo oscuro o de alto contraste.** Útil para baja visión; hacerlo después de la Fase 2, cuando los colores ya vivan en tokens.
- **Ajustes de usuario** (velocidad de voz, desactivar escucha automática, tamaño de texto propio): pantalla futura.
- **GPS en segundo plano:** no implementado; no prometerlo en la interfaz.
