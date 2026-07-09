import {
  useFonts,
  Newsreader_400Regular,
  Newsreader_700Bold,
} from '@expo-google-fonts/newsreader';

import {
  Manrope_400Regular,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';

export const fontFamilies = {
  newsreader: 'Newsreader_400Regular',
  newsreaderBold: 'Newsreader_700Bold',
  manrope: 'Manrope_400Regular',
  manropeSemi: 'Manrope_600SemiBold',
  manropeBold: 'Manrope_700Bold',
};

export const useCustomFonts = () => {
  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_700Bold,
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  return fontsLoaded;
};