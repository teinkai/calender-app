
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    liveReload: true,
    hot: true,
    open: false,
    port: 8080,
    static: ['./'],
    proxy: [
      {
        context: ['/extract-schedule', '/health'],
        target: 'http://localhost:8765',
      },
    ],
  },
});
