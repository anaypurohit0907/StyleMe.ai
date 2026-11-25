/**
 * Shared Android blur target for the glass tab bar.
 *
 * `expo-blur` on Android only blurs a `BlurTargetView` that is a *sibling*
 * behind the `BlurView` — without a target it silently falls back to no blur.
 * Each `Screen` wraps its content in a `BlurTargetView` and registers that ref
 * here on focus; the tab-bar `ChromeSurface` consumes it as `blurTarget`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from "react";
import type { View } from "react-native";

export type BlurTargetRef = RefObject<ComponentRef<typeof View> | null>;

interface BlurTargetContextValue {
  /** Ref to the currently focused screen's BlurTargetView. */
  targetRef: BlurTargetRef | null;
  /** Bumped whenever the target ref changes so the BlurView re-attaches. */
  version: number;
  setTargetRef: (ref: BlurTargetRef) => void;
}

const BlurTargetContext = createContext<BlurTargetContextValue | null>(null);

export function BlurTargetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    ref: BlurTargetRef | null;
    version: number;
  }>({ ref: null, version: 0 });

  const setTargetRef = useCallback((ref: BlurTargetRef) => {
    setState((prev) => ({ ref, version: prev.version + 1 }));
  }, []);

  const value = useMemo(
    () => ({ targetRef: state.ref, version: state.version, setTargetRef }),
    [state.ref, state.version, setTargetRef],
  );

  return <BlurTargetContext.Provider value={value}>{children}</BlurTargetContext.Provider>;
}

export function useBlurTarget(): BlurTargetContextValue | null {
  return useContext(BlurTargetContext);
}
