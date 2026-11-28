# PreviewDockActions

文件页预览能力桥：把「截图落盘、外部打开、删除、墙纸、裁剪、待拖拽」这些依赖页面运行期的动作，
登记到 App 层；程序坞里的视频 / 图片窗口按**当前条目 id** 读取，不再拿固定条目的旧闭包。

## 锁了什么

- 只做**运行期能力转发**：不持有文件列表，不决定当前是哪一条；窗口传 id，页面按 id 查自己的状态。
- 页面挂载时用 `useProvidePreviewDockActions` 登记，卸载时清空。页面不在时程序坞窗口对应按钮自然不出现，
  不会调用已卸载页面的闭包。
- 能力对象必须按条目 id 回调：`onRequestDelete(id)` / `onRequestWallpaper(id, name)` /
  `onOpenExternal(id)` / `onToggleBatch(id)` / `isBatched(id)`；窗口翻到另一条后仍操作正确的那一条。
- 回调引用要稳定（页面侧用 `useCallback` 或等价写法），否则 Provider 的 `actions` 更新会反向触发表格页面重渲染。
- Provider 挂在 `DockProvider` 外层；读取 hook 只在程序坞窗口里用。

## 契约

```ts
type PreviewDockActions = {
  blocked: boolean;
  video: {
    externalApp?: string;
    isBatched: (id: string) => boolean;
    onCapture: (dataUrl: string, captureDir: string) => Promise<...>;
    onOpenExternal: (id: string) => void;
    onPickDir: () => Promise<string | null>;
    onRequestDelete: (id: string) => void;
    onToggleBatch: (id: string) => void;
  };
  image: {
    isBatched: (id: string) => boolean;
    onCrop: (request: ImageCropRequest) => Promise<...>;
    onRequestDelete: (id: string) => void;
    onRequestWallpaper: (id: string, name: string) => void;
    onToggleBatch: (id: string) => void;
  };
};
```

`blocked` 会在页面删除 / 墙纸二次确认开着时变 true，程序坞窗口据此收掉键位与底层交互；
确认层层级已抬到程序坞窗口之上（见 `docs/dock.md` 的层级表）。

## 不负责

- 不负责跨页恢复能力：文件页卸载后清空，程序坞窗口只剩快照自带的操作（播放、翻篇、全屏、复制等）。
- 不负责二次确认与墙纸写入，仍由文件页自己的确认层和 API 完成。
