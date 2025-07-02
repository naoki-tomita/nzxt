export declare function command(command?: string): Promise<{
    close(): void;
    listen(port: number): Promise<void>;
} | undefined>;
export declare function create(): Promise<{
    close(): void;
    listen(port: number): Promise<void>;
}>;
//# sourceMappingURL=index.d.ts.map