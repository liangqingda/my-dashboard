#!/usr/bin/env node
/**
 * My Dashboard — 目录结构检查
 *
 * 作为 lint 的一部分执行，强制模块组织约定，补 ESLint 管不到的「目录结构」：
 *  1. src/features 已废弃，出现即报错（页面代码就近写在 src/pages/<Page>/ 里）
 *  2. 含 index.tsx 的组件目录必须同时有 index.scss
 *  3. pages 下不得嵌套 components/ 目录（子组件直接放父组件目录）
 *  4. 页面内相对导入不得跨出该页面目录，跨目录一律用 @/ 别名
 *  5. 菜单页（由 Sidebar navItems + App.tsx 路由自动解析）必须用 src/layouts/MenuContentLayout
 *     包内容，页面样式不得再定义 .page
 *  6. 入口文档 AGENTS.md 只放硬约束与索引：行数不超上限，docs/ 下的细则与索引一一对应，
 *     索引里的文档路径（含跟代码走的组件 / hook README）必须真实存在；
 *     CLAUDE.md 只能是指向它的软链（两份内容会漂移）
 *
 * 任一规则被违反 → 打印错误并以退出码 1 结束。
 */
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const LEGACY_FEATURES = path.join(SRC, 'features');
const PAGES = path.join(SRC, 'pages');
const CODE_EXTS = ['.ts', '.tsx'];
const AGENTS_FILE = path.join(ROOT, 'AGENTS.md');
const CLAUDE_FILE = path.join(ROOT, 'CLAUDE.md');
const DOCS = path.join(ROOT, 'docs');
const ENTRY_MAX_LINES = 100;

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
  if (!existsSync(dir)) return out;

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

/** src/features 已废弃：页面代码就近放 src/pages/<Page>/ */
function checkNoFeatures() {
  if (existsSync(LEGACY_FEATURES)) {
    errors.push(
      '[结构] src/features 已废弃，不要再建；页面代码就近写到 src/pages/<Page>/ 里，跨页面复用的才提到 src/components 或 src/utils',
    );
  }
}

function checkPages() {
  if (!existsSync(PAGES)) return;

  for (const { abs, rel } of collectDirs(PAGES, PAGES)) {
    if (path.basename(abs) === 'components') {
      errors.push(
        `[结构] pages/${rel} 不允许嵌套 components/，子组件直接放页面目录`,
      );
    }
  }

  // 组件目录（含 index.tsx）必须有配套样式，样式跟着组件走
  for (const { abs, rel } of collectDirs(PAGES, PAGES)) {
    if (
      existsSync(path.join(abs, 'index.tsx')) &&
      !existsSync(path.join(abs, 'index.scss'))
    ) {
      errors.push(`[结构] pages/${rel} 有 index.tsx 缺 index.scss`);
    }
  }

  // 页面内相对导入不得跨出该页面目录：跨目录一律走 @/ 别名
  for (const pageDir of readdirSync(PAGES, { withFileTypes: true })) {
    if (!pageDir.isDirectory()) continue;

    const pageRoot = path.join(PAGES, pageDir.name);

    for (const file of collectFiles(pageRoot, CODE_EXTS)) {
      const relToPage = path.relative(PAGES, file);
      const lines = readFileSync(file, 'utf8').split('\n');

      lines.forEach((line, index) => {
        for (const spec of extractSpecs(line)) {
          if (!spec.startsWith('.')) continue; // 别名 / 裸模块 / node 内置，跳过

          const target = path.resolve(path.dirname(file), spec);

          if (!target.startsWith(`${pageRoot}${path.sep}`)) {
            errors.push(
              `[导入] pages/${relToPage}:${index + 1} 用相对路径 "${spec}" 跨出页面目录，请改用 @/ 别名`,
            );
          }
        }
      });
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
    // import Services from '@/pages/Services'
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

    // <Route element={<Services />} path="/services" />
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

/**
 * AGENTS.md 是唯一入口，只放硬约束与索引：
 *  1. 超过行数上限说明该拆的没拆（不是放宽阈值，是拆到 docs/）
 *  2. docs/ 里的每份细则都必须出现在索引里
 *  3. 索引里写的文档路径（docs/ 细则、src 下跟代码走的 README 规格）必须真实存在
 *  4. CLAUDE.md 必须是指向它的软链；写成第二份内容即视为漂移
 */
function checkEntryDocs() {
  if (!existsSync(AGENTS_FILE)) {
    errors.push('[文档] 根目录 AGENTS.md 缺失：协作入口只维护这一份');
    return;
  }

  const source = readFileSync(AGENTS_FILE, 'utf8');
  const lineCount = source.replace(/\n$/, '').split('\n').length;

  if (lineCount > ENTRY_MAX_LINES) {
    errors.push(
      `[文档] AGENTS.md 有 ${lineCount} 行（上限 ${ENTRY_MAX_LINES}）：细则拆到 docs/，入口只留硬约束与索引`,
    );
  }

  if (existsSync(DOCS)) {
    for (const name of readdirSync(DOCS)) {
      if (!name.endsWith('.md')) continue;
      if (!source.includes(`docs/${name}`)) {
        errors.push(
          `[文档] docs/${name} 没有出现在 AGENTS.md 的索引里，新增细则要同时补索引`,
        );
      }
    }
  }

  // 反向：索引里指的文档都要真实存在（non-global 规格跟着代码走，路径在 src/ 下）
  for (const match of source.matchAll(/((?:docs|src)\/[\w./-]+\.md)/g)) {
    if (!existsSync(path.join(ROOT, match[1]))) {
      errors.push(`[文档] AGENTS.md 索引里的 ${match[1]} 不存在`);
    }
  }

  // Claude Code 只认 CLAUDE.md：要求它只是指向 AGENTS.md 的软链，规则只有一份
  if (!existsSync(CLAUDE_FILE)) {
    errors.push(
      '[文档] CLAUDE.md 缺失：Claude Code 读不到规则，请建指向 AGENTS.md 的软链',
    );
    return;
  }

  if (!lstatSync(CLAUDE_FILE).isSymbolicLink()) {
    errors.push(
      '[文档] CLAUDE.md 不是软链：规则只维护 AGENTS.md，CLAUDE.md 请改为指向它的软链，避免两份内容漂移',
    );
    return;
  }

  if (realpathSync(CLAUDE_FILE) !== realpathSync(AGENTS_FILE)) {
    errors.push('[文档] CLAUDE.md 软链指向的不是 AGENTS.md');
  }
}

checkNoFeatures();
checkPages();
checkMenuPages();
checkEntryDocs();

if (errors.length > 0) {
  console.error('[×] 结构检查未通过：');
  for (const message of errors) console.error(`  ${message}`);
  process.exit(1);
}

console.log('[✓] 结构检查通过：pages 目录组织、菜单页布局与入口文档索引符合约定');
