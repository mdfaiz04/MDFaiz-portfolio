/**
 * Query vocabulary for the portfolio assistant (Phase 5).
 *
 * Seeded now so the content layer is complete. It lives here rather than in
 * lib/ because tuning it is *data* editing — when a visitor phrases a
 * question in a way the engine misses, the fix is a new alias in this file,
 * never a code change.
 *
 * Keys are the canonical terms that appear in the indexed content. Values are
 * the ways a visitor might say the same thing.
 */
export const synonyms: Record<string, readonly string[]> = {
  // Domains
  'artificial intelligence': ['ai', 'machine learning', 'ml', 'deep learning'],
  'large language models': ['llm', 'llms', 'gpt', 'language model'],
  'retrieval-augmented generation': ['rag', 'retrieval augmented', 'retrieval'],
  'model context protocol': ['mcp'],
  'computer vision': ['cv', 'opencv', 'image recognition', 'vision'],

  // Engineering
  backend: ['back end', 'back-end', 'server side', 'api', 'apis'],
  frontend: ['front end', 'front-end', 'client side', 'ui'],
  devops: ['dev ops', 'deployment', 'ci/cd', 'infrastructure'],
  database: ['db', 'databases', 'storage', 'data store'],

  // Career questions
  experience: [
    'work',
    'worked',
    'job',
    'jobs',
    'internship',
    'internships',
    'career',
    'employment',
    'background',
  ],
  projects: ['project', 'built', 'build', 'portfolio', 'work samples'],
  skills: [
    'skill',
    'tech stack',
    'stack',
    'technologies',
    'tools',
    'know',
    'proficient',
  ],
  education: [
    'study',
    'studied',
    'degree',
    'college',
    'university',
    'school',
    'cgpa',
    'graduation',
  ],
  achievements: [
    'award',
    'awards',
    'competition',
    'competitions',
    'hackathon',
    'placement',
    'won',
    'win',
  ],
  availability: [
    'hire',
    'hiring',
    'available',
    'availability',
    'open to work',
    'looking for',
    'opportunities',
  ],
  contact: ['reach', 'email', 'get in touch', 'connect', 'message'],
}

/**
 * Terms that carry no signal for this corpus. Removed before scoring so a
 * question like "what can you tell me about your projects" ranks on
 * "projects" alone.
 */
export const stopwords: readonly string[] = [
  'a',
  'about',
  'an',
  'and',
  'any',
  'are',
  'as',
  'at',
  'be',
  'been',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'for',
  'from',
  'had',
  'has',
  'have',
  'he',
  'her',
  'his',
  'how',
  'i',
  'if',
  'in',
  'is',
  'it',
  'its',
  'me',
  'my',
  'of',
  'on',
  'or',
  'she',
  'should',
  'so',
  'some',
  'tell',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'to',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'will',
  'with',
  'would',
  'you',
  'your',
  'yours',
]
