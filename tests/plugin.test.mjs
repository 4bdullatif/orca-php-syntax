import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

const root = new URL('../', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('orca-plugin.json', root), 'utf8'))
const syntaxes = manifest.contributes.syntaxes
const grammars = new Map(
  syntaxes.map((syntax) => [
    syntax.scopeName,
    JSON.parse(readFileSync(new URL(syntax.path, root), 'utf8'))
  ])
)
// source.java is only reached from JSP-style comments in XML heredocs; Orca leaves it plain.
const EXTERNAL_SCOPES = new Set(['source.java'])
const GRAMMAR_KEYS = new Set(['comment', 'name', 'scopeName', 'patterns', 'repository'])
const RULE_KEYS = new Set([
  'name',
  'contentName',
  'comment',
  'include',
  'match',
  'begin',
  'end',
  'while',
  'applyEndPatternLast',
  'patterns',
  'repository',
  'captures',
  'beginCaptures',
  'endCaptures',
  'whileCaptures'
])
const CAPTURE_KEYS = ['captures', 'beginCaptures', 'endCaptures', 'whileCaptures']

function* rules(grammar) {
  const pending = [{ patterns: grammar.patterns, repository: grammar.repository }]
  while (pending.length > 0) {
    const rule = pending.pop()
    yield rule
    pending.push(...(rule.patterns ?? []), ...Object.values(rule.repository ?? {}))
    for (const key of CAPTURE_KEYS) {
      pending.push(...Object.values(rule[key] ?? {}))
    }
  }
}

test('only the PHP syntax claims files, with the extensions Orca already treats as PHP', () => {
  const claiming = syntaxes.filter(
    (syntax) => syntax.extensions?.length || syntax.filenames?.length
  )
  assert.deepEqual(
    claiming.map((syntax) => [syntax.scopeName, syntax.extensions]),
    [['text.html.php', ['.php', '.php4', '.php5', '.phtml', '.ctp']]]
  )
})

test('every grammar matches its manifest scope and carries nothing Orca drops', () => {
  for (const [scopeName, grammar] of grammars) {
    assert.equal(grammar.scopeName, scopeName)
    for (const key of Object.keys(grammar)) {
      assert.ok(GRAMMAR_KEYS.has(key), `${scopeName}: grammar key ${key}`)
    }
    for (const rule of rules(grammar)) {
      for (const key of Object.keys(rule)) {
        assert.ok(RULE_KEYS.has(key), `${scopeName}: rule key ${key}`)
      }
      for (const key of CAPTURE_KEYS) {
        for (const captureKey of Object.keys(rule[key] ?? {})) {
          assert.match(
            captureKey,
            /^(?:0|[1-9][0-9]{0,2})$/,
            `${scopeName}: capture key ${captureKey}`
          )
        }
      }
    }
  }
})

test('every include resolves inside the plugin, except the scopes left plain on purpose', () => {
  for (const [scopeName, grammar] of grammars) {
    for (const rule of rules(grammar)) {
      if (!rule.include || rule.include.startsWith('#') || rule.include.startsWith('$')) {
        continue
      }
      const [targetScope, key] = rule.include.split('#')
      if (EXTERNAL_SCOPES.has(targetScope)) {
        continue
      }
      const target = grammars.get(targetScope)
      assert.ok(target, `${scopeName}: include ${rule.include}`)
      if (key) {
        assert.ok(Object.hasOwn(target.repository, key), `${scopeName}: include ${rule.include}`)
      }
    }
  }
})

test('the language configuration is plain JSON with only the keys Orca reads', () => {
  const configuration = JSON.parse(
    readFileSync(new URL('syntaxes/language-configuration.json', root), 'utf8')
  )
  assert.deepEqual(Object.keys(configuration), [
    'comments',
    'brackets',
    'autoClosingPairs',
    'surroundingPairs'
  ])
  assert.deepEqual(configuration.comments, { lineComment: '//', blockComment: ['/*', '*/'] })
})
