import { defineConfig } from 'vite';
export default defineConfig({
  server:{ port:5173 },
  preview:{ port:3000 },
  build:{ outDir:'dist' }
});
