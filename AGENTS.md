<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Shared shopping-item UI belongs in reusable row and bottom-sheet components across Home, List and In-Store so editing, importance and purchase states stay consistent.
- Store records persist whether they are online-only; physical shopping controls must only appear for non-online stores.
- Online order snapshots persist in dedicated order tables and move into inventory atomically when received, so family devices stay consistent.
- Own the visual-search wishlist once in the main screen container and share it with Home and List so both views update immediately.
- Own Home shortcut preferences once in the main screen; persist ordered pinned IDs by authenticated user separately from List tab order so family members cannot overwrite one another's choices.
- Recipes, notes and receipt scans use authenticated native Gemini streaming with a server-held provider key; multi-image recipes stay in one request to keep extraction consistent.
- Receipt confirmation stores private family-scoped images and atomically saves expenses and matched unit prices through an RLS-enforced RPC; content-addressed paths prevent duplicate receipt charges.
- Cooking uses a family-scoped, RLS-enforced transactional RPC with exact name/unit matches and sequential stock consumption, preventing partial deductions and duplicate-row overcounting.
- Cross-store purchase/clear deletion matches trimmed case-insensitive product names only within the same household and different non-null stores; mirror it in the offline queue and an RLS-enforced database trigger so devices agree while event-family scopes remain isolated.
- Event renaming uses an owner-family-authorized RPC; exporting copies quantity deficits into household rows without mutating event rows, preserving shared event tracking.
- ShoppingApp wraps its hook-owning ShoppingSession with a dev-only module-generation key: the Vite OXC refresh transform ignores @refresh reset, so explicit remounts prevent stale hook queues when .ts hooks change.
- Smart purchase calculations are pure tested helpers; household RLS triggers preserve depletion and matched receipt unit/store snapshots, and structured deficit additions use the existing offline queue to preserve quantities and avoid repeated purchases.

- Household administration uses family-scoped user_roles and authenticated RPCs; removed identities cannot rejoin via cached invitation codes.
- Item actor IDs are stamped by database triggers; display-name badges reuse the shared row, and event metadata/tasks remain on isolated event-family records with owner-family RPC authorization.
- Calendar synchronization is user-initiated Google Calendar event prefill or an ICS download, not connected-account background access.

- Home food scans reuse recipeFromImage and the normalized ingredient schema; product scans reuse native Gemini and enqueue categorized items into the explicit default store.
