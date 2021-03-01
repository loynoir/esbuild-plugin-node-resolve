# Introduction
esbuild-plugin-node-resolve is an [esbuild](https://github.com/evanw/esbuild) plugin resolve modules respect env NODE_PATH.

# Install
```sh
npm i loynoir/esbuild-plugin-node-resolve
```

# Features
1. Shrink path comment in unminified bundle. 
2. Browserify alike.
3. Custom-able import behavior.

# Features Explain
1. If you have library apple and pine in NODE_PATH, `/a/long/path/to/node_modules`. Normally, esbuild without minify leave a bundle like
```js
// without plugin
// /a/long/and/you/dont/want/it/to/show/up/in/unminified/bundle/path/to/node_modules/foo/bar.js
/* some code */

// with plugin
// node_modules:foo/bar.js
/* some code */
```

2. Webpack, for example, can replace node builtin module `buffer` with [feross/buffer](https://github.com/feross/buffer). 
With this plugin, you can do that too.
```js
// your nodejs code
import {Buffer} from 'buffer'
```
`npm install buffer` first, then add below to your esbuild script.
```js
// `` first
NodeResolvePlugin({ alias: { 'buffer':require.resolve('buffer/index.js') } })
```

3. You can hook something with parameter `getNamedImportPath`.


# Usage
```js
#!/usr/bin/env node
const { NodeResolvePlugin, getNamedImportPath } = require('esbuild-plugin-node-resolve');

esbuild
  .build({
  
    // ... your other esbuild options goes here
    
    plugins: [
      NodeResolvePlugin({
        // optional: getNamedImportPath(_:string)
        // getNamedImportPath,
        
        // optional: alias
        // alias: { 'buffer':require.resolve('buffer/index.js') },
        
        // optional: external
        // external: [ 'yaml' ]
        
        // optional: namespace
      }),
    ],
  })
  .catch((err) => {
    // ... your esbuild catch
  });
```

# Output
```js
// loynoir/node_modules:apple/pen.js
/* some code */

// loynoir/node_modules:pine/apple/pen.mjs
/* some code */
```

