## 2025-02-23 - Path Traversal Prevention in Storage Proxy
**Vulnerability:** Unsanitized path/key input in `/storage/*` proxy endpoint allowed relative directory traversal (`..`) sequences when retrieving presigned storage URLs.
**Learning:** Dynamic storage proxy routes mapping wildcard URL params to S3 key paths must strictly sanitize relative paths and reject `..` traversal sequences before forwarding to storage backends.
**Prevention:** Always normalize key paths and check for `..` or absolute path indicators prior to generating presigned GET/PUT parameters.

## 2025-03-03 - URL-Encoded Path Traversal Bypass in Storage Proxy
**Vulnerability:** URL-encoded (`%2e%2e`, `%2f`, `%5c`) and multi-level URL-encoded (`%252e%252e`) sequences in wildcard `/storage/*` route parameters bypassed string matching and path normalization checks before forwarding to S3 presigning API.
**Learning:** Checking string pattern matches (`..`) on raw URL path parameters is insufficient because storage backends or downstream parsers decode URL percent-encoding.
**Prevention:** Recursively decode URL components and handle URI errors prior to applying normalization and path traversal checks.

## 2025-03-05 - Account Status Enforcement Gap in Express REST Endpoints
**Vulnerability:** Raw Express endpoints (such as `POST /api/profile-media`) bypassed tRPC account status middlewares (`ensureActiveAccount`), allowing suspended or restricted accounts to upload media to backend storage.
**Learning:** When adding standalone Express REST endpoints outside tRPC, account status checks (`profile.accountStatus !== "active"`) must be explicitly applied alongside authentication checks.
**Prevention:** Always verify `profile.accountStatus === "active"` in all state-modifying Express endpoints before proceeding with file storage or database operations.

## 2025-03-05 - Account Status Enforcement Gap in Messaging Query Endpoints
**Vulnerability:** Protected tRPC messaging query endpoints (`messaging.inbox` and `messaging.messages`) omitted `ensureActiveAccount` checks, allowing suspended or restricted accounts to fetch private conversation messages and inbox listings.
**Learning:** Checking account status (`accountStatus === "active"`) must be consistently applied across both query and mutation procedures in domain routers handling sensitive user data, not just write operations.
**Prevention:** Always invoke `await ensureActiveAccount(ctx.user.id);` at the start of protected tRPC query/mutation handlers where suspended user access must be prohibited.
