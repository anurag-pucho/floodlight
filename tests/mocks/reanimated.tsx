import { createElement, type ComponentType } from 'react';
import { View, Text, Image, ScrollView } from 'react-native';

interface Shared<T> {
  value: T;
}

function createAnimatedComponent<P extends object>(Component: ComponentType<P>) {
  // Merge animatedProps (already evaluated) into plain props.
  return function Animated(props: P & { animatedProps?: object }) {
    const { animatedProps, ...rest } = props;
    return createElement(Component as ComponentType<object>, { ...rest, ...animatedProps });
  };
}

export const useSharedValue = <T,>(initial: T): Shared<T> => ({ value: initial });
export const useAnimatedStyle = (fn: () => object) => fn();
export const useAnimatedProps = (fn: () => object) => fn();
export const useAnimatedReaction = () => undefined;
export const withSpring = <T,>(to: T) => to;
export const withTiming = <T,>(to: T) => to;
export const withDelay = <T,>(_ms: number, v: T) => v;
export const withSequence = <T,>(...v: T[]) => v[v.length - 1];
export const Easing = { out: (f: unknown) => f, cubic: () => 0, quad: () => 0 };

const Animated = {
  View,
  Text,
  Image,
  ScrollView,
  createAnimatedComponent,
};

export default Animated;
