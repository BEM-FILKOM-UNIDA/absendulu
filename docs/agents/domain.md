# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root, or
- `CONTEXT-MAP.md` at the repo root if it exists — it points at one `CONTEXT.md` per context.
- `docs/adr/` — read ADRs that touch the area being changed.

If any of these files don't exist, proceed silently. Don't flag their absence or create them upfront. Create them lazily when terminology or architectural decisions are actually resolved.

## File structure

This is a single-context repo. When domain documentation is added, use:

```text
/
├── CONTEXT.md
└── docs/adr/
```

## Use the glossary's vocabulary

When output names a domain concept, use the term as defined in `CONTEXT.md`. If the concept is not defined yet, record the terminology gap instead of silently inventing competing names.

## Flag ADR conflicts

If a change contradicts an existing ADR, surface it explicitly rather than silently overriding the decision.
