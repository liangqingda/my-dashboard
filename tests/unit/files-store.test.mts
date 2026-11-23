import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import {
  buildPickerScript,
  compareByUpdatedDesc,
  compareFilesByCategoryThenUpdated,
  createFolder,
  deleteEntry,
  listDirectory,
  moveEntry,
  renameEntry,
} from '../../scripts/vite/files-store.ts';

describe('files-store', () => {
  let root = '';

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'files-store-'));

    await mkdir(path.join(root, 'folder-a'));
    await mkdir(path.join(root, 'folder-b'));
    await mkdir(path.join(root, 'sub', 'folder-c'), { recursive: true });

    await writeFile(path.join(root, 'folder-a', 'one.mp4'), 'a');
    await writeFile(path.join(root, 'folder-a', 'two.mov'), 'b');
    await writeFile(path.join(root, 'folder-a', 'note.txt'), 'c');
    await writeFile(path.join(root, 'sub', 'folder-c', 'clip.mp4'), 'd');
    await writeFile(path.join(root, 'clip.webm'), 'e');
    await writeFile(path.join(root, 'poster.png'), 'f');
    await writeFile(path.join(root, 'guide.pdf'), 'h');
    await writeFile(path.join(root, 'readme.md'), 'i');
    await writeFile(path.join(root, 'archive.zip'), 'j');
    await writeFile(path.join(root, 'script.js'), 'k');
    await writeFile(path.join(root, '.hidden.mp4'), 'g');

    /*
     * 修改时间写死：写文件都在毫秒级内发生，靠真实 mtime 断不出先后。
     * 「other」两档里 script.js 更新、archive.zip 更旧；三个文件夹也各给一个时间。
     */
    const stamp = (iso: string) => new Date(iso);

    await utimes(path.join(root, 'script.js'), stamp('2026-06-01'), stamp('2026-06-01'));
    await utimes(path.join(root, 'archive.zip'), stamp('2026-01-01'), stamp('2026-01-01'));
    await utimes(path.join(root, 'folder-a'), stamp('2026-07-01'), stamp('2026-07-01'));
    await utimes(path.join(root, 'folder-b'), stamp('2026-01-15'), stamp('2026-01-15'));
    await utimes(path.join(root, 'sub'), stamp('2026-03-01'), stamp('2026-03-01'));
  });

  after(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('列出直属文件与子文件夹（不限扩展名），文件夹按直属条目计数', async () => {
    const listing = await listDirectory(root);

    assert.equal(listing.path, root);
    assert.equal(listing.parent, path.dirname(root));
    assert.deepEqual(
      listing.folders.map((folder) => [folder.name, folder.itemCount]),
      [
        ['folder-a', 3],
        ['sub', 1],
        ['folder-b', 0],
      ],
    );
    assert.deepEqual(
      listing.files.map((file) => [file.name, file.category]),
      [
        ['clip.webm', 'video'],
        ['poster.png', 'image'],
        ['guide.pdf', 'pdf'],
        ['readme.md', 'markdown'],
        ['script.js', 'other'],
        ['archive.zip', 'other'],
      ],
    );
  });

  it('子文件夹带内部出现过的文件分类：直属与更深层都算，空文件夹为空', async () => {
    const listing = await listDirectory(root);

    assert.deepEqual(
      listing.folders.map((folder) => [folder.name, folder.categories]),
      [
        ['folder-a', ['video', 'other']],
        ['sub', ['video']],
        ['folder-b', []],
      ],
    );
  });

  it('文件夹摘要标记直属应用包：包里 / 深层才有的 app 不算', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'files-store-apps-'));

    await mkdir(path.join(dir, 'Apps', 'Demo.app'), { recursive: true });
    await mkdir(path.join(dir, 'Deep', 'Nested', 'Inner.app'), {
      recursive: true,
    });

    const listing = await listDirectory(dir);
    const byName = new Map(
      listing.folders.map((folder) => [folder.name, folder]),
    );

    assert.equal(byName.get('Apps')?.hasApps, true);
    assert.equal(byName.get('Deep')?.hasApps, false);
    // 深层应用包仍计入分类摘要，但不是「直属含 app」
    assert.deepEqual(byName.get('Deep')?.categories, ['app']);

    await rm(dir, { force: true, recursive: true });
  });

  it('列表先按类别分段、同类别内按修改时间新的在前', async () => {
    const listing = await listDirectory(root);

    assert.ok(listing.folders.every((folder) => folder.updatedMs > 0));
    assert.ok(listing.files.every((file) => file.updatedMs > 0));
    assert.deepEqual(
      listing.files.map((file) => file.category),
      ['video', 'image', 'pdf', 'markdown', 'other', 'other'],
    );
    assert.deepEqual(
      [...listing.folders]
        .sort(compareByUpdatedDesc)
        .map((folder) => folder.name),
      listing.folders.map((folder) => folder.name),
    );
    assert.deepEqual(
      [
        { category: 'other', name: 'a', updatedMs: 5 },
        { category: 'video', name: 'b', updatedMs: 1 },
        { category: 'other', name: 'b', updatedMs: 2 },
        { category: 'video', name: 'a', updatedMs: 5 },
        { category: 'image', name: 'c', updatedMs: 9 },
      ]
        .sort(compareFilesByCategoryThenUpdated)
        .map((entry) => `${entry.category}:${entry.name}`),
      ['video:a', 'video:b', 'image:c', 'other:a', 'other:b'],
    );
  });

  it('裸 .ts 不算视频（那是 TypeScript），.m2ts 仍算', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'files-store-ts-'));

    try {
      await writeFile(path.join(dir, 'config.ts'), 'export {};');
      await writeFile(path.join(dir, 'stream.m2ts'), 'x');

      const listing = await listDirectory(dir);

      assert.deepEqual(
        listing.files.map((file) => [file.name, file.category]),
        [
          ['stream.m2ts', 'video'],
          ['config.ts', 'other'],
        ],
      );
    } finally {
      await rm(dir, { force: true, recursive: true });
    }
  });

  it('文件条目带大小与修改时间，文件大小按字节保留', async () => {
    const [file] = (await listDirectory(root)).files.filter(
      (entry) => entry.name === 'clip.webm',
    );

    assert.ok(file);
    assert.equal(file.size, 1);
    assert.equal(file.category, 'video');
    assert.match(file.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(file.path, path.join(root, 'clip.webm'));
  });

  it('子文件夹可以再打开一层', async () => {
    const [sub] = (await listDirectory(root)).folders.filter(
      (folder) => folder.name === 'sub',
    );

    assert.ok(sub);

    const nested = await listDirectory(sub.path);

    assert.deepEqual(nested.folders.map((folder) => folder.name), ['folder-c']);
    assert.deepEqual(nested.files, []);
  });

  it('相对路径被拒收，目录不存在时抛可读错误', async () => {
    await assert.rejects(() => listDirectory('relative/path'), /绝对路径/);
    await assert.rejects(
      () => listDirectory(path.join(root, 'no-such-dir')),
      /目录不存在/,
    );
  });

  it('选择器脚本：不带默认目录时不设默认位置；带目录时定位到该路径并转义引号', () => {
    assert.equal(
      buildPickerScript(),
      'POSIX path of (choose folder with prompt "选择要浏览的目录")',
    );

    const script = buildPickerScript('/Users/lqd/My "Docs"');

    assert.match(script, /default location defaultDir/);
    assert.match(script, /POSIX file "\/Users\/lqd\/My \\"Docs\\""/);
  });

  it('新建文件夹：默认名重名时自动追加序号，不覆盖已有文件夹', async () => {
    const first = await createFolder(root);

    assert.equal(first.name, '未命名文件夹');
    assert.equal(first.itemCount, 0);

    const second = await createFolder(root);

    assert.equal(second.name, '未命名文件夹 2');

    const listing = await listDirectory(root);

    assert.ok(listing.folders.some((folder) => folder.name === first.name));
    assert.ok(listing.folders.some((folder) => folder.name === second.name));
  });

  it('重命名：改名后路径同步更新；目标已有同名条目时拒绝且不覆盖', async () => {
    const created = await createFolder(root);
    const renamed = await renameEntry(created.path, 'renamed-folder');

    assert.equal(renamed.name, 'renamed-folder');
    assert.equal(renamed.path, path.join(root, 'renamed-folder'));

    await assert.rejects(
      () => renameEntry(renamed.path, 'folder-a'),
      /已存在同名条目/,
    );

    const listing = await listDirectory(root);

    assert.ok(listing.folders.some((folder) => folder.name === 'renamed-folder'));
  });

  it('移动条目：文件移入目标文件夹；目标已有同名条目时拒绝', async () => {
    const before = await listDirectory(root);
    const target = before.folders.find((folder) => folder.name === 'folder-b');

    assert.ok(target);

    const source = before.files.find((file) => file.name === 'clip.webm');

    assert.ok(source);

    await moveEntry(source.path, target.path);

    const afterRoot = await listDirectory(root);
    const afterTarget = await listDirectory(target.path);

    assert.equal(
      afterRoot.files.some((file) => file.name === 'clip.webm'),
      false,
    );
    assert.ok(afterTarget.files.some((file) => file.name === 'clip.webm'));

    // folder-a 里已有 one.mp4：再把根目录的另一文件改成同名不适用，这里用同名文件测冲突
    await writeFile(path.join(target.path, 'dup.txt'), 'x');
    await writeFile(path.join(root, 'dup.txt'), 'y');

    const rootDup = (await listDirectory(root)).files.find(
      (file) => file.name === 'dup.txt',
    );

    assert.ok(rootDup);
    await assert.rejects(() => moveEntry(rootDup.path, target.path), /同名条目/);
  });

  it('文件夹不能移动到它自身或其子文件夹内', async () => {
    const listing = await listDirectory(root);
    const sub = listing.folders.find((folder) => folder.name === 'sub');

    assert.ok(sub);

    const child = (await listDirectory(sub.path)).folders.find(
      (folder) => folder.name === 'folder-c',
    );

    assert.ok(child);

    await assert.rejects(
      () => moveEntry(sub.path, child.path),
      /自身或其子文件夹/,
    );
  });

  it('应用包单独成列：不进文件夹、可来自符号链接，父文件夹摘要带上 app', async () => {
    const zone = await mkdtemp(path.join(tmpdir(), 'files-store-apps-'));

    try {
      await mkdir(path.join(zone, 'Inner.app', 'Contents'), { recursive: true });
      await mkdir(path.join(zone, 'Apps', 'Nested.app'), { recursive: true });
      await symlink(
        path.join(zone, 'Inner.app'),
        path.join(zone, 'Linked.app'),
      );

      const listing = await listDirectory(zone);

      assert.deepEqual(
        listing.apps.map((app) => [app.name, app.system]),
        [
          ['Inner', false],
          ['Linked', false],
        ],
      );
      assert.deepEqual(
        listing.folders.map((folder) => [folder.name, folder.categories]),
        [['Apps', ['app']]],
      );
      assert.deepEqual(listing.files, []);
    } finally {
      await rm(zone, { force: true, recursive: true });
    }
  });

  it('删除：空文件夹直接删除；非空文件夹连同内部文件与子文件夹递归删除；不存在的路径报错', async () => {
    const empty = await createFolder(root);

    await deleteEntry(empty.path);
    assert.ok(
      !(await listDirectory(root)).folders.some((folder) => folder.path === empty.path),
    );

    const nested = await createFolder(root);
    await writeFile(path.join(nested.path, 'inside.txt'), 'x');
    await mkdir(path.join(nested.path, 'child'));

    await deleteEntry(nested.path);
    assert.ok(
      !(await listDirectory(root)).folders.some((folder) => folder.path === nested.path),
    );

    await assert.rejects(
      () => deleteEntry(path.join(root, 'no-such-entry')),
      /目录不存在/,
    );
  });
});
