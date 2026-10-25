# nzxt

A server side rendering framework for zheleznaya..

See [documentation]([https://217.142.230.147/](https://nzxt-docs.naoki-tomita.deno.net/))

## Runtimes

nzxt runs on both Node.js and Deno.

nzxt uses zheleznaya 0.3, which is an ES module only package, so Node.js
20.19+ / 22.12+ (or Deno 2) is required.

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

Pages that need state use `useStore` from `nzxt/h` (zheleznaya 0.3 no longer
provides a global `useStore`):

```tsx
import { Component, h, useStore } from "nzxt/h";

const Counter: Component<{ count: number }> = ({ count }) => {
  const state = useStore({ count });
  return <button onclick={() => state.count++}>{state.count}</button>;
}
```

This repository's own `deno.json` additionally enables `"unstable": ["detect-cjs"]`,
which is only needed here because `bin/nzxt.js` and `dst/` are CommonJS files
living outside `node_modules`.
