// vitest-axe ships its matcher types against the legacy global `Vi` namespace,
// which Vitest 4 no longer reads. Re-declare them on the current interface so
// `expect(...).toHaveNoViolations()` typechecks.
import 'vitest'
import type { AxeMatchers } from 'vitest-axe'

declare module 'vitest' {
  interface Matchers<T = unknown> extends AxeMatchers {
    _axeMatchersFor?: T
  }
}
