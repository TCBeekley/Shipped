# Contributing

## Branching

Branch off `main` using a type prefix:

- `feat/<short-description>` — new features
- `fix/<short-description>` — bug fixes
- `chore/<short-description>` — tooling, deps, maintenance

Direct pushes to `main` are blocked; all changes land via pull request.

## Commit messages

Every commit **must** follow the [Conventional Commits](https://www.conventionalcommits.org/)
format:

```
type(scope): description
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test` (plus the
other conventional types such as `build`, `ci`, `perf`, `style`, `revert`).

Examples:

```
feat(cart): add quantity stepper
fix(auth): handle expired refresh token
chore(deps): bump vite to 8.1
```

This is enforced locally by the `commit-msg` Husky hook (commitlint) and
validated again in CI on every PR commit. Local hooks can be bypassed with
`--no-verify`, but CI is the backstop — a non-conforming commit fails the PR.

## Pull request process

1. Create a branch and open a PR against `main`.
2. Fill out the PR template (summary, changes, testing done, checklist).
3. CI must pass: `lint`, `typecheck`, `test`, `build`.
4. At least one approving review is required; stale approvals are dismissed on
   new pushes.
5. PRs merge via **merge commit** (squash and rebase are disabled). The branch
   is deleted automatically after merge.

## Before you push

```bash
make format
make lint
make typecheck
make test-cov
```

New and changed code should keep coverage at or above 80%.
