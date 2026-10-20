import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import {
  Disc3,
  Heart,
  Library,
} from 'lucide-react-native';
import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const TAB_ITEMS = [
  { route: 'index', label: 'Library', Icon: Library },
  { route: 'saved', label: 'Saved', Icon: Heart },
  { route: 'player', label: 'Player', Icon: Disc3 },
] as const;

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottom = Platform.OS === 'web' ? 34 : Math.max(16, insets.bottom + 16);

  return (
    <View pointerEvents="box-none" style={[styles.barPosition, { bottom }]}>
      <View
        style={[
          styles.barFrame,
          {
            borderColor: colors.glassBorder,
            backgroundColor: colors.glassBackground,
            shadowColor: colors.shadow,
          },
        ]}
      >
        {Platform.OS === 'web' ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.webGlass, { backgroundColor: colors.card }]}
          />
        ) : (
          <BlurView
            pointerEvents="none"
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        )}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glassTint, { backgroundColor: colors.background }]} />
        <View style={styles.tabItems}>
          {TAB_ITEMS.map(({ route, label, Icon }) => {
            const routeIndex = state.routes.findIndex((item) => item.name === route);
            if (routeIndex < 0) return null;
            const isActive = state.index === routeIndex;
            const tabRoute = state.routes[routeIndex];
            const color = isActive ? colors.primary : colors.mutedForeground;

            return (
              <Pressable
                key={route}
                accessibilityRole="tab"
                accessibilityLabel={label}
                accessibilityState={{ selected: isActive }}
                testID={`tab-${route}`}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: tabRoute.key,
                    canPreventDefault: true,
                  });
                  if (!isActive && !event.defaultPrevented) {
                    navigation.navigate(tabRoute.name, tabRoute.params);
                  }
                }}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: tabRoute.key })}
                style={({ pressed }) => [
                  styles.tabItem,
                  isActive && styles.activeTabItem,
                  pressed && styles.pressed,
                ]}
              >
                <Icon size={21} color={color} strokeWidth={isActive ? 2.4 : 1.9} />
                <Text style={[styles.tabLabel, { color }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export default function MusicTabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Library' }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
      <Tabs.Screen name="player" options={{ title: 'Player' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barPosition: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
  },
  barFrame: {
    height: 72,
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 24,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  webGlass: {
    opacity: 0.96,
  },
  glassTint: {
    opacity: 0.42,
  },
  tabItems: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  tabItem: {
    minWidth: 82,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 18,
  },
  activeTabItem: {
    transform: [{ scale: 1.06 }],
  },
  tabLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.7,
  },
});
