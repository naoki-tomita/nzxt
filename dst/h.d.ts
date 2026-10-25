import { h } from "zheleznaya";
export { h };
type Children = Parameters<typeof h> extends [any, any, ...infer C] ? C : never;
export interface Component<P = unknown> {
    (props: P, children: Children): ReturnType<typeof h>;
    getInitialPrpos?(context: {
        params: {
            [keys: string]: string;
        };
    }): Promise<P> | P;
}
export declare const SsrStyle: () => any;
export declare function useStore<T extends {}>(initialValue: T): T;
//# sourceMappingURL=h.d.ts.map