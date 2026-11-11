# Guía de Modificación Visual para el Diseñador / Desarrollador UI

¡Hola! Este proyecto es la aplicación móvil accesible en **React Native / Expo**.
Toda la interfaz visual ha sido modularizada para que puedas cambiar colores, tamaños, bordes y estilos sin tocar la lógica interna de sensores ni de red.

---

## 🎨 1. ¿Dónde cambio los colores y tipografías globales?
Abre el archivo:
📁 **`src/theme/tokens.js`**

Todos los componentes leen de aquí; no escribas colores ni tamaños sueltos en los componentes.

- `Colors`: fondos (`appBg`, `surface`), textos (`text`, `textSecondary`, `textMuted`), fondos de botones (`primary`, `success`, `warning`, `danger`, `dark`) y tonos de estado (`infoBg`/`infoText`, `warningBg`/`warningText`, etc.).
- `Typography`: escala de fuentes. Mínimo 16 para el cuerpo y 14 para texto auxiliar.
- `Spacing` y `Radius`: espaciados y bordes redondeados.
- `Touch`: alturas mínimas de toque (48 secundarias, 56 principales, 72 el micrófono).

**Regla de contraste:** cualquier color nuevo debe cumplir WCAG AA (4.5:1 con su fondo). Los colores actuales ya cumplen; el contraste de cada uno está anotado en el archivo.

---

## 🧩 2. ¿Dónde modifico el diseño de cada pantalla o tarjeta?
Todos los componentes visuales están en 📁 **`src/components/`**, en tres subcarpetas:

| Archivo | Qué parte de la pantalla es |
| :--- | :--- |
| **`layout/`** | *Estructura fija de la pantalla* |
| `layout/HeaderBar.js` | Barra superior institucional con título y punto indicador de GPS. |
| `layout/BottomDock.js` | Botonera en la parte inferior: fila de apoyo (Repetir, Callar, Escribir / Cancelar grabación), botón del micrófono y acciones de cada fase. |
| **`cards/`** | *Una tarjeta por fase o función* |
| `cards/VoiceCard.js` | Tarjeta del asistente que muestra lo que el usuario habla o la respuesta del bot. |
| `cards/TextQueryCard.js` | Campo para escribir el destino en lugar de hablar. |
| `cards/ConfirmOriginCard.js` | Tarjeta de confirmación "¿Sales desde esta ubicación?" (Sí / No). |
| `cards/RouteCard.js` | Tarjeta que muestra el micro o combi recomendado (Empresa, Letra/Línea, insignias de caminata). |
| `cards/CompassCard.js` | Brújula visual para guiar al usuario hacia el paradero. |
| `cards/RadarCameraCard.js` | Visor de la cámara trasera con el escaneo continuo de micros. |
| `cards/OnboardCard.js` | Viaje a bordo: contador de metros, precisión del GPS y alertas de llegada. |
| **`ui/`** | *Piezas genéricas reutilizables* |
| `ui/AccessibleButton.js` | Botón base para toda la app: tamaño mínimo, estado presionado, ocupado y deshabilitado. Los emojis van en `icon` para que el lector de pantalla no los lea. Úsalo en lugar de `TouchableOpacity`. |
| `ui/StepIndicator.js` | Indicador "Paso N de 4" en la parte superior del contenido. |
| `ui/KeepScreenOn.js` | Mantiene la pantalla encendida durante brújula, cámara y viaje a bordo (no dibuja nada). |

Textos de los pasos y nombres de las fases: 📁 **`src/config/phases.js`**. Tiempos (retrasos del lector de pantalla, brújula, etc.): 📁 **`src/config/timing.js`**.

Plan de accesibilidad y tareas pendientes: 📄 **`PLAN_FRONTEND_ACCESIBILIDAD.md`**. Reorganización del código: 📄 **`PLAN_REORGANIZACION_FRONTEND.md`**.

---

## 🗂️ 3. Mapa del código

| Carpeta / archivo | Qué hay ahí |
| :--- | :--- |
| `App.js` | Punto de entrada: solo monta la pantalla del viaje. |
| `src/screens/TripScreen.js` | La pantalla del viaje: decide qué se dice al usuario y a qué fase pasar. Aquí están los **mensajes hablados**. |
| `src/components/` | Lo visual (ver sección 2). |
| `src/hooks/accessibility/` | Voz única (TTS o lector de pantalla), foco del lector al cambiar de fase. |
| `src/hooks/device/` | Permisos, botón atrás de Android, app en primer plano. |
| `src/hooks/trip/` | Mecánica de cada paso: grabación de voz, brújula, radar de cámara, GPS a bordo. |
| `src/services/assistantApi.js` | Llamadas al backend (voz, texto, visión, reinicio de sesión). |
| `src/config/` | URLs del backend, fases y pasos, todos los tiempos. |
| `src/theme/tokens.js` | Colores, tipografía, espaciado (ver sección 1). |
| `src/utils/` | Cálculos puros con pruebas: rumbo y distancia, indicaciones de brújula, seguridad de avisos, cliente HTTP. |
| `tests/` | Pruebas: `npm run test:safety`. |

**¿Quieres cambiar un texto que dice la app?** Búscalo en `src/screens/TripScreen.js` (o en el hook de su paso, p. ej. los avisos de llegada en `src/hooks/trip/useOnboardTracking.js`).

**El backend:** configura `EXPO_PUBLIC_BACKEND_URLS` en `.env` con una URL a la que llegue el teléfono (no `localhost`) y reinicia con `npx expo start -c`.

---

## 🚀 4. ¿Cómo ejecutar el proyecto en tu computadora?
1. Descomprime el archivo `.zip`.
2. En la terminal dentro de la carpeta:
   ```bash
   npm install
   npx expo start
   ```
3. Escanea el código QR con la app **Expo Go** en tu celular Android o iOS.
