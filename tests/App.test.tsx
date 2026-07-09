import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import App from '../src/App'
import { renderWithUser } from './fixtures/renderWithUser'

describe('<App />', () => {
  it('renders the getting-started heading', () => {
    renderWithUser(<App />)
    expect(
      screen.getByRole('heading', { name: /get started/i }),
    ).toBeInTheDocument()
  })

  it('increments the counter when clicked', async () => {
    const { user } = renderWithUser(<App />)
    const button = screen.getByRole('button', { name: /count is 0/i })

    await user.click(button)

    expect(
      screen.getByRole('button', { name: /count is 1/i }),
    ).toBeInTheDocument()
  })
})
