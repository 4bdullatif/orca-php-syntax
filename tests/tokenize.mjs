import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import textmate from 'vscode-textmate'
import oniguruma from 'vscode-oniguruma'

const require = createRequire(import.meta.url)
const syntaxes = new URL('../syntaxes/', import.meta.url)
const wasm = readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'))
await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength))

export const grammars = new Map(
  readdirSync(syntaxes)
    .filter((file) => file.endsWith('.tmLanguage.json'))
    .map((file) => JSON.parse(readFileSync(new URL(file, syntaxes), 'utf8')))
    .map((grammar) => [grammar.scopeName, grammar])
)

// No getInjections and no injection keys in the grammars: Orca's engine sees neither.
const registry = new textmate.Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
    createOnigString: (text) => new oniguruma.OnigString(text)
  }),
  loadGrammar: async (scope) => grammars.get(scope) ?? null
})
const grammar = await registry.loadGrammar('text.html.php')

// Orca gives each line 50 ms and retries a line that stopped early, before giving up on the file.
export function tokenize(source) {
  const lines = source.split(/\r\n|\r|\n/)
  let state = textmate.INITIAL
  const results = lines.map((line) => {
    let result
    for (let attempt = 0; attempt < 3; attempt += 1) {
      result = grammar.tokenizeLine(line, state, 50)
      if (!result.stoppedEarly) {
        break
      }
    }
    if (result.stoppedEarly) {
      throw new Error(`line exceeded the time budget: ${line.slice(0, 80)}`)
    }
    state = result.ruleStack
    return result.tokens
  })
  return { lines, results }
}
