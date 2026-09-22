/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUNO_API_BASE?: string;
  readonly VITE_SUNO_API_KEY?: string;
  readonly VITE_SUNO_CALLBACK_URL?: string;
  readonly VITE_USE_MOCK_SUNO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*liricle.mjs' {
  export default class Liricle {
    readonly data: {
      tags: Record<string, string>;
      lines: Array<{ time: number; text: string; words?: Array<{ time: number; text: string }> | null; index?: number }>;
      enhanced: boolean;
    } | null;
    offset: number;
    load(options: { text: string; skipBlankLine?: boolean } | { url: string; skipBlankLine?: boolean }): void;
    sync(time: number, continuous?: boolean): void;
    on(type: 'load' | 'loaderror' | 'sync', callback: (...args: never[]) => void): void;
  }
}
