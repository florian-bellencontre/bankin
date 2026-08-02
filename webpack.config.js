/**
 * This konnector ships TWO bundles, because it runs on both sides:
 *
 * - build/main.js  : the client-side (clisk) part, loaded by the flagship app
 *                    in a webview. It signs the user in (they solve the
 *                    captcha themselves) and calls the Bankin' API from the
 *                    phone, so every request comes from the user's own IP.
 * - build/index.js : the server-side part, started by the client one through
 *                    runServerJob. It only writes io.cozy.bank.* documents,
 *                    which the clisk bridge cannot do.
 */
const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const webpack = require('webpack')
const fs = require('fs')
const SvgoInstance = require('svgo')

const readManifest = () =>
  JSON.parse(fs.readFileSync(path.join(__dirname, './manifest.konnector')))

const svgo = new SvgoInstance({
  plugins: [
    {
      inlineStyles: { onlyMatchedOnce: false }
    }
  ]
})

let iconName
try {
  iconName = JSON.parse(fs.readFileSync('manifest.konnector', 'utf8')).icon
  // we run optimize only on SVG
  if (!iconName.match(/\.svg$/)) iconName = null
} catch (e) {
  // console.error(`Unable to read the icon path from manifest: ${e}`)
}
const appIconRX = iconName && new RegExp(`[^/]*/${iconName}`)

function optimizeSVGIcon(buffer, path) {
  if (appIconRX && path.match(appIconRX)) {
    return svgo.optimize(buffer).then(resp => resp.data)
  } else {
    return buffer
  }
}

// The client bundle is the one talking to Bankin' now, so it needs the API
// client id/secret too; the server bundle keeps them for standalone runs.
const environmentPlugin = () =>
  new webpack.EnvironmentPlugin({
    DEFAULT_CLIENT_ID: null,
    DEFAULT_CLIENT_SECRET: null
  })

const serverConfig = {
  name: 'server',
  entry: path.join(__dirname, 'src/index.js'),
  target: 'node',
  mode: 'none',
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'index.js'
  },
  plugins: [
    // Only this half copies the static files, so that both halves writing to
    // the same build/ directory do not race on them.
    new CopyPlugin({
      patterns: [
        { from: 'manifest.konnector' },
        { from: 'package.json' },
        { from: 'README.md' },
        { from: 'assets', transform: optimizeSVGIcon },
        { from: '.travis.yml' },
        { from: 'LICENSE' }
      ]
    }),
    new webpack.DefinePlugin({
      __WEBPACK_PROVIDED_MANIFEST__: JSON.stringify(readManifest())
    }),
    environmentPlugin()
  ],
  module: {
    // to ignore the warnings like :
    // WARNING in ../libs/node_modules/bindings/bindings.js 76:22-40
    // Critical dependency: the request of a dependency is an expression
    // Since we cannot change this dependency. I think it won't hide more important messages
    exprContextCritical: false
  }
}

const clientConfig = {
  name: 'client',
  entry: path.join(__dirname, 'src/client.js'),
  // runs in a webview, not in node
  target: 'web',
  mode: 'none',
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'main.js'
  },
  plugins: [environmentPlugin()],
  module: {
    exprContextCritical: false
  }
}

module.exports = [serverConfig, clientConfig]
