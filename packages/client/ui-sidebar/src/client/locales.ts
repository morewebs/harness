/** `sidebar` namespace dictionaries: shell controls (brand row, New Session, fold toggle). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'session.new': '新会话',
  'session.new.label': '新建会话',
  'toggle.open': '打开侧边栏',
  'toggle.collapse': '收起侧边栏',
  'nav.newChat': '新会话',
  'nav.pullRequests': '拉取请求',
  'nav.scheduled': '定时任务',
  'nav.plugins': '插件',
  'nav.explore': '探索',
  'nav.notifications': '通知',
  'search': '搜索',
} satisfies Record<string, string>

/** The sidebar namespace key union. */
export type SidebarKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'session.new': 'New Session',
  'session.new.label': 'New session',
  'toggle.open': 'Open sidebar',
  'toggle.collapse': 'Collapse sidebar',
  'nav.newChat': 'New chat',
  'nav.pullRequests': 'Pull requests',
  'nav.scheduled': 'Scheduled',
  'nav.plugins': 'Plugins',
  'nav.explore': 'Explore',
  'nav.notifications': 'Notifications',
  'search': 'Search',
} satisfies Record<SidebarKey, string>
