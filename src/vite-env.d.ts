/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public web app URL used for desktop share links. Required for desktop builds. */
  readonly VITE_SHARE_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
