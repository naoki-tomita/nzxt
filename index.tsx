import { readdir, stat, writeFile, mkdir, readFile } from "fs/promises";
import { build } from "esbuild";
import { express } from "summer-framework/dist/Express";
import { join, extname } from "path";
import { renderToText, h } from "zheleznaya";
import { Component } from "./h";
import { Document as _Document, Error as _Error } from "./DefaultComponents";

async function getFiles(rootPath: string): Promise<string[]> {
  const names = await readdir(rootPath);
  const list = await Promise.all(names.map(async it => ({
    path: join(rootPath, it),
    stat: await stat(join(rootPath, it))
  })));
  const files = list.filter(it => it.stat.isFile()).map(it => it.path);
  const dirs = list.filter(it => !it.stat.isFile()).map(it => it.path);
  return [...files, ...(await Promise.all(dirs.map(it => getFiles(it)))).flat()];
}

async function generateCode(file: string): Promise<void> {
  const hash = file.replace(/\//g, "_").replace(/\./g, "_");
  const tmpFilePath = `./.tmp/main.${hash}.tsx`;
  await writeFile(tmpFilePath, `
    declare const parameter;
    import { render, h } from "zheleznaya";
    import Component from "../${file.replace(".tsx", "").replace(".jsx", "")}";
    (function (params: any) {
      render(<Component {...params} />, document.getElementById("nzxt-app"));
    })(parameter);
  `);
}

async function buildCode(file: string): Promise<string> {
  const hash = file.replace(/\//g, "_").replace(/\./g, "_");
  const tmpFilePath = `./.tmp/main.${hash}.tsx`;
  const start = Date.now();
  console.log(`Building ${file}...`);
  const { outputFiles: [{ text: code }], warnings } = await build({
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

function toCodeTemplate(code: string): (parameter: { [key: string]: string }) => string {
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

async function getCodeTemplate(file: string) {
  const code = await buildCode(file);
  return toCodeTemplate(code);
}

const DocType = "<!DOCTYPE html>"

async function buildCommand() {
  await mkdir(".tmp", { recursive: true });
  const root = "pages";
  const files = await getFiles(root)

  await Promise.all(
    files.map(async file => {
      const path = file
        .replace(/\/_(.+)_\//g, "/:$1/") // pages/_id_/foo.tsx => pages/:id/foo.tsx
        .replace(/\/_(.+)_\./g, "/:$1.") // pages/xxx/_id_.tsx => pages/xxx/:id.tsx
        .replace(/\/(.*)\.tsx$/g, "/$1") // pages/xxx/foo.tsx => pages/xxx/foo
        .replace(root, "") // pages/xxx/foo => /xxx replace only 1 time.
        .replace(/\/index$/g, ""); // /xxx/index => /xxx

      if (path.includes("_error")) return;
      if (path.includes("_document")) return;
      if (path.includes("_app")) return; // TODO: _app.

      await generateCode(file);
    })
  );
}

function tryImportOrRequire(path: string): Promise<{ default: Component<any> }> | { default: Component<any> } {
  try {
    return import(path);
  } catch (e) {
    console.warn("Failed to import", e);
    return require(path);
  }
}

const ContentTypeHeader = { "content-type": "text/html" }

async function serveCommand() {
  const root = "pages";
  const files = await getFiles(root);
  const Document = files.some(it => it.startsWith("pages/_document.tsx"))
    ? (await tryImportOrRequire(join(process.cwd(), "pages", "_document.tsx"))).default
    : _Document;
  const Error: Component<{ error: any }> = files.some(it => it.startsWith("pages/_error"))
    ? (await tryImportOrRequire(join(process.cwd(), "pages", "_error.tsx"))).default
    : _Error;

  const app = express();
  Promise.all(files.map(async file => {
    const path = file
        .replace(/\/_(.+)_\//g, "/:$1/") // pages/_id_/foo.tsx => pages/:id/foo.tsx
        .replace(/\/_(.+)_\./g, "/:$1.") // pages/xxx/_id_.tsx => pages/xxx/:id.tsx
        .replace(/\/(.*)\.tsx$/g, "/$1") // pages/xxx/foo.tsx => pages/xxx/foo
        .replace(root, "") // pages/xxx/foo => /xxx replace only 1 time.
        .replace(/\/index$/g, ""); // /xxx/index => /xxx

      if (path.includes("_error")) return;
      if (path.includes("_document")) return;
      if (path.includes("_app")) return; // TODO: _app.
    const codeTemplate = await getCodeTemplate(file);
    app.get(path, async (req, res) => {
      try {
        const { default: Component } = await tryImportOrRequire(join(process.cwd(), `${file}`));
        const initialProps = typeof Component.getInitialPrpos === "function"
          ? await Component.getInitialPrpos({ params: req.params })
          : {};
        const html = renderToText(
          <Document>
            <div id="nzxt-app">
            <Component {...initialProps} />
            </div>
            <script>
            {codeTemplate(initialProps)}
            </script>
          </Document>
        ).trim().replaceAll(">___SSR_STYLE_REPLACER___<", ">" + ((globalThis as any)?.__ssrRenderedStyle ?? "") + "<");
        res
          .status(200)
          .header(ContentTypeHeader)
          .body(DocType + html);
      } catch (e) {
        const html = renderToText(
          <Document>
            <Error error={e} />
          </Document>
        ).trim();
        res
          .status(500)
          .header(ContentTypeHeader)
          .body(DocType + html);
      }
    });
  }));

  app.get("/images/:filename", async (req, res) => {
    const { filename } = req.params;
    const file = await readFile(join("./public/images", filename));
    res
      .status(200)
      .header({ "content-type": ContentTypes[extname(filename) as keyof typeof ContentTypes] })
      .header({ "cache-control": "max-age=604800" })
      .end(file);
  });
  return app as unknown as {
    close(): void;
    listen(port: number): Promise<void>;
  };

}

export async function command(command?: string) {
  command = command ?? process.argv[2] ?? "start";
  if (command === "build") {
    await buildCommand();
  } else if (command === "start") {
    await buildCommand();
    return serveCommand();
  } else if (command === "serve") {
    return serveCommand();
  }
}

export async function create() {
  return serveCommand();
}

const ContentTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml"
}

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
]
