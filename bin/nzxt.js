#! /usr/bin/env node
require("source-map-support").install()
const tsconfig = require("../tsconfig.app.json");
require("ts-node").register(tsconfig);

const { command } = require("../index");

command()
  .then(app => {
    if (["start", "serve", undefined].includes(process.argv[2])) {
      app.listen(parseInt(process.env.PORT || "8080", 10))
    }
  })
  .catch(e => console.error(e));
