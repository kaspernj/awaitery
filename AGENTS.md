# Development Workflow

- Run `npm run lint` to check code style and JSDoc rules.
- Run `npm run typecheck` to verify TypeScript types without emitting build artifacts.
- Run `npm run test` to execute the Jasmine test suite.
- After making changes, run `npm run lint`, `npm run typecheck`, and `npm run test` to verify everything works.
- Update the PR description with `gh pr edit <pr-number> --body "..."` when needed.
