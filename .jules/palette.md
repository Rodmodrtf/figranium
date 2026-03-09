## 2024-05-18 - Icon-only buttons with titles need aria-labels
**Learning:** Adding a `title` attribute to an icon-only button (e.g., `<button title="Delete"><Icon/></button>`) provides a tooltip on hover, but it is not consistently announced by all screen readers. An explicit `aria-label` is still required for robust accessibility.
**Action:** When creating icon-only buttons, ensure both `title` (for visual users) and `aria-label` (for screen reader users) are present, or use visually hidden text.

## 2025-05-19 - Focus management for icon-only buttons
**Learning:** Icon-only buttons in dark-themed interfaces often lack visible focus indicators. Using `focus:outline-none` with `focus-visible:ring-2` provides a clear, accessible focus state for keyboard users without affecting the visual experience for mouse users.
**Action:** Apply the `focus-visible:ring-2 focus-visible:ring-white/50` pattern to all interactive icon-only elements to ensure WCAG compliance for keyboard navigation.
