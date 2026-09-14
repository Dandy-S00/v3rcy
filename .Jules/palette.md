## 2025-05-18 - Accessibility and Async Feedback for Icon-Only Chat Action Buttons
**Learning:** Icon-only buttons in messaging interfaces (like the Send button) lack accessible names for screen readers and leave users uncertain whether their input is being processed during network latency.
**Action:** Always provide an explicit `aria-label` that reflects the current state (e.g. "Send message" / "Sending message...") and render a loading spinner during pending async mutations.
