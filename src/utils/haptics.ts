import { Platform, Vibration } from 'react-native';

/**
 * Tactile Haptic Feedback Utility
 * Provides subtle physical micro-feedback for mobile interactions (Peak-End Rule & emotional design).
 */
export const haptics = {
  /**
   * Ultra-light tap for navigation tabs, segmented controls, and filter pills.
   */
  selection: () => {
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate(10);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore vibration errors on unsupported environments
    }
  },

  /**
   * Light impact for secondary buttons, modal triggers, and switches.
   */
  impactLight: () => {
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate(20);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Medium impact for primary CTAs and task control toggles (pause / resume).
   */
  impactMedium: () => {
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate(35);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Celebratory multi-pulse haptic pattern for the "Peak" moment when a campaign is successfully scheduled.
   */
  notificationSuccess: () => {
    try {
      if (Platform.OS === 'android') {
        // [wait, vibrate, wait, vibrate]
        Vibration.vibrate([0, 25, 70, 35]);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Warning / error haptic pulse for failures or deletions.
   */
  notificationError: () => {
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 40, 50, 40]);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore
    }
  },
};
