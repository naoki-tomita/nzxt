import { readdir, readFile, stat, writeFile, mkdir } from "fs/promises";
import { express } from "summer-framework/dist/Express";
import Bundler from "parcel";
import { join } from "path";

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

async function generateTmpFile(file: string, params: { [key: string]: string }): Promise<string> {
  const hash = file.replace(/\//g, "_");
  const tmpFilePath = `./.tmp/main.${hash}.tsx`;
  await writeFile(tmpFilePath, `
    import { render, h } from "zheleznaya";
    import Component from "../${file}";
    render(<Component {...${JSON.stringify(params)}} />);
  `);
  const bundler = new Bundler([tmpFilePath], { watch: false, sourceMaps: false });
  const result = await bundler.bundle();
  console.log(result);
  return `dist/main.${hash}.js`
}

async function generateHtml(jsPath: string): Promise<string> {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
</head>
<body>
  <script>
    ${(await readFile(jsPath)).toString()}
  </script>
</body>
</html>
  `;
}

async function main() {
  await mkdir(".tmp", { recursive: true });
  const root = "pages";
  const files = await getFiles(root)
  const app = express();

  files.forEach(file => {
    const path = file
      .replace(/_(.+)_/g, ":$1")
      .replace(root, "")
      .replace(/\/(.*)\.tsx$/g, "/$1")
      .replace(/\/index$/g, "");
    app.get(path, async (req, res) => {
      try {
        const code = await generateTmpFile(file, req.params).then(generateHtml);
        res.status(200).end(code);
      } catch (e) {
        console.error(e);
        res.status(500).end("error");
      }
    });
  });

  await app.listen(8080);
}

main();
