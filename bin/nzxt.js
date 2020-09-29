#! /usr/bin/env node
require("source-map-support").install()
const tsconfig = require("../tsconfig.app.json");
require("ts-node").register(tsconfig);

require("../index");
