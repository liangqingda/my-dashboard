#!/usr/bin/env node
/**
 * My Dashboard — 目录结构检查
 *
 * 作为 lint 的一部分执行，强制模块组织约定，补 ESLint 管不到的「目录结构」：
 *  1. src/features 已废弃，出现即报错（页面代码就近写在 src/pages/<Page>/ 里）
 *  2. 含 index.tsx 的组件目录必须同时有 index.scss
 *  3. pages 下不得嵌套 components/ 目录（子组件直接放父页面目录）
 *  3.1 公共组件按类型分目录：src/components/<分类>/<组件>，分类只允许固定名单的小写目录
 *  4. 页面内相对导入不得跨出该页面目录，跨目录一律用 @/ 别名
 *  5. 菜单页（由 Sidebar navItems + App.tsx 路由自动解析）必须用 src/layouts/MenuContentLayout
 *     包内容，页面样式不得再定义 .page
 *  6. Modal 只许出现在封装壳（FreeModal）里，业务侧不得直连 Mantine Modal
 *  7. 键盘监听只许出现在外壳 / 布局：业务页面与业务弹窗不得自己 addEventListener('keydown')
 *  7.1 Free 层是唯一入口：Modal / Table / TextInput / ActionIcon 只许在对应的 Free 组件里直连，
 *      别处直连就是绕层（例外登记在 FREE_LAYER_OWNERS[].allowFiles，且必须同时写进 docs/ui-components.md）
 *  7.2 每个公共组件目录必须有 README.md：契约（锁了什么、props、坑）跟代码走
 *  7.3 单行省略只许出自 FreeTruncatedText：别处写 text-overflow: ellipsis 就是两套口径
 *  8. 入口文档 AGENTS.md 只放硬约束与索引：行数不超上限，docs/ 下的细则与索引一一对应，
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
const COMPONENTS = path.join(SRC, 'components');
const CODE_EXTS = ['.ts', '.tsx'];
const AGENTS_FILE = path.join(ROOT, 'AGENTS.md');
const CLAUDE_FILE = path.join(ROOT, 'CLAUDE.md');
const DOCS = path.join(ROOT, 'docs');
const ENTRY_MAX_LINES = 100;

/** 公共组件的分类目录：src/components/<分类>/<组件>，分类用小写，组件目录用 PascalCase */
const COMPONENT_GROUPS = new Set([
  'buttons',
  'feedback',
  'fields',
  'modals',
  'panels',
  'tables',
  'texts',
]);
const PASCAL_CASE = /^[A-Z][a-zA-Z0-9]*$/;

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

    // const EnglishNotes = lazy(() => import('@/pages/EnglishNotes'))
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

/**
 * Modal 只许出现在封装壳里：`FreeModal`（阅读窗 / 普通弹窗的 `height="auto"`）。
 * 业务侧直接 import Mantine `Modal` 就等于绕开框体、header、键位与遮罩那一套基线，
 * 迟早出现「这扇窗和别的窗不一样」——这里直接拦成结构错误。
 */
/**
 * Free 层 = 「某类对象全站只允许一种形态的唯一入口」，所以组件库原语只许出现在
 * 对应的 Free 组件里。别处直连的后果不是「多写一行 import」，而是同一类东西长出第二副样子
 * （两套颜色、两套尺寸档、两套 tooltip 时机）——上一轮 IconPopoverButton 就是这么漂的。
 *
 * 例外只许登记在 `allowFiles`，并且同一条例外必须写进 `docs/ui-components.md` 与
 * 对应组件的 README：名单是「已声明的例外」，不是「暂时没空改的地方」。
 */
const FREE_LAYER_OWNERS = [
  {
    symbol: 'ActionIcon',
    owner: 'components/buttons/FreeIconAction/index.tsx',
    hint: '图标按钮一律走 @/components/buttons/FreeIconAction；要当锚点（Popover.Target 这类）用 tooltip="none" 取按钮本体，不许另抄颜色规则',
    allowFiles: [
      'layouts/Header/index.tsx',
      'components/modals/MarkdownPreviewModal/ProseFontControl/index.tsx',
    ],
  },
  {
    symbol: 'Modal',
    owner: 'components/modals/FreeModal/index.tsx',
    hint: '弹窗一律走 @/components/modals/FreeModal（普通弹窗 height="auto"，二次确认再基于它封 ConfirmModal）',
    allowFiles: [],
  },
  {
    symbol: 'Table',
    owner: 'components/tables/FreeTable/index.tsx',
    hint: '表格一律走 @/components/tables/FreeTable，业务表格在它上面加增量',
    allowFiles: [],
  },
  {
    symbol: 'TextInput',
    owner: 'components/fields/FreeSearchInput/index.tsx',
    hint: '输入框一律走 Free 层（搜索框 FreeSearchInput；普通输入框 FreeInput 未落地前先在 docs/ui-components.md 登记，不要在业务里直连）',
    allowFiles: [],
  },
];

/** 匹配 `import { … } from '@mantine/core'`（含多行） */
const MANTINE_IMPORT_RE = /import\s+(?:type\s+)?\{[^}]*\}\s*from\s+'@mantine\/core'/g;

function checkFreeLayerIsOnlyEntry() {
  for (const rule of FREE_LAYER_OWNERS) {
    const ownerAbs = path.join(SRC, rule.owner);
    const allowAbs = rule.allowFiles.map((rel) => path.join(SRC, rel));

    for (const file of collectFiles(SRC, CODE_EXTS)) {
      if (file === ownerAbs) continue;
      if (allowAbs.includes(file)) continue;

      const source = readFileSync(file, 'utf8');
      const lineOf = (index) => source.slice(0, index).split('\n').length;

      MANTINE_IMPORT_RE.lastIndex = 0;
      let match;
      while ((match = MANTINE_IMPORT_RE.exec(source))) {
        if (!new RegExp(`\\b${rule.symbol}\\b`).test(match[0])) continue;

        errors.push(
          `[结构] ${path.relative(ROOT, file)}:${lineOf(match.index)} 越过 Free 层直连 Mantine ${rule.symbol}：${rule.hint}`,
        );
      }
    }
  }
}

/**
 * 公共组件的契约（锁了什么、props、边界与坑）跟着代码走，写在组件目录的 README.md 里。
 * 缺 README 的组件等于「只有实现、没有判据」，下一个人只能靠猜改它。
 */
function checkComponentReadmes() {
  if (!existsSync(COMPONENTS)) return;

  for (const entry of readdirSync(COMPONENTS, { withFileTypes: true })) {
    if (!entry.isDirectory() || !COMPONENT_GROUPS.has(entry.name)) continue;

    const groupDir = path.join(COMPONENTS, entry.name);

    for (const child of readdirSync(groupDir, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;

      const readme = path.join(groupDir, child.name, 'README.md');
      if (existsSync(readme)) continue;

      errors.push(
        `[结构] src/components/${entry.name}/${child.name} 缺 README.md：公共组件的契约（锁了什么 / props / 边界）写在它自己目录里`,
      );
    }
  }
}

/**
 * 单行省略只有一套口径：放不下才省略、只有被截断且被指到时才弹 tip（`FreeTruncatedText`）。
 * 别处再写 `text-overflow: ellipsis`，就是「省略了但看不到全文」的第二套实现。
 */
function checkSingleLineEllipsis() {
  const owner = path.join(SRC, 'components', 'texts', 'FreeTruncatedText', 'index.scss');

  for (const file of collectFiles(SRC, ['.scss'])) {
    if (file === owner) continue;

    const lines = readFileSync(file, 'utf8').split('\n');

    lines.forEach((line, index) => {
      if (!/text-overflow:\s*ellipsis/.test(line)) return;

      errors.push(
        `[结构] ${path.relative(ROOT, file)}:${index + 1} 自己写单行省略：走 @/components/texts/FreeTruncatedText（省略与「截断才弹 tip」都在它里面），样式里只给字号 / 颜色 / 版式`,
      );
    });
  }
}

/**
 * 键盘监听只许出现在「外壳 / 布局」：键位是「同一时刻只能有一套」的交互，
 * 业务页面或业务弹窗自己 `addEventListener('keydown')`，就会出现
 * 「笔记预览能用、记录详情不能用」这类只在一边生效的键。
 *
 * 允许的位置与理由：
 *  - `FreeModal/`：阅读窗整套键位（空格 / 翻篇 / `F` / `C` 复制 / `Delete` 删除）；
 *  - `layouts/`：页面级 `R` / `F` 与全屏 Esc；
 *  - `MarkdownPreviewModal/hooks/useHeaderActionShortcuts.ts`：预览 header 的 `a` / `s` / `r`
 *    （开合字号 / 筛选面板、刷新正文，只在预览里有语义）。
 *
 * 新能力要键位：一律挂到 `FreeModal`（`copy` / `onRequestDelete` / `nav`），
 * 不要在新位置补一份监听；确需业务层监听，先把它下沉到外壳再回来改这份名单。
 */
function checkKeyboardListeners() {
  const allowDirs = [
    path.join(SRC, 'components', 'modals', 'FreeModal'),
    path.join(SRC, 'layouts'),
  ];
  const allowFiles = [
    path.join(
      SRC,
      'components',
      'modals',
      'MarkdownPreviewModal',
      'hooks',
      'useHeaderActionShortcuts.ts',
    ),
  ];

  for (const file of collectFiles(SRC, CODE_EXTS)) {
    const allowed =
      allowDirs.some((dir) => file.startsWith(`${dir}${path.sep}`)) ||
      allowFiles.includes(file);

    if (allowed) continue;

    const lines = readFileSync(file, 'utf8').split('\n');

    lines.forEach((line, index) => {
      if (!line.includes('addEventListener') || !/['"]keydown['"]/.test(line)) {
        return;
      }

      errors.push(
        `[结构] ${path.relative(ROOT, file)}:${index + 1} 自己监听 keydown：键位一律挂在 FreeModal（copy / onRequestDelete / nav）或布局层，同一操作在所有弹窗键位与 tooltip 标注必须一致`,
      );
    });
  }
}

/**
 * 公共组件按类型分目录存放：src/components/<分类>/<组件>/。
 * 分类目录用小写固定名单（modals、buttons、tables…），组件目录用 PascalCase 且带 index.tsx；
 * src/components 下不允许直接放组件目录或散文件，避免「一部分分了类、一部分又平铺回去」。
 */
function checkComponents() {
  if (!existsSync(COMPONENTS)) return;

  for (const entry of readdirSync(COMPONENTS, { withFileTypes: true })) {
    const rel = `src/components/${entry.name}`;

    if (!entry.isDirectory()) {
      errors.push(`[结构] ${rel} 是文件：公共组件要放进分类目录，src/components 下不放散文件`);
      continue;
    }

    if (!COMPONENT_GROUPS.has(entry.name)) {
      errors.push(
        `[结构] ${rel} 不是分类目录：公共组件一律按类型放 modals / buttons / tables / fields / panels / texts / feedback，新分类要先补 docs/ui-components.md 与 scripts/check-structure.mjs`,
      );
      continue;
    }

    const groupDir = path.join(COMPONENTS, entry.name);

    for (const child of readdirSync(groupDir, { withFileTypes: true })) {
      const childRel = `src/components/${entry.name}/${child.name}`;

      if (!child.isDirectory()) {
        errors.push(`[结构] ${childRel} 是文件：分类目录下只放组件目录`);
        continue;
      }

      if (!PASCAL_CASE.test(child.name)) {
        errors.push(`[结构] ${childRel} 组件目录必须是 PascalCase`);
        continue;
      }

      if (!existsSync(path.join(groupDir, child.name, 'index.tsx'))) {
        errors.push(`[结构] ${childRel} 缺 index.tsx（一个组件一个目录，入口为 index.tsx）`);
      }
    }
  }
}

checkNoFeatures();
checkPages();
checkComponents();
checkMenuPages();
checkEntryDocs();
checkFreeLayerIsOnlyEntry();
checkComponentReadmes();
checkSingleLineEllipsis();
checkKeyboardListeners();

if (errors.length > 0) {
  console.error('[×] 结构检查未通过：');
  for (const message of errors) console.error(`  ${message}`);
  process.exit(1);
}

console.log(
  '[✓] 结构检查通过：pages 目录组织、公共组件分类目录与 README、菜单页布局、Free 层唯一入口（Modal / Table / TextInput / ActionIcon）、单行省略归属、键位归属与入口文档索引符合约定',
);
