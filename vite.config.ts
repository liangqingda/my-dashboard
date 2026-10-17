import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, normalizePath } from 'vite';

import type { Plugin } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const srcDir = normalizePath(path.resolve(rootDir, 'src'));
const scssExtension = '.scss';
const scssModuleExtension = '.module.scss';
const scssModuleQuery = 'implicit-scss-module';
const scssModuleIdSuffix = `${scssModuleExtension}?${scssModuleQuery}`;

const toScssModuleId = (filePath: string) => {
  const normalizedPath = normalizePath(filePath);

  return `${normalizedPath.slice(0, -scssExtension.length)}${scssModuleIdSuffix}`;
};

const toScssSourceFile = (id: string) => {
  const normalizedId = normalizePath(id);

  if (!normalizedId.endsWith(scssModuleIdSuffix)) {
    return null;
  }

  return `${normalizedId.slice(0, -scssModuleIdSuffix.length)}${scssExtension}`;
};

const shouldUseScssModule = (filePath: string) => {
  const normalizedPath = normalizePath(filePath);

  return (
    normalizedPath.startsWith(`${srcDir}/`) &&
    normalizedPath.endsWith(scssExtension) &&
    !normalizedPath.endsWith(scssModuleExtension) &&
    !normalizedPath.endsWith('/global.scss')
  );
};

const implicitScssModules = (): Plugin => ({
  name: 'implicit-scss-modules',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (!importer || !source.endsWith(scssExtension) || source.endsWith(scssModuleExtension)) {
      return null;
    }

    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });

    if (!resolved || !shouldUseScssModule(resolved.id)) {
      return null;
    }

    return toScssModuleId(resolved.id);
  },
  async load(id) {
    const sourceFile = toScssSourceFile(id);

    if (!sourceFile) {
      return null;
    }

    this.addWatchFile(sourceFile);

    return readFile(sourceFile, 'utf-8');
  },
  handleHotUpdate(context) {
    if (!shouldUseScssModule(context.file)) {
      return;
    }

    const module = context.server.moduleGraph.getModuleById(toScssModuleId(context.file));

    if (!module) {
      return;
    }

    return [module];
  },
});

// https://vite.dev/config/
export default defineConfig({
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  plugins: [implicitScssModules(), react()],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  server: {
    port: 3000,
  },
});
