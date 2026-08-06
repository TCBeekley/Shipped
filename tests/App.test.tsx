import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import App from '../src/App'
import { renderWithUser } from './fixtures/renderWithUser'

describe('<App />', () => {
  it('renders the hero headline', () => {
    renderWithUser(<App />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /shipped: apps people use, systems that stay up/i,
      }),
    ).toBeInTheDocument()
  })

  it('features SPT-50 with its App Store CTA and shipped date', () => {
    renderWithUser(<App />)
    const featured = screen.getByRole('link', { name: /SPT-50/ })

    expect(featured).toHaveAttribute('href', '/spt-50')
    expect(featured).toHaveTextContent(/view on the app\sstore/i)
    expect(featured).toHaveTextContent('shipped: 2026-03')
    expect(screen.getByAltText('SPT-50 app icon')).toBeInTheDocument()
  })

  it('renders a card with a shipped stamp for every project', () => {
    renderWithUser(<App />)

    for (const [title, shipped] of [
      ['Stitch', 'shipped: 2025-08'],
      ['Transfer Tracker', 'shipped: 2025-01'],
      ['OpenVPN fleet', 'shipped: 2026-06'],
    ]) {
      const card = screen.getByRole('link', { name: new RegExp(title) })
      expect(card).toHaveTextContent(shipped)
    }
  })

  it('links the footer to the shipped repo', () => {
    renderWithUser(<App />)
    expect(screen.getByRole('link', { name: /source/i })).toHaveAttribute(
      'href',
      'https://github.com/TCBeekley/Shipped',
    )
  })
})
