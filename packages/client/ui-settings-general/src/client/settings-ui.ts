/**
 * SettingsUIController: the Provider of the `ctx.settingsUI` open command.
 * The Service Definition (the face and its Context slot) lives in the
 * settings domain base (ui-settings); the shell's modal state lives in the
 * `sidebar.settings` entry's store (settings-shell-store.ts), and this
 * controller — provided by this plugin — adopts the store's bound actions
 * through the registration's inject factory, exactly as ui-layout's root
 * entry wires ctx.layout.
 */
import type { ISettingsUI } from '@deepseek-ai/dsh-client-ui-settings/client'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { createSettingsShellStore } from './settings-shell-store.ts'

/** The settings shell store's bound action set (framework-baked, draft params peeled). */
export type SettingsShellActions = BoundActions<ReturnType<typeof createSettingsShellStore>>

/** Cross-plugin settings-open provider (the service behind ctx.settingsUI). */
export class SettingsUIController implements ISettingsUI {
  #shell: SettingsShellActions | undefined

  /**
   * Adopt the shell entry's bound store actions. Called from the
   * `sidebar.settings` registration's inject factory (a sanctioned assembly
   * side effect), so the face is live from the entry's first render; on entry
   * re-register the fresh actions overwrite the stale set.
   * @param actions - bound actions of the entry's settings shell store instance.
   */
  attachShell(actions: SettingsShellActions): void {
    this.#shell = actions
  }

  /** Open the settings modal, optionally selecting a nav section by id. */
  open(sectionId?: string): void {
    this.#require().open(sectionId)
  }

  #require(): SettingsShellActions {
    // Callers are UI gestures, which cannot fire before the shell entry
    // rendered (the inject factory runs in its first render) — reaching this
    // unwired is a boot-order bug, not a race to tolerate.
    if (this.#shell === undefined) throw new Error('settingsUI: shell actions not wired (settings entry not mounted)')
    return this.#shell
  }
}
