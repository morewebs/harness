/**
 * The settings-open service contract — the Service Definition of the
 * cross-entry command that opens the Settings modal. The Provider is the
 * settings shell (ui-settings-general, whose `sidebar.settings` entry owns
 * the modal store); this package, the settings domain base, owns only the
 * face every consumer reaches through `ctx.settingsUI`. It lives here rather
 * than with the shell for the same reason the settings slot types do: the
 * base layer is the one settings dependency every consumer already carries,
 * and the shell depends on the sidebar's slot contract, so a face declared
 * there would force a dependency cycle on every consumer outside the
 * settings family.
 */
import type {} from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Open the Settings modal, optionally selecting a nav section by id. */
    settingsUI: ISettingsUI
  }
}

/**
 * The outward settings-open face: the command other plugins' apply worlds
 * trigger — the sidebar's nav cluster opening a section directly — and
 * exactly what a test fake must supply. The concrete provider lives with
 * the shell (ui-settings-general); calling it before the shell entry wired
 * its store throws.
 */
export interface ISettingsUI {
  /**
   * Open the settings modal, optionally selecting a nav section by id.
   * @param sectionId - Nav section to select; omit to keep the current selection.
   */
  open(sectionId?: string): void
}
