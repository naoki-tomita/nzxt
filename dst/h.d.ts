import { Component as _Component } from "zheleznaya";
export { h } from "zheleznaya";
export interface Component<P = unknown> extends _Component<P> {
    getInitialPrpos?(context: {
        params: {
            [keys: string]: string;
        };
    }): Promise<P> | P;
}
//# sourceMappingURL=h.d.ts.map