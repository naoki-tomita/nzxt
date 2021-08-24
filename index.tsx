import { readdir, stat, writeFile, mkdir, readFile } from "fs/promises";
import { build } from "esbuild";
import { express } from "summer-framework/dist/Express";
import { join, extname } from "path";
import { renderToText, h } from "zheleznaya";
import { Component } from "./h";

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

async function generateCode(file: string): Promise<(parameter: { [key: string]: string }) => string> {
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
  console.log(`Building ${file}...`);
  const start = Date.now();
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

const _Document: Component = (_, children) => {
  return (
    <html lang="en">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Document</title>
    </head>
    <body>
      {children}
    </body>
    </html>
  );
}

const _Error: Component<{ error: Error }> = ({ error }) => {
  return (
    <div>
      <h1>An error occured</h1>
      <code>{error.stack}</code>
    </div>
  );
}

const DocType = "<!DOCTYPE html>"

async function main() {
  const command = process.argv[2] ?? "start";
  await mkdir(".tmp", { recursive: true });
  const root = "pages";
  const files = await getFiles(root)
  const app = express();
  const Document = files.some(it => it.startsWith("pages/_document.tsx"))
    ? (await import(join(process.cwd(), "pages", "_document"))).default
    : _Document;
  const Error = files.some(it => it.startsWith("pages/_error"))
    ? (await import(join(process.cwd(), "pages", "_error"))).default
    : _Error;

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

      const codeGenerator = await generateCode(file);
      app.get(path, async (req, res) => {
        try {
          const { default: Component }: { default: Component<{}> } = await import(join(process.cwd(), `${file}`));
          const initialProps = typeof Component.getInitialPrpos === "function"
            ? await Component.getInitialPrpos({ params: req.params })
            : {};
          const html = renderToText(
            <Document>
              <div id="nzxt-app">
                <Component {...initialProps} />
              </div>
              <script>
              {codeGenerator(initialProps)}
              </script>
            </Document>
          ).trim();
          res.status(200).end(DocType + html);
        } catch (e) {
          const html = renderToText(
            <Document>
              <Error error={e} />
            </Document>
          ).trim();
          res.status(500).end(DocType + html);
        }
      });
    })
  );

  if (command === "build") {
    return;
  }
  app.get("/images/:filename", async (req, res) => {
    const { filename } = req.params;
    const file = await readFile(join("./public/images", filename));
    res.status(200).header({ "content-type": ContentTypes[extname(filename) as keyof typeof ContentTypes] }).end(file);
  });
  await app.listen(parseInt(process.env.PORT ?? "8080", 10));
}

const ContentTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".bmp": "image/bmp"
}

main();

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
