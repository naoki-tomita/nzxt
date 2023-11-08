import { Component as _Component } from "zheleznaya";
import { h } from "zheleznaya";
export { h };
export interface Component<P = unknown> extends _Component<P> {
    getInitialPrpos?(context: {
        params: {
            [keys: string]: string;
        };
    }): Promise<P> | P;
}
export declare const SsrStyle: () => any;
//# sourceMappingURL=h.d.ts.map