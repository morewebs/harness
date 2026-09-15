/** `layout` namespace dictionaries: TopBar and layout chrome. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'topbar.openSidebar': '打开侧边栏',
  'topbar.collapseSidebar': '收起侧边栏',
  'topbar.back': '后退',
  'topbar.forward': '前进',
  'topbar.appMenu': '应用菜单',
  'topbar.menuFile': '文件',
  'topbar.menuEdit': '编辑',
  'topbar.menuView': '视图',
  'topbar.menuHelp': '帮助',
  'topbar.windowControls': '窗口控制',
  'topbar.minimize': '最小化',
  'topbar.maximize': '最大化',
  'topbar.restore': '还原',
  'topbar.close': '关闭',
} satisfies Record<string, string>

/** The layout namespace key union. */
export type LayoutKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'topbar.openSidebar': 'Open Primary Side Bar',
  'topbar.collapseSidebar': 'Collapse Primary Side Bar',
  'topbar.back': 'Back',
  'topbar.forward': 'Forward',
  'topbar.appMenu': 'Application Menu',
  'topbar.menuFile': 'File',
  'topbar.menuEdit': 'Edit',
  'topbar.menuView': 'View',
  'topbar.menuHelp': 'Help',
  'topbar.windowControls': 'Window Controls',
  'topbar.minimize': 'Minimize',
  'topbar.maximize': 'Maximize',
  'topbar.restore': 'Restore',
  'topbar.close': 'Close',
} satisfies Record<LayoutKey, string>
