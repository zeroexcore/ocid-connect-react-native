const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for React Native components from the SDK


// Add support for resolving modules from the SDK
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

// Ensure React is resolved from this project to prevent multiple instances
config.resolver.alias = {
  'react': path.resolve(__dirname, 'node_modules/react'),
  'react-native': path.resolve(__dirname, 'node_modules/react-native'),
};

// Allow importing from linked packages
config.watchFolders = [
  path.resolve(__dirname, '../..'),
];

module.exports = config;
