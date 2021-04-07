import { Component, h } from "../../h";
import fetch from "node-fetch";

const Top: Component<{ star: number }> = ({ star }) => {
  return (
    <div>Top: {star}</div>
  );
}

Top.getInitialPrpos = async () => {
  const starCount = await fetch("https://api.github.com/repos/naoki-tomita/nzxt")
    .then(it => it.json())
    .then((it: { stargazers_count: number }) => it.stargazers_count);
  return {
    star: starCount
  };
}


export default Top;
