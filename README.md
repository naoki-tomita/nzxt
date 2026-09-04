# nzxt

A server side rendering framework for zheleznaya..

See [documentation](https://217.142.230.147/)

## Runtimes

nzxt runs on both Node.js and Deno. Dependencies are installed with npm/yarn in
either case, Deno reads the same `node_modules`.

```sh
yarn install

# Node.js
node bin/nzxt.js

# Deno
deno task start
```

A Deno project using nzxt needs a `deno.json` telling Deno how to compile the
JSX in `pages/`, and `node_modules` installed by npm/yarn:

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h"
  },
  "nodeModulesDir": "manual"
}
```

This repository's own `deno.json` additionally enables `"unstable": ["detect-cjs"]`,
which is only needed because `bin/nzxt.js` and `dst/` are CommonJS files living
outside `node_modules`.
