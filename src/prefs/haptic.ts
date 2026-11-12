import * as Haptics from 'expo-haptics';
import { prefsStore } from './prefs';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

const noop = () => undefined;

/** Fires haptic feedback only when the haptics preference is on; never throws. */
export function haptic(kind: HapticKind): void {
  if (!prefsStore.get().haptics) return;
  try {
    let result: Promise<void>;
    switch (kind) {
      case 'light':
        result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        result = Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        result = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        result = Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
    // Swallow async rejections too (e.g. no haptic engine).
    void Promise.resolve(result).catch(noop);
  } catch {
    // Haptics are best-effort feedback.
  }
}
