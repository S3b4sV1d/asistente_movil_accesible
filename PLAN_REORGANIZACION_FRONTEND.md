# Plan de reorganización del frontend

Reorganizar el código sin cambiar el comportamiento de la app. Ninguna pantalla, mensaje, flujo ni contrato con el backend debe cambiar; solo dónde vive cada cosa.

**Estado:** marcar `[x]` al completar cada paso.

---

## Diagnóstico

| Archivo | Líneas | Problema |
|---|---|---|
| `App.js` | 1366 | Todo en un solo componente: ~25 estados, ~35 refs y la lógica de voz, texto, permisos, GPS, brújula, cámara, modo a bordo, botón atrás y accesibilidad. Difícil de leer, de probar y de cambiar sin romper otra cosa. |
| `src/components/` | 8–200 c/u | Tamaños razonables, pero 12 archivos en una sola carpeta mezclan piezas genéricas (botón), estructura (encabezado, dock) y tarjetas de cada fase. |
| `src/utils/` | — | Bien. `travelSafety.js` y `apiClient.js` ya están separados y probados. |

## Estructura propuesta

```
App.js                          ≈15 líneas: providers + <TripScreen />
src/
  screens/
    TripScreen.js               Orquestador: máquina de fases, compone hooks y tarjetas (≈250 líneas)
  config/
    backend.js                  URLs del backend (EXPO_PUBLIC_BACKEND_URLS) e id de sesión
    phases.js                   PHASES (mismos strings que hoy), pasos del indicador, fases con pantalla encendida
    timing.js                   Todos los tiempos: foco, anuncios, grabación, brújula, confirmación de atrás
  services/
    assistantApi.js             transcribeVoice, sendQuery, predictVehicle, resetSession, newSession
  hooks/
    accessibility/
      useScreenReader.js        (ya existe; se mueve)
      useAnnouncer.js           speak/announce con un solo canal, repetir, callar, escucha automática
      usePhaseFocus.js          foco del lector al título de la fase nueva
    device/
      useAppActive.js           AppState
      usePermissions.js         permisos iniciales, revisión al volver de Ajustes, estado del GPS
      useHardwareBack.js        botón atrás de Android con el handler más reciente
    trip/
      useVoiceRecorder.js       grabar, detección de silencio, cancelar, leer audio en base64
      useCompass.js             magnetómetro, indicaciones, alineación
      useVehicleRadar.js        bucle de cámara, evidencia en varios cuadros, avisos
      useOnboardTracking.js     watchPosition, distancia, precisión, avisos de bajada
  components/
    ui/                         Piezas genéricas reutilizables
      AccessibleButton.js
      StepIndicator.js
      KeepScreenOn.js
    layout/                     Estructura fija de la pantalla
      HeaderBar.js
      BottomDock.js
    cards/                      Una tarjeta por fase o función
      VoiceCard.js
      TextQueryCard.js
      ConfirmOriginCard.js
      RouteCard.js
      CompassCard.js
      RadarCameraCard.js
      OnboardCard.js
  theme/
    tokens.js                   (sin cambios)
  utils/                        (no se mueven: los usan tests/ y package.json)
    apiClient.js
    travelSafety.js
    geo.js                      calculateBearing, haversine (salen de App.js)
    compassGuidance.js          describeCompassTurn (sale de App.js)
tests/
  travelSafety.test.js          (sin cambios)
  compassGuidance.test.js       nuevo: indicaciones de la brújula
  geo.test.js                   nuevo: rumbo y distancia
```

### Por qué esta forma

- **Un hook por función del viaje.** Cada uno guarda sus propios refs y estados, expone `start`/`stop` y limpia sus suscripciones al desmontarse. `TripScreen` solo decide en qué fase está la app y qué hook arranca o detiene.
- **Las carpetas de `components/` siguen donde el diseñador las espera** (`LEEME_INTERFAZ.md`), solo agrupadas en subcarpetas.
- **`src/utils/` no se mueve:** `tests/travelSafety.test.js` y el script `typecheck:safety` dependen de esas rutas.
- **Lógica pura fuera de React** (`geo.js`, `compassGuidance.js`): se puede probar con `node --test`, como `travelSafety.js`.

### Cómo se coordinan los hooks

Varios módulos dependen entre sí. Para no reintroducir los problemas de closures que el código actual resuelve con refs:

| Dependencia | Solución |
|---|---|
| El anuncio con escucha automática necesita iniciar la grabación | `useAnnouncer` recibe `onAutoListen` como ref (patrón actual de `startRecordingRef`) |
| La grabación necesita saber si hay lector de pantalla | `useAnnouncer` expone `screenReaderRef`; `useVoiceRecorder` lo recibe |
| Reiniciar debe detener grabación, brújula, radar y GPS a bordo | Cada hook expone `stop()`; `TripScreen.resetTrip()` los llama a todos |
| Los callbacks de sensores leen el estado más reciente | Se mantiene el patrón actual: ref actualizada en `useEffect` sin dependencias |
| Nueva sesión al reiniciar | `assistantApi.newSession()` sustituye la reasignación de `apiFetch` en App.js |

---

## Pasos (cada uno deja la app funcionando)

Tras **cada** paso: `npx eslint App.js src`, `npm run test:safety`, `npx expo export --platform android` y abrir la app en Expo Go.

- [x] **R1. Configuración y lógica pura.** Crear `config/backend.js`, `config/phases.js` y `config/timing.js`; mover `calculateBearing` y `calculateHaversine` a `utils/geo.js` y `describeCompassTurn` a `utils/compassGuidance.js`. Agregar pruebas `tests/geo.test.js` y `tests/compassGuidance.test.js`, y sumarlas al script `test:safety`. *Riesgo: bajo.*
- [x] **R2. Servicio del asistente.** `services/assistantApi.js` envuelve `createApiClient` y expone las 4 llamadas con los mismos cuerpos JSON y endpoints, además de `newSession()`. *Riesgo: bajo.*
- [x] **R3. Mover componentes a subcarpetas.** `ui/`, `layout/` y `cards/`; actualizar imports y `LEEME_INTERFAZ.md`. Sin cambios de código. *Riesgo: muy bajo.*
> R1–R3 completados. `eslint`, `test:safety` (8 pruebas, 4 nuevas), `typecheck:safety` y `expo export` (Android) pasan. `App.js` bajó de 1366 a 1296 líneas; el grueso se reduce en R4–R7. Pendiente: probar la app en Expo Go antes de R4.

- [x] **R4. Hooks de accesibilidad.** `useAnnouncer` (de `speakAccessible`, `repeatLastMessage` y `stopSpeaking`) y `usePhaseFocus`; mover `useScreenReader`. *Riesgo: medio (canal de voz).*
- [x] **R5. Hooks de dispositivo.** `useAppActive`, `usePermissions` (permisos iniciales, revisión al volver, `gpsState`) y `useHardwareBack`. *Riesgo: medio.*
> R4–R5 completados. `eslint`, `test:safety` y `expo export` (Android) pasan; `App.js` en 1140 líneas. Notas: (a) `useAnnouncer` expone `speak`/`stopSpeaking`; decidir *qué* repetir sigue en el orquestador porque depende de la fase; (b) `usePermissions` no decide los mensajes: recibe callbacks (`onMissing`, `onGpsOff`, `onReady`, `onLocation`); (c) corrección: el aviso de GPS apagado ya no lo corta la bienvenida (antes se interrumpía al instante). Pendiente: probar en Expo Go antes de R6.

- [x] **R6. Hooks del viaje, uno por uno, del más aislado al más delicado.** Probar en el teléfono después de cada uno:
  1. `useOnboardTracking`
  2. `useCompass`
  3. `useVehicleRadar`
  4. `useVoiceRecorder` (detección de silencio, cancelación, retraso con lector de pantalla)

  *Riesgo: medio-alto; por eso van separados.*
> R6 completado. `eslint` (también con `no-undef`), `test:safety` (9 pruebas), `typecheck:safety` y `expo export` (Android) pasan; `App.js` en 582 líneas. Los 4 hooks solo manejan mecánica (sensores, temporizadores, estado y limpieza al desmontar); los mensajes y cambios de fase se quedan en el orquestador mediante callbacks. `walkingBearing` pasó a `utils/geo.js` con prueba. Cada hook limpia sus recursos al desmontar (antes lo hacía un solo efecto en App). Pendiente: probar en Expo Go el flujo completo antes de R7.

- [x] **R7. `TripScreen` y `App.js` mínimo.** Mover el resto de la orquestación (fases, `handleAssistantReply`, `sendTextQuery`, `confirmPendingOrigin`, `resetTrip`, `returnToRoute`, render) a `screens/TripScreen.js`. *Riesgo: medio.*
- [x] **R8. Documentación.** Actualizar `LEEME_INTERFAZ.md` con un mapa de carpetas de una línea por carpeta, y las rutas en `PLAN_FRONTEND_ACCESIBILIDAD.md`.

> R7–R8 completados. `App.js` quedó en 11 líneas (provider + `TripScreen`). `TripScreen.js` tiene 585 líneas, más que las ~250 estimadas: conserva todos los mensajes hablados y las transiciones de fase, que se dejaron juntos a propósito para que los textos se editen en un solo lugar. Los literales de fase se sustituyeron por `PHASES.*` (mismos valores). `eslint` (con `no-undef`), `test:safety`, `typecheck:safety` y `expo export` pasan. Documentación: mapa de carpetas en `LEEME_INTERFAZ.md` y equivalencias de rutas en `PLAN_FRONTEND_ACCESIBILIDAD.md`.

## Qué se garantiza (compatibilidad)

- Mismos strings de fase (`IDLE`, `CONFIRM_ORIGIN`, `ROUTE_FOUND`, `COMPASS_WALKING`, `CAMERA_DETECTION`, `ONBOARD_GPS`).
- Mismos endpoints y cuerpos: `/api/voice/transcribe`, `/api/query`, `/api/vision/predict` y `/api/session/reset`. La sesión nueva al reiniciar se mantiene.
- Mismos mensajes, tiempos, vibraciones y etiquetas de accesibilidad.
- Mismas dependencias: no se instala nada.
- `tests/travelSafety.test.js` y `typecheck:safety` siguen funcionando sin cambios.

## Fuera de alcance (decidir después)

- **Expo Router (`src/app/`).** AGENTS.md lo pide, pero la app es una sola pantalla con fases que comparten sensores en vivo. Tras esta reorganización migrar sería más fácil: `TripScreen` pasaría a `src/app/index.js`. Conviene hacerlo cuando haya más pantallas (ajustes, historial).
- **Migrar a TypeScript.** Más sencillo con los hooks ya separados; archivo por archivo.
