---
name: matt-pocock
description: Apply Matt Pocock's (Total TypeScript) TypeScript best practices when authoring, fixing, or reviewing TypeScript in this project — types vs interfaces, `satisfies`, no enums, derive-don't-duplicate, `unknown` over `any`, discriminated unions, branded ids, strictness, and ts-reset. Use whenever writing or reviewing `.ts`/`.tsx`.
---

# Matt Pocock — TypeScript best practices

Write and review TypeScript the way Matt Pocock (Total TypeScript) teaches it. This repo is `strict` Next.js 16 + React; favor types that make illegal states unrepresentable and that derive from a single source of truth.

## Types vs interfaces
- `interface` for object shapes meant to be extended/implemented; `type` for unions, intersections, mapped/conditional types, tuples, and function types.
- Be consistent within a file. Don't reach for `interface` just out of habit.

## Prefer `satisfies` over annotations for literals
- `const config = { … } satisfies Config` — keeps the *narrow inferred* type while still checking the shape. Avoid `const config: Config = { … }`, which widens and loses literal info.

## No `enum` — use `as const` or unions
- Replace `enum` with a string-literal union, or:
  `const Status = { Idle: 'idle', Loading: 'loading' } as const;`
  `type Status = (typeof Status)[keyof typeof Status];`

## Derive, don't duplicate
- One source of truth, then derive: `z.infer<typeof schema>`, `typeof someConst`, `ReturnType<>`, `Parameters<>`, indexed access (`Foo['bar']`), `keyof`, `as const`. Never hand-maintain a type that mirrors a runtime value.

## `unknown` over `any`
- Never `any`. Use `unknown` at boundaries (JSON, `catch`, external data) and narrow with type guards. If an escape hatch is unavoidable, isolate it to one line and comment why.

## Make illegal states unrepresentable
- Model async/UI state as a discriminated union, not a bag of booleans:
  `type State = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ok'; data: Data };`

## Strictness assumptions
- Assume `strict` and ideally `noUncheckedIndexedAccess`: handle the `T | undefined` from array/record indexing instead of asserting it away.

## Branded ids
- Prevent mixing identifiers: `type UserId = string & { readonly __brand: 'UserId' };` (and a small `asUserId` helper) so a `ShowId` can't be passed where a `UserId` is expected.

## Generics & helpers
- Name generic params meaningfully and constrain with `extends`. Don't over-generalize. Reach for built-in/util types before writing new ones.

## ts-reset
- Consider `@total-typescript/ts-reset` for safer built-ins (`.json()` → `unknown`, `.filter(Boolean)` narrows, `Array.includes` widening). Suggest adding it if the project doesn't already.

## When reviewing, flag
- `any`, unjustified non-null `!`, lying `as` casts, `enum`, and types that duplicate a runtime shape instead of deriving it.
