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

- Shared shopping-item UI belongs in reusable row and bottom-sheet components so List and In-Store stay behaviorally consistent.
- Store records persist whether they are online-only; physical shopping controls must only appear for non-online stores.
- Online order snapshots persist in dedicated order tables and move into inventory atomically when received, so family devices stay consistent.
