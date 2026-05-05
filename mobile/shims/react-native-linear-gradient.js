// Shim para react-native-linear-gradient em Expo Go.
// react-native-linear-gradient requer native build; expo-linear-gradient está incluída no Expo Go.
// react-native-gifted-charts e outros pacotes importam via default import, então re-exportamos
// o componente como default E como named export para compatibilidade.

const { LinearGradient } = require('expo-linear-gradient');

module.exports = LinearGradient;
module.exports.default = LinearGradient;
module.exports.LinearGradient = LinearGradient;
