// Shared test setup — runs before every test file (see vite.config.ts `setupFiles`).
// Registers jest-dom matchers (toBeInTheDocument, toHaveTextContent, ...) plus
// vitest-axe's toHaveNoViolations, and clears the DOM between tests.
import '@testing-library/jest-dom/vitest'
import { afterEach, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
// vitest-axe's own extend-expect entry ships an empty dist file, so register
// the matcher directly (types are declared in tests/vitest-axe.d.ts).
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

afterEach(() => {
  cleanup()
})
