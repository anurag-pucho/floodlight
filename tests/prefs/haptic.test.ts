import * as Haptics from 'expo-haptics';
import { haptic } from '../../src/prefs/haptic';
import { prefsStore } from '../../src/prefs/prefs';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

const impact = Haptics.impactAsync as jest.Mock;
const notify = Haptics.notificationAsync as jest.Mock;

describe('haptic()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fires the matching impact / notification when haptics are on', async () => {
    await prefsStore.set({ haptics: true });
    haptic('light');
    haptic('heavy');
    haptic('success');
    haptic('warning');
    expect(impact).toHaveBeenNthCalledWith(1, 'light');
    expect(impact).toHaveBeenNthCalledWith(2, 'heavy');
    expect(notify).toHaveBeenNthCalledWith(1, 'success');
    expect(notify).toHaveBeenNthCalledWith(2, 'warning');
  });

  it('does nothing when haptics are off', async () => {
    await prefsStore.set({ haptics: false });
    haptic('light');
    haptic('success');
    expect(impact).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('swallows sync and async haptics errors', async () => {
    await prefsStore.set({ haptics: true });
    impact.mockImplementationOnce(() => {
      throw new Error('sync boom');
    });
    expect(() => haptic('medium')).not.toThrow();
    notify.mockImplementationOnce(() => Promise.reject(new Error('async boom')));
    expect(() => haptic('success')).not.toThrow();
    await Promise.resolve();
  });
});
