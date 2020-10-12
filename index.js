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
    const hash = file.replace(/\//g, "_").replace(/\./g, "_");
    const tmpFilePath = `./tmp/main.${hash}.tsx`;
    await promises_1.writeFile(tmpFilePath, `
    declare const parameter;
    import { render, h } from "zheleznaya";
    import Component from "../${file.replace(".tsx", "")}";
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
const _Document = (_, children) => {
    return (zheleznaya_1.h("html", { lang: "en" },
        zheleznaya_1.h("head", null,
            zheleznaya_1.h("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
            zheleznaya_1.h("title", null, "Document")),
        zheleznaya_1.h("body", null, children)));
};
async function main() {
    await promises_1.mkdir("tmp", { recursive: true });
    const root = "pages";
    const files = await getFiles(root);
    const app = Express_1.express();
    const Document = files.includes("pages/_document.tsx")
        ? (await Promise.resolve().then(() => __importStar(require(path_1.join(process.cwd(), "pages", "_document"))))).default
        : _Document;
    for (const file of files) {
        const path = file
            .replace(/\/_(.+)_\//g, "/:$1/") // pages/_id_/foo.tsx => pages/:id/foo.tsx
            .replace(/\/_(.+)_\./g, "/:$1.") // pages/xxx/_id_.tsx => pages/xxx/:id.tsx
            .replace(/\/(.*)\.tsx$/g, "/$1") // pages/xxx/foo.tsx => pages/xxx/foo
            .replace(root, "") // pages/xxx/foo => /xxx replace only 1 time.
            .replace(/\/index$/g, ""); // /xxx/index => /xxx
        if (path.includes("_error"))
            continue;
        if (path.includes("_document"))
            continue; // TODO: _document.
        if (path.includes("_app"))
            continue; // TODO: _app.
        const codeGenerator = await generateCode(file);
        app.get(path, async (req, res) => {
            try {
                const { default: Component } = await Promise.resolve().then(() => __importStar(require(path_1.join(process.cwd(), `${file}`))));
                const initialProps = typeof Component.getInitialPrpos === "function"
                    ? await Component.getInitialPrpos({ params: req.params })
                    : {};
                const html = zheleznaya_1.renderToText(zheleznaya_1.h(Document, null,
                    zheleznaya_1.h("div", { id: "nzxt-app" },
                        zheleznaya_1.h(Component, Object.assign({}, initialProps))),
                    zheleznaya_1.h("script", null, codeGenerator(initialProps)))).trim();
                res.status(200).end(html);
            }
            catch (e) {
                const { default: Component } = await Promise.resolve().then(() => __importStar(require(path_1.join(process.cwd(), "pages", "_error"))));
                const html = zheleznaya_1.renderToText(zheleznaya_1.h(Document, null,
                    zheleznaya_1.h(Component, { error: e }))).trim();
                res.status(500).end(html);
            }
        });
    }
    await app.listen(parseInt(process.env.PORT ?? "8080", 10));
}
main();
//# sourceMappingURL=index.js.map