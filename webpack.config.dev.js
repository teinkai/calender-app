
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    liveReload: true,
    hot: true,
    open: false,
    port: 57901,
    static: ['./'],
    proxy: [
      {
        context: ['/extract-schedule', '/health'],
        target: 'http://localhost:56999',
      },
    ],
  },
});
