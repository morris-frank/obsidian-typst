// esbuild inlines `.typ` imports as text (see esbuild.config.mjs).
declare module "*.typ" {
  const source: string;
  export default source;
}
