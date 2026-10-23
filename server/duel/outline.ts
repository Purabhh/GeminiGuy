import type { Section } from '../../shared/duel.ts'

// What the digital SAT and PSAT test, by section and content domain, in our
// own words (after College Board's public test specifications). The bank
// generator writes new questions against these, and every bank question is
// tagged with one domain.

export type Domain = 'algebra' | 'advanced' | 'psda' | 'geometry' | 'craft' | 'info' | 'conventions' | 'expression'

export interface DomainSpec {
  section: Section
  name: string
  skills: string[]
}

export const OUTLINE: Record<Domain, DomainSpec> = {
  algebra: {
    section: 'math',
    name: 'Algebra',
    skills: ['linear equations in one variable', 'linear equations in two variables', 'linear functions', 'systems of two linear equations', 'linear inequalities'],
  },
  advanced: {
    section: 'math',
    name: 'Advanced Math',
    skills: ['equivalent expressions', 'nonlinear equations and systems', 'quadratic functions', 'exponential functions', 'function notation'],
  },
  psda: {
    section: 'math',
    name: 'Problem-Solving and Data Analysis',
    skills: ['ratios, rates and proportions', 'percentages', 'one-variable data (mean, median, spread)', 'two-variable data and scatterplots', 'probability', 'inference from samples'],
  },
  geometry: {
    section: 'math',
    name: 'Geometry and Trigonometry',
    skills: ['area and volume', 'lines, angles and triangles', 'right triangles and trigonometry', 'circles'],
  },
  craft: {
    section: 'rw',
    name: 'Craft and Structure',
    skills: ['words in context', 'text structure and purpose', 'cross-text connections'],
  },
  info: {
    section: 'rw',
    name: 'Information and Ideas',
    skills: ['central ideas and details', 'command of evidence (textual and quantitative)', 'inferences'],
  },
  conventions: {
    section: 'rw',
    name: 'Standard English Conventions',
    skills: ['sentence boundaries', 'subject-verb agreement', 'possessives and plurals', 'punctuation between clauses'],
  },
  expression: {
    section: 'rw',
    name: 'Expression of Ideas',
    skills: ['transitions', 'rhetorical synthesis from notes'],
  },
}

export const DOMAINS = Object.keys(OUTLINE) as Domain[]
