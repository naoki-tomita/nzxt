import { h, createRoot } from "zheleznaya";
export { h };
// zheleznaya does not export its Component type, so derive it from h.
type Children = Parameters<typeof h> extends [any, any, ...infer C] ? C : never;
export interface Component<P = unknown> {
  (props: P, children: Children): ReturnType<typeof h>;
  getInitialPrpos?(
    context: {
      params: { [keys: string]: string };
    }
  ): Promise<P> | P;
}
export const SsrStyle = () => {
  return h("style", { "data-zstyl": "" }, "___SSR_STYLE_REPLACER___") as any;
}

type Root = ReturnType<typeof createRoot>;
export function useStore<T extends {}>(initialValue: T): T {
  const root: Root | undefined = (globalThis as any).__nzxtRoot__;
  // server side rendering
  if (!root) {
    return initialValue;
  }
  const store = root.getStore<any>();
  // already initialized
  if (store.__on__) {
    return store;
  }
  return root.createStore(initialValue);
}
