import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export type DeviceType = 'phone' | 'tablet';
export type Orientation = 'portrait' | 'landscape';

export interface LayoutInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: Orientation;
  isTablet: boolean;
  isLandscape: boolean;
  // Adaptive spacing/sizing
  padding: number;
  fontSize: { sm: number; md: number; lg: number; xl: number };
  bubbleMaxWidth: string;
  columns: number; // for grid layouts (tools page etc.)
}

function getLayout(window: ScaledSize): LayoutInfo {
  const { width, height } = window;
  const isLandscape = width > height;
  const shortSide = Math.min(width, height);
  const isTablet = shortSide >= 600;

  const padding = isTablet ? 24 : 16;
  const fontSize = isTablet
    ? { sm: 13, md: 16, lg: 20, xl: 26 }
    : { sm: 11, md: 14, lg: 18, xl: 22 };

  // Chat bubble max width: narrower on tablets for readability
  const bubbleMaxWidth = isTablet ? '60%' : '78%';

  // Grid columns for tools/settings
  let columns = 1;
  if (isTablet && isLandscape) columns = 3;
  else if (isTablet || isLandscape) columns = 2;

  return {
    width,
    height,
    deviceType: isTablet ? 'tablet' : 'phone',
    orientation: isLandscape ? 'landscape' : 'portrait',
    isTablet,
    isLandscape,
    padding,
    fontSize,
    bubbleMaxWidth,
    columns,
  };
}

export function useLayout(): LayoutInfo {
  const [layout, setLayout] = useState(() => getLayout(Dimensions.get('window')));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setLayout(getLayout(window));
    });
    return () => subscription.remove();
  }, []);

  return layout;
}
