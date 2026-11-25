import { useColorScheme } from "react-native";
import { getTheme } from "@styleme/design";

/**
 * Scheme-aware token set. React Native re-renders on OS theme change,
 * so components calling this pick up light/dark automatically.
 */
export function useTheme() {
  return getTheme(useColorScheme());
}
