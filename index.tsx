import { readdir, readFile, stat, writeFile, mkdir } from "fs/promises";
import { express } from "summer-framework/dist/Express";
import Bundler from "parcel";
import { join } from "path";
import { renderToText, h } from "zheleznaya";
import { Component } from "./h";

function getOption(optionName: string) {
  const index = process.argv.indexOf(optionName);
  if (index === -1) {
    return false;
  }
  const val = process.argv[index + 1];
  if (val == null || val.startsWith("-")) {
    return true;
  }
  return val;
}

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

function generateHtml(code: string, renderedHtml: string): string {
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
  await mkdir("tmp", { recursive: true });
  const root = "pages";
  const files = await getFiles(root)
  const app = express();
  for (const file of files) {
    const path = file
      .replace(/\/_(.+)_\//g, "/:$1/")
      .replace(/\/_(.+)_\./g, "/:$1.")
      .replace(root, "")
      .replace(/\/(.*)\.tsx$/g, "/$1")
      .replace(/\/index$/g, "");

    if (path.includes("_error")) continue;
    if (path.includes("_document")) continue; // TODO: _document.
    if (path.includes("_app")) continue; // TODO: _app.

    const codeGenerator = await generateCode(file);
    app.get(path, async (req, res) => {
      try {
        const { default: Component }: { default: Component<{}> } = require(join(process.cwd(), `${file}`));
        const initialProps = Component.getInitialPrpos
          ? await Component.getInitialPrpos({ params: req.params })
          : {};
        const html = generateHtml(
          codeGenerator({...req.params, ...initialProps}).trim(),
          renderToText(<Component {...{...req.params, ...initialProps}} />).trim()
        );
        res.status(200).end(html);
      } catch (e) {
        const { default: Component }: { default: Component<{}> } = require(join(process.cwd(), "pages", "_error"));
        const html = generateHtml(
          `console.error("Unexpeted error occured.")`,
          renderToText(<Component />).trim()
        );
        res.status(500).end(html);
      }
    });
  }

  await app.listen(parseInt(process.env.PORT ?? "8080", 10));
}

main();
