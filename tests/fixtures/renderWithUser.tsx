import type { ReactElement } from 'react'
import { render, type RenderResult } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'

/**
 * Shared test fixture: renders a component and hands back a configured
 * userEvent instance alongside the usual render result. Import this instead
 * of re-wiring userEvent.setup() in every component test.
 */
export function renderWithUser(
  ui: ReactElement,
): RenderResult & { user: UserEvent } {
  return {
    user: userEvent.setup(),
    ...render(ui),
  }
}
