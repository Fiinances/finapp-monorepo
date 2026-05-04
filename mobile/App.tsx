import './src/global.css';

import { GluestackUIProvider } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { finappTheme } from './src/theme';

function AppContent() {
  const { isDark } = useTheme();

  return (
    <GluestackUIProvider config={finappTheme} colorMode={isDark ? 'dark' : 'light'}>
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-[#0f1117]' : 'bg-white'}`}>
        <Text className={`text-xl font-semibold ${isDark ? 'text-[#f8f9fc]' : 'text-[#0f1117]'}`}>
          Finapp
        </Text>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </View>
    </GluestackUIProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
