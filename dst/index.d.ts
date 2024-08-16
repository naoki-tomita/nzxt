type Brand<K, T> = K & {
    __brand: T;
};
type Html = Brand<string, "Html">;
export declare function start(): Promise<{
    close(): void;
    listen(port: number): Promise<void>;
}>;
export declare function generate(_url: string): Promise<Html>;
export {};
//# sourceMappingURL=index.d.ts.map