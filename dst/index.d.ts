export declare function start(): Promise<{
    close(): void;
    listen(port: number): Promise<void>;
}>;
export declare function buildCommand(): Promise<void>;
export declare function serveCommand(): Promise<{
    close(): void;
    listen(port: number): Promise<void>;
}>;
export declare function generate(rawUrl: string): Promise<string>;
//# sourceMappingURL=index.d.ts.map