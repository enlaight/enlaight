/// <reference types="vite/client" />

// @ts-nocheck
// Suppress all TypeScript errors for external libraries
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [key: string]: string | undefined;
    }
  }
}

// Ignore TypeScript module resolution issues
// @ts-ignore
