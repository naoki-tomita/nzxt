import { Component as _Component } from "zheleznaya";
import { h } from "zheleznaya";
export { h };
export interface Component<P = unknown> extends _Component<P> {
  getInitialPrpos?(
    context: {
      params: { [keys: string]: string };
    }
  ): Promise<P> | P;
}
export const SsrStyle = () => {
  return h("style", { "data-zstyl": "" }, `___SSR_STYLE_REPLACER___`) as any;
}
