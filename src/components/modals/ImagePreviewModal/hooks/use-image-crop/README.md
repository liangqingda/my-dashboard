# use-image-crop

`ImagePreviewModal` 的裁剪会话：管「进不进裁剪、选框在哪、是否保存中」，把 canvas 的重编码结果交给
调用方落盘。私有件，只被图片预览弹窗使用。

## 分工

| 环节 | 在哪 |
| --- | --- |
| 选框几何（拖框 / 8 个手柄 / 最小尺寸） | `../../ImageCropOverlay/utils.ts` |
| 比例 → 源图像素、按扩展名编码 data URL | `../../utils.ts`（`renderCropDataUrl`） |
| 写盘（原子覆盖 / 另存目录、编号递增） | 调用方 `onCrop` → 页面 `cropImage` → `scripts/vite/files-crop.ts` |
| 时序与提示（保存中、成功 / 失败通知） | 本 hook |

## 入参 / 出口

```ts
const crop = useImageCrop({ path, name, mode, onCrop });
```

- `path`：当前图片绝对路径，保存时原样交给 `onCrop`；
- `name`：文件名，既决定**能不能裁**（`cropMimeForName` 只认 PNG / JPEG / WebP），也决定编码格式；
- `mode`：设置里的保存口径（`replace` / `copy`），由 header 的设置弹层写入偏好；
- `onCrop`：不传则裁剪入口整块不出现（弹窗按它判有无）。

出口 `{ active, rect, saving, supported, start, cancel, setRect, save }`：

- `start()` 才进入裁剪，并先把选框复位成 `DEFAULT_CROP_RECT`（居中 80%）；格式不支持时直接不动，
  提示归调用方（弹窗在按钮上置灰）；
- `cancel()` 保存中不生效（`saving` 为真时保持原状），避免写盘一半退回普通态；
- `save(image)` 从 `<img>` 节点重新编码当前选框：`image` 为 `null`、未在裁剪、正在保存或没有
  `onCrop` 时直接返回；编码失败给「裁剪失败」，落盘失败按 `mode` 分别给「替换源文件失败」/
  「保存裁剪图片失败」，成功后退出裁剪并提示覆盖了谁 / 另存到了哪；
- 所有 setState 都先看 `useMounted`，弹窗关掉之后不再回写（异步写盘可能晚于关窗）。

## 为什么不放弹窗里

保存是一条「读节点 → 编码 → 请求 → 刷新页面数据」的异步链，夹着成功 / 失败两套提示；摊在弹窗
文件里会和 header 弹层、键位让位、全屏状态挤在同一层，也容易把行数顶过上限。这里只收口会话状态，
读者不必先理解 DOM 与接口就能判断「现在能不能取消、保存到哪一步」。
