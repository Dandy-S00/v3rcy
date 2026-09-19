## 2025-02-23 - Icon-Only Action Buttons in Interactive Components
**Learning:** Icon-only action buttons (such as chat send buttons) lack implicit text for screen readers and visual hints for sighted users.
**Action:** Always wrap icon-only action buttons in Radix UI Tooltips and provide explicit `aria-label` attributes reflecting the current dynamic state (e.g., sending vs send).

## 2025-02-24 - Tooltips on Disabled Buttons
**Learning:** Browsers suppress pointer/mouse events on disabled `<button>` elements, preventing Radix UI Tooltips from showing when hovering over a disabled state.
**Action:** Wrap disabled buttons in an inline wrapper element (e.g. `<span className="inline-block">`) inside `<TooltipTrigger asChild>` to capture pointer events and display helpful tooltips explaining why the action is disabled.
