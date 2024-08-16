#! /usr/bin/env node
require("source-map-support").install()
const tsconfig = require("../tsconfig.app.json");
require("esbuild-register/dist/node").register({ tsconfigRaw: tsconfig, target: "esnext" });

const { start } = require("../dst/index");

const command = process.argv[2];
if (command === "start" || command == null) {
  start()
    .then(app => {
      if (app) {
        app.listen(parseInt(process.env.PORT || "8080", 10))
      }
    })
    .catch(e => console.error(e));
} else if (command === "generate") {

}
