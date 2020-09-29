declare module "parcel" {
  class Bundler {
    constructor(entries: string[], options?: {
      production?: boolean = false;
      publicURL?: string;
      watch?: boolean = true;
      target?: "node" | "browser" = "browser";
      sourceMaps?: boolean = true;
    } = {})
    async bundle(): Promise<Bundle>;
  }

  class Bundle {
    name: string;
    type: string;
    parentBundle: Bundle;
    totalSize: number;
    bundleTime: number;
    isolated?: boolean;
  }
  export default Bundler;
}
