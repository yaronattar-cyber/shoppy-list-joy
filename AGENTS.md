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
- Keep `@refresh reset` on the main route while its custom hooks live in uninstrumented `.ts` modules; remounting on live edits prevents stale hook slots when their signatures change.
