import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

/**
 * Rules R2, R3 and R4 from the build plan are enforced here, mechanically.
 * R1 (no content facts in components) is enforced by scripts/check-literals.mjs,
 * because it needs to reason about prose rather than syntax.
 */

/** R4 — process.env may be read in exactly one module. */
const noRawEnvAccess = {
  selector:
    "MemberExpression[object.type='MemberExpression'][object.object.name='process'][object.property.name='env']",
  message:
    'R4: read environment variables only in src/config/env.ts, then import { env }.',
}

/** R2 — colours come from design tokens, never from a literal in markup. */
const noHexInClassName = {
  selector:
    "JSXAttribute[name.name='className'] Literal[value=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/]",
  message:
    'R2: no hex colours in className. Add a token in globals.css and use it.',
}

/** R2 — arbitrary Tailwind values bypass the token scale. */
const noArbitraryTailwindValue = {
  selector:
    "JSXAttribute[name.name='className'] Literal[value=/(?:^|\\s)-?[a-z][a-zA-Z-]*\\[[^\\]]+\\]/]",
  message:
    'R2: no arbitrary Tailwind values (e.g. mt-[13px]). Extend the token scale instead.',
}

/** R3 — every timing value lives in src/config/motion.ts. */
const noInlineMotionNumbers = {
  selector:
    'JSXAttribute[name.name=/^(transition|animate|initial|whileInView|whileHover|whileTap|exit)$/] Property[key.name=/^(duration|delay|stiffness|damping|mass|staggerChildren|delayChildren|repeatDelay|bounce)$/] > Literal[value=/^[0-9]/]',
  message:
    'R3: no inline timing numbers. Import the value from src/config/motion.ts.',
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    name: 'portfolio/no-hardcoding',
    rules: {
      'no-restricted-syntax': [
        'error',
        noRawEnvAccess,
        noHexInClassName,
        noArbitraryTailwindValue,
        noInlineMotionNumbers,
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  {
    // The single sanctioned reader of process.env (R4).
    name: 'portfolio/env-module-exemption',
    files: ['src/config/env.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  {
    // Node scripts are build tooling, not application code.
    name: 'portfolio/scripts-exemption',
    files: ['scripts/**/*.mjs', '*.config.mjs', '*.config.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'coverage/**',
  ]),
])

export default eslintConfig
