#!/usr/bin/env node
/**
 * My Dashboard — feature / 页面结构检查
 *
 * 作为 lint 的一部分执行，强制模块组织约定，补 ESLint 管不到的「目录结构」：
 *  1. src/features 下所有目录名须 kebab-case（小写 + 连字符）
 *  2. 组件目录（含 index.tsx）必须同时有 index.scss
 *  3. features / pages 下不得嵌套 components/ 目录（子组件直接放父组件目录）
 *  4. feature 内跨模块禁止用相对导入绕开 @/ 别名
 *  5. 菜单页（由 Sidebar navItems + App.tsx 路由自动解析）必须用 src/layouts/MenuContentLayout
 *     包内容，页面样式不得再定义 .page
 *
 * 任一规则被违反 → 打印错误并以退出码 1 结束。
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FEATURES = path.join(ROOT, 'src', 'features');
const PAGES = path.join(ROOT, 'src', 'pages');
const CODE_EXTS = ['.ts', '.tsx'];

/** kebab-case：小写字母/数字，用单个连字符分隔 */
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const errors = [];

/** 收集目录下所有子目录（含多级），返回 { abs, rel } */
function collectDirs(dir, base) {
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const abs = path.join(dir, entry.name);
    result.push({ abs, rel: path.relative(base, abs) });
    result.push(...collectDirs(abs, base));
  }
  return result;
}

/** 收集目录下所有指定扩展名的文件（含多级） */
function collectFiles(dir, exts, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(abs, exts, out);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(abs);
    }
  }
  return out;
}

/** 从一行源码中提取 import/export 的目标说明符 */
function extractSpecs(line) {
  const specs = [];
  const fromRe = /\bfrom\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = fromRe.exec(line))) specs.push(match[1]);
  const bare = line.match(/^\s*import\s+['"]([^'"]+)['"]/);
  if (bare) specs.push(bare[1]);
  return specs;
}

function checkFeatures() {
  if (!existsSync(FEATURES)) return;

  const dirs = collectDirs(FEATURES, FEATURES);

  for (const { abs, rel } of dirs) {
    const name = path.basename(abs);
    if (!KEBAB.test(name)) {
      errors.push(`[命名] features/${rel} 目录名须 kebab-case（小写+连字符）`);
    }
    if (name === 'components') {
      errors.push(
        `[结构] features/${rel} 不允许嵌套 components/，子组件直接放父组件目录`,
      );
    }
    if (
      existsSync(path.join(abs, 'index.tsx')) &&
      !existsSync(path.join(abs, 'index.scss'))
    ) {
      errors.push(`[结构] features/${rel} 有 index.tsx 缺 index.scss`);
    }
  }

  const files = collectFiles(FEATURES, CODE_EXTS);
  for (const file of files) {
    const relToFeatures = path.relative(FEATURES, file);
    const featureName = relToFeatures.split(path.sep)[0];
    const featureRoot = path.join(FEATURES, featureName);
    const lines = readFileSync(file, 'utf8').split('\n');

    lines.forEach((line, index) => {
      for (const spec of extractSpecs(line)) {
        if (!spec.startsWith('.')) continue; // 别名 / 裸模块 / node 内置，跳过
        const target = path.resolve(path.dirname(file), spec);
        const inside =
          target === featureRoot || target.startsWith(`${featureRoot}${path.sep}`);
        if (!inside) {
          errors.push(
            `[导入] ${relToFeatures}:${index + 1} 用相对路径 "${spec}" 跨出模块，请改用 @/features/... 别名`,
          );
        }
      }
    });
  }
}

function checkPages() {
  if (!existsSync(PAGES)) return;

  const dirs = collectDirs(PAGES, PAGES);
  for (const { abs, rel } of dirs) {
    if (path.basename(abs) === 'components') {
      errors.push(
        `[结构] pages/${rel} 不允许嵌套 components/，子组件直接放页面目录`,
      );
    }
  }
}

/**
 * 菜单页统一布局：菜单项对应的页面内容必须包在 MenuContentLayout 里
 * （内边距 14px 12px、标题排版都由它负责），页面样式不能再自写 .page。
 * 哪些页面算「菜单页」不靠手工白名单：从 Sidebar 的 navItems 取路径，
 * 经 App.tsx 的 <Route> 找到页面组件，再对应到 src/pages 目录。
 */

/** 取侧边栏 navItems 里的所有菜单跳转路径 */
function collectNavPaths() {
  const sidebarFile = path.join(ROOT, 'src', 'layouts', 'Sidebar', 'index.tsx');
  if (!existsSync(sidebarFile)) return [];

  const source = readFileSync(sidebarFile, 'utf8');
  const paths = [];

  // 只认 `to: '…'` / `to: "…"`，NavLink 上 `to={to}` 这种动态写法不参与
  for (const match of source.matchAll(/\bto:\s*(['"])([^'"]+)\1/g)) {
    paths.push(match[2]);
  }

  return paths;
}

/** 解析 App.tsx：路由 path → 页面组件名，页面组件名 → pages 目录名 */
function collectRouteMap() {
  const appFile = path.join(ROOT, 'src', 'App.tsx');
  if (!existsSync(appFile)) {
    return { componentToPage: new Map(), pathToComponent: new Map() };
  }

  const source = readFileSync(appFile, 'utf8');
  const sourceFile = ts.createSourceFile(
    appFile,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const componentToPage = new Map();
  const pathToComponent = new Map();

  /** 取子树里第一个 `@/pages/…` 字符串对应的目录名（lazy(() => import(…)) 也走这里） */
  const findPageName = (node) => {
    let found = null;

    const visit = (child) => {
      if (found) return found;
      if (ts.isStringLiteral(child) && child.text.startsWith('@/pages/')) {
        found = child.text.split('/')[2] ?? null;
        return found;
      }

      return ts.forEachChild(child, visit);
    };

    ts.forEachChild(node, visit);

    return found;
  };

  const attributeText = (node, name) => {
    for (const property of node.attributes.properties) {
      if (
        ts.isJsxAttribute(property) &&
        property.name.getText(sourceFile) === name
      ) {
        return property;
      }
    }

    return null;
  };

  const visit = (node) => {
    // import Home from '@/pages/Home'
    if (ts.isImportDeclaration(node)) {
      const localName = node.importClause?.name;
      const specifier =
        node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : '';

      if (localName && specifier.startsWith('@/pages/')) {
        componentToPage.set(localName.text, specifier.split('/')[2] ?? '');
      }
    }

    // const English = lazy(() => import('@/pages/English'))
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      const pageName = findPageName(node.initializer);

      if (pageName) {
        componentToPage.set(node.name.text, pageName);
      }
    }

    // <Route element={<Home />} path="/" />
    if (
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(sourceFile) === 'Route'
    ) {
      const pathAttr = attributeText(node, 'path');
      const elementAttr = attributeText(node, 'element');
      const routePath =
        pathAttr?.initializer && ts.isStringLiteral(pathAttr.initializer)
          ? pathAttr.initializer.text
          : null;
      const elementInit = elementAttr?.initializer;
      const element =
        elementInit && ts.isJsxExpression(elementInit)
          ? elementInit.expression
          : null;
      const componentName =
        element &&
        (ts.isJsxSelfClosingElement(element) || ts.isJsxOpeningElement(element))
          ? element.tagName.getText(sourceFile)
          : null;

      if (routePath && componentName) {
        pathToComponent.set(routePath, componentName);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return { componentToPage, pathToComponent };
}

/** 解析出菜单页目录集合；解析不出的菜单路径单独返回，用于报错 */
function collectMenuPages() {
  const navPaths = collectNavPaths();
  const { componentToPage, pathToComponent } = collectRouteMap();
  const menuPages = new Set();
  const unresolved = [];

  for (const navPath of navPaths) {
    const component = pathToComponent.get(navPath);
    const pageName = component ? componentToPage.get(component) : undefined;

    if (pageName) {
      menuPages.add(pageName);
    } else {
      unresolved.push(navPath);
    }
  }

  return { menuPages, unresolved };
}

function checkMenuPages() {
  if (!existsSync(PAGES)) return;

  const { menuPages, unresolved } = collectMenuPages();

  if (unresolved.length > 0) {
    errors.push(
      `[布局] 这些侧边栏路径解析不到 src/pages 目录：${unresolved.join('、')}；请检查 App.tsx 的 Route 写法`,
    );
  }

  if (menuPages.size === 0) {
    errors.push(
      '[布局] 没解析到任何菜单页；Sidebar navItems 或 App.tsx 路由结构可能变了，先修解析再跑检查',
    );
    return;
  }

  for (const pageName of menuPages) {
    const pageDir = path.join(PAGES, pageName);
    const pageTsx = path.join(pageDir, 'index.tsx');

    if (!existsSync(pageTsx)) {
      errors.push(`[布局] 菜单页 pages/${pageName}/index.tsx 不存在`);
      continue;
    }

    const source = readFileSync(pageTsx, 'utf8');
    if (!/<MenuContentLayout[\s/>]/.test(source)) {
      errors.push(
        `[布局] pages/${pageName}/index.tsx 必须用 <MenuContentLayout title="…"> 包裹内容`,
      );
    }

    const pageScss = path.join(pageDir, 'index.scss');
    if (
      existsSync(pageScss) &&
      /\.page\b/.test(readFileSync(pageScss, 'utf8'))
    ) {
      errors.push(
        `[布局] pages/${pageName}/index.scss 不得再定义 .page，内边距与高度由 MenuContentLayout 负责`,
      );
    }
  }
}

checkFeatures();
checkPages();
checkMenuPages();

if (errors.length > 0) {
  console.error('[×] 结构检查未通过：');
  for (const message of errors) console.error(`  ${message}`);
  process.exit(1);
}

console.log('[✓] 结构检查通过：features / pages 目录组织符合约定');
