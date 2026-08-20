/// <reference types="vite/client" />
/// <reference types="chrome" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY?: string;
}

declare module "*.css?inline" {
  const css: string;
  export default css;
}
