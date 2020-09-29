"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = require("fs/promises");
const Express_1 = require("summer-framework/dist/Express");
const parcel_1 = __importDefault(require("parcel"));
const path_1 = require("path");
const zheleznaya_1 = require("zheleznaya");
async function getFiles(rootPath) {
    const names = await promises_1.readdir(rootPath);
    const list = await Promise.all(names.map(async (it) => ({
        path: path_1.join(rootPath, it),
        stat: await promises_1.stat(path_1.join(rootPath, it))
    })));
    const files = list.filter(it => it.stat.isFile()).map(it => it.path);
    const dirs = list.filter(it => !it.stat.isFile()).map(it => it.path);
    return [...files, ...(await Promise.all(dirs.map(it => getFiles(it)))).flat()];
}
async function generateCode(file) {
    const hash = file.replace(/\//g, "_");
    const tmpFilePath = `./.tmp/main.${hash}.tsx`;
    await promises_1.writeFile(tmpFilePath, `
    declare const parameter;
    import { render, h } from "zheleznaya";
    import Component from "../${file}";
    (function (params: any) {
      render(<Component {...params} />, document.getElementById("nzxt-app"));
    })(parameter);
  `);
    const bundler = new parcel_1.default([tmpFilePath], {
        watch: false,
        sourceMaps: false,
        production: true,
    });
    const result = await bundler.bundle();
    const code = await promises_1.readFile(result.name);
    return parameter => `var parameter = ${JSON.stringify(parameter)}; ${code}`;
}
function generateHtml(code, renderedHtml) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <div id="nzxt-app">${renderedHtml}</div>
  <script>
    ${code}
  </script>
</body>
</html>
  `;
}
async function main() {
    await promises_1.mkdir(".tmp", { recursive: true });
    const root = "pages";
    const files = await getFiles(root);
    const app = Express_1.express();
    await Promise.all(files.map(async (file) => {
        const path = file
            .replace(/_(.+)_/g, ":$1")
            .replace(root, "")
            .replace(/\/(.*)\.tsx$/g, "/$1")
            .replace(/\/index$/g, "");
        const codeGenerator = await generateCode(file);
        app.get(path, async (req, res) => {
            try {
                const { default: Component } = await Promise.resolve().then(() => __importStar(require(`./${file}`)));
                const html = generateHtml(codeGenerator(req.params).trim(), zheleznaya_1.renderToText(zheleznaya_1.h(Component, Object.assign({}, req.params))).trim());
                res.status(200).end(html);
            }
            catch (e) {
                console.error(e);
                res.status(500).end("error");
            }
        });
    }));
    await app.listen(8080);
}
main();
//# sourceMappingURL=index.js.map