module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', {
        root: ['.'],
        alias: {
          '@': './src',
          '@izara/api-client': './packages/api-client/src',
          '@izara/shared': './packages/shared/src',
        },
      }],
      'react-native-reanimated/plugin',
    ],
  };
};
