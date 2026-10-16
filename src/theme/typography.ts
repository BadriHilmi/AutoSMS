import { TextStyle } from 'react-native';

export const Typography = {
  fontFamily: 'Sora_400Regular',
  fontFamilyMedium: 'Sora_500Medium',
  fontFamilySemiBold: 'Sora_600SemiBold',
  fontFamilyBold: 'Sora_700Bold',

  // 1. Display / Screen Title (20px)
  h1: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Sora_700Bold',
    includeFontPadding: false,
  } as TextStyle,

  // 2. Section / Card Title (16px)
  h2: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  } as TextStyle,

  // Alias h3 to section/card header
  h3: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  } as TextStyle,

  // 3. Body text (14px)
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Sora_400Regular',
    includeFontPadding: false,
  } as TextStyle,
  bodyMedium: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
  } as TextStyle,
  bodySemiBold: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  } as TextStyle,

  // 4. Caption / Badges / Meta (12px)
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
  } as TextStyle,
  captionSemiBold: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Sora_600SemiBold',
    includeFontPadding: false,
  } as TextStyle,
  small: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'Sora_500Medium',
    includeFontPadding: false,
  } as TextStyle,

  // Tabular Numbers (steady layout metrics)
  number: {
    fontSize: 14,
    fontFamily: 'Sora_700Bold',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  } as TextStyle,
  numberLarge: {
    fontSize: 20,
    fontFamily: 'Sora_700Bold',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  } as TextStyle,
};
