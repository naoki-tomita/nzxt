# nzxt

A server side rendering framework for zheleznaya..

See [documentation](https://217.142.230.147/)

## Runtimes

nzxt runs on both Node.js and Deno.

```sh
# Node.js
yarn install
node bin/nzxt.js

# Deno (no npm/yarn needed, Deno installs the dependencies itself)
deno task start
```

Both runtimes read the same `package.json` and the same `node_modules`, so
either installer works for either runtime.

A Deno project using nzxt needs a `deno.json` telling Deno how to compile the
JSX in `pages/`:

```json
{
  "compilerOptions": {
    "jsx": "react",
    "jsxFactory": "h"
  }
}
```

This repository's own `deno.json` additionally enables `"unstable": ["detect-cjs"]`,
which is only needed here because `bin/nzxt.js` and `dst/` are CommonJS files
living outside `node_modules`.
