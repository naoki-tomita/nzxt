import { readdir, stat, writeFile, mkdir, readFile } from "fs/promises";
import { build } from "esbuild";
import { express } from "summer-framework/dist/Express";
import { join, extname } from "path";
import { renderToText, h } from "zheleznaya";
import { Component } from "./h";
import { Document as _Document, Error as _Error } from "./DefaultComponents";

type Brand<K, T> = K & { __brand: T };
type CodeTemplate = (props: Props) => JavaScriptWithProps;
type JavaScript = Brand<string, "JavaScript">;
type JavaScriptWithProps = Brand<string, "JavaScriptWithProps">;
type Html = Brand<string, "Html">;
type StatusCode = Brand<number, "StatusCode">;
type UserCreatedTSXFilePath = Brand<string, "UserCreatedTSXFilePath">;
type GeneratedTSXFilePath = Brand<string, "GeneratedTSXFilePath">;
type Props = Brand<{ [key: string]: any }, "Props">;
type UrlPath = Brand<string, "UrlPath">;
const RootDirName = "pages";
const ContentTypeHeader = { "content-type": "text/html" };

async function getFiles(rootPath: string): Promise<UserCreatedTSXFilePath[]> {
  const names = await readdir(rootPath);
  const list = await Promise.all(names.map(async it => ({
    path: join(rootPath, it),
    stat: await stat(join(rootPath, it))
  })));
  const files = list.filter(it => it.stat.isFile()).map(it => it.path as UserCreatedTSXFilePath);
  const dirs = list.filter(it => !it.stat.isFile()).map(it => it.path);
  return [...files, ...(await Promise.all(dirs.map(it => getFiles(it)))).flat()];
}

async function generateCode(file: UserCreatedTSXFilePath): Promise<void> {
  const tmpFilePath = createTmpFilePath(file);
  await writeFile(tmpFilePath, `
    declare const parameter;
    import { render, h } from "zheleznaya";
    import Component from "../${file.replace(".tsx", "").replace(".jsx", "")}";
    (function (params: any) {
      render(<Component {...params} />, document.getElementById("nzxt-app"));
    })(parameter);
  `);
}

function createTmpFilePath(filePath: UserCreatedTSXFilePath): GeneratedTSXFilePath {
  const hash = filePath.replace(/\//g, "_").replace(/\./g, "_");
  return `./.tmp/main.${hash}.tsx` as GeneratedTSXFilePath;
}

async function buildJavaScript(file: UserCreatedTSXFilePath): Promise<JavaScript> {
  const tmpFilePath = createTmpFilePath(file);
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
  return code as JavaScript;
}

function createCodeTemplate(code: JavaScript): (parameter: Props) => JavaScriptWithProps {
  return parameter => `
    var parameter = ${JSON.stringify(parameter)};
    function require(moduleName) {
      var errFn = function() { throw Error("This module is not callable on browser."); }
      var obj = new Proxy(errFn, { get(_, key) { return obj; } });
      return obj;
    };
    ${code}
  ` as JavaScriptWithProps;
}

async function getCodeTemplate(file: UserCreatedTSXFilePath): Promise<CodeTemplate> {
  const code = await buildJavaScript(file);
  return createCodeTemplate(code);
}

function isErrorComponentTSX(filePath: UserCreatedTSXFilePath): boolean {
  return filePath.includes("_error");
}

function isDocumentComponentTSX(filePath: UserCreatedTSXFilePath): boolean {
  return filePath.includes("_document");
}

function isAppComponentTSX(filePath: UserCreatedTSXFilePath): boolean {
  return filePath.includes("_app");
}

function isSpecialComponentTSX(filePath: UserCreatedTSXFilePath): boolean {
  return isErrorComponentTSX(filePath) || isDocumentComponentTSX(filePath) || isAppComponentTSX(filePath);
}

const DocType = "<!DOCTYPE html>"

async function generateTemporaryCode() {
  await mkdir(".tmp", { recursive: true });
  const files = await getFiles(RootDirName);

  await Promise.all(
    files.map(async file => {
      if (isSpecialComponentTSX(file)) return;
      await generateCode(file);
    })
  );
}

function convertFilePathToUrlPath(filePath: UserCreatedTSXFilePath): UrlPath {
  return filePath
    .replace(/\/_(.+)_\//g, "/:$1/")      // pages/_id_/foo.tsx => pages/:id/foo.tsx
    .replace(/\/_(.+)_\./g, "/:$1.")      // pages/xxx/_id_.tsx => pages/xxx/:id.tsx
    .replace(/\/(.*)\.tsx$/g, "/$1")      // pages/xxx/foo.tsx => pages/xxx/foo
    .replace(RootDirName, "")             // pages/xxx/foo => /xxx replace only 1 time.
    .replace(/\/index$/g, "") as UrlPath; // /xxx/index => /xxx
}

function tryImportOrRequireForPageComponent(path: UserCreatedTSXFilePath): Promise<{ default: Component<any> }> | { default: Component<any> } {
  try {
    return import(path);
  } catch (e) {
    console.warn("Failed to import", e);
    return require(path);
  }
}

async function generateHtml(
  filePath: UserCreatedTSXFilePath,
  params: { [key: string]: string },
  Document: Component<any>,
  Error: Component<any>,
  codeTemplate: CodeTemplate,
): Promise<[StatusCode, Html]> {
  try {
    const { default: Component }: { default: Component<Props> } = await tryImportOrRequireForPageComponent(join(process.cwd(), filePath) as UserCreatedTSXFilePath);
    const initialProps: Props = typeof Component.getInitialPrpos === "function"
      ? await Component.getInitialPrpos({ params })
      : {} as Props;
    const html = renderToText(
      <Document>
        <div id="nzxt-app">
          <Component {...initialProps} />
        </div>
        <script>
        {codeTemplate(initialProps)}
        </script>
      </Document>
    ).trim()
    .replaceAll(">___SSR_STYLE_REPLACER___<", ">" + ((globalThis as any)?.__ssrRenderedStyle ?? "") + "<");
    return [200 as StatusCode, html as Html];
  } catch (e) {
    const html = renderToText(
      <Document>
        <Error error={e} />
      </Document>
    ).trim();
    return [500 as StatusCode, html as Html];
  }
}

async function createServer() {
  const files = await getFiles(RootDirName);
  const Document = files.some(it => it.startsWith("pages/_document.tsx"))
    ? (await tryImportOrRequireForPageComponent(join(process.cwd(), "pages", "_document.tsx") as UserCreatedTSXFilePath)).default
    : _Document;
  const Error: Component<{ error: any }> = files.some(it => it.startsWith("pages/_error"))
    ? (await tryImportOrRequireForPageComponent(join(process.cwd(), "pages", "_error.tsx") as UserCreatedTSXFilePath)).default
    : _Error;

  const app = express();
  Promise.all(files.map(async file => {
    if (isSpecialComponentTSX(file)) return;
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

export async function start() {
  await generateTemporaryCode();
  return createServer();
}

function getSimiralityFilePath(filePaths: UserCreatedTSXFilePath[], path: UrlPath): UserCreatedTSXFilePath | undefined {
  const splittedPath = path.split("/");
  for (const current of filePaths) {
    const urlPath = convertFilePathToUrlPath(current);
    const splittedUrlPath = urlPath.split("/");
    if (splittedPath.length !== splittedUrlPath.length) continue;
    if (splittedUrlPath.every((it, i) => (it.startsWith(":") || it === splittedPath[i]))) {
      return current;
    }
  }
  return;
}

export async function generate(rawUrl: string) {
  await generateTemporaryCode();
  const url = new URL(rawUrl);
  const files = await getFiles(RootDirName);
  const Document = files.some(it => it.startsWith("pages/_document.tsx"))
    ? (await tryImportOrRequireForPageComponent(join(process.cwd(), "pages", "_document.tsx") as UserCreatedTSXFilePath)).default
    : _Document;
  const Error: Component<{ error: any }> = files.some(it => it.startsWith("pages/_error"))
    ? (await tryImportOrRequireForPageComponent(join(process.cwd(), "pages", "_error.tsx") as UserCreatedTSXFilePath)).default
    : _Error;

  const path = url.pathname as UrlPath;

  const mostSimilarFile = getSimiralityFilePath(files, path);
  const codeTemplate = await getCodeTemplate(mostSimilarFile!);
  const [_, html] = await generateHtml(mostSimilarFile!, {}, Document, Error, codeTemplate);
  return DocType + html;
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
