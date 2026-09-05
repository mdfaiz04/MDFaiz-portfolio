import { z } from 'zod'

/**
 * The content contract (L1).
 *
 * Every fact about the portfolio owner is validated against these schemas.
 * Types are INFERRED from them, so the data and the types can never drift
 * apart — there is no separate interface to keep in sync.
 *
 * Nothing here describes presentation. How a project looks is a component's
 * concern; what a project *is* lives here.
 */

/** Slug format shared by every addressable entity. */
const Slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a lowercase slug, e.g. "my-id"')

/** ISO year-month. Dates are stored machine-readable and formatted at render. */
const YearMonth = z
  .string()
  .regex(
    /^\d{4}-(?:0[1-9]|1[0-2])$/,
    'must be an ISO year-month, e.g. "2026-04"',
  )

export const LinkKindSchema = z.enum(['repo', 'live', 'doc', 'social', 'email'])

export const LinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().url(),
  kind: LinkKindSchema,
})

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const ProfileSchema = z.object({
  name: z.string().min(1),
  /** Used where the full name would crowd the layout. */
  shortName: z.string().min(1),
  role: z.string().min(1),
  /** The single line that carries the hero. */
  tagline: z.string().min(1),
  summary: z.string().min(1),
  /**
   * Words in `tagline` to accent. Matched case-insensitively and ignoring
   * trailing punctuation, so "AI." here catches "AI." in the sentence.
   * Which words carry the line is an editorial call, so it lives with the
   * copy rather than in the component that renders it.
   */
  taglineHighlights: z.array(z.string().min(1)).default([]),
  location: z.object({
    city: z.string().min(1),
    region: z.string().min(1),
    country: z.string().min(1),
  }),
  email: z.string().email(),
  /**
   * Deliberately unused on the public site — published phone numbers get
   * scraped. Kept optional so it is available for a generated CV later.
   */
  phone: z.string().optional(),
  availability: z.object({
    open: z.boolean(),
    statement: z.string().min(1),
  }),
  links: z.array(LinkSchema).min(1),
})

// ---------------------------------------------------------------------------
// Experience
// ---------------------------------------------------------------------------

export const ExperienceSchema = z
  .object({
    id: Slug,
    org: z.string().min(1),
    role: z.string().min(1),
    kind: z.enum(['internship', 'employment']),
    start: YearMonth,
    /** `null` means the role is current. */
    end: YearMonth.nullable(),
    location: z.string().optional(),
    summary: z.string().min(1),
    highlights: z.array(z.string().min(1)).min(1),
    stack: z.array(z.string().min(1)).default([]),
  })
  .refine((role) => role.end === null || role.end >= role.start, {
    message: 'end must not precede start',
    path: ['end'],
  })

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const ProjectCategorySchema = z.enum([
  'ai-nlp',
  'ai-vision',
  'fullstack-devops',
  'cad-engineering',
])

export const ProjectSchema = z.object({
  id: Slug,
  name: z.string().min(1),
  category: ProjectCategorySchema,
  year: z.number().int().min(2000).max(2100),
  /** The three-beat structure every project section renders. */
  problem: z.string().min(1),
  approach: z.string().min(1),
  outcome: z.string().min(1),
  stack: z.array(z.string().min(1)).min(1),
  highlights: z.array(z.string().min(1)).default([]),
  /** Empty is normal — not every project is public. Layout must cope. */
  links: z.array(LinkSchema).default([]),
  featured: z.boolean().default(true),
})

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

export const SkillClusterSchema = z.object({
  id: Slug,
  title: z.string().min(1),
  blurb: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
  /**
   * Project ids that demonstrate this cluster. Cross-checked against the
   * project list at import — a broken reference fails the build.
   */
  evidence: z.array(Slug).default([]),
  /**
   * Optional self-assessed percentage. Left unset by default: an unverifiable
   * number reads as decoration next to the evidence links above. Present so
   * the bar treatment stays one edit away.
   */
  level: z.number().min(0).max(100).optional(),
  /**
   * Surfaced as a card in the hero. Off by default: the hero shows what the
   * work leads with, not everything the CV lists.
   */
  featured: z.boolean().default(false),
})

// ---------------------------------------------------------------------------
// Achievements & education
// ---------------------------------------------------------------------------

export const AchievementSchema = z.object({
  id: Slug,
  title: z.string().min(1),
  kind: z.enum(['placement', 'award', 'certification']),
  event: z.string().min(1),
  organisation: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  detail: z.string().min(1),
})

export const EducationSchema = z
  .object({
    id: Slug,
    qualification: z.string().min(1),
    field: z.string().optional(),
    institution: z.string().min(1),
    startYear: z.number().int().min(1900).max(2100),
    endYear: z.number().int().min(1900).max(2100),
    score: z.object({
      label: z.string().min(1),
      value: z.string().min(1),
    }),
  })
  .refine((entry) => entry.endYear >= entry.startYear, {
    message: 'endYear must not precede startYear',
    path: ['endYear'],
  })

// ---------------------------------------------------------------------------
// Section registry
// ---------------------------------------------------------------------------

/** The visitor journey each section serves. Encoded, not decorative. */
export const JourneyStageSchema = z.enum([
  'attention',
  'understanding',
  'proof',
  'interaction',
  'connection',
])

export const SectionSchema = z.object({
  id: Slug,
  navLabel: z.string().min(1),
  order: z.number().int().min(0),
  stage: JourneyStageSchema,
  /**
   * Section copy. Optional because the hero carries its own headline from
   * the profile. Kept here rather than in components so no section title is
   * ever a literal in markup (R1).
   */
  heading: z.string().min(1).optional(),
  /**
   * Words of `heading` to set in the accent gradient. Matched the same way
   * the hero matches its tagline: case-insensitively, ignoring punctuation.
   *
   * Optional rather than defaulted, so the five sections that accent nothing
   * do not each carry an empty array to satisfy the type.
   */
  headingHighlights: z.array(z.string().min(1)).optional(),
  lede: z.string().min(1).optional(),
  /** Sections ship dark until their content exists. */
  enabled: z.boolean().default(true),
})

// ---------------------------------------------------------------------------
// Inferred types — the only place component props should come from
// ---------------------------------------------------------------------------

export type Link = z.infer<typeof LinkSchema>
export type LinkKind = z.infer<typeof LinkKindSchema>
export type Profile = z.infer<typeof ProfileSchema>
export type Experience = z.infer<typeof ExperienceSchema>
export type Project = z.infer<typeof ProjectSchema>
export type ProjectCategory = z.infer<typeof ProjectCategorySchema>
export type SkillCluster = z.infer<typeof SkillClusterSchema>
export type Achievement = z.infer<typeof AchievementSchema>
export type Education = z.infer<typeof EducationSchema>
export type Section = z.infer<typeof SectionSchema>
export type JourneyStage = z.infer<typeof JourneyStageSchema>

// ---------------------------------------------------------------------------
// Brand marks
// ---------------------------------------------------------------------------

/**
 * A technology logo. GENERATED into brands.ts — see scripts/generate-brands.mjs.
 *
 * `technology` is checked against the technologies the CV actually names, so
 * a logo for something unused cannot reach the page.
 */
export const BrandMarkSchema = z.object({
  technology: z.string().min(1),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a hex colour'),
  path: z.string().min(1),
})

export type BrandMark = z.infer<typeof BrandMarkSchema>

/**
 * A social profile's logo, matched to a link by the host of its URL.
 *
 * Host rather than label: a label is free text, and renaming "LinkedIn" to
 * "LinkedIn profile" should not silently drop the logo.
 */
export const SocialMarkSchema = z.object({
  host: z.string().min(1),
  title: z.string().min(1),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'must be a hex colour'),
  path: z.string().min(1),
})

export type SocialMark = z.infer<typeof SocialMarkSchema>
