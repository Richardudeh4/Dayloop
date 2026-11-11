import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export type RingControls = {
  progress: SharedValue<number>;
  check: SharedValue<number>;
  burst: SharedValue<number>;
  /** Content drawn in the centre of the ring (e.g. the test countdown). */
  setCenter: (node: ReactNode) => void;
};

export type StepProps = {
  next: () => void;
  ring: RingControls;
};
