import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TripScreen from "./src/screens/TripScreen";

export default function App() {
  return (
    <SafeAreaProvider>
      <TripScreen />
    </SafeAreaProvider>
  );
}
