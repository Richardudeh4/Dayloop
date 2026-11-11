import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme/kairo';

const PATHS = {
  back: 'M15 5l-7 7 7 7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  bell: 'M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 004 0',
  calendar: 'M4 7a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7zM4 10h16M8 3v4M16 3v4',
  bolt: 'M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z',
  battery: 'M3 8.5A1.5 1.5 0 014.5 7h13A1.5 1.5 0 0119 8.5v7a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 013 15.5v-7zM21 10.5v3M6.5 10v4M10 10v4',
  video: 'M3.5 7.5A1.5 1.5 0 015 6h9a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0114 18H5a1.5 1.5 0 01-1.5-1.5v-9zM15.5 10.5l5-3v9l-5-3',
  dash: 'M6 12h12',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  lists: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, color = colors.text, strokeWidth = 2 }: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={PATHS[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
