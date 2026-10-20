const palette = {
  text: '#FFFFFF',
  tint: '#00E5FF',
  background: '#0A0B1A',
  foreground: '#FFFFFF',
  card: '#1A0B2E',
  cardForeground: '#FFFFFF',
  primary: '#00E5FF',
  primaryForeground: '#0A0B1A',
  secondary: '#9D4EDD',
  secondaryForeground: '#FFFFFF',
  muted: '#211633',
  mutedForeground: '#A0A0B0',
  accent: '#281640',
  accentForeground: '#00E5FF',
  destructive: '#FF6B7B',
  destructiveForeground: '#FFFFFF',
  border: 'rgba(255,255,255,0.12)',
  input: 'rgba(255,255,255,0.16)',
  surfaceRaised: '#24113D',
  track: '#30213E',
  glassBorder: 'rgba(255,255,255,0.16)',
  glassBackground: 'rgba(26,11,46,0.84)',
  cyanSoft: 'rgba(0,229,255,0.19)',
  cyanLine: 'rgba(0,229,255,0.48)',
  whiteLine: 'rgba(255,255,255,0.19)',
  whiteLineSubtle: 'rgba(255,255,255,0.15)',
  whiteFaint: 'rgba(255,255,255,0.23)',
  whiteStrong: 'rgba(255,255,255,0.38)',
  whiteMuted: 'rgba(255,255,255,0.7)',
  shadow: '#000000',
  visualizerColors: ['#9D4EDD', '#00E5FF', '#37D98B', '#FFD166', '#FF5364'] as const,
};

const colors = {
  // The SIDE A experience is intentionally dark regardless of device appearance.
  light: palette,
  dark: palette,
  radius: 24,
};

export default colors;
