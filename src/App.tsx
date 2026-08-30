import type { ReactNode } from 'react'

/*
 * Home-page images live in public/ and are referenced by URL rather than
 * imported. The page is prerendered and ships no JavaScript, so there is no
 * client module graph for a bundler import to be emitted from. Case-study
 * pages still import theirs through HTML, where Vite content-hashes them.
 */
const IMG = '/img'
import './App.css'

const REPO_URL = 'https://github.com/TCBeekley/Shipped'
const STITCH_URL = 'https://stitch.beekley.dev'
const SPT50_APP_STORE_URL =
  'https://apps.apple.com/us/app/spt-50-license-plate-game/id6787229051'

interface Project {
  // Omitted while a project has no page to send anyone to. Extensionless
  // paths do not 404 against S3 — the SPA fallback quietly serves the home
  // page instead — so a placeholder href reads as a working link and is not.
  href?: string
  kicker: string
  title: string
  pitch: string
  stack: string
  // Dropped alongside href: a call to action on an inert card is a lie.
  cta?: string
  shipped: string
  preview: ReactNode
}

const projects: Project[] = [
  {
    href: '/nchsaa-seeding.html',
    kicker: 'Web app · live',
    title: 'NCHSAA Bracket Projector',
    pitch:
      'Live RPI standings turned into projected high school playoff brackets — two sports, eight classifications, 446 schools, refreshed hourly.',
    stack: 'React · FastAPI · DynamoDB · CDK',
    cta: 'Read the case study',
    shipped: '2026-05',
    preview: (
      <div className="card-preview card-preview--shot">
        <img
          src={`${IMG}/nchsaa-bracket-card.webp`}
          alt=""
          width="360"
          height="180"
          loading="lazy"
        />
      </div>
    ),
  },
  {
    href: '/cpap-tracker.html',
    kicker: 'Utility · macOS · Swift',
    title: 'CPAP Tracker',
    pitch:
      'Offline-first macOS app that tracks when CPAP consumables need replacing — calendar-aware scheduling, a local JSON store, no accounts, no cloud.',
    stack: 'SwiftUI · Codable · macOS 14',
    cta: 'Read the case study',
    shipped: '2026-08',
    preview: (
      <div className="card-preview card-preview--icon">
        <img src={`${IMG}/cpap-icon.svg`} alt="" width="72" height="72" />
      </div>
    ),
  },
  {
    // The demo environment is a sign-in wall today; a marketing site will
    // take its place. Say so on the card rather than promising a tour the
    // link cannot deliver.
    href: STITCH_URL,
    kicker: 'Web app · demo',
    title: 'Stitch',
    pitch:
      'Uniform ordering for travel sports organizations — teams order, orgs approve, vendors fulfill. The demo environment is live behind a sign-in.',
    stack: 'React · FastAPI · DynamoDB',
    cta: 'Open the sign-in',
    shipped: '2025-08',
    preview: (
      <div className="card-preview">
        <span className="preview-tag">live app preview</span>
        <span className="soon-badge">case study soon</span>
      </div>
    ),
  },
  {
    href: '/transfer-tracker.html',
    kicker: 'Data · live',
    title: 'Transfer Tracker',
    pitch:
      'Scheduled capture of the D1 baseball transfer portal — every version kept, so "what changed" is a SQL question. Now published as a dashboard, for about a dollar a month.',
    stack: 'Python · Lambda · S3 · Parquet · Athena',
    cta: 'See the dashboard',
    shipped: '2026-06',
    preview: (
      <div className="card-preview card-preview--shot">
        <img
          src={`${IMG}/transfer-dashboard-card.webp`}
          alt=""
          width="360"
          height="180"
          loading="lazy"
        />
      </div>
    ),
  },
  {
    kicker: 'Infrastructure · AWS',
    title: 'OpenVPN fleet',
    pitch:
      'Four failure modes survived with ~zero dollars of new infrastructure. No load balancer, no ASG.',
    stack: 'EC2 · CloudWatch · Route 53',
    shipped: '2026-06',
    preview: (
      <div className="card-preview card-preview--fleet">
        <span className="chip">
          <span className="dot" aria-hidden="true">
            ●
          </span>
          &nbsp; $0/mo incremental
        </span>
        <div className="fleet-preview-row">
          <span className="chip">4 regions</span>
          <span className="chip">no hot standby</span>
        </div>
        <span className="soon-badge">case study soon</span>
      </div>
    ),
  },
]

function ProjectCard({
  href,
  kicker,
  title,
  pitch,
  stack,
  cta,
  shipped,
  preview,
}: Project) {
  const body = (
    <>
      {preview}
      <div className="card-body">
        <p className="card-kicker">{kicker}</p>
        <h3 className="card-title">{title}</h3>
        <p className="card-pitch">{pitch}</p>
        <p className="card-stack">{stack}</p>
        <div className="card-foot">
          {cta && (
            <span className="card-cta">
              {cta} <span aria-hidden="true">→</span>
            </span>
          )}
          <span className="shipped-stamp">shipped: {shipped}</span>
        </div>
      </div>
    </>
  )

  // No page yet, so no anchor: an inert card is honest, whereas a link to a
  // path that does not exist silently re-serves the home page.
  if (!href) {
    return <div className="project-card project-card--pending">{body}</div>
  }

  return (
    <a href={href} className="project-card">
      {body}
    </a>
  )
}

function App() {
  return (
    <div className="page">
      <div className="container">
        <header className="site-header">
          <a href="/" className="wordmark">
            shipped<span className="wordmark-dot">.</span>
            <span className="wordmark-domain">beekley.dev</span>
          </a>
          <nav className="site-nav" aria-label="Site">
            <a href="#projects">projects</a>
            <a href="#about">about</a>
            <a href="mailto:tim@beekley.engineering">contact</a>
          </nav>
        </header>

        <main>
          <section className="hero">
            <p className="eyebrow">Portfolio · web + mobile + infrastructure</p>
            <h1>
              <span className="accent">shipped:</span> apps people use, systems
              that stay up, proof you can click.
            </h1>
            <p className="hero-sub">
              I take ideas from first commit to real users — the interface, the
              API behind it, and the infrastructure underneath. Everything here
              is live, in production or on the App Store, so you can check the
              work instead of taking my word for it.
            </p>
            <div className="chip-row">
              <span className="chip">
                <span className="dot" aria-hidden="true">
                  ●
                </span>
                &nbsp; 6 things shipped
              </span>
              <span className="chip">web · iOS · infra</span>
              <span className="chip">React · Swift · Python · AWS</span>
            </div>
          </section>

          <section id="projects" className="featured">
            <h2 className="eyebrow">Featured · on the App Store</h2>
            <a href="/spt-50.html" className="featured-card">
              <div className="featured-art">
                {/*
                  Above the fold, so never lazy-loaded. Fixed 140px box with
                  1x/2x/3x sources; WebP first, PNG for anything that cannot
                  take it. Explicit width/height reserve the space.
                */}
                <picture>
                  <source
                    type="image/webp"
                    srcSet={`${IMG}/spt50-icon-140.webp 1x, ${IMG}/spt50-icon-280.webp 2x, ${IMG}/spt50-icon-420.webp 3x`}
                  />
                  <img
                    src={`${IMG}/spt50-icon-140.png`}
                    srcSet={`${IMG}/spt50-icon-140.png 1x, ${IMG}/spt50-icon-280.png 2x, ${IMG}/spt50-icon-420.png 3x`}
                    alt="SPT-50 app icon"
                    width="140"
                    height="140"
                    decoding="async"
                  />
                </picture>
              </div>
              <div className="featured-body">
                <p className="card-kicker">Game · iOS · Swift</p>
                <h3 className="featured-title">SPT-50</h3>
                <p className="card-pitch">
                  A modern take on the license-plate game. Spot all fifty on the
                  road — see America one plate at a time.
                </p>
                <div className="featured-meta">
                  <span className="store-button">
                    Read the case study <span aria-hidden="true">→</span>
                  </span>
                  <span className="shipped-stamp">shipped: 2026-08</span>
                </div>
              </div>
            </a>
            {/*
              The card is the case study, so the store link lives beside it:
              an anchor cannot nest inside another anchor.
            */}
            <p className="featured-aside">
              <a href={SPT50_APP_STORE_URL}>
                view on the App&nbsp;Store <span aria-hidden="true">↗</span>
              </a>
            </p>
          </section>

          <section className="project-grid" aria-labelledby="more-projects">
            <h2 id="more-projects" className="visually-hidden">
              More projects
            </h2>
            {projects.map((project) => (
              <ProjectCard key={project.title} {...project} />
            ))}
          </section>

          <section id="about" className="about">
            <h2 className="eyebrow">About</h2>
            <p className="about-copy">
              Tim Beekley — engineer. I build the whole thing: the interface,
              the API behind it, and the infrastructure underneath. This site is
              the résumé; every entry above is live.
            </p>
            <div className="about-links">
              <a href="https://github.com/TCBeekley">
                github <span aria-hidden="true">↗</span>
              </a>
              <a href="https://www.linkedin.com/in/tim-beekley/">
                linkedin <span aria-hidden="true">↗</span>
              </a>
              <a href="mailto:tim@beekley.engineering">
                email <span aria-hidden="true">↗</span>
              </a>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          shipped.beekley.dev &nbsp;·&nbsp; web · iOS · infra &nbsp;·&nbsp;
          evidence over claims, done over described &nbsp;·&nbsp;{' '}
          <a href={REPO_URL}>
            source <span aria-hidden="true">↗</span>
          </a>
        </footer>
      </div>
    </div>
  )
}

export default App
