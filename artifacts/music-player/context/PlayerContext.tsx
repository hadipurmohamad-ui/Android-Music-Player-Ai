import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import type { AssetInfo, PermissionResponse } from 'expo-media-library';

type MediaLibraryApi = typeof import('expo-media-library');

export interface Track {
  id: string;
  uri: string;
  title: string;
  artist: string;
  duration: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerContextValue {
  tracks: Track[];
  favoriteIds: string[];
  permission: PermissionResponse | null;
  isLoadingLibrary: boolean;
  libraryError: string | null;
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  playbackError: string | null;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  requestLibraryAccess: () => Promise<void>;
  refreshLibrary: () => Promise<void>;
  playTrack: (track: Track, queue?: Track[]) => void;
  playAll: (queue: Track[]) => void;
  togglePlayback: () => void;
  playNext: () => void;
  playPrevious: () => void;
  seekTo: (seconds: number) => void;
  toggleFavorite: (trackId: string) => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
}

const FAVORITES_KEY = 'music-player:favorites:v1';
const PlayerContext = createContext<PlayerContextValue | null>(null);

function trackFromAsset(asset: AssetInfo): Track {
  const filename = asset.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
  const separator = filename.match(/\s[-–—]\s/);
  const splitAt = separator?.index;
  const separatorLength = separator?.[0].length ?? 0;
  const artist = splitAt === undefined ? 'On this device' : filename.slice(0, splitAt).trim();
  const title =
    splitAt === undefined
      ? filename.trim() || asset.filename
      : filename.slice(splitAt + separatorLength).trim() || asset.filename;

  return {
    id: asset.id,
    uri: asset.uri,
    title,
    artist,
    duration: (asset.duration ?? 0) / 1000,
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [permission, setPermission] = useState<PermissionResponse | null>(null);
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryApi | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [queue, setQueue] = useState<Track[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const scanning = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let mounted = true;
    void import('expo-media-library')
      .then(async (library) => {
        const result = await library.getPermissionsAsync(false, ['audio']);
        if (mounted) {
          setMediaLibrary(library);
          setPermission(result);
        }
      })
      .catch(() => {
        if (mounted) setLibraryError('Audio access could not be checked. Try again.');
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'doNotMix',
      shouldPlayInBackground: true,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(FAVORITES_KEY)
      .then((stored) => {
        if (!mounted || !stored) return;
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
          setFavoriteIds(parsed);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setFavoritesLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!favoritesLoaded) return;
    void AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds)).catch(
      () => undefined,
    );
  }, [favoriteIds, favoritesLoaded]);

  const refreshLibrary = useCallback(async () => {
    if (Platform.OS !== 'android' || scanning.current) return;
    scanning.current = true;
    setIsLoadingLibrary(true);
    setLibraryError(null);

    try {
      const library = mediaLibrary ?? (await import('expo-media-library'));
      if (!mediaLibrary) setMediaLibrary(library);
      const assets = await new library.Query()
        .eq(library.AssetField.MEDIA_TYPE, library.MediaType.AUDIO)
        .orderBy(library.AssetField.CREATION_TIME)
        .exe();
      const found = await Promise.all(
        assets.map(async (asset) => trackFromAsset(await asset.getInfo())),
      );

      found.sort((left, right) => left.title.localeCompare(right.title));
      setTracks(found);
    } catch {
      setLibraryError('Your music library could not be scanned. Try again.');
    } finally {
      setIsLoadingLibrary(false);
      scanning.current = false;
    }
  }, [mediaLibrary]);

  useEffect(() => {
    if (permission?.granted && Platform.OS === 'android') {
      void refreshLibrary();
    }
  }, [permission?.granted, refreshLibrary]);

  const requestLibraryAccess = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    setLibraryError(null);
    try {
      const library = mediaLibrary ?? (await import('expo-media-library'));
      setMediaLibrary(library);
      const result = await library.requestPermissionsAsync(false, ['audio']);
      setPermission(result);
      if (result.granted) await refreshLibrary();
    } catch {
      setLibraryError('Audio access could not be requested. Try again.');
    }
  }, [mediaLibrary, refreshLibrary]);

  const playTrack = useCallback(
    (track: Track, nextQueue: Track[] = tracks) => {
      const activeQueue = nextQueue.length > 0 ? nextQueue : tracks;
      setQueue(activeQueue);
      setCurrentTrack(track);
      setPlaybackError(null);
      try {
        player.replace({ uri: track.uri, name: track.title });
        player.play();
        if (Platform.OS !== 'web') {
          player.setActiveForLockScreen(
            true,
            { title: track.title, artist: track.artist },
            { showSeekBackward: false, showSeekForward: false },
          );
        }
      } catch {
        setPlaybackError('This audio file could not be played.');
      }
    },
    [player, tracks],
  );

  const playNext = useCallback(() => {
    const activeQueue = queue.length ? queue : tracks;
    if (!activeQueue.length) return;
    const currentIndex = activeQueue.findIndex((track) => track.id === currentTrack?.id);
    if (shuffleEnabled && activeQueue.length > 1) {
      const choices = activeQueue.filter((track) => track.id !== currentTrack?.id);
      playTrack(choices[Math.floor(Math.random() * choices.length)], activeQueue);
      return;
    }
    const nextIndex = currentIndex + 1;
    if (nextIndex >= activeQueue.length && repeatMode !== 'all') return;
    playTrack(activeQueue[nextIndex % activeQueue.length], activeQueue);
  }, [currentTrack?.id, playTrack, queue, repeatMode, shuffleEnabled, tracks]);

  const playPrevious = useCallback(() => {
    if (status.currentTime > 3) {
      void player.seekTo(0);
      return;
    }
    const activeQueue = queue.length ? queue : tracks;
    if (!activeQueue.length) return;
    const currentIndex = activeQueue.findIndex((track) => track.id === currentTrack?.id);
    const previousIndex =
      currentIndex <= 0
        ? repeatMode === 'all'
          ? activeQueue.length - 1
          : 0
        : currentIndex - 1;
    playTrack(activeQueue[previousIndex], activeQueue);
  }, [currentTrack?.id, playTrack, player, queue, repeatMode, status.currentTime, tracks]);

  const togglePlayback = useCallback(() => {
    if (!currentTrack) {
      if (tracks.length) playTrack(tracks[0], tracks);
      return;
    }
    if (status.playing) player.pause();
    else player.play();
  }, [currentTrack, playTrack, player, status.playing, tracks]);

  const playAll = useCallback(
    (nextQueue: Track[]) => {
      if (nextQueue.length) playTrack(nextQueue[0], nextQueue);
    },
    [playTrack],
  );

  const seekTo = useCallback(
    (seconds: number) => {
      const maximum = status.duration || currentTrack?.duration || 0;
      void player.seekTo(Math.max(0, Math.min(seconds, maximum)));
    },
    [currentTrack?.duration, player, status.duration],
  );

  const toggleFavorite = useCallback((trackId: string) => {
    setFavoriteIds((current) =>
      current.includes(trackId)
        ? current.filter((id) => id !== trackId)
        : [...current, trackId],
    );
  }, []);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((current) =>
      current === 'off' ? 'all' : current === 'all' ? 'one' : 'off',
    );
  }, []);

  useEffect(() => {
    player.loop = repeatMode === 'one';
  }, [player, repeatMode]);

  useEffect(() => {
    if (status.didJustFinish && repeatMode !== 'one') playNext();
  }, [playNext, repeatMode, status.didJustFinish]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      tracks,
      favoriteIds,
      permission,
      isLoadingLibrary,
      libraryError,
      currentTrack,
      isPlaying: status.playing,
      isBuffering: status.isBuffering,
      position: status.currentTime,
      duration: status.duration || currentTrack?.duration || 0,
      playbackError,
      repeatMode,
      shuffleEnabled,
      requestLibraryAccess,
      refreshLibrary,
      playTrack,
      playAll,
      togglePlayback,
      playNext,
      playPrevious,
      seekTo,
      toggleFavorite,
      toggleShuffle: () => setShuffleEnabled((enabled) => !enabled),
      cycleRepeatMode,
    }),
    [
      tracks,
      favoriteIds,
      permission,
      isLoadingLibrary,
      libraryError,
      currentTrack,
      status.playing,
      status.isBuffering,
      status.currentTime,
      status.duration,
      playbackError,
      repeatMode,
      shuffleEnabled,
      requestLibraryAccess,
      refreshLibrary,
      playTrack,
      playAll,
      togglePlayback,
      playNext,
      playPrevious,
      seekTo,
      toggleFavorite,
      cycleRepeatMode,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
}
