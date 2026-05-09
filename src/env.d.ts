/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_GA_MEASUREMENT_ID?: string;
  readonly PUBLIC_AMAZON_TAG?: string;
  readonly PUBLIC_ENABLE_AMAZON_BUTTONS?: string;
  readonly PUBLIC_ENABLE_AWIN_MASTERTAG?: string;
  readonly PUBLIC_EMAILOCTOPUS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
