import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer, type Track } from '@/context/PlayerContext';
import { useColors } from '@/hooks/useColors';

type LibraryFilter = 'all' | 'favorites';

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

function TrackArtwork({ size = 48 }: { size?: number }) {
  const colors = useColors();
  return (
    <LinearGradient
      colors={[colors.secondary, colors.surfaceRaised, colors.card]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.artwork, { width: size, height: size }]}
    >
      <View style={[styles.artworkRing, { width: size * 0.7, height: size * 0.7, borderColor: colors.cyanLine }]}>
        <View style={[styles.artworkInnerRing, { width: size * 0.43, height: size * 0.43, borderColor: colors.whiteFaint }]} />
        <View style={[styles.artworkCenter, { backgroundColor: colors.primary }]} />
      </View>
    </LinearGradient>
  );
}

function TrackRow({ track, index, queue }: { track: Track; index: number; queue: Track[] }) {
  const colors = useColors();
  const { currentTrack, isPlaying, favoriteIds, playTrack, toggleFavorite } = usePlayer();
  const isCurrent = currentTrack?.id === track.id;
  const isFavorite = favoriteIds.includes(track.id);

  return (
    <View style={[styles.trackRow, isCurrent && { backgroundColor: colors.card }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Play ${track.title} by ${track.artist}`}
        testID={`track-${track.id}`}
        onPress={() => {
          void Haptics.selectionAsync();
          playTrack(track, queue);
        }}
        style={({ pressed }) => [styles.trackMain, pressed && styles.pressed]}
      >
        {isCurrent && isPlaying ? (
          <View style={[styles.playingIndicator, { backgroundColor: colors.accent }]}>
            <Ionicons name="volume-high" size={18} color={colors.primary} />
          </View>
        ) : (
          <TrackArtwork />
        )}
        <View style={styles.trackCopy}>
          <Text numberOfLines={1} style={[styles.trackTitle, { color: isCurrent ? colors.primary : colors.foreground }]}>
            {track.title}
          </Text>
          <Text numberOfLines={1} style={[styles.trackArtist, { color: colors.mutedForeground }]}>{track.artist}</Text>
        </View>
      </Pressable>
      <Text style={[styles.trackDuration, { color: colors.mutedForeground }]}>{formatTime(track.duration)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? `Remove ${track.title} from saved songs` : `Save ${track.title}`}
        testID={`favorite-${track.id}`}
        onPress={() => {
          void Haptics.selectionAsync();
          toggleFavorite(track.id);
        }}
        hitSlop={10}
        style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}
      >
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? colors.primary : colors.mutedForeground} />
      </Pressable>
      <Text style={[styles.trackIndex, { color: colors.mutedForeground }]}>{String(index + 1).padStart(2, '0')}</Text>
    </View>
  );
}

function MiniProgress({ position, duration, onSeek }: { position: number; duration: number; onSeek: (seconds: number) => void }) {
  const colors = useColors();
  const [width, setWidth] = useState(1);
  const ratio = duration > 0 ? Math.min(1, position / duration) : 0;
  const onLayout = (event: LayoutChangeEvent) => setWidth(Math.max(1, event.nativeEvent.layout.width));
  const onPress = (event: GestureResponderEvent) => {
    onSeek((Math.max(0, Math.min(event.nativeEvent.locationX, width)) / width) * duration);
  };

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Track playback position"
      accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(position) }}
      testID="mini-progress"
      onLayout={onLayout}
      onPress={onPress}
      hitSlop={8}
      style={[styles.miniProgressTrack, { backgroundColor: colors.track }]}
    >
      <View style={[styles.miniProgressFill, { width: `${ratio * 100}%`, backgroundColor: colors.primary }]} />
    </Pressable>
  );
}

function MiniPlayer({ bottom }: { bottom: number }) {
  const colors = useColors();
  const router = useRouter();
  const { currentTrack, isPlaying, isBuffering, position, duration, togglePlayback, playNext, seekTo } = usePlayer();
  if (!currentTrack) return null;

  return (
    <View style={[styles.miniPlayer, { bottom, backgroundColor: colors.card, borderColor: colors.glassBorder, shadowColor: colors.shadow }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open player for ${currentTrack.title}`}
        testID="mini-player-open"
        onPress={() => router.navigate('/(tabs)/player')}
        style={({ pressed }) => [styles.miniMain, pressed && styles.pressed]}
      >
        <TrackArtwork size={42} />
        <View style={styles.miniCopy}>
          <Text numberOfLines={1} style={[styles.miniTitle, { color: colors.foreground }]}>{currentTrack.title}</Text>
          <Text numberOfLines={1} style={[styles.miniArtist, { color: colors.mutedForeground }]}>{currentTrack.artist}</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        testID="mini-player-toggle"
        onPress={togglePlayback}
        style={({ pressed }) => [styles.miniControl, pressed && styles.pressed]}
      >
        {isBuffering ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name={isPlaying ? 'pause' : 'play'} size={21} color={colors.primary} />}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Play next song"
        testID="mini-player-next"
        onPress={playNext}
        style={({ pressed }) => [styles.miniControl, pressed && styles.pressed]}
      >
        <Ionicons name="play-skip-forward" size={19} color={colors.foreground} />
      </Pressable>
      <MiniProgress position={position} duration={duration} onSeek={seekTo} />
    </View>
  );
}

export function LibraryScreen({ initialFilter }: { initialFilter: LibraryFilter }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    tracks,
    favoriteIds,
    permission,
    isLoadingLibrary,
    libraryError,
    currentTrack,
    playbackError,
    refreshLibrary,
    requestLibraryAccess,
    playAll,
  } = usePlayer();
  const [filter, setFilter] = useState<LibraryFilter>(initialFilter);
  const [search, setSearch] = useState('');
  const hasPermission = Boolean(permission?.granted);
  const showWebNotice = Platform.OS === 'web';
  const safeTop = Platform.OS === 'web' ? 67 : insets.top;
  const tabBottom = Platform.OS === 'web' ? 34 : Math.max(16, insets.bottom + 16);
  const miniBottom = tabBottom + 72 + 12;

  const visibleTracks = useMemo(() => {
    const source = filter === 'favorites' ? tracks.filter((track) => favoriteIds.includes(track.id)) : tracks;
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) return source;
    return source.filter((track) =>
      track.title.toLocaleLowerCase().includes(normalizedSearch) ||
      track.artist.toLocaleLowerCase().includes(normalizedSearch),
    );
  }, [favoriteIds, filter, search, tracks]);

  const requestOrOpenSettings = async () => {
    if (permission && !permission.granted && !permission.canAskAgain && Platform.OS !== 'web') {
      await Linking.openSettings();
      return;
    }
    await requestLibraryAccess();
  };

  const listBottom = currentTrack ? miniBottom + 90 : miniBottom + 16;
  const title = initialFilter === 'favorites' ? 'Saved' : 'Library';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: safeTop }]}>
      <StatusBar style="light" />
      <FlatList
        data={visibleTracks}
        keyExtractor={(track) => track.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: listBottom }}
        showsVerticalScrollIndicator={false}
        refreshing={hasPermission && isLoadingLibrary}
        onRefresh={hasPermission ? refreshLibrary : undefined}
        ListHeaderComponent={
          <View>
            <View style={styles.brandRow}>
              <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.brandMark}>
                <Ionicons name="disc" size={19} color={colors.primaryForeground} />
              </LinearGradient>
              <Text style={[styles.brandName, { color: colors.foreground }]}>SIDE A</Text>
              <View style={styles.brandSpacer} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={hasPermission ? 'Refresh music library' : 'Scan device for music'}
                testID="refresh-library"
                onPress={hasPermission ? refreshLibrary : requestOrOpenSettings}
                style={({ pressed }) => [styles.headerIconButton, pressed && styles.pressed]}
              >
                {isLoadingLibrary ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="refresh" size={19} color={colors.foreground} />}
              </Pressable>
            </View>

            <View style={styles.headingRow}>
              <View>
                <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{initialFilter === 'favorites' ? 'YOUR COLLECTION' : 'YOUR MUSIC, OFFLINE'}</Text>
                <Text style={[styles.pageTitle, { color: colors.foreground }]}>{title}</Text>
              </View>
              {hasPermission && tracks.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Play all songs"
                  testID="play-all"
                  onPress={() => playAll(visibleTracks)}
                  disabled={!visibleTracks.length}
                  style={({ pressed }) => [styles.playAllButton, { backgroundColor: colors.primary, opacity: visibleTracks.length ? 1 : 0.45 }, pressed && styles.pressed]}
                >
                  <Ionicons name="play" size={14} color={colors.primaryForeground} />
                  <Text style={[styles.playAllText, { color: colors.primaryForeground }]}>Play all</Text>
                </Pressable>
              )}
            </View>

            {showWebNotice ? (
              <View style={[styles.permissionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.permissionIcon, { backgroundColor: colors.accent }]}>
                  <Ionicons name="phone-portrait-outline" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.permissionTitle, { color: colors.foreground }]}>Made for your Android</Text>
                <Text style={[styles.permissionBody, { color: colors.mutedForeground }]}>Open SIDE A on your Android phone to scan and play the audio files saved on your device.</Text>
              </View>
            ) : !hasPermission ? (
              <View style={[styles.permissionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.permissionIcon, { backgroundColor: colors.accent }]}>
                  <Ionicons name="musical-notes" size={24} color={colors.primary} />
                </View>
                <Text style={[styles.permissionTitle, { color: colors.foreground }]}>Your music is already here</Text>
                <Text style={[styles.permissionBody, { color: colors.mutedForeground }]}>Give SIDE A access to audio on this device. Your songs stay on your phone.</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={permission && !permission.canAskAgain ? 'Open app settings' : 'Allow audio access'}
                  testID="request-audio-access"
                  onPress={requestOrOpenSettings}
                  style={({ pressed }) => [styles.permissionAction, { backgroundColor: colors.primary }, pressed && styles.pressed]}
                >
                  <Text style={[styles.permissionActionText, { color: colors.primaryForeground }]}>{permission && !permission.canAskAgain ? 'Open settings' : 'Allow audio access'}</Text>
                  <Ionicons name="arrow-forward" size={17} color={colors.primaryForeground} />
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.librarySummary}>
                  <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>{tracks.length} {tracks.length === 1 ? 'TRACK' : 'TRACKS'} ON THIS DEVICE</Text>
                  <View style={[styles.summaryDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.summaryText, { color: colors.mutedForeground }]}>LOCAL LIBRARY</Text>
                </View>
                <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="search" size={18} color={colors.mutedForeground} />
                  <TextInput
                    accessibilityLabel="Search your music"
                    testID="music-search"
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search songs or artists"
                    placeholderTextColor={colors.mutedForeground}
                    returnKeyType="search"
                    style={[styles.searchInput, { color: colors.foreground }]}
                  />
                  {!!search && (
                    <Pressable accessibilityRole="button" accessibilityLabel="Clear search" testID="clear-search" onPress={() => setSearch('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>
                <View style={[styles.filterBar, { backgroundColor: colors.card }]}>
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: filter === 'all' }}
                    testID="filter-all"
                    onPress={() => setFilter('all')}
                    style={[styles.filterTab, filter === 'all' && { backgroundColor: colors.accent }]}
                  >
                    <Text style={[styles.filterText, { color: filter === 'all' ? colors.accentForeground : colors.mutedForeground }]}>All songs</Text>
                    <Text style={[styles.filterCount, { color: filter === 'all' ? colors.accentForeground : colors.mutedForeground }]}>{tracks.length}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="tab"
                    accessibilityState={{ selected: filter === 'favorites' }}
                    testID="filter-favorites"
                    onPress={() => setFilter('favorites')}
                    style={[styles.filterTab, filter === 'favorites' && { backgroundColor: colors.accent }]}
                  >
                    <Ionicons name="heart" size={14} color={filter === 'favorites' ? colors.accentForeground : colors.mutedForeground} />
                    <Text style={[styles.filterText, { color: filter === 'favorites' ? colors.accentForeground : colors.mutedForeground }]}>Saved</Text>
                    <Text style={[styles.filterCount, { color: filter === 'favorites' ? colors.accentForeground : colors.mutedForeground }]}>{favoriteIds.length}</Text>
                  </Pressable>
                </View>
                {libraryError && (
                  <View style={[styles.errorBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.destructive} />
                    <Text style={[styles.errorText, { color: colors.foreground }]}>{libraryError}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Retry scan" testID="retry-scan" onPress={refreshLibrary}>
                      <Text style={[styles.retryText, { color: colors.primary }]}>Retry</Text>
                    </Pressable>
                  </View>
                )}
                {!!playbackError && <Text accessibilityRole="alert" style={[styles.playbackError, { color: colors.destructive }]}>{playbackError}</Text>}
                <View style={styles.trackListHeading}>
                  <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{filter === 'favorites' ? 'Saved songs' : 'All songs'}</Text>
                  <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{visibleTracks.length}</Text>
                </View>
              </>
            )}
          </View>
        }
        renderItem={({ item, index }) => <TrackRow track={item} index={index} queue={visibleTracks} />}
        ListEmptyComponent={
          showWebNotice || !hasPermission ? null : isLoadingLibrary ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Scanning your music</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>This only takes a moment.</Text>
            </View>
          ) : filter === 'favorites' && tracks.length > 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="heart-outline" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No saved songs yet</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Tap the heart beside a track to keep it here.</Text>
            </View>
          ) : tracks.length > 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No matches</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Try another song or artist.</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyDisc, { backgroundColor: colors.card }]}>
                <Ionicons name="disc-outline" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No tracks found</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Add audio files to your device, then scan again.</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Scan again" testID="scan-again" onPress={refreshLibrary} style={({ pressed }) => [styles.scanButton, { borderColor: colors.border }, pressed && styles.pressed]}>
                <Ionicons name="refresh" size={16} color={colors.foreground} />
                <Text style={[styles.scanButtonText, { color: colors.foreground }]}>Scan again</Text>
              </Pressable>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 18 }} />}
      />
      {currentTrack && <MiniPlayer bottom={miniBottom} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', height: 42, marginBottom: 28 },
  brandMark: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  brandName: { marginLeft: 10, fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 2.4 },
  brandSpacer: { flex: 1 },
  headerIconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.7 },
  pageTitle: { marginTop: 4, fontFamily: 'Inter_700Bold', fontSize: 34, letterSpacing: -1.1 },
  playAllButton: { height: 39, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  playAllText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  permissionCard: { borderWidth: 1, borderRadius: 24, padding: 21, marginTop: 3 },
  permissionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  permissionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 19, letterSpacing: -0.25 },
  permissionBody: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 340 },
  permissionAction: { minHeight: 48, paddingHorizontal: 17, marginTop: 20, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  permissionActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  librarySummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3, marginBottom: 16 },
  summaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 1.05 },
  summaryDot: { width: 4, height: 4, borderRadius: 2 },
  searchBox: { height: 49, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, paddingVertical: 0 },
  filterBar: { flexDirection: 'row', borderRadius: 17, padding: 4, marginTop: 15, marginBottom: 22 },
  filterTab: { flex: 1, minHeight: 39, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  filterText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  filterCount: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  errorBanner: { borderWidth: 1, borderRadius: 13, minHeight: 44, marginBottom: 13, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 12 },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  playbackError: { fontFamily: 'Inter_500Medium', fontSize: 12, marginBottom: 12 },
  trackListHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  sectionCount: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  trackRow: { minHeight: 70, borderRadius: 17, paddingHorizontal: 8, marginHorizontal: -8, flexDirection: 'row', alignItems: 'center', gap: 11 },
  trackMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, paddingVertical: 7 },
  artwork: { alignItems: 'center', justifyContent: 'center', borderRadius: 14, overflow: 'hidden' },
  artworkRing: { borderWidth: 1.5, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  artworkInnerRing: { position: 'absolute', borderWidth: 1, borderRadius: 99 },
  artworkCenter: { width: 7, height: 7, borderRadius: 4 },
  playingIndicator: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  trackCopy: { flex: 1, minWidth: 0 },
  trackTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  trackArtist: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  trackDuration: { fontFamily: 'Inter_400Regular', fontSize: 11, width: 36, textAlign: 'right' },
  favoriteButton: { width: 31, height: 40, alignItems: 'center', justifyContent: 'center' },
  trackIndex: { width: 18, textAlign: 'right', fontFamily: 'Inter_500Medium', fontSize: 9 },
  pressed: { opacity: 0.66 },
  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 20 },
  emptyDisc: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, marginTop: 7, textAlign: 'center' },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7, maxWidth: 270 },
  scanButton: { minHeight: 40, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 },
  scanButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  miniPlayer: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 66,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingBottom: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  miniMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  miniCopy: { flex: 1, minWidth: 0 },
  miniTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  miniArtist: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  miniControl: { width: 34, height: 44, alignItems: 'center', justifyContent: 'center' },
  miniProgressTrack: { position: 'absolute', left: 10, right: 10, bottom: 0, height: 3, borderRadius: 4, overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 4 },
});
