import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import {
  isSystemAppPath,
  scanAppResidues,
  uninstallAppBundle,
} from '../../scripts/vite/files-apps.ts';

/** 最小可用的 Info.plist：只要 bundle id 与显示名 */
const INFO_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.demo.app</string>
  <key>CFBundleDisplayName</key>
  <string>Demo</string>
  <key>CFBundleShortVersionString</key>
  <string>1.2.3</string>
</dict>
</plist>
`;

describe('files-apps', () => {
  let root = '';
  let home = '';
  let bundle = '';
  let systemLink = '';

  before(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'files-apps-'));
    home = path.join(root, 'home');
    bundle = path.join(root, 'Demo.app');
    systemLink = path.join(root, 'SystemDemo.app');

    await mkdir(path.join(bundle, 'Contents'), { recursive: true });
    await writeFile(path.join(bundle, 'Contents', 'Info.plist'), INFO_PLIST);

    const library = path.join(home, 'Library');
    const residueDirs = [
      path.join(library, 'Application Support', 'Demo'),
      path.join(library, 'Caches', 'com.demo.app'),
      path.join(library, 'Saved Application State', 'com.demo.app.savedState'),
      path.join(library, 'Logs', 'Demo'),
    ];

    for (const dir of residueDirs) {
      await mkdir(dir, { recursive: true });
    }

    await mkdir(path.join(library, 'Preferences'), { recursive: true });
    await writeFile(
      path.join(library, 'Preferences', 'com.demo.app.plist'),
      'prefs',
    );

    await symlink('/System/Library', systemLink);
  });

  after(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('识别系统只读位置：系统自带应用不给卸载入口', () => {
    assert.equal(isSystemAppPath('/System/Applications/Safari.app'), true);
    assert.equal(isSystemAppPath('/usr/local/bin/foo'), true);
    assert.equal(isSystemAppPath('/Applications/Demo.app'), false);
  });

  it('列残留：只报真实存在的用户级条目，bundle id 从 Info.plist 解析', async () => {
    const report = await scanAppResidues(bundle, home);

    assert.equal(report.app.bundleId, 'com.demo.app');
    assert.equal(report.app.name, 'Demo');
    assert.equal(report.app.system, false);
    assert.deepEqual(
      report.residues.map((residue) => path.basename(residue.path)).sort(),
      ['Demo', 'Demo', 'com.demo.app', 'com.demo.app.plist', 'com.demo.app.savedState'].sort(),
    );
  });

  it('符号链接到系统路径的应用标记为系统自带，且拒绝卸载', async () => {
    const report = await scanAppResidues(systemLink, home);

    assert.equal(report.app.system, true);
    assert.deepEqual(report.residues, []);
    await assert.rejects(
      () => uninstallAppBundle(systemLink, home),
      /系统自带应用不能卸载/,
    );
  });

  it('卸载：删掉整包与全部残留，逐项返回删除结果', async () => {
    const result = await uninstallAppBundle(bundle, home);

    assert.deepEqual(result.failed, []);
    assert.ok(result.removed.length >= 5);
    await assert.rejects(() => stat(bundle), /ENOENT/);
    await assert.rejects(
      () => stat(path.join(home, 'Library', 'Caches', 'com.demo.app')),
      /ENOENT/,
    );
  });
});
