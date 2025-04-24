/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    // Disable webpack cache globally to prevent cache-related errors
    config.cache = false;
    
    // Игнорировать критические ошибки связанные с require-addon и sodium-native
    config.ignoreWarnings = [
      { module: /require-addon\/lib\/runtime\/bare\.js/ },
      { module: /require-addon\/lib\/runtime\/default\.js/ },
      { module: /require-addon\/lib\/runtime\/node\.js/ },
      { module: /sodium-native\/index\.js/ }
    ];
    
    // Добавить fallback для node.js модулей
    config.resolve.fallback = {
      ...config.resolve.fallback,
      net: false,
      tls: false,
      fs: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      path: require.resolve('path-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      zlib: require.resolve('browserify-zlib'),
      os: require.resolve('os-browserify/browser')
    };
    
    // Добавить алиасы для некоторых проблемных модулей
    config.resolve.alias = {
      ...config.resolve.alias,
      // Предотвращаем ошибки с sodium-native
      'sodium-native': false,
      // Предотвращаем некоторые проблемы с buffer
      buffer: require.resolve('buffer/'),
    };
    
    // Добавляем полифиллы для Node.js API
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser',
      })
    );
    
    return config;
  },
};

module.exports = nextConfig;