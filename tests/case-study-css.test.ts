import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * Structural guards on case-study.css.
 *
 * Both bugs these cover were specificity collisions: a later rule of equal or
 * greater weight silently captured an earlier one. Neither is catchable the
 * usual way — jsdom has no layout engine, so a computed width or font size is
 * always 0 there, and axe cannot see it either. The alternative would be a
 * headless browser in CI for two assertions. These read the stylesheet instead.
 */

const raw = readFileSync(
  resolve(process.cwd(), 'src/pages/case-study.css'),
  'utf8',
)

// Comments are stripped before any selector matching. These files document
// selectors in prose, so a comment mentioning `.case h2` directly above a rule
// would otherwise be swallowed into that rule's selector and satisfy the
// assertion below without the rule itself being scoped at all.
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '')

describe('case-study.css', () => {
  it('keeps the wide-figure breakout away from phone captures', () => {
    // `.shot--phone` caps a portrait capture at its natural width. The
    // breakout rule sets `.shot` at equal specificity and appears later in the
    // file, so without the :not() it wins: a 360x782 capture shipped to
    // production at 1038x2252, a third of the page height.
    const breakout = css.match(/@media \(min-width: 1100px\) \{[\s\S]*?\n\}/)
    expect(breakout).not.toBeNull()
    expect(breakout?.[0]).toContain(':not(.shot--phone)')
  })

  it('scopes the callout title so the section-heading rule cannot reach it', () => {
    // The callout's title is an <h2> for the document outline, so `.case h2`
    // (0,1,1) outranks a bare `.callout-title` (0,1,0) and drags a 58px top
    // margin and the 25px section size inside the box.
    const selectors = [...css.matchAll(/^([^{@\n][^{]*)\{/gm)]
      .map((m) => m[1].trim())
      .filter((s) => s.includes('.callout-title'))

    expect(selectors.length).toBeGreaterThan(0)
    for (const selector of selectors) {
      expect(selector, `${selector} is outranked by .case h2`).toContain(
        '.case',
      )
    }
  })
})
