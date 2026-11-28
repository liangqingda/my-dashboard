# 公共化边界：本项目落点与示例

通用判据（UI 与逻辑分开判、四种形态、公共件不得含页面语义、props 中转、高频能力先提）见
`best-react-code` 的《公共化边界：UI 与逻辑分开判》与《能力上提与持久化边界》。本文件只写
本项目的落点、命名与示例，不重复判据。

## 本项目落点

| 形态 | 本项目落点 | 调用方还留什么 |
| --- | --- | --- |
| UI 与逻辑都提，且不带业务语义 | `src/components/<分类>/<Name>/` | 只传数据与事件 |
| UI 与逻辑都提，但带业务语义 | `src/pages/<Page>/<Name>/` | 页面数据与业务参数 |
| 仅 UI 提公共 | `src/components/<分类>/FreeXxx/`（或既有公共壳） | 选项、文案、`render` / `children`、`onChange` |
| 仅逻辑提公共 | 纯函数 `src/utils/<kebab>.ts`；状态机 `src/hooks/` 或页面 `hooks/` | 自己决定怎么画、画在哪 |
| 两者都不提 | `src/pages/<Page>/` | 全部 |

分类目录、`FreeXxx` 的命名与「唯一入口」判据见 `docs/ui-components.md`；存储键的命名见
`docs/shared-utils.md`。

## 本项目命名与边界

- **`Free` 前缀只给某类对象的全站唯一入口**；只提供某个动作的现成实现、不构成唯一入口的能力件
  不挂 `Free`（如复制、筛选、图标弹层、二次确认、文档预览）。
- 公共件语义边界（页面文案 / 阈值 / 存储键 / 段落标记）与 props 中转，按 skill 判据落到上表
  对应目录；本项目不在 `src/components` 里补业务分支。

## 示例（只作注脚）

| 形态 | 本项目例子 | 为什么这么归 |
| --- | --- | --- |
| ① | `FreeTable`、`FreeModal` 的关窗 / 翻篇 / 全屏键位与框体 | 两个页面要的是同一套行为，没有页面差异 |
| ② | `ConfirmModal`、`FilterButton`、`IconPopoverButton` | 外壳与开合是同一套；筛什么、说明写什么各页不同 |
| ③ | `@/hooks/useStoredState`、`@/utils/format` | 逻辑能共用，界面上放哪、长什么样归页面 |
| ④ | `NoteFilter` 的筛选口径、`NoteEditor` 的块编辑 | 语义只属于这一页 |

## 自检

按 skill 的三步自查（正向查公共件 props / constants 的页面来源、反向查两次以上改动的同一段、
查重复的外观常量与字段组合）之外，本项目再 grep 两处：

```bash
# 以当前页面为例：把「错题 / 习题」换成任一页面的专有名词
grep -rn "错题\|习题" --include="*.tsx" --include="*.ts" src/components
grep -rn "comboboxProps\|FIELD_STYLES" src   # 同一段字段组合 / 同一套外观常量被复制
```

命中后按落点表判一遍：该提 UI 的封 `FreeXxx`，该提逻辑的收进 `utils` / `hooks`，两者都不同的留在
页面。提完把规格写进组件自己目录的 `README.md`，只有跨文件的判据才回到本文件。
