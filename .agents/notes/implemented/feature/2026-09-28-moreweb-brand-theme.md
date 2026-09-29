# Agent Note: The moreweb palette, typography, and brand surfaces

Status: implemented

English | [中文](2026-09-28-moreweb-brand-theme.zh.md)

## Problem

The fork's rebrand stopped at the wordmark. `ui-theme`'s token sheets still carried the upstream palette wholesale: every link, primary button, thinking shimmer, and selected-session accent resolved through the `--dsw-static-deepseek-*` blue ramp, dark surfaces were the upstream neutral greys, and `--dsw-font-family` was the system stack — so the product read as DeepSeek blue everywhere except the wordmark, which itself still carried the upstream "HARNESS" badge with a clipped final letter. The sidebar and hero brand-mark slots rendered nothing (`OfficialBrandMark` returned null; `HeroShell` never rendered the mark slot it received), `BrandWordmark`'s `includeMark` prop was documented as defaulting to true but silently ignored, the web favicon was the upstream whale, and the desktop taskbar/installer icons were the upstream blue emblem.

## Decision

The brand identity follows the moreweb site: a purple accent on near-black purple-tinted surfaces, Poppins for UI text, Space Mono for code. The values live where the styling rules put them — token values in `ui-theme`, not component CSS:

- `design-platform.css` gains a `--dsw-static-moreweb-*` scale (accent ramp `50`–`900` plus the site's exact surface family: base `rgb(3,0,5)`, raised `rgb(7,3,13)`, overlay `rgb(13,7,22)`, panel `rgb(20,10,32)`, selected `rgb(44,19,67)` and its two hover steps). The semantic aliases rebind to it in both themes: links, `state-business-primary`, the info button pair, the chat bubble, the sidebar active-session accent, and the dark scrollbar l1/l2 pairs; dark base/layers ride the site surface family, and the elevated chrome tokens (`tip`, `selector`, `input-major`, `toast`/`tooltip-bg`, `multi-select`, `module-platform`) follow the same rungs so the elevation ladder stays one ladder. The dead `--dsw-static-deepseek-*` ramp is deleted; `dshmarket` and every feature component consume only `--dsw-alias-*` names, so no consumer changes.
- `base.css` sets `--dsw-font-family` to Poppins-first and `--ds-font-family-code` to Space Mono-first, keeping the CJK system tails. The latin woff2 subsets (Poppins 100/400/500/600/700, Space Mono 400/700) ship from `apps/web/public/fonts/` with their OFL-1.1 license text beside them; `THIRD_PARTY_NOTICES.md` gains a vendored-font-assets section through the notices generator.
- The remaining direct static consumers rebind through aliases: the ChatView thinking gradient and the StateDot ongoing color read `state-business-primary`/`-tertiary`.
- `BrandMark` (new, `ui-primitives`) draws the site's mark — the gradient "m" glyph on its dark tile — with a `useId`-scoped gradient so multiple instances coexist. `BrandWordmark` honors `includeMark` (mark + name) and drops the upstream badge; `ui-brand-official` occupies the sidebar mark slot with the real mark and registers the hero mark, which `HeroShell` now renders above the blank-session headline (an absent renderer or unoccupied slot collapses the wrapper, so the stack spacing never reserves an empty seat).
- The web favicon becomes the site's mark svg, and `scripts/generate-desktop-icons.py` redraws the 512px tile from the same geometry (bezier-sampled gradient stroke, cyan dot), regenerating `icon.png`/`icon.ico`. The desktop splash spell the full brand ("moreweb" was rendering four of seven letters), carries the purple error badge color, and loads only the bundled font (the Google Fonts network link is gone).

## Alternatives considered

**Restyle component CSS directly.** Rejected by [docs/web-styling.md](../../../../docs/web-styling.md): feature sheets read semantic aliases, and the theme owns values. Editing tokens rebinds every consumer at once and keeps the light/dark pair coherent.

**Keep the deepseek ramp alongside the moreweb one.** After the alias rebind and the two component fixes, nothing consumed it; keeping an unreferenced palette scale contradicts the one-home-per-fact rule.

**A third-party theme via `ctx.theme` instead of rebinding the built-ins.** The built-in light/dark pair is the product's identity, not an add-on; the override layer is for compositions that want their own theme on top.

**Keep the whale favicon and fish icon as fallbacks.** The fork removed the fish from the sidebar in commit 89778758f5; keeping the art as unused exports and stale icons left the brand split across two identities.

## Consequences

Light mode stays white-surfaced with the purple accent ramp (text-safe `moreweb-500` for links and fills); dark mode is the site's surface family with `moreweb-450` (`#bf00ff`) as the accent. The elevation-ladder scrollbar spec still holds because the elevated chrome tokens still resolve to the layer-2/3 rungs — the spec's palette-ladder derivation catches any future token that leaves the rungs. Poppins covers Latin only; CJK text falls through to the system tails per-glyph, so zh users keep PingFang SC/Microsoft YaHei rendering inside the same layout metrics. The wordmark's name width is a measured constant with slack (`NAME_WIDTH`); engines with wider Poppins metrics render into the slack instead of clipping.
