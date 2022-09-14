#! /usr/bin/env node
require("source-map-support").install()
const tsconfig = require("../tsconfig.app.json");
require("ts-node").register(tsconfig);

const { create } = require("../index");

create()
  .then(app => app.listen(parseInt(process.env.PORT || "8080", 10)))
  .catch(e => console.error(e));
