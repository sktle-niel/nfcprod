// Dependency-free secret scan. Scans files git would commit (tracked + untracked, not ignored).
// Usage: node scripts/secret-scan.mjs          scan the working tree
//        node scripts/secret-scan.mjs --staged scan only staged changes
// Suppress a known-safe line with the marker: secret-scan:allow
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const staged = process.argv.includes('--staged')

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

const files = (
  staged
    ? git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
    : git(['ls-files', '-co', '--exclude-standard'])
)
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean)

const SKIP_FILE = /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$|\.(png|jpe?g|gif|webp|avif|ico|svg|woff2?|ttf|pdf)$/i

const FORBIDDEN_NAME = [
  [/(^|\/)\.env(\..+)?$/i, (f) => !/\.env\.example$/i.test(f)],
  [/\.(pem|key|p12|pfx)$/i, () => true],
  [/(^|\/)(service-account|.*-credentials).*\.json$/i, () => true],
  [/(^|\/)id_(rsa|ed25519|ecdsa)$/i, () => true],
]

const PATTERNS = [
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['Stripe live key', /\b[sr]k_live_[A-Za-z0-9]{10,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['JWT (may be a Supabase/Firebase key)', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/],
  ['connection string with password', /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s@/]{3,}@[^\s/]+/i],
  [
    'hard-coded credential',
    /\b(secret|password|passwd|token|api[_-]?key|service[_-]?role)\w*\s*[:=]\s*['"`][^'"`\s]{8,}['"`]/i,
  ],
]

const findings = []

for (const file of files) {
  for (const [nameRe, isBad] of FORBIDDEN_NAME) {
    if (nameRe.test(file) && isBad(file)) findings.push(`${file}: forbidden file type (never commit)`)
  }
  if (SKIP_FILE.test(file)) continue

  let text
  try {
    text = staged ? git(['show', `:${file}`]) : readFileSync(file, 'utf8')
  } catch {
    continue
  }
  if (text.includes('\0')) continue

  text.split('\n').forEach((line, i) => {
    if (line.includes('secret-scan:allow')) return
    for (const [label, re] of PATTERNS) {
      if (re.test(line)) findings.push(`${file}:${i + 1}: possible ${label}`)
    }
  })
}

if (findings.length) {
  console.error('Secret scan FAILED:\n' + findings.map((f) => `  - ${f}`).join('\n'))
  console.error('\nRemove the secret and rotate it if it was ever pushed. Use placeholders: empty or <what goes here>.')
  process.exit(1)
}
console.log(`Secret scan OK (${files.length} files)`)
