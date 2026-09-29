/** `sidebar` namespace dictionaries: shell controls (brand row, New Session, nav cluster, fold toggle). */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'session.new.label': '新建会话',
  'toggle.open': '打开侧边栏',
  'toggle.collapse': '收起侧边栏',
  'nav.newChat': '新会话',
  'nav.plugins': '插件',
  'nav.explore': '探索',
} satisfies Record<string, string>

/** The sidebar namespace key union. */
export type SidebarKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'session.new.label': 'New session',
  'toggle.open': 'Open sidebar',
  'toggle.collapse': 'Collapse sidebar',
  'nav.newChat': 'New chat',
  'nav.plugins': 'Plugins',
  'nav.explore': 'Explore',
} satisfies Record<SidebarKey, string>
