import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { axe } from 'vitest-axe'
import App, { ProjectCard } from '../src/App'

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

  it('features SPT-50 with its case study CTA and shipped date', () => {
    render(<App />)
    const featured = screen.getByRole('link', { name: /SPT-50/ })

    expect(featured).toHaveAttribute('href', '/spt-50.html')
    expect(featured).toHaveTextContent(/read the case study/i)
    expect(featured).toHaveTextContent('shipped: 2026-08')
    expect(featured).not.toHaveTextContent(/case study soon/i)
    expect(screen.getByAltText('SPT-50 app icon')).toBeInTheDocument()
  })

  it('keeps the App Store link beside the featured card', () => {
    render(<App />)
    expect(
      screen.getByRole('link', { name: /view on the app\sstore/i }),
    ).toHaveAttribute(
      'href',
      'https://apps.apple.com/us/app/spt-50-license-plate-game/id6787229051',
    )
  })

  it('renders a card with a shipped stamp for every project', () => {
    render(<App />)

    for (const [title, shipped] of [
      ['NCHSAA Bracket Projector', 'shipped: 2026-05'],
      ['CPAP Tracker', 'shipped: 2026-08'],
      ['Stitch', 'shipped: 2025-08'],
      ['Transfer Tracker', 'shipped: 2026-06'],
      ['OpenVPN fleet', 'shipped: 2026-06'],
    ]) {
      const card = screen
        .getByRole('heading', { level: 3, name: title })
        .closest('.project-card')
      expect(card).toHaveTextContent(shipped)
    }
  })

  it('labels the one card whose case study is still unwritten', () => {
    render(<App />)
    // Stitch alone. OpenVPN fleet's case study is published.
    expect(screen.getAllByText('case study soon')).toHaveLength(1)
  })

  it('stamps Transfer Tracker with the month its pipeline was built', () => {
    render(<App />)
    // The TransferTracker repo begins 2026-06-12; anything earlier is a claim
    // the repository itself disproves.
    const card = screen.getByRole('link', { name: /Transfer Tracker/ })

    expect(card).toHaveTextContent('shipped: 2026-06')
    expect(card).not.toHaveTextContent('2025-01')
  })

  it('renders a project with nowhere to point as inert, not as a link', () => {
    // No project is pending today, so this branch is unreachable through
    // <App />. It is the guard that keeps the next one from shipping as a link
    // to a path the SPA fallback would answer with the home page.
    const { container } = render(
      <ProjectCard
        kicker="Infrastructure · AWS"
        title="Unwritten"
        pitch="No case study yet."
        stack="EC2"
        shipped="2026-06"
        preview={<div className="card-preview" />}
      />,
    )

    const card = container.querySelector('.project-card')
    expect(card?.tagName).toBe('DIV')
    expect(card).toHaveClass('project-card--pending')
    expect(container.querySelector('a')).toBeNull()
    // No CTA either: an arrow on an inert card promises a click that is not there.
    expect(container.querySelector('.card-cta')).toBeNull()
  })

  it('never points a card at an extensionless local path', () => {
    render(<App />)

    /*
     * The original bug, kept as a rule rather than a list of projects. An
     * extensionless path does not 404 against S3 -- the fallback answers it --
     * so a card linking to one reads as working. Two shipped that way. Naming
     * the pending projects instead would have gone stale the moment one of
     * them got a page, which is exactly what happened here.
     */
    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? ''
      if (!href.startsWith('/')) continue
      expect(href, `${href} needs a file extension`).toMatch(
        /^\/$|\.html$|^\/#/,
      )
    }
  })

  it('sends Stitch to its live demo rather than a local path', () => {
    render(<App />)
    const card = screen.getByRole('link', { name: /Stitch/ })

    // Live, but a sign-in wall — the card says so instead of promising a tour.
    expect(card).toHaveAttribute('href', 'https://stitch.beekley.dev')
    expect(card).toHaveTextContent(/open the sign-in/i)
    expect(card).toHaveTextContent(/behind a sign-in/i)
  })

  it('points every project link at a page that exists', () => {
    render(<App />)

    // Every page Vite is configured to emit, plus the home page.
    const pages = new Set([
      '/',
      '/index.html',
      '/spt-50.html',
      '/transfer-tracker.html',
      '/nchsaa-seeding.html',
      '/cpap-tracker.html',
      '/openvpn-fleet.html',
    ])

    for (const link of screen.getAllByRole('link')) {
      const href = link.getAttribute('href') ?? ''
      if (!href.startsWith('/')) continue // external, mailto, or in-page anchor
      expect(pages.has(href), `${href} has no page behind it`).toBe(true)
    }
  })

  it('points the about links at real destinations', () => {
    render(<App />)

    for (const [name, href] of [
      [/github/i, 'https://github.com/TCBeekley'],
      [/linkedin/i, 'https://www.linkedin.com/in/tim-beekley/'],
      [/email/i, 'mailto:tim@beekley.engineering'],
    ] as const) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href)
    }
  })

  it('links the live projector to its case study', () => {
    render(<App />)
    const card = screen.getByRole('link', { name: /NCHSAA Bracket Projector/ })

    expect(card).toHaveAttribute('href', '/nchsaa-seeding.html')
    expect(card).not.toHaveTextContent(/case study soon/i)
  })

  it('links CPAP Tracker to its published case study', () => {
    render(<App />)
    const card = screen.getByRole('link', { name: /CPAP Tracker/ })

    expect(card).toHaveAttribute('href', '/cpap-tracker.html')
    expect(card).not.toHaveTextContent(/case study soon/i)
  })

  it('links Transfer Tracker to its published case study', () => {
    render(<App />)
    const card = screen.getByRole('link', { name: /Transfer Tracker/ })

    expect(card).toHaveAttribute('href', '/transfer-tracker.html')
    // The dashboard is public now, and the case study opens with a link to it.
    expect(card).toHaveTextContent(/see the dashboard/i)
    expect(card).toHaveTextContent(/Data · live/)
    // The case study exists, so this card carries no "soon" badge.
    expect(card).not.toHaveTextContent(/case study soon/i)
  })

  it('links the footer to the shipped repo', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: /source/i })).toHaveAttribute(
      'href',
      'https://github.com/TCBeekley/Shipped',
    )
  })

  it('has no detectable accessibility violations', async () => {
    const { container } = render(<App />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it('exposes one h1 and a heading for every section', () => {
    render(<App />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    for (const name of [/featured/i, /more projects/i, /about/i]) {
      expect(
        screen.getByRole('heading', { level: 2, name }),
      ).toBeInTheDocument()
    }
    // Project titles sit one level below their section heading.
    expect(
      screen.getByRole('heading', { level: 3, name: 'SPT-50' }),
    ).toBeInTheDocument()
  })

  it('exposes banner, navigation, main, and contentinfo landmarks', () => {
    render(<App />)

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(
      within(screen.getByRole('banner')).getByRole('navigation', {
        name: /site/i,
      }),
    ).toBeInTheDocument()
  })
})
