declare module "parcel" {
  class Bundler {
    constructor(entries: string[], options?: {
      production?: boolean = false;
      publicURL?: string;
      watch?: boolean = true;
      target?: "node" | "browser" = "browser";
      sourceMaps?: boolean = true;
    } = {})
    async bundle(): Promise<void>;
  }
  export default Bundler;
}
