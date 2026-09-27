/**
 * The settings shell store: modal open state and the active nav section id.
 * Entry-declared viewing state (the framework instantiates it per entry), so
 * the cross-entry open command reaches it through ctx.settingsUI — the
 * registration's inject factory hands the bound actions to that service,
 * exactly as ui-layout's root entry wires ctx.layout. Module level exports
 * the factory only: a module-level handle would pin the store's identity in
 * the module cache (a de-facto singleton surviving plugin reloads).
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'

/** Settings shell state: whether the modal is open and which nav row is active. */
export type SettingsShellState = { open: boolean; activeSectionId: string | undefined }

/**
 * Annotation twin of the actions literal below (the export needs a declared
 * return type); drift fails assignability at the defineStore call.
 */
type SettingsShellActions = {
  open: (draft: SettingsShellState, sectionId?: string) => void
  close: (draft: SettingsShellState) => void
  select: (draft: SettingsShellState, sectionId: string) => void
}

/**
 * Create the settings shell store handle. `open` without a section id keeps
 * the current selection (a fresh open after `close` starts at the first row,
 * because close clears the id); `open` with an id also switches the section,
 * so a cross-entry request while the modal is already open lands on its row.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createSettingsShellStore(): EngineStoreHandle<SettingsShellState, SettingsShellActions> {
  return defineStore({
    init: (): SettingsShellState => ({ open: false, activeSectionId: undefined }),
    actions: {
      open: (d, sectionId?: string) => {
        d.open = true
        if (sectionId !== undefined) d.activeSectionId = sectionId
      },
      close: (d) => {
        d.open = false
        d.activeSectionId = undefined
      },
      select: (d, sectionId: string) => { d.activeSectionId = sectionId },
    },
  })
}
