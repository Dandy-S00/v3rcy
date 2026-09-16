## 2025-02-23 - Icon-Only Action Buttons in Interactive Components
**Learning:** Icon-only action buttons (such as chat send buttons) lack implicit text for screen readers and visual hints for sighted users.
**Action:** Always wrap icon-only action buttons in Radix UI Tooltips and provide explicit `aria-label` attributes reflecting the current dynamic state (e.g., sending vs send).
