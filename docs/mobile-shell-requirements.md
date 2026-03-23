# Mobile Shell Requirements

This note captures the mobile-specific shell and scrolling behavior requested
for the site during the March 2026 visual-performance pass.

## Scope

- Applies to iPhone-class mobile browsers, especially recent iOS Safari and
  iOS Chrome with translucent browser chrome / liquid-glass effects.
- Concerns the shared site shell: hero, compact header, top spill, bottom
  spill, section surfaces, and the resume route.

## Top Spill

- The area visible behind the top browser chrome must use the same moving blue
  shell texture as the hero.
- That top spill must also carry the same darkening treatment as the hero so
  it does not appear as a lighter flat blue.
- Hero content itself must not bleed into the top browser chrome. Only the
  shell background may appear there.
- The compact header should remain visually opaque; content should not be
  readable underneath it.

## Bottom Spill

- The bottom of the page must not bleed the moving shell texture.
- The bottom browser-chrome spill should continue the active page surface:
  dark on `about`, `github`, `resume`, and `portfolio`; light on `greece`.

## Header Behavior

- On mobile, once the hero is collapsed, the compact header must stay pinned
  to the top of the page.
- The hero must not be able to scroll past the top in iOS Chrome.
- The collapsed header should not become translucent.
- Navigation actions should land in a collapsed state for consistency.

## Resume Route

- The resume route should always use the compact header state on mobile.
- The native PDF viewer should start below the compact header rather than
  underneath it.
- Mobile users must be able to zoom normally in the PDF viewer.
- The initial PDF view should default to a fit mode.

## Testing Notes

- Chrome desktop emulation is useful for validating scroll geometry, route
  transitions, and pinned-header behavior.
- Chrome desktop emulation is not a reliable representation of the exact top
  browser-chrome spill seen on a real iPhone, so on-device verification is
  still required for final polish.
