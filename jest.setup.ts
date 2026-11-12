import '@testing-library/jest-native/extend-expect';

// Reanimated 4's real JS runtime cannot initialise under Jest; use a light stand-in.
jest.mock('react-native-reanimated', () => require('./tests/mocks/reanimated'));
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: (...a: unknown[]) => void, ...args: unknown[]) => fn(...args),
}));
