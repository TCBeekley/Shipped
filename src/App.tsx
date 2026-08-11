import type { ReactNode } from 'react'
import spt50Icon140 from './assets/spt50-icon-140.png'
import spt50Icon280 from './assets/spt50-icon-280.png'
import spt50Icon420 from './assets/spt50-icon-420.png'
import spt50Icon140Webp from './assets/spt50-icon-140.webp'
import spt50Icon280Webp from './assets/spt50-icon-280.webp'
import spt50Icon420Webp from './assets/spt50-icon-420.webp'
import cpapIcon from './assets/cpap-icon.svg'
import nchsaaCard from './assets/nchsaa/bracket-card.webp'
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
        <img src={nchsaaCard} alt="" width="360" height="180" loading="lazy" />
      </div>
    ),
  },
  {
    href: '/cpap-tracker',
    kicker: 'Utility · macOS · Swift',
    title: 'CPAP Tracker',
    pitch:
      'Offline-first macOS app that tracks when CPAP consumables need replacing — calendar-aware scheduling, a local JSON store, no accounts, no cloud.',
    stack: 'SwiftUI · Codable · macOS 14',
    cta: 'See the build',
    shipped: '2026-08',
    preview: (
      <div className="card-preview card-preview--icon">
        <img src={cpapIcon} alt="" width="72" height="72" />
        <span className="soon-badge">case study soon</span>
      </div>
    ),
  },
  {
    href: '/stitch',
    kicker: 'Web app · live',
    title: 'Stitch',
    pitch:
      'Uniform ordering for travel sports organizations — teams order, orgs approve, vendors fulfill.',
    stack: 'React · FastAPI · DynamoDB',
    cta: 'Open the app',
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
    kicker: 'Data · pipeline',
    title: 'Transfer Tracker',
    pitch:
      'Scheduled capture of the D1 baseball transfer portal — every version kept, so "what changed" is a SQL question. About a dollar a month.',
    stack: 'Python · Lambda · S3 · Parquet',
    cta: 'Read the pipeline',
    shipped: '2025-01',
    preview: (
      <div className="card-preview">
        <span className="preview-tag">capture pipeline · case study</span>
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
    cta: 'Read the design',
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
  return (
    <a href={href} className="project-card">
      {preview}
      <div className="card-body">
        <p className="card-kicker">{kicker}</p>
        <h3 className="card-title">{title}</h3>
        <p className="card-pitch">{pitch}</p>
        <p className="card-stack">{stack}</p>
        <div className="card-foot">
          <span className="card-cta">
            {cta} <span aria-hidden="true">→</span>
          </span>
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
            <a href="/spt-50" className="featured-card">
              <div className="featured-art">
                <span className="soon-badge">case study soon</span>
                {/*
                  Above the fold, so never lazy-loaded. Fixed 140px box with
                  1x/2x/3x sources; WebP first, PNG for anything that cannot
                  take it. Explicit width/height reserve the space.
                */}
                <picture>
                  <source
                    type="image/webp"
                    srcSet={`${spt50Icon140Webp} 1x, ${spt50Icon280Webp} 2x, ${spt50Icon420Webp} 3x`}
                  />
                  <img
                    src={spt50Icon140}
                    srcSet={`${spt50Icon140} 1x, ${spt50Icon280} 2x, ${spt50Icon420} 3x`}
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
                    View on the App&nbsp;Store&nbsp;
                    <span aria-hidden="true">↗</span>
                  </span>
                  <span className="shipped-stamp">shipped: 2026-03</span>
                </div>
              </div>
            </a>
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
