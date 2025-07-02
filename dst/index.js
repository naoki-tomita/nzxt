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
exports.start = start;
exports.generate = generate;
const promises_1 = require("fs/promises");
const esbuild_1 = require("esbuild");
const Express_1 = require("summer-framework/dist/Express");
const path_1 = require("path");
const zheleznaya_1 = require("zheleznaya");
const DefaultComponents_1 = require("./DefaultComponents");
const RootDirName = "pages";
const ContentTypeHeader = { "content-type": "text/html" };
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
    const tmpFilePath = createTmpFilePath(file);
    await (0, promises_1.writeFile)(tmpFilePath, `
    declare const parameter;
    import { render, h } from "zheleznaya";
    import Component from "../${file.replace(".tsx", "").replace(".jsx", "")}";
    (function (params: any) {
      render(<Component {...params} />, document.getElementById("nzxt-app"));
    })(parameter);
  `);
}
function createTmpFilePath(filePath) {
    const hash = filePath.replace(/\//g, "_").replace(/\./g, "_");
    return `./.tmp/main.${hash}.tsx`;
}
async function buildJavaScript(file) {
    const tmpFilePath = createTmpFilePath(file);
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
function createCodeTemplate(code) {
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
    const code = await buildJavaScript(file);
    return createCodeTemplate(code);
}
function isErrorComponentTSX(filePath) {
    return filePath.includes("_error");
}
function isDocumentComponentTSX(filePath) {
    return filePath.includes("_document");
}
function isAppComponentTSX(filePath) {
    return filePath.includes("_app");
}
function isSpecialComponentTSX(filePath) {
    return isErrorComponentTSX(filePath) || isDocumentComponentTSX(filePath) || isAppComponentTSX(filePath);
}
const DocType = "<!DOCTYPE html>";
async function generateTemporaryCode() {
    await (0, promises_1.mkdir)(".tmp", { recursive: true });
    const files = await getFiles(RootDirName);
    await Promise.all(files.map(async (file) => {
        if (isSpecialComponentTSX(file))
            return;
        await generateCode(file);
    }));
}
function convertFilePathToUrlPath(filePath) {
    return filePath
        .replace(/\/_(.+)_\//g, "/:$1/") // pages/_id_/foo.tsx => pages/:id/foo.tsx
        .replace(/\/_(.+)_\./g, "/:$1.") // pages/xxx/_id_.tsx => pages/xxx/:id.tsx
        .replace(/\/(.*)\.tsx$/g, "/$1") // pages/xxx/foo.tsx => pages/xxx/foo
        .replace(RootDirName, "") // pages/xxx/foo => /xxx replace only 1 time.
        .replace(/\/index$/g, ""); // /xxx/index => /xxx
}
function tryImportOrRequireForPageComponent(path) {
    try {
        return Promise.resolve(`${path}`).then(s => __importStar(require(s)));
    }
    catch (e) {
        console.warn("Failed to import", e);
        return require(path);
    }
}
async function generateHtml(filePath, params, Document, Error, codeTemplate) {
    try {
        const { default: Component } = await tryImportOrRequireForPageComponent((0, path_1.join)(process.cwd(), filePath));
        const initialProps = typeof Component.getInitialPrpos === "function"
            ? await Component.getInitialPrpos({ params })
            : {};
        const html = (0, zheleznaya_1.renderToText)((0, zheleznaya_1.h)(Document, null,
            (0, zheleznaya_1.h)("div", { id: "nzxt-app" },
                (0, zheleznaya_1.h)(Component, { ...initialProps })),
            (0, zheleznaya_1.h)("script", null, codeTemplate(initialProps)))).trim()
            .replaceAll(">___SSR_STYLE_REPLACER___<", ">" + (globalThis?.__ssrRenderedStyle ?? "") + "<");
        return [200, html];
    }
    catch (e) {
        const html = (0, zheleznaya_1.renderToText)((0, zheleznaya_1.h)(Document, null,
            (0, zheleznaya_1.h)(Error, { error: e }))).trim();
        return [500, html];
    }
}
async function createServer() {
    const files = await getFiles(RootDirName);
    const Document = files.some(it => it.startsWith("pages/_document.tsx"))
        ? (await tryImportOrRequireForPageComponent((0, path_1.join)(process.cwd(), "pages", "_document.tsx"))).default
        : DefaultComponents_1.Document;
    const Error = files.some(it => it.startsWith("pages/_error"))
        ? (await tryImportOrRequireForPageComponent((0, path_1.join)(process.cwd(), "pages", "_error.tsx"))).default
        : DefaultComponents_1.Error;
    const app = (0, Express_1.express)();
    Promise.all(files.map(async (file) => {
        if (isSpecialComponentTSX(file))
            return;
        const path = convertFilePathToUrlPath(file);
        const codeTemplate = await getCodeTemplate(file);
        app.get(path, async (req, res) => {
            const [status, html] = await generateHtml(file, req.params, Document, Error, codeTemplate);
            res
                .status(status)
                .header(ContentTypeHeader)
                .end(DocType + html);
        });
    }));
    app.get("/images/:filename", async (req, res) => {
        const { filename } = req.params;
        const file = await (0, promises_1.readFile)((0, path_1.join)("./public/images", filename));
        res
            .status(200)
            .header({ "content-type": ContentTypes[(0, path_1.extname)(filename)] })
            .header({ "cache-control": "max-age=604800" })
            .end(file);
    });
    return app;
}
async function start() {
    await generateTemporaryCode();
    return createServer();
}
function getSimiralityFilePath(filePaths, path) {
    const splittedPath = path.split("/");
    for (const current of filePaths) {
        const urlPath = convertFilePathToUrlPath(current);
        const splittedUrlPath = urlPath.split("/");
        if (splittedPath.length !== splittedUrlPath.length)
            continue;
        if (splittedUrlPath.every((it, i) => (it.startsWith(":") || it === splittedPath[i]))) {
            return current;
        }
    }
    return;
}
async function generate(rawUrl) {
    await generateTemporaryCode();
    const url = new URL(rawUrl);
    const files = await getFiles(RootDirName);
    const Document = files.some(it => it.startsWith("pages/_document.tsx"))
        ? (await tryImportOrRequireForPageComponent((0, path_1.join)(process.cwd(), "pages", "_document.tsx"))).default
        : DefaultComponents_1.Document;
    const Error = files.some(it => it.startsWith("pages/_error"))
        ? (await tryImportOrRequireForPageComponent((0, path_1.join)(process.cwd(), "pages", "_error.tsx"))).default
        : DefaultComponents_1.Error;
    const path = url.pathname;
    const mostSimilarFile = getSimiralityFilePath(files, path);
    const codeTemplate = await getCodeTemplate(mostSimilarFile);
    const [_, html] = await generateHtml(mostSimilarFile, {}, Document, Error, codeTemplate);
    return DocType + html;
}
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