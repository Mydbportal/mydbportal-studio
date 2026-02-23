# Contributing to Mydbportal Studio

Thanks for your interest in contributing.

This document explains how to contribute safely and efficiently to this
repository.

## Ways to Contribute

- Report bugs
- Propose features
- Improve documentation
- Submit code fixes or enhancements
- Review pull requests

## Project Stack

- Next.js App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- Database drivers: `pg`, `mysql2`, `mongodb`
- Desktop packaging: Electron + `electron-builder`

## Development Setup

### Prerequisites

- Node.js 20+
- Bun (recommended for local development)
- Git



## Branching and Commits

- Create feature branches from `main`.
- Keep each branch focused on one change.
- Use clear commit messages.
- Conventional Commit format is recommended:
  - `feat: add schema picker validation`
  - `fix: sanitize mysql table name`
  - `docs: update desktop release steps`

## Code Guidelines

- Follow existing file/module structure:
  - `app/actions/*` for server actions
  - `lib/adapters/*` for DB connectors
  - `modules/*` for UI features
- Prefer explicit TypeScript types.
- Avoid `any` unless unavoidable and documented.
- Reuse existing UI components before adding new primitives.
- Keep changes minimal and scoped.
- Validate SQL and identifier handling when touching DB logic.

## Quality Checks Before Opening a PR

Run these locally:

```bash
bun run lint
bun run build
```

Also perform manual verification for the area you changed:

- Connection flows (add/select/delete)
- DB-specific paths (PostgreSQL/MySQL/MongoDB) if affected
- Electron path if desktop code changed

## Pull Request Process

1. Fork the repository to your own GitHub account.
2. Clone your forked repository to your local machine.
3. Create a new branch:git checkout -b <branch-name>
1. Push your branch:
   ```bash
   git push origin <branch-name>
   ```
2. Open a PR against `main`.
3. Complete the PR template:
   - Description of the change
   - Linked issue (`Fixes #...`)
   - Type of change
   - Test steps
4. Include screenshots for UI changes if applicable.
5. Update docs when behavior or workflows change.
6. Respond to review feedback and push follow-up commits.

## Issues

Use GitHub issue templates:

- Bug reports: `.github/ISSUE_TEMPLATE/bug_report.md`
- Feature requests: `.github/ISSUE_TEMPLATE/feature_request.md`

When reporting a bug, include:

- Reproduction steps
- Expected vs actual behavior
- Logs/error text
- Environment details

## Security

Do not post sensitive credentials, connection strings, or keys in issues/PRs.

If you find a security issue, use a private disclosure path (GitHub Security
Advisory) instead of a public issue.

## Release Notes for Maintainers

Desktop releases are built by GitHub Actions workflow:

- `.github/workflows/electron-release.yml`

Publishing a GitHub Release with a tag (for example `v0.1.0`) triggers
cross-platform Electron builds and uploads assets to that release.

## Contributor Etiquette

- Be respectful and constructive in discussions.
- Assume good intent.
- Focus reviews on code quality and behavior.
