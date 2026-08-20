/// <reference types="vite/client" />
/// <reference types="chrome" />

interface ImportMetaEnv {
  readonly VITE_CONTEXT_X_API_URL?: string;
}

declare module "*.css?inline" {
  const css: string;
  export default css;
}
