import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../src/App'

describe('<App />', () => {
  it('renders the hero headline', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /shipped: apps people use, systems that stay up, proof you can click/i,
      }),
    ).toBeInTheDocument()
  })

  it('features SPT-50 with its App Store CTA and shipped date', () => {
    render(<App />)
    const featured = screen.getByRole('link', { name: /SPT-50/ })

    expect(featured).toHaveAttribute('href', '/spt-50')
    expect(featured).toHaveTextContent(/view on the app\sstore/i)
    expect(featured).toHaveTextContent('shipped: 2026-03')
    expect(screen.getByAltText('SPT-50 app icon')).toBeInTheDocument()
  })

  it('renders a card with a shipped stamp for every project', () => {
    render(<App />)

    for (const [title, shipped] of [
      ['Stitch', 'shipped: 2025-08'],
      ['Transfer Tracker', 'shipped: 2025-01'],
      ['OpenVPN fleet', 'shipped: 2026-06'],
    ]) {
      const card = screen.getByRole('link', { name: new RegExp(title) })
      expect(card).toHaveTextContent(shipped)
    }
  })

  it('labels every card as a pending case study', () => {
    render(<App />)
    expect(screen.getAllByText('case study soon')).toHaveLength(4)
  })

  it('links the footer to the shipped repo', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: /source/i })).toHaveAttribute(
      'href',
      'https://github.com/TCBeekley/Shipped',
    )
  })
})
