import { Component, h } from "../../h";

const Item: Component<{ id: string }> = ({ id }: { id: string }) => {
  return <div>{id}</div>
}

Item.getInitialPrpos = async ({ params }) => {
  return params as { id: string };
}

export default Item;
