import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isNoteName } from '../../scripts/vite/english-notes-store.ts';

/** 合法的笔记文件名：`<category>-<slug>.md`，slug 只用小写 ASCII */
const LEGAL = [
  'errors-wait-missing-preposition-for.md',
  'vocabulary-headquarters.md',
  'phrases-dish-out.md',
  'grammar-modal-verb-base-form.md',
  'usage-cannot-vs-cant.md',
  'errors-modal-verb-takes-base-form.md',
];

/** 不合法的文件名：中文、大写、下划线、无分类前缀，以及路径穿越写法 */
const ILLEGAL = [
  'errors-wait-后遗漏介词-for.md',
  'grammar-情态动词后使用动词原形.md',
  'errors-Foo-Bar.md',
  'errors-foo_bar.md',
  'headquarters.md',
  'errors-foo.json',
  'readme.md',
  '../package.json',
  '/etc/passwd',
  'errors-../package.md',
  'errors -foo.md',
];

describe('笔记文件名校验', () => {
  it('接受与记录仓库同口径的 ASCII 文件名', () => {
    for (const name of LEGAL) {
      assert.equal(isNoteName(name), true, name);
    }
  });

  it('拒绝中文 slug，避免预览层放行源仓库已拒收的文件名', () => {
    assert.equal(isNoteName('errors-wait-后遗漏介词-for.md'), false);
    assert.equal(isNoteName('grammar-情态动词后使用动词原形.md'), false);
  });

  it('拒绝大写、下划线、缺少分类前缀与非 Markdown 文件', () => {
    assert.equal(isNoteName('errors-Foo-Bar.md'), false);
    assert.equal(isNoteName('errors-foo_bar.md'), false);
    assert.equal(isNoteName('headquarters.md'), false);
    assert.equal(isNoteName('errors-foo.json'), false);
  });

  it('拒绝路径穿越与目录说明文件', () => {
    assert.equal(isNoteName('../package.json'), false);
    assert.equal(isNoteName('/etc/passwd'), false);
    assert.equal(isNoteName('errors-../package.md'), false);
    assert.equal(isNoteName('readme.md'), false);
  });
});
