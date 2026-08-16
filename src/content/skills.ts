import type { SkillCluster } from './schema'

/**
 * Capability clusters rather than self-scored bars.
 *
 * `evidence` points at the projects that demonstrate each cluster, so a
 * visitor can verify a claim in one click instead of taking a percentage on
 * trust. Every id here is checked against the project list at import.
 *
 * The optional `level` field stays unset — see the schema note.
 */
export const skills = [
  {
    id: 'artificial-intelligence',
    title: 'Artificial Intelligence',
    blurb:
      'Applied LLM work: retrieval pipelines, agentic systems, and tool integration through the Model Context Protocol.',
    items: [
      'Large Language Models',
      'Agentic AI',
      'Retrieval-Augmented Generation',
      'Model Context Protocol',
      'Prompt Engineering',
      'CNN',
      'OpenCV',
    ],
    evidence: ['news-sentiment-analysis', 'gesture-media-controller'],
  },
  {
    id: 'backend-engineering',
    title: 'Backend Engineering',
    blurb:
      'API and microservice design, from scheduling and background jobs to third-party integrations.',
    items: [
      'Python',
      'FastAPI',
      'Node.js',
      'Django',
      'Flask',
      'REST APIs',
      'Microservices',
    ],
    evidence: ['api-monitoring-platform'],
  },
  {
    id: 'frontend-engineering',
    title: 'Frontend Engineering',
    blurb:
      'Typed React applications and dashboards that stay readable as they grow.',
    items: ['Next.js', 'React', 'TypeScript', 'JavaScript', 'HTML', 'CSS'],
    evidence: ['api-monitoring-platform'],
  },
  {
    id: 'data-and-storage',
    title: 'Data & Storage',
    blurb:
      'Relational and document stores, chosen to match the shape of the data rather than habit.',
    items: ['PostgreSQL', 'MongoDB', 'SQL', 'NoSQL'],
    evidence: ['api-monitoring-platform'],
  },
  {
    id: 'cloud-and-devops',
    title: 'Cloud & DevOps',
    blurb:
      'Containerised services on AWS, with version control and deployment as part of the build rather than an afterthought.',
    items: [
      'AWS EC2',
      'AWS S3',
      'AWS Lambda',
      'AWS IAM',
      'DynamoDB',
      'Docker',
      'Git',
      'GitHub',
      'Linux',
    ],
    evidence: ['api-monitoring-platform'],
  },
] satisfies SkillCluster[]
