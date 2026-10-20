import colors from '@/constants/colors';

/** Returns the SIDE A dark design tokens and shared corner radius. */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
