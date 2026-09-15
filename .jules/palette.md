## 2025-05-18 - Icon-only action buttons accessibility & feedback

**Learning:** Icon-only action buttons (such as send message, delete, or reorder buttons) lack visual textual context for sighted keyboard/mouse users and accessible text for screen reader users. Furthermore, async icon buttons without loading feedback lead to double-clicks and confusion.
**Action:** Always provide `aria-label`, wrap icon-only action buttons with Radix `Tooltip`, and substitute the icon with a loading spinner (e.g., `Loader2`) while async operations are pending.
