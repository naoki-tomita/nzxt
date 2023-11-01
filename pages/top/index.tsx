import { Component, h } from "../../h";
import { readFile } from "fs/promises";

const Top: Component<{ star: number; file: string }> = ({ star, file }) => {
  return (
    <div>
      <div>Top: {star}</div>
      <pre>{file}</pre>
      <img src="/images/logo.png" />
    </div>
  );
}

Top.getInitialPrpos = async () => {
  const starCount = await fetch("https://api.github.com/repos/naoki-tomita/nzxt")
    .then(it => it.json())
    .then((it: { stargazers_count: number }) => it.stargazers_count);
  const file = await readFile("./README.md").then(it => it.toString("utf-8"));
  return {
    star: starCount,
    file
  };
}


export default Top;
