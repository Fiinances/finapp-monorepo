const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// react-dom é importado por react-aria (dependência web do gluestack-ui/themed).
// Em React Native não existe react-dom, então redirecionamos para um shim vazio.
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    'react-dom': path.resolve(__dirname, 'shims/react-dom.js'),
    // react-native-linear-gradient requer native build; redirecionamos para expo-linear-gradient
    'react-native-linear-gradient': path.resolve(__dirname, 'shims/react-native-linear-gradient.js'),
  },
};

module.exports = withNativeWind(config, { input: './src/global.css' });
