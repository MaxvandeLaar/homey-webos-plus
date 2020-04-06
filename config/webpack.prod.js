const path = require('path');
const webpack = require('webpack');
const JavaScriptObfuscator = require('webpack-obfuscator');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const packageJson = require("../package.json");
const NpmZipInstall = require('./plugin');

module.exports = env => {
  const distFolder = `dist/homey-webos-plus-v${packageJson.version}`;

  return {
    entry: {
      app: './app',
      'drivers/webos_plus/driver': './drivers/webos_plus/driver',
      'drivers/webos_plus/device': './drivers/webos_plus/device'
    },
    externals: {
      'homey': 'commonjs homey',
      'websocket': 'commonjs websocket',
      'jimp-compact': 'commonjs jimp-compact'
    },
    mode: 'production',
    target: 'node',
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, `../${distFolder}`),
      libraryTarget: 'umd'
    },
    plugins: [
      new CleanWebpackPlugin(),
      new CopyPlugin([
        {from: './package.json', to: './'},
        {from: './assets', to: './assets'},
        {from: './locales', to: './locales'},
        {from: './app.json', to: './'},
        {from: './drivers/webos_plus/assets', to: './drivers/webos_plus/assets'},
        {from: './drivers/webos_plus/driver.js', to: './drivers/webos_plus/'},
      ]),
      new JavaScriptObfuscator ({
        rotateUnicodeArray: true,
        debugProtection: true,
        compact: true,
        identifierNamesGenerator: "hexadecimal",
        shuffleStringArray: true,
        splitStrings: true,
        stringArrayEncoding: "rc4"
      }),
      new NpmZipInstall()
    ]
  };
};
