import { createContext, useContext } from 'react';
import type { ComponentRef, RefObject } from 'react';
import { View } from 'react-native';

export const BlurTargetContext = createContext<RefObject<ComponentRef<typeof View> | null> | null>(null);

export function useBlurTarget() {
  return useContext(BlurTargetContext);
}
