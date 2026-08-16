import type { Education } from './schema'

/** Ordered most recent first. */
export const education = [
  {
    id: 'bitm-cse-ai',
    qualification: 'B.E. Computer Science & Engineering',
    field: 'Artificial Intelligence',
    institution: 'Ballari Institute of Technology and Management',
    startYear: 2023,
    endYear: 2027,
    score: { label: 'CGPA', value: '8.0' },
  },
  {
    id: 'bpsc-pu-college',
    qualification: 'Pre-University',
    field: 'PCMC',
    institution: 'BPSC PU College',
    startYear: 2021,
    endYear: 2023,
    score: { label: 'Score', value: '85%' },
  },
  {
    id: 'basavarajeshwari-sslc',
    qualification: 'SSLC',
    institution: 'Basavarajeshwari Public School & College',
    startYear: 2020,
    endYear: 2021,
    score: { label: 'Score', value: '80%' },
  },
] satisfies Education[]
