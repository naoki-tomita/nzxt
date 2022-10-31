"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = exports.command = void 0;
const promises_1 = require("fs/promises");
const esbuild_1 = require("esbuild");
const Express_1 = require("summer-framework/dist/Express");
const path_1 = require("path");
const zheleznaya_1 = require("zheleznaya");
async function getFiles(rootPath) {
    const names = await (0, promises_1.readdir)(rootPath);
    const list = await Promise.all(names.map(async (it) => ({
        path: (0, path_1.join)(rootPath, it),
        stat: await (0, promises_1.stat)((0, path_1.join)(rootPath, it))
    })));
    const files = list.filter(it => it.stat.isFile()).map(it => it.path);
    const dirs = list.filter(it => !it.stat.isFile()).map(it => it.path);
    return [...files, ...(await Promise.all(dirs.map(it => getFiles(it)))).flat()];
}
async function generateCode(file) {
    const hash = file.replace(/\//g, "_").replace(/\./g, "_");
    const tmpFilePath = `./.tmp/main.${hash}.tsx`;
    await (0, promises_1.writeFile)(tmpFilePath, `
    declare const parameter;
    import { render, h } from "zheleznaya";
    import Component from "../${file.replace(".tsx", "").replace(".jsx", "")}";
    (function (params: any) {
      render(<Component {...params} />, document.getElementById("nzxt-app"));
    })(parameter);
  `);
}
async function buildCode(file) {
    const hash = file.replace(/\//g, "_").replace(/\./g, "_");
    const tmpFilePath = `./.tmp/main.${hash}.tsx`;
    const start = Date.now();
    console.log(`Building ${file}...`);
    const { outputFiles: [{ text: code }], warnings } = await (0, esbuild_1.build)({
        entryPoints: [tmpFilePath],
        treeShaking: true,
        write: false,
        bundle: true,
        minify: true,
        external: NodeModules,
        tsconfig: "./tsconfig.json"
    });
    warnings.length > 0 && console.warn(warnings.map(it => `${it.text}`).join("\n"));
    console.log(`Built ${file} by ${Date.now() - start}ms`);
    return code;
}
function toCodeTemplate(code) {
    return parameter => `
    var parameter = ${JSON.stringify(parameter)};
    function require(moduleName) {
      var errFn = function() { throw Error("This module is not callable on browser."); }
      var obj = new Proxy(errFn, { get(_, key) { return obj; } });
      return obj;
    };
    ${code}
  `;
}
async function getCodeTemplate(file) {
    const code = await buildCode(file);
    return toCodeTemplate(code);
}
const _Document = (_, children) => {
    return ((0, zheleznaya_1.h)("html", { lang: "en" },
        (0, zheleznaya_1.h)("head", null,
            (0, zheleznaya_1.h)("meta", { name: "viewport", content: "width=device-width, initial-scale=1.0" }),
            (0, zheleznaya_1.h)("title", null, "Document")),
        (0, zheleznaya_1.h)("body", null, children)));
};
const _Error = ({ error }) => {
    return ((0, zheleznaya_1.h)("div", null,
        (0, zheleznaya_1.h)("h1", null, "An error occured"),
        (0, zheleznaya_1.h)("code", null, error.stack)));
};
const DocType = "<!DOCTYPE html>";
async function buildCommand() {
    await (0, promises_1.mkdir)(".tmp", { recursive: true });
    const root = "pages";
    const files = await getFiles(root);
    await Promise.all(files.map(async (file) => {
        const path = file
            .replace(/\/_(.+)_\//g, "/:$1/") // pages/_id_/foo.tsx => pages/:id/foo.tsx
            .replace(/\/_(.+)_\./g, "/:$1.") // pages/xxx/_id_.tsx => pages/xxx/:id.tsx
            .replace(/\/(.*)\.tsx$/g, "/$1") // pages/xxx/foo.tsx => pages/xxx/foo
            .replace(root, "") // pages/xxx/foo => /xxx replace only 1 time.
            .replace(/\/index$/g, ""); // /xxx/index => /xxx
        if (path.includes("_error"))
            return;
        if (path.includes("_document"))
            return;
        if (path.includes("_app"))
            return; // TODO: _app.
        await generateCode(file);
    }));
}
function tryImportOrRequire(path) {
    try {
        return Promise.resolve().then(() => __importStar(require(path)));
    }
    catch (e) {
        console.warn("Failed to import", e);
        return require(path);
    }
}
const ContentTypeHeader = { "content-type": "text/html; charset=utf-8" };
async function serveCommand() {
    const root = "pages";
    const files = await getFiles(root);
    const Document = files.some(it => it.startsWith("pages/_document.tsx"))
        ? (await tryImportOrRequire((0, path_1.join)(process.cwd(), "pages", "_document.tsx"))).default
        : _Document;
    const Error = files.some(it => it.startsWith("pages/_error"))
        ? (await tryImportOrRequire((0, path_1.join)(process.cwd(), "pages", "_error.tsx"))).default
        : _Error;
    const app = (0, Express_1.express)();
    Promise.all(files.map(async (file) => {
        const path = file
            .replace(/\/_(.+)_\//g, "/:$1/") // pages/_id_/foo.tsx => pages/:id/foo.tsx
            .replace(/\/_(.+)_\./g, "/:$1.") // pages/xxx/_id_.tsx => pages/xxx/:id.tsx
            .replace(/\/(.*)\.tsx$/g, "/$1") // pages/xxx/foo.tsx => pages/xxx/foo
            .replace(root, "") // pages/xxx/foo => /xxx replace only 1 time.
            .replace(/\/index$/g, ""); // /xxx/index => /xxx
        if (path.includes("_error"))
            return;
        if (path.includes("_document"))
            return;
        if (path.includes("_app"))
            return; // TODO: _app.
        const codeTemplate = await getCodeTemplate(file);
        app.get(path, async (req, res) => {
            try {
                const { default: Component } = await tryImportOrRequire((0, path_1.join)(process.cwd(), `${file}`));
                const initialProps = typeof Component.getInitialPrpos === "function"
                    ? await Component.getInitialPrpos({ params: req.params })
                    : {};
                const html = (0, zheleznaya_1.renderToText)((0, zheleznaya_1.h)(Document, null,
                    (0, zheleznaya_1.h)("div", { id: "nzxt-app" },
                        (0, zheleznaya_1.h)(Component, { ...initialProps })),
                    (0, zheleznaya_1.h)("script", null, codeTemplate(initialProps)))).trim();
                res
                    .status(200)
                    .header(ContentTypeHeader)
                    .body(DocType + html);
            }
            catch (e) {
                const html = (0, zheleznaya_1.renderToText)((0, zheleznaya_1.h)(Document, null,
                    (0, zheleznaya_1.h)(Error, { error: e }))).trim();
                res
                    .status(500)
                    .header(ContentTypeHeader)
                    .body(DocType + html);
            }
        });
    }));
    app.get("/images/:filename", async (req, res) => {
        const { filename } = req.params;
        const file = await (0, promises_1.readFile)((0, path_1.join)("./public/images", filename));
        res
            .status(200)
            .header({ "content-type": ContentTypes[(0, path_1.extname)(filename)] })
            .end(file);
    });
    return app;
}
async function command(command) {
    command = command ?? process.argv[2] ?? "start";
    if (command === "build") {
        await buildCommand();
    }
    else if (command === "start") {
        await buildCommand();
        return serveCommand();
    }
    else if (command === "serve") {
        return serveCommand();
    }
}
exports.command = command;
async function create() {
    return serveCommand();
}
exports.create = create;
const ContentTypes = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml"
};
const NodeModules = [
    "child_process",
    "assert",
    "async_hooks",
    "buffer",
    "cluster",
    "constants",
    "crypto",
    "dgram",
    "dns",
    "domain",
    "events",
    "fs",
    "fs/promises",
    "http",
    "http2",
    "https",
    "inspector",
    "module",
    "net",
    "os",
    "path",
    "perf_hooks",
    "process",
    "punycode",
    "querystring",
    "readline",
    "repl",
    "stream",
    "string_decoder",
    "timers",
    "tls",
    "trace_events",
    "tty",
    "url",
    "util",
    "v8",
    "vm",
    "wasi",
    "worker_threads",
    "zlib",
];
//# sourceMappingURL=index.js.map