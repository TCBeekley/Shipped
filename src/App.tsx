import type { ReactNode } from 'react'
import spt50Icon from './assets/spt50-icon.png'
import './App.css'

const REPO_URL = 'https://github.com/TCBeekley/Shipped'

interface Project {
  href: string
  kicker: string
  title: string
  pitch: string
  stack: string
  cta: string
  shipped: string
  preview: ReactNode
}

const projects: Project[] = [
  {
    href: '/stitch',
    kicker: 'Web app · live',
    title: 'Stitch',
    pitch:
      'Uniform ordering for travel sports organizations — teams order, orgs approve, vendors fulfill.',
    stack: 'React · FastAPI · DynamoDB',
    cta: 'Open the app →',
    shipped: '2025-08',
    preview: (
      <div className="card-preview">
        <span className="preview-tag">live app preview</span>
      </div>
    ),
  },
  {
    href: '/transfer-tracker',
    kicker: 'Data · analytics',
    title: 'Transfer Tracker',
    pitch:
      'Scraping and analytics for D1 baseball transfers — who moved, where, and what it means.',
    stack: 'Python · Metabase',
    cta: 'See the data →',
    shipped: '2025-01',
    preview: (
      <div className="card-preview">
        <span className="preview-tag">metabase dashboard</span>
      </div>
    ),
  },
  {
    href: '/openvpn-fleet',
    kicker: 'Infrastructure · AWS',
    title: 'OpenVPN fleet',
    pitch:
      'Four failure modes survived with ~zero dollars of new infrastructure. No load balancer, no ASG.',
    stack: 'EC2 · CloudWatch · Route 53',
    cta: 'Read the design →',
    shipped: '2026-06',
    preview: (
      <div className="card-preview card-preview--fleet">
        <span className="chip">
          <span className="dot">●</span>&nbsp; $0/mo incremental
        </span>
        <div className="fleet-preview-row">
          <span className="chip">4 regions</span>
          <span className="chip">no hot standby</span>
        </div>
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
  return (
    <a href={href} className="project-card">
      {preview}
      <div className="card-body">
        <p className="card-kicker">{kicker}</p>
        <h3 className="card-title">{title}</h3>
        <p className="card-pitch">{pitch}</p>
        <p className="card-stack">{stack}</p>
        <div className="card-foot">
          <span className="card-cta">{cta}</span>
          <span className="shipped-stamp">shipped: {shipped}</span>
        </div>
      </div>
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
            <a href="#about">contact</a>
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
                <span className="dot">●</span>&nbsp; 4 things shipped
              </span>
              <span className="chip">web · iOS · infra</span>
              <span className="chip">React · Swift · Python · AWS</span>
            </div>
          </section>

          <section id="projects" className="featured">
            <p className="eyebrow">Featured · on the App Store</p>
            <a href="/spt-50" className="featured-card">
              <div className="featured-art">
                <img
                  src={spt50Icon}
                  alt="SPT-50 app icon"
                  width="140"
                  height="140"
                />
              </div>
              <div className="featured-body">
                <p className="card-kicker">Game · iOS · Swift</p>
                <h2 className="featured-title">SPT-50</h2>
                <p className="card-pitch">
                  A modern take on the license-plate game. Spot all fifty on the
                  road — see America one plate at a time.
                </p>
                <div className="featured-meta">
                  <span className="store-button">
                    View on the App&nbsp;Store&nbsp;↗
                  </span>
                  <span className="shipped-stamp">shipped: 2026-03</span>
                </div>
              </div>
            </a>
          </section>

          <section className="project-grid">
            {projects.map((project) => (
              <ProjectCard key={project.title} {...project} />
            ))}
          </section>

          <section id="about" className="about">
            <p className="eyebrow">About</p>
            <p className="about-copy">
              Beekley — engineer. I build the whole thing: the interface, the
              API behind it, and the infrastructure underneath. This site is the
              résumé; every entry above is live.
            </p>
            <div className="about-links">
              <a href="https://github.com/TCBeekley">github ↗</a>
              <a href="#about">linkedin ↗</a>
              <a href="mailto:tim@beekley.engineering">email ↗</a>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          shipped.beekley.dev &nbsp;·&nbsp; web · iOS · infra &nbsp;·&nbsp;
          evidence over claims, done over described &nbsp;·&nbsp;{' '}
          <a href={REPO_URL}>source ↗</a>
        </footer>
      </div>
    </div>
  )
}

export default App
