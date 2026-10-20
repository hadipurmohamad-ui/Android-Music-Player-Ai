import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function VisualizerBar({
  index,
  playing,
  palette,
}: {
  index: number;
  playing: boolean;
  palette: readonly [string, string, ...string[]];
}) {
  const level = useSharedValue(0.035);
  const maxHeight = 78;
  const glow = palette[index % palette.length];
  const animatedStyle = useAnimatedStyle(() => ({
    height: Math.max(4, level.value * maxHeight),
  }));

  useEffect(() => {
    cancelAnimation(level);
    if (!playing) {
      level.value = withTiming(0.035, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
      });
      return () => cancelAnimation(level);
    }

    const floor = 0.2 + ((index * 17) % 7) * 0.035;
    const peak = 0.52 + ((index * 23) % 9) * 0.05;
    const duration = 380 + (index % 6) * 85;
    level.value = withDelay(
      (index * 29) % 580,
      withRepeat(
        withSequence(
          withTiming(peak, { duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(floor, { duration: duration + 120, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(level);
  }, [index, level, playing]);

  return (
    <View style={styles.visualizerSlot}>
      <Animated.View
        style={[
          styles.visualizerBar,
          animatedStyle,
          { shadowColor: glow },
        ]}
      >
        <LinearGradient
          colors={palette}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

function RgbVisualizer({
  playing,
  palette,
}: {
  playing: boolean;
  palette: readonly [string, string, ...string[]];
}) {
  return (
    <View
      accessibilityLabel={playing ? 'Animated music visualizer' : 'Music visualizer paused'}
      style={styles.visualizer}
    >
      {Array.from({ length: 32 }, (_, index) => (
        <VisualizerBar key={index} index={index} playing={playing} palette={palette} />
      ))}
    </View>
  );
}

function AlbumArtwork({ size }: { size: number }) {
  const colors = useColors();
  return (
    <View
      accessibilityLabel="Abstract SIDE A album artwork"
      style={[
        styles.albumArtwork,
        {
          width: size,
          height: size,
          shadowColor: colors.secondary,
        },
      ]}
    >
      <LinearGradient
        colors={[colors.secondary, colors.surfaceRaised, colors.background]}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.coverGlow, { backgroundColor: colors.cyanSoft }]} />
      <View style={[styles.coverOrbit, { borderColor: colors.whiteLine }]} />
      <View style={[styles.coverOrbit, styles.coverOrbitInner, { borderColor: colors.cyanLine }]} />
      <View style={[styles.coverDisc, { borderColor: colors.whiteFaint }]}>
        <View style={[styles.coverDiscLine, { borderColor: colors.whiteLineSubtle }]} />
        <View style={[styles.coverDiscCenter, { backgroundColor: colors.primary }]}>
          <Ionicons name="musical-note" size={26} color={colors.primaryForeground} />
        </View>
      </View>
      <View style={styles.coverWordmark}>
        <Text style={[styles.coverSmall, { color: colors.whiteMuted }]}>SIDE A / ORIGINALS</Text>
        <Text style={[styles.coverBig, { color: colors.foreground }]}>SOUND</Text>
      </View>
      <View style={[styles.coverIndex, { borderColor: colors.whiteStrong }]}>
        <Text style={[styles.coverIndexText, { color: colors.foreground }]}>01</Text>
      </View>
    </View>
  );
}

function SeekSlider({
  position,
  duration,
  seekTo,
}: {
  position: number;
  duration: number;
  seekTo: (seconds: number) => void;
}) {
  const colors = useColors();
  const [width, setWidth] = useState(1);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const measuredWidth = useRef(1);
  const trackLeft = useRef(0);
  const trackRef = useRef<View>(null);
  const shownPosition = dragPosition ?? position;
  const ratio = duration > 0 ? Math.max(0, Math.min(1, shownPosition / duration)) : 0;

  const getGesturePosition = (gesture: PanResponderGestureState) => {
    const activeWidth = Math.max(1, measuredWidth.current);
    const fraction = Math.max(0, Math.min(1, (gesture.moveX - trackLeft.current) / activeWidth));
    return fraction * duration;
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderGrant: (_, gesture) => setDragPosition(getGesturePosition(gesture)),
        onPanResponderMove: (_, gesture) => setDragPosition(getGesturePosition(gesture)),
        onPanResponderRelease: (_, gesture) => {
          seekTo(getGesturePosition(gesture));
          setDragPosition(null);
        },
        onPanResponderTerminate: () => setDragPosition(null),
      }),
    // The responder only needs the current seek callback and duration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duration, seekTo],
  );

  const onLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.max(1, event.nativeEvent.layout.width);
    measuredWidth.current = nextWidth;
    setWidth(nextWidth);
    trackRef.current?.measureInWindow((x) => {
      trackLeft.current = x;
    });
  };

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') seekTo(Math.min(duration, position + 10));
    if (event.nativeEvent.actionName === 'decrement') seekTo(Math.max(0, position - 10));
  };

  const tooltipLeft = Math.max(27, Math.min(width - 27, ratio * width));

  return (
    <View
      ref={trackRef}
      onLayout={onLayout}
      {...responder.panHandlers}
      accessibilityRole="adjustable"
      accessibilityLabel="Track playback position"
      accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(shownPosition) }}
      accessibilityActions={[
        { name: 'increment', label: 'Forward 10 seconds' },
        { name: 'decrement', label: 'Back 10 seconds' },
      ]}
      onAccessibilityAction={onAccessibilityAction}
      testID="now-playing-progress"
      style={styles.sliderTouchArea}
    >
      {dragPosition !== null && (
        <View style={[styles.timeTooltip, { left: tooltipLeft, backgroundColor: colors.surfaceRaised }]}>
          <Text style={[styles.tooltipText, { color: colors.foreground }]}>{formatTime(shownPosition)}</Text>
          <View style={[styles.tooltipTail, { borderTopColor: colors.surfaceRaised }]} />
        </View>
      )}
      <View style={[styles.sliderTrack, { backgroundColor: colors.track }]}>
        <View style={[styles.sliderFill, { width: `${ratio * 100}%`, backgroundColor: colors.primary, shadowColor: colors.primary }]} />
        <View style={[styles.endpointDot, styles.leftEndpoint, { backgroundColor: colors.foreground }]} />
        <View style={[styles.endpointDot, styles.rightEndpoint, { backgroundColor: colors.foreground }]} />
        <View
          style={[
            styles.sliderThumb,
            {
              left: `${ratio * 100}%`,
              backgroundColor: colors.foreground,
              shadowColor: colors.primary,
            },
          ]}
        />
      </View>
      <View style={styles.progressTimes}>
        <Text style={[styles.progressTime, { color: colors.mutedForeground }]}>{formatTime(shownPosition)}</Text>
        <Text style={[styles.progressTime, { color: colors.mutedForeground }]}>-{formatTime(Math.max(0, duration - shownPosition))}</Text>
      </View>
    </View>
  );
}

export default function NowPlayingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    position,
    duration,
    favoriteIds,
    repeatMode,
    shuffleEnabled,
    togglePlayback,
    playNext,
    playPrevious,
    seekTo,
    toggleFavorite,
    toggleShuffle,
    cycleRepeatMode,
  } = usePlayer();
  const tabBottom = Platform.OS === 'web' ? 34 : Math.max(16, insets.bottom + 16);
  const tabClearance = tabBottom + 72 + 12;
  const safeTop = Platform.OS === 'web' ? 67 : insets.top;
  const usableHeight = screenHeight - safeTop - tabClearance;
  const artworkSize = Math.min(screenWidth - 56, Math.max(188, (usableHeight - 330) * 0.82));
  const isFavorite = currentTrack ? favoriteIds.includes(currentTrack.id) : false;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: safeTop, paddingBottom: tabClearance }]}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.playerContent, { minHeight: Math.max(0, usableHeight) }]}
      >
        <View style={styles.playerHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to library"
            testID="close-now-playing"
            onPress={() => router.navigate('/')}
            hitSlop={12}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-down" size={25} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>NOW PLAYING</Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>{currentTrack ? 'From your library' : 'SIDE A player'}</Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        {currentTrack ? (
          <>
            <View style={styles.artStage}>
              <AlbumArtwork size={artworkSize} />
              <RgbVisualizer playing={isPlaying} palette={colors.visualizerColors} />
            </View>

            <View style={styles.nowPlayingMeta}>
              <View style={styles.nowPlayingTitles}>
                <Text numberOfLines={1} style={[styles.nowPlayingTitle, { color: colors.foreground }]}>{currentTrack.title}</Text>
                <Text numberOfLines={1} style={[styles.nowPlayingArtist, { color: colors.mutedForeground }]}>{currentTrack.artist}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isFavorite ? 'Remove from saved songs' : 'Save song'}
                testID="now-playing-favorite"
                onPress={() => {
                  void Haptics.selectionAsync();
                  toggleFavorite(currentTrack.id);
                }}
                hitSlop={10}
                style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}
              >
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={25} color={isFavorite ? colors.primary : colors.mutedForeground} />
              </Pressable>
            </View>

            <SeekSlider position={position} duration={duration} seekTo={seekTo} />

            <View style={styles.playerControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={shuffleEnabled ? 'Turn shuffle off' : 'Turn shuffle on'}
                accessibilityState={{ selected: shuffleEnabled }}
                testID="shuffle-toggle"
                onPress={toggleShuffle}
                style={({ pressed }) => [styles.sideControl, pressed && styles.pressed]}
              >
                <Ionicons name="shuffle" size={22} color={shuffleEnabled ? colors.primary : colors.mutedForeground} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous song" testID="previous-track" onPress={playPrevious} style={({ pressed }) => [styles.skipControl, pressed && styles.pressed]}>
                <Ionicons name="play-skip-back" size={27} color={colors.foreground} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                testID="now-playing-toggle"
                onPress={togglePlayback}
                style={({ pressed }) => [styles.mainPlayButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, pressed && styles.mainPlayPressed]}
              >
                {isBuffering ? <ActivityIndicator color={colors.primaryForeground} size="small" /> : <Ionicons name={isPlaying ? 'pause' : 'play'} size={29} color={colors.primaryForeground} />}
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Next song" testID="next-track" onPress={playNext} style={({ pressed }) => [styles.skipControl, pressed && styles.pressed]}>
                <Ionicons name="play-skip-forward" size={27} color={colors.foreground} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Repeat ${repeatMode}`}
                accessibilityState={{ selected: repeatMode !== 'off' }}
                testID="repeat-toggle"
                onPress={cycleRepeatMode}
                style={({ pressed }) => [styles.sideControl, pressed && styles.pressed]}
              >
                <Ionicons name="repeat" size={22} color={repeatMode === 'off' ? colors.mutedForeground : colors.primary} />
                {repeatMode === 'one' && <Text style={[styles.repeatOneBadge, { color: colors.primary }]}>1</Text>}
              </Pressable>
            </View>

            <View style={[styles.deviceNote, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="phone-portrait-outline" size={16} color={colors.mutedForeground} />
              <Text style={[styles.deviceNoteText, { color: colors.mutedForeground }]}>Playing from this device</Text>
            </View>
          </>
        ) : (
          <View style={[styles.emptyPlayer, { minHeight: Math.max(440, usableHeight - 54) }]}>
            <View style={[styles.emptyDisc, { backgroundColor: colors.card }]}>
              <Ionicons name="musical-notes" size={30} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Choose a song to begin</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Your local music and saved tracks are ready in the library.</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Browse your music library"
              testID="browse-library"
              onPress={() => router.navigate('/')}
              style={({ pressed }) => [styles.browseButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
            >
              <Text style={[styles.browseButtonText, { color: colors.primaryForeground }]}>Browse library</Text>
              <Ionicons name="arrow-forward" size={17} color={colors.primaryForeground} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  playerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 2,
    paddingBottom: 12,
  },
  playerHeader: { flexDirection: 'row', alignItems: 'center', minHeight: 49, marginBottom: 5 },
  headerButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center' },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.9 },
  headerTitle: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 3 },
  artStage: { alignItems: 'center', justifyContent: 'flex-start' },
  albumArtwork: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    overflow: 'hidden',
    shadowOpacity: 0.32,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 13 },
    elevation: 15,
    zIndex: 2,
  },
  coverGlow: { position: 'absolute', width: '75%', height: '75%', right: -40, top: -50, borderRadius: 999 },
  coverOrbit: { position: 'absolute', width: '83%', aspectRatio: 1, borderWidth: 1, borderRadius: 999, transform: [{ rotate: '-24deg' }] },
  coverOrbitInner: { width: '58%', transform: [{ rotate: '32deg' }] },
  coverDisc: { width: '49%', aspectRatio: 1, borderWidth: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  coverDiscLine: { position: 'absolute', width: '73%', aspectRatio: 1, borderWidth: 1, borderRadius: 999 },
  coverDiscCenter: { width: '31%', aspectRatio: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  coverWordmark: { position: 'absolute', left: 20, bottom: 19 },
  coverSmall: { fontFamily: 'Inter_600SemiBold', fontSize: 8, letterSpacing: 1.8 },
  coverBig: { fontFamily: 'Inter_700Bold', fontSize: 23, letterSpacing: 3.8, marginTop: 3 },
  coverIndex: { position: 'absolute', right: 20, top: 18, width: 31, height: 31, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  coverIndexText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 0.6 },
  visualizer: {
    width: '100%',
    height: 75,
    marginTop: -16,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 2,
    zIndex: 1,
  },
  visualizerSlot: { flex: 1, height: 68, justifyContent: 'flex-end', alignItems: 'center' },
  visualizerBar: {
    width: '100%',
    minHeight: 4,
    borderRadius: 4,
    overflow: 'hidden',
    shadowOpacity: 0.5,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  nowPlayingMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 3 },
  nowPlayingTitles: { flex: 1, minWidth: 0 },
  nowPlayingTitle: { fontFamily: 'Inter_700Bold', fontSize: 21, letterSpacing: -0.4 },
  nowPlayingArtist: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 5 },
  favoriteButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.68 },
  sliderTouchArea: { height: 58, justifyContent: 'flex-end', paddingBottom: 4, overflow: 'visible' },
  sliderTrack: { width: '100%', height: 5, borderRadius: 5, justifyContent: 'center', overflow: 'visible' },
  sliderFill: { height: '100%', borderRadius: 5, shadowOpacity: 0.56, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 3 },
  sliderThumb: { position: 'absolute', width: 15, height: 15, borderRadius: 8, marginLeft: -7.5, shadowOpacity: 0.3, shadowRadius: 7, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  endpointDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, top: 0.5 },
  leftEndpoint: { left: 0 },
  rightEndpoint: { right: 0 },
  timeTooltip: { position: 'absolute', top: 1, minWidth: 54, height: 25, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginLeft: -27, zIndex: 5 },
  tooltipText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, fontVariant: ['tabular-nums'] },
  tooltipTail: { position: 'absolute', width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 5, borderLeftColor: 'transparent', borderRightColor: 'transparent', bottom: -4 },
  progressTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressTime: { fontFamily: 'Inter_500Medium', fontSize: 10, fontVariant: ['tabular-nums'] },
  playerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 },
  sideControl: { width: 38, height: 48, alignItems: 'center', justifyContent: 'center' },
  skipControl: { width: 44, height: 52, alignItems: 'center', justifyContent: 'center' },
  mainPlayButton: { width: 66, height: 66, borderRadius: 23, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 7 },
  mainPlayPressed: { opacity: 0.83, transform: [{ scale: 0.96 }] },
  repeatOneBadge: { position: 'absolute', top: 9, right: 2, fontSize: 9, fontFamily: 'Inter_700Bold' },
  deviceNote: { height: 38, borderRadius: 14, borderWidth: 1, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  deviceNoteText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  emptyPlayer: { flexGrow: 1, width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  emptyDisc: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17, textAlign: 'center' },
  emptyBody: { maxWidth: 260, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 7, textAlign: 'center' },
  browseButton: { minHeight: 46, paddingHorizontal: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 20 },
  browseButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
});
