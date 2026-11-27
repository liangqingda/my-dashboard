/**
 * 文件浏览页：按 macOS 目录网格展示本机指定目录下的子文件夹、应用包与文件，不限文件类型；
 * 应用包按一条应用展示（真实图标 + 卸载入口），不当作可进入的文件夹。
 * 网格与表格（名称 / 类别 / 操作三列）两种展示形式在设置面板外观组里切换，结果记在 localStorage。
 * 设置面板可开启按类型分组成段（文件夹 / 应用 / 视频 / 图片 / PDF / Markdown / 其它，对齐 macOS 访达分组），
 * 段标题整行可点折叠收起；默认平铺，分组偏好持久化，折叠状态只留在会话内。
 * 点文件夹进入下一层，面包屑回退，`⌘↑` 回上一级；可收藏常用目录，在收藏面板里点选直达；
 * 拖起任一条目会打开移动弹窗（设置里可改成一直接拖：不开弹窗，拖到列表里的文件夹松手即移入；
 * 目标自己在待拖拽区时这一格是禁用落点）：全屏逐层挑目标文件夹，面包屑换层，松手没落成移动就把条目留在手里；
 * 弹窗 header 有收藏当前层 / 新建文件夹 / 选本地目录三颗按钮（都走页面同一套流程），
 * 弹窗里这批条目平铺成待拖拽区，图标按条目类型换、图 / 视频可点开预览。
 * 网格里用 ⌘ / Shift + 点击（或待拖拽区已经非空时直接点）把条目攒进待拖拽区，
 * 平时它整块盖住侧栏那一列；页面全屏时没有侧栏了，它改成就地占内容区左侧一列，
 * 把列表挤到右边、高度撑满内容区（不再浮在列表上）。
 * 攒下东西后点条目只做「加入 / 移除」，整批搬走归待拖拽区底部的「拖拽全部」按钮，
 * 「选择全部 / 取消」也在那条底部条上（面板本身不再是拖拽热区）。
 * 两扇预览各有一颗「加入 / 移出待拖拽区」（图片在 header、视频在控制栏）：看大图或看视频时
 * 不用回网格按修饰键点，也能把当前这条收进这一批、或再点一次撤出去；那一下只弹一条提示，
 * 待拖拽区等关掉预览才浮出来（它比弹窗高一层，露出来会压住画面）。
 * 标题栏筛选面板支持按名称关键词过滤与按类型勾选，取消勾选的类型连同对应文件夹一起隐藏。
 * 列表只列摘要；点视频条目会在弹窗里播放（设置里可改成交给外部播放器），
 * 点图片条目会在同形的弹窗里预览，两者的翻篇与列表点选都基于当前目录的同类列表
 * （图片的列表收在 header 的图片列表弹层里，视频另有截图）。
 * 应用 hover 后右上角给卸载按钮，二次确认里先列清要删的残留，确认后由中间件删整包并清理缓存 / 配置 / 数据。
 * 目录读取走 Vite 中间件，仅开发模式可用。
 * 标题行右侧再显示本机剩余可用空间；当前目录在外接盘上时，连同那块盘的可用空间一起显示。
 * 设置里可以给这一页加安全锁：设了密码并开启后，每次进入都先弹一扇关不掉的密码窗，对上才进。
 * 状态编排见 `hooks/useFilesPageState`，本组件只做数据拼装与排布。
 */

import { Stack } from '@mantine/core';

import MenuContentLayout from '@/layouts/MenuContentLayout';

import DirBreadcrumb from './DirBreadcrumb';
import FilesActions from './FilesActions';
import FilesEntries from './FilesEntries';
import FilesLockGate from './FilesLockGate';
import FilesOverlays from './FilesOverlays';
import FilesStates from './FilesStates';
import FilesWorkspace from './FilesWorkspace';
import { describeDirSpace } from './utils/files';
import { pickDirectory } from './utils/files-api';
import { useFilesPageState } from './hooks/useFilesPageState';

import styles from './index.scss';

const Files = () => {
  const state = useFilesPageState();
  const {
    appUninstall,
    collapsedGroups,
    currentDir,
    currentEntry,
    deletingEntry,
    drag,
    emptyText,
    error,
    favorites,
    favoritesHook,
    filterActions,
    fixedColumns,
    goToDir,
    handlePickDir,
    handleSelectAll,
    imagePreview,
    imageStaged,
    isFavorite,
    isGridView,
    keyword,
    launchApp,
    launchingPath,
    list,
    listing,
    loading,
    loadingFolder,
    locked,
    moveFavorite,
    navigateParent,
    openFolder,
    openImage,
    openPanel,
    selectedCategories,
    openVideo,
    openVideoExternal,
    pending,
    pendingPaths,
    picking,
    refresh,
    removeFavorite,
    requestDelete,
    settings,
    toggleFavorite,
    toggleGroup,
    toggleImage,
    togglePinnedFavorite,
    togglePanel,
    toggleVideo,
    entryActions,
    entryDelete,
    unlock,
    videoPreview,
    videoApp,
    videoOpenMode,
    videoStaged,
    videoThumbStyle,
    view,
    volumeEject,
    wallpaper,
  } = state;

  /** 安全锁开着、密码也设了：本次停留还没输对，就只给那一扇密码窗 */
  if (locked) {
    return <FilesLockGate onUnlock={unlock} />;
  }

  return (
    <MenuContentLayout
      actions={
        <FilesActions
          canEject={volumeEject.canEject}
          createDisabled={currentEntry === null}
          ejecting={volumeEject.ejecting}
          favoriteDisabled={currentEntry === null}
          favorites={favorites}
          isFavorite={currentEntry !== null && isFavorite(currentEntry.path)}
          keyword={keyword}
          loading={loading}
          onCreateFolder={entryActions.createEntry}
          onEject={volumeEject.requestEject}
          onKeywordChange={state.setKeyword}
          onMoveFavorite={moveFavorite}
          onOpenFavorite={goToDir}
          onPanelChange={state.setOpenPanel}
          onPickDir={handlePickDir}
          onRemoveFavorite={removeFavorite}
          onSelectedCategoriesChange={filterActions.changeSelectedCategories}
          onToggleFavorite={() => {
            if (currentEntry !== null) {
              toggleFavorite(currentEntry);
            }
          }}
          onTogglePinnedFavorite={togglePinnedFavorite}
          onTypeFilterModeChange={filterActions.changeFilterMode}
          onViewModeChange={state.setView}
          openPanel={openPanel}
          picking={picking}
          selectedCategories={selectedCategories}
          settings={settings}
          typeFilterMode={settings.filterMode}
          view={view}
        />
      }
      description={describeDirSpace(listing?.space ?? null)}
      fill
      onEscape={pending.active ? pending.clear : undefined}
      onNavigateParent={navigateParent}
      onSpace={pending.active ? pending.clear : undefined}
      onToggleFavorites={() => togglePanel('favorites')}
      onToggleFilter={() => togglePanel('filter')}
      title="文件"
    >
      <FilesWorkspace
        drag={drag}
        entryActions={entryActions}
        onSelectAll={handleSelectAll}
        pending={pending}
        previewOpen={
          imagePreview.activeId !== null || videoPreview.activeId !== null
        }
      >
        <Stack className={styles.shell} gap="sm">
          {/* 批量状态（待拖拽区非空）下一旦起拖，松手落在其它任何地方都要收掉） */}
          <DirBreadcrumb currentDir={currentDir} onNavigate={goToDir} />

          <FilesStates
            error={error}
            gridSkeleton={list.showGridSkeleton}
            onRetry={refresh}
            prompt={list.showPrompt}
            tableSkeleton={list.showTableSkeleton}
          />

          {/* 两种形态都自己滚：纵向滚动条浮在内容之上，右侧固定留出一段比
              常规内边距更宽的空白（滚动条 6px + 呼吸空间），别让滚动条贴住列表内容 */}
          {listing !== null && !list.showSkeleton ? (
            <FilesEntries
              apps={list.visibleApps}
              collapsedGroups={collapsedGroups}
              dragPaths={drag.dragPaths}
              dropBlockedPath={drag.dropBlockedPath}
              dropTarget={drag.dropTarget}
              emptyText={emptyText}
              files={list.visibleFiles}
              fixedColumns={fixedColumns}
              folderProgress={drag.folderProgress}
              folders={list.visibleFolders}
              grouped={settings.grouped}
              isGridView={isGridView}
              launchingApp={launchingPath}
              loading={loading}
              loadingFolder={loadingFolder}
              onDragEnd={drag.handleDragEnd}
              onDragLeaveFolder={drag.handleDragLeaveFolder}
              onDragOverFolder={drag.handleDragOverFolder}
              onDragStartEntry={drag.handleListDragStart}
              onDropBlank={drag.handleDropBlank}
              onDropFolder={drag.handleDropFolder}
              onEditEntry={entryActions.editEntry}
              onOpenApp={launchApp}
              onOpenExternalVideo={openVideoExternal}
              onOpenFolder={openFolder}
              onOpenImage={openImage}
              onOpenVideo={openVideo}
              onRequestDeleteEntry={requestDelete}
              onRequestUninstallApp={appUninstall.requestUninstall}
              onSelectRange={pending.selectRange}
              onSetWallpaper={wallpaper.requestWallpaper}
              onToggleGroup={toggleGroup}
              onTogglePending={pending.toggle}
              pendingActive={pending.active}
              pendingPaths={pendingPaths}
              rows={list.rows}
              tileMinWidth={settings.tileMinWidth}
              tipsOff={entryActions.dragMove.dragActive}
              veilOpacity={settings.veilOpacity}
              videoApp={videoApp}
              videoOpenMode={videoOpenMode}
              videoThumbStyle={videoThumbStyle}
            />
          ) : null}
        </Stack>
      </FilesWorkspace>

      <FilesOverlays
        modals={{
          appUninstall,
          deleteEntry: entryDelete,
          entryActions,
          favorites: favoritesHook,
          onCreateFolder: (dir) => void entryActions.createEntryIn(dir),
          onPickDir: pickDirectory,
          onPreviewImage: openImage,
          onPreviewVideo: openVideo,
          volumeEject,
          wallpaper,
        }}
        preview={{
          blocked: deletingEntry !== null,
          defaultFullscreen: {
            image: settings.imageFullscreen,
            video: settings.videoFullscreen,
          },
          image: imagePreview,
          imageStaged,
          onRequestDelete: requestDelete,
          onToggleImage: toggleImage,
          onToggleVideo: toggleVideo,
          video: videoPreview,
          videoStaged,
        }}
      />
    </MenuContentLayout>
  );
};

export default Files;
