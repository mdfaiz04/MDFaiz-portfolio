/**
 * How the assistant reads a question.
 *
 * `vocabulary.ts` teaches the search index what words *mean*. This file
 * teaches the router what a visitor is *asking for* — a different job, and
 * the one that grows every time somebody phrases something in a way the site
 * has not seen before.
 *
 * It is data on purpose. Widening what the assistant understands must be an
 * edit here, never a change to the routing code.
 *
 * Weights are a four-point scale:
 *   1  weak      — could belong to several intents
 *   2  moderate  — leans this way
 *   3  strong    — usually decisive on its own
 *   4  decisive  — this phrasing means one thing and one thing only
 *
 * Scores accumulate, so three weak signals can outvote one strong one. That
 * is the point: an awkwardly worded question still lands somewhere sensible
 * instead of falling off the end of a chain of tests.
 */

export const INTENT_IDS = [
  'greeting',
  'capabilities',
  'about',
  'assessment',
  'strengths',
  'limits',
  'why-hire',
  'experience',
  'projects-overview',
  'project-detail',
  'skills-overview',
  'skill-area',
  'skill-check',
  'education',
  'achievements',
  'contact',
  'unknown-technology',
  'not-found',
] as const

export type IntentId = (typeof INTENT_IDS)[number]

/**
 * A cue is a term and the weight it carries.
 *
 * Every term must already be normalised — lower case, no punctuation beyond
 * `+ # . -`, single spaces. A test asserts this, because a cue with a stray
 * apostrophe would silently never match anything.
 */
export type Cue = readonly [term: string, weight: number]

export type Cues = {
  /** Matched as a word prefix: "project" also catches "projects". */
  readonly prefixes?: readonly Cue[]
  /** Matched as a whole word: "work" must not catch "worked". */
  readonly words?: readonly Cue[]
  /** Matched anywhere in the query. Multi-word phrasings carry real signal. */
  readonly phrases?: readonly Cue[]
}

export const intentCues: Partial<Record<IntentId, Cues>> = {
  /** Only ever consulted for very short queries — see the router. */
  greeting: {
    words: [
      ['hi', 4],
      ['hii', 4],
      ['hey', 4],
      ['hello', 4],
      ['yo', 3],
      ['sup', 3],
      ['namaste', 4],
      ['salam', 4],
      ['greetings', 4],
      ['morning', 3],
      ['evening', 3],
    ],
    phrases: [
      ['good morning', 4],
      ['good evening', 4],
      ['good afternoon', 4],
    ],
  },

  /** Questions about the assistant itself rather than about the person. */
  capabilities: {
    phrases: [
      ['what can you answer', 4],
      ['what can i ask', 4],
      ['what should i ask', 4],
      ['what do you know', 3],
      ['how does this work', 4],
      ['how do you work', 4],
      ['are you chatgpt', 4],
      ['are you gpt', 4],
      ['are you an ai', 4],
      ['are you ai', 3],
      ['are you a bot', 4],
      ['are you a real', 3],
      ['are you human', 4],
      ['who built you', 4],
      ['who made you', 4],
      ['what model', 3],
      ['which model', 3],
      ['what are you', 2],
      ['can you help', 3],
    ],
    words: [['help', 3]],
  },

  about: {
    phrases: [
      ['who are you', 4],
      ['who is this', 4],
      ['who is he', 4],
      ['who is she', 4],
      ['who is faiz', 4],
      ['who is md faiz', 4],
      ['about yourself', 4],
      ['about himself', 4],
      ['introduce yourself', 4],
      ['what is your name', 4],
      ['where are you based', 4],
      ['where do you live', 4],
      ['where are you from', 4],
      ['based in', 3],
      ['about you', 2],
      ['about him', 2],
    ],
    prefixes: [
      ['introduc', 3],
      ['bio', 3],
    ],
    words: [['who', 1]],
  },

  /**
   * The judgement question — "how is this person?" — which a portfolio is
   * actually built to answer and which the first version simply refused.
   */
  assessment: {
    phrases: [
      ['how is this person', 4],
      ['how is the person', 4],
      ['how is this candidate', 4],
      ['how is this guy', 4],
      ['how is he', 4],
      ['how is she', 4],
      ['how are they', 3],
      ['how good is', 4],
      ['how good are', 4],
      ['is he good', 4],
      ['is she good', 4],
      ['are they good', 4],
      ['are you good', 3],
      ['is he any good', 4],
      ['how would you describe', 4],
      ['how do you describe', 4],
      ['describe yourself', 4],
      ['describe himself', 4],
      ['describe this person', 4],
      ['describe him', 3],
      ['describe her', 3],
      ['describe them', 3],
      ['what do you think', 3],
      ['your opinion', 3],
      ['honest opinion', 4],
      ['tell me honestly', 3],
      ['what kind of engineer', 4],
      ['what sort of engineer', 4],
      ['what type of engineer', 4],
      ['what is he like', 4],
      ['what are you like', 4],
      ['how would you rate', 4],
      ['how strong is', 3],
      ['how capable', 3],
      ['good engineer', 3],
      ['good developer', 3],
      ['good candidate', 3],
      ['elevator pitch', 4],
      ['in a nutshell', 4],
      ['quick summary', 3],
      ['short summary', 3],
      ['sum up', 3],
      ['summarise', 3],
      ['summarize', 3],
      ['big picture', 3],
      ['first impression', 3],
      ['at a glance', 3],
      ['in short', 2],
      ['tldr', 4],
      ['tl dr', 4],
    ],
    prefixes: [
      ['assess', 3],
      ['evaluat', 3],
      ['impress', 2],
      ['calibre', 3],
      ['caliber', 3],
      ['potential', 2],
    ],
    words: [
      ['good', 2],
      ['great', 2],
      ['talented', 3],
      ['capable', 2],
      ['competent', 3],
      ['verdict', 3],
      ['overview', 2],
      ['profile', 2],
      ['worth', 2],
    ],
  },

  strengths: {
    phrases: [
      ['best at', 4],
      ['good at', 3],
      ['great at', 3],
      ['excel at', 4],
      ['strong suit', 4],
      ['strong point', 4],
      ['core strength', 4],
      ['key strength', 4],
      ['main strength', 4],
      ['biggest strength', 4],
      ['what do you do best', 4],
      ['what are you best', 4],
      ['stand out', 3],
      ['superpower', 4],
      ['super power', 4],
      ['most experienced', 3],
    ],
    prefixes: [['strength', 4]],
    words: [['strongest', 4]],
  },

  limits: {
    phrases: [
      ['weak point', 4],
      ['weak spot', 4],
      ['weak area', 4],
      ['blind spot', 4],
      ['not good at', 4],
      ['what are you missing', 4],
      ['what is missing', 4],
      ['what is lacking', 4],
      ['room to grow', 4],
      ['room for improvement', 4],
      ['areas to improve', 4],
      ['need to improve', 4],
      ['still learning', 4],
      ['yet to learn', 4],
      ['have not done', 3],
      ['red flag', 4],
      ['downside', 4],
      ['what should i worry', 4],
      ['do not know', 3],
      ['what he can not', 4],
      ['what you can not', 4],
    ],
    prefixes: [
      ['weakness', 4],
      ['limitation', 4],
      ['shortcoming', 4],
      ['inexperienc', 4],
      ['drawback', 4],
      ['junior', 3],
    ],
    words: [
      ['weak', 3],
      ['flaw', 4],
      ['flaws', 4],
      ['fault', 3],
      ['faults', 3],
      ['gaps', 3],
      ['gap', 2],
      ['cons', 3],
      ['risks', 2],
      ['concerns', 2],
      ['negatives', 3],
    ],
  },

  'why-hire': {
    phrases: [
      ['why should i hire', 4],
      ['why should we hire', 4],
      ['should i hire', 4],
      ['should we hire', 4],
      ['why hire', 4],
      ['worth hiring', 4],
      ['why should i pick', 4],
      ['why should i choose', 4],
      ['why choose', 4],
      ['why you', 3],
      ['sell yourself', 4],
      ['pitch me', 4],
      ['pitch yourself', 4],
      ['convince me', 4],
      ['what makes you different', 4],
      ['what makes him different', 4],
      ['what makes you special', 4],
      ['what makes you stand', 4],
      ['what sets you apart', 4],
      ['sets him apart', 4],
      ['good fit', 3],
      ['right person', 3],
      ['right candidate', 3],
      ['right fit', 3],
      ['what can you bring', 4],
      ['what do you bring', 4],
      ['value you bring', 4],
      ['take a chance', 3],
    ],
  },

  experience: {
    phrases: [
      ['where have you worked', 4],
      ['where did you work', 4],
      ['where do you work', 4],
      ['who do you work for', 4],
      ['work experience', 4],
      ['professional experience', 4],
      ['years of experience', 4],
      ['how long have you', 3],
      ['job history', 4],
      ['employment history', 4],
      ['current role', 4],
      ['previous role', 4],
      ['past jobs', 4],
      ['what are you doing now', 4],
      ['right now', 2],
    ],
    prefixes: [
      ['experienc', 3],
      ['intern', 4],
      ['career', 3],
      ['employ', 3],
      ['background', 3],
      ['worked', 4],
      ['working', 3],
      ['workplace', 4],
      ['tenure', 4],
      ['position', 3],
      ['compan', 3],
      ['organis', 2],
      ['organiz', 2],
    ],
    words: [
      ['job', 3],
      ['jobs', 3],
      ['role', 3],
      ['roles', 3],
      ['work', 1],
    ],
  },

  'projects-overview': {
    phrases: [
      ['what have you built', 4],
      ['what did you build', 4],
      ['show me your work', 4],
      ['show me what', 3],
      ['best project', 4],
      ['biggest project', 4],
      ['favourite project', 4],
      ['favorite project', 4],
      ['side project', 4],
      ['what have you made', 4],
      ['what have you done', 3],
    ],
    prefixes: [
      ['project', 4],
      ['built', 3],
      ['build', 3],
      ['shipped', 3],
      ['portfolio', 2],
      ['demo', 3],
      ['case stud', 4],
      ['made', 2],
    ],
    words: [
      ['work', 2],
      ['works', 2],
      ['apps', 2],
      ['app', 1],
      ['stuff', 2],
    ],
  },

  'skills-overview': {
    phrases: [
      ['tech stack', 4],
      ['your stack', 4],
      ['what tools', 4],
      ['what do you use', 4],
      ['tools do you', 4],
      ['what can you do', 3],
      ['programming language', 4],
      ['what are you skilled', 4],
      ['technical skills', 4],
    ],
    prefixes: [
      ['skill', 4],
      ['technolog', 4],
      ['framework', 3],
      ['languag', 3],
      ['proficien', 4],
      ['expertis', 3],
      ['capabilit', 3],
      ['competenc', 3],
      ['toolkit', 4],
    ],
    words: [
      ['stack', 3],
      ['tools', 3],
      ['tool', 2],
      ['tech', 2],
    ],
  },

  /**
   * Shape only. These never route on their own — the router requires a
   * technology to have actually been named as well.
   */
  'skill-check': {
    phrases: [
      ['do you know', 3],
      ['does he know', 3],
      ['do you use', 3],
      ['have you used', 3],
      ['ever used', 3],
      ['have you worked with', 3],
      ['worked with', 3],
      ['work with', 2],
      ['are you familiar', 3],
      ['familiar with', 3],
      ['experience with', 3],
      ['experience in', 2],
      ['comfortable with', 3],
      ['can you use', 3],
      ['can you write', 3],
      ['good with', 3],
      ['hands on', 2],
      ['know about', 2],
    ],
  },

  education: {
    phrases: [
      ['where did you study', 4],
      ['what did you study', 4],
      ['where are you studying', 4],
      ['your degree', 4],
      ['which college', 4],
      ['which university', 4],
      ['academic background', 4],
      ['when do you graduate', 4],
    ],
    prefixes: [
      ['educat', 4],
      ['stud', 4],
      ['degree', 4],
      ['colleg', 4],
      ['universit', 4],
      ['school', 4],
      ['cgpa', 4],
      ['gpa', 4],
      ['graduat', 4],
      ['qualification', 4],
      ['academic', 3],
      ['diploma', 4],
      ['sslc', 4],
      ['semester', 3],
      ['marks', 3],
      ['grade', 3],
    ],
    words: [
      ['course', 3],
      ['branch', 2],
      ['year', 1],
    ],
  },

  achievements: {
    phrases: [
      ['have you won', 4],
      ['did you win', 4],
      ['any wins', 4],
      ['any awards', 4],
    ],
    prefixes: [
      ['award', 4],
      ['competit', 4],
      ['hackathon', 4],
      ['placement', 4],
      ['achiev', 4],
      ['prize', 4],
      ['trophy', 4],
      ['medal', 4],
      ['contest', 4],
      ['accolade', 4],
      ['recogni', 3],
      ['rank', 3],
    ],
    words: [
      ['won', 4],
      ['win', 3],
      ['wins', 3],
    ],
  },

  contact: {
    phrases: [
      ['get in touch', 4],
      ['in touch', 3],
      ['how can i reach', 4],
      ['reach out', 4],
      ['your email', 4],
      ['contact details', 4],
      ['contact him', 4],
      ['contact you', 4],
      ['open to', 3],
      ['looking for work', 4],
      ['work with you', 4],
      ['phone number', 3],
      ['social media', 2],
      ['linkedin', 2],
      ['github', 2],
    ],
    prefixes: [
      ['contact', 4],
      ['reach', 4],
      ['email', 4],
      ['availab', 4],
      ['opportunit', 3],
      ['hiring', 3],
      ['recruit', 3],
      ['freelanc', 3],
      ['collaborat', 3],
    ],
    words: [
      ['hire', 3],
      ['connect', 3],
      ['mail', 3],
      ['message', 2],
      ['resume', 3],
      ['cv', 3],
    ],
  },
}

/**
 * Extra words the spell repairer should recognise as already-correct.
 *
 * The repair vocabulary is built from the indexed corpus, which does not
 * contain question words. Without these, "portfolio" or "hire" would look
 * like typos of something in the content and get silently rewritten.
 */
export const questionWords: readonly string[] = [
  'about',
  'available',
  'best',
  'better',
  'describe',
  'different',
  'experience',
  'explain',
  'hire',
  'know',
  'learn',
  'person',
  'portfolio',
  'project',
  'projects',
  'skills',
  'strength',
  'strengths',
  'summary',
  'technologies',
  'weakness',
  'weaknesses',
  'worked',
]

/**
 * Shorthand a visitor types and the long form the cues are written in.
 *
 * `normalise` strips apostrophes, so "how's" arrives as "hows" and would
 * otherwise match nothing at all. Expanded before cue matching, never before
 * retrieval — the index has no use for "do not".
 */
export const contractions: Record<string, string> = {
  hows: 'how is',
  whats: 'what is',
  wheres: 'where is',
  whos: 'who is',
  whys: 'why is',
  thats: 'that is',
  theres: 'there is',
  hes: 'he is',
  shes: 'she is',
  its: 'it is',
  im: 'i am',
  ive: 'i have',
  id: 'i would',
  youre: 'you are',
  youve: 'you have',
  theyre: 'they are',
  dont: 'do not',
  doesnt: 'does not',
  didnt: 'did not',
  cant: 'can not',
  cannot: 'can not',
  couldnt: 'could not',
  wont: 'will not',
  wouldnt: 'would not',
  isnt: 'is not',
  arent: 'are not',
  wasnt: 'was not',
  hasnt: 'has not',
  havent: 'have not',
  shouldnt: 'should not',
  lets: 'let us',
  u: 'you',
  ur: 'your',
  r: 'are',
  pls: 'please',
  plz: 'please',
  thx: 'thanks',
  abt: 'about',
  exp: 'experience',
  proj: 'project',
}
