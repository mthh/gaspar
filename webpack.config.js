const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const ReplaceHashWebpackPlugin = require('replace-hash-webpack-plugin');
const zopfli = require('@gfx/zopfli');
const { name, version } = require('./package.json');


module.exports = [
  {
    entry: {
      app: './src/js/index.js',
    },
    output: {
      filename: '[name].[hash:6].js',
      publicPath: '',
    },
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    module: {
      rules: [
        {
          test: /\.js$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    targets: {
                      browsers: [
                        'last 2 Chrome versions',
                        'last 2 Firefox versions',
                        'last 1 Safari version',
                        'last 1 Opera version',
                      ],
                    },
                  },
                ],
              ],
              plugins: ['syntax-dynamic-import'],
            },
          },
          exclude: [
            /node_modules/,
          ],
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                ident: 'postcss',
                plugins: [
                  require('autoprefixer')(), // eslint-disable-line
                ],
              },
            },
          ],
        },
        {
          // find these extensions in our css, copy the files to the outputPath,
          // and rewrite the url() in our css to point them to the new (copied) location
          test: /\.(woff(2)?|eot|otf|ttf|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          use: {
            loader: 'file-loader',
            options: {
              outputPath: 'fonts/',
            },
          },
        },
        {
          test: /\.(png|svg|jpg|gif)$/,
          use: [
            'file-loader',
          ],
        },
      ],
    },
    // optimization: {
    //   splitChunks: {
    //     cacheGroups: {
    //       commons: {
    //         test: /[\\/]node_modules[\\/]/,
    //         name: 'vendor',
    //         chunks: 'all',
    //       },
    //     },
    //   },
    // },
    optimization: {
      // runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 0,
        cacheGroups: {
          ol: {
            test: /[\\/]node_modules[\\/](ol)[\\/]/,
            name: 'ol',
          },
          itownsthree: {
            test: /[\\/]node_modules[\\/](three|itowns)[\\/]/,
            name: 'itownsthree',
          },
          vendor: {
            test: /[\\/]node_modules[\\/](!ol)(!three)(!itowns)[\\/]/,
            name: 'vendor',
          },
        },
      },
    },
    plugins: [
      new CleanWebpackPlugin({
        cleanAfterEveryBuildPatterns: ['dist/*.*'],
        watch: true,
      }),
      new webpack.ProvidePlugin({
        Promise: 'bluebird',
      }),
      new ReplaceHashWebpackPlugin({
        cwd: 'src',
        src: '**/*.html',
        dest: 'dist',
      }),
      new webpack.DefinePlugin({
        CHOUCAS_VERSION: JSON.stringify(version),
        APPLICATION_NAME: JSON.stringify(name),
      }),
      new FaviconsWebpackPlugin({
        logo: './src/img/logo-choucas-small.png',
        mode: 'webapp',
        devMode: 'webapp',
        favicons: {
          appName: name,
          icons: {
            android: false,
            appleIcon: false,
            appleStartup: false,
            coast: false,
            favicons: true,
            firefox: false,
            yandex: false,
            windows: false,
          },
        },
      }),
    ],
    watchOptions: {
      poll: true,
    },
  },
];

if (process.env.NODE_ENV === 'production') {
  // Theorically aiohttp should use the .gz version of the files when
  // they exist (https://docs.aiohttp.org/en/stable/web_reference.html#aiohttp.web.UrlDispatcher.add_static)
  module.exports[0].plugins.push(
    new CompressionPlugin({
      compressionOptions: { numiterations: 15 },
      algorithm(input, compressionOptions, callback) {
        return zopfli.gzip(input, compressionOptions, callback);
      },
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
      deleteOriginalAssets: false,
    }),
  );
}
