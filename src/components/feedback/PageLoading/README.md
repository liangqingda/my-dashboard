# 页面切换占位（`PageLoading`）

页面 chunk 还在加载时的整屏占位：居中一个 `Loader size="sm"`。

| 项 | 约定 |
| --- | --- |
| 用途 | 只给路由级懒加载用（`BasicLayout` 的 `Suspense` fallback），不是通用加载态 |
| 全屏态 | 目标页上次是**页面全屏**时，用不透明底铺满视口、盖住顶栏与侧栏 |
| 为什么提前判断 | 全屏状态要等页面 chunk 挂载后才读得到；不提前盖住，刷新后第一帧会先露出非全屏界面再切过去，看起来像闪一下。存储读取走 `@/utils/page-fullscreen`，与 `MenuContentLayout` 同一份键 |
| 不负责 | 数据加载中（那种用 `Loader` / `Skeleton` 就地表达，不要盖整屏） |

## 注意

- 这是「页面占位」这一具体实现，**不是**全站加载态的唯一入口，所以不挂 `Free`（判据见
  `docs/ui-components.md` 的「命名与位置」）。
- 需要动画骨架时用 `Skeleton`，不要在这里加业务态。
