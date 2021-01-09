import { readdir, readFile, stat, writeFile, mkdir } from "fs/promises";
import { express } from "summer-framework/dist/Express";
import Bundler from "parcel";
import { join } from "path";
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
  const tmpFilePath = `./tmp/main.${hash}.tsx`;
  await writeFile(tmpFilePath, `
    declare const parameter;
    import { render, h } from "zheleznaya";
    import Component from "../${file.replace(".tsx", "")}";
    (function (params: any) {
      render(<Component {...params} />, document.getElementById("nzxt-app"));
    })(parameter);
  `);
  const bundler = new Bundler([tmpFilePath], {
    watch: false,
    sourceMaps: false,
    production: true,
  });
  const result = await bundler.bundle();
  const code = await readFile(result.name);
  return parameter => `var parameter = ${JSON.stringify(parameter)}; ${code}`;
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

async function main() {
  const command = process.argv[2] ?? "start";
  await mkdir("tmp", { recursive: true });
  const root = "pages";
  const files = await getFiles(root)
  const app = express();
  const Document = files.includes("pages/_document.tsx")
    ? (await import(join(process.cwd(), "pages", "_document"))).default
    : _Document;
  for (const file of files) {
    const path = file
      .replace(/\/_(.+)_\//g, "/:$1/") // pages/_id_/foo.tsx => pages/:id/foo.tsx
      .replace(/\/_(.+)_\./g, "/:$1.") // pages/xxx/_id_.tsx => pages/xxx/:id.tsx
      .replace(/\/(.*)\.tsx$/g, "/$1") // pages/xxx/foo.tsx => pages/xxx/foo
      .replace(root, "") // pages/xxx/foo => /xxx replace only 1 time.
      .replace(/\/index$/g, ""); // /xxx/index => /xxx

    if (path.includes("_error")) continue;
    if (path.includes("_document")) continue; // TODO: _document.
    if (path.includes("_app")) continue; // TODO: _app.

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
        res.status(200).end(html);
      } catch (e) {
        const { default: Component }: { default: Component<{ error: Error }> } = await import(join(process.cwd(), "pages", "_error"));
        const html = renderToText(
          <Document>
            <Component error={e} />
          </Document>
        ).trim();
        res.status(500).end(html);
      }
    });
  }

  if (command === "build") {
    return;
  }

  await app.listen(parseInt(process.env.PORT ?? "8080", 10));
}

main();
