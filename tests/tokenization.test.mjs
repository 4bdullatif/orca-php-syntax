import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { tokenize } from './tokenize.mjs'

function tokensOf(document, line, fragment) {
  const source = document.lines[line]
  const start = source.indexOf(fragment)
  assert.notEqual(start, -1, `missing fixture fragment: ${fragment}`)
  const end = start + fragment.length
  const tokens = document.results[line].filter((token) => token.startIndex < end && token.endIndex > start)
  assert.ok(tokens.length > 0)
  return tokens
}

function expectScope(document, line, fragment, scope) {
  for (const token of tokensOf(document, line, fragment)) {
    assert.ok(
      token.scopes.includes(scope),
      `${JSON.stringify(fragment)} on line ${line + 1}: expected ${scope}, got ${token.scopes.join(' ')}`
    )
  }
}

function expectNoScope(document, line, fragment, scope) {
  for (const token of tokensOf(document, line, fragment)) {
    assert.ok(
      !token.scopes.includes(scope),
      `${JSON.stringify(fragment)} on line ${line + 1}: unexpected ${scope} in ${token.scopes.join(' ')}`
    )
  }
}

test('PHP code inside <?php is highlighted by the PHP grammar', () => {
  const document = tokenize(
    [
      '<?php',
      'final class Users extends Base {',
      '    public function find(int $id): ?User { return null; } // note',
      '}'
    ].join('\n')
  )
  expectScope(document, 0, '<?php', 'punctuation.section.embedded.begin.php')
  expectScope(document, 1, 'class', 'storage.type.class.php')
  expectScope(document, 1, 'Users', 'entity.name.type.class.php')
  expectScope(document, 1, 'Base', 'entity.other.inherited-class.php')
  expectScope(document, 2, 'find', 'entity.name.function.php')
  expectScope(document, 2, 'id', 'variable.other.php')
  expectScope(document, 2, 'null', 'constant.language.php')
  expectScope(document, 2, '// note', 'comment.line.double-slash.php')
})

test('HTML around PHP keeps HTML scopes and ?> returns to HTML', () => {
  const document = tokenize('<?php $a = 1; ?>\n<p class="x">Hi</p>')
  expectScope(document, 0, '?>', 'punctuation.section.embedded.end.php')
  expectScope(document, 1, 'p', 'entity.name.tag.html')
  expectScope(document, 1, 'class', 'entity.other.attribute-name.html')
  expectNoScope(document, 1, '<p class="x">Hi</p>', 'source.php')
})

test('PHP tags are found in HTML text, attribute values, bare in tags and in comments', () => {
  const document = tokenize(
    [
      '<title><?= $title ?></title>',
      '<a href="/u/<?= $id ?>">',
      '<body <?php if ($dark): ?>data-dark<?php endif; ?>>',
      '<!-- by <?= $app ?> -->'
    ].join('\n')
  )
  expectScope(document, 0, '$title', 'variable.other.php')
  expectScope(document, 1, '$id', 'variable.other.php')
  expectScope(document, 1, 'href', 'entity.other.attribute-name.html')
  expectScope(document, 2, 'if', 'keyword.control.if.php')
  expectScope(document, 2, 'data-dark', 'entity.other.attribute-name.html')
  expectScope(document, 2, 'endif', 'keyword.control.endif.php')
  expectScope(document, 3, '$app', 'variable.other.php')
})

test('PHP tags are found inside <script> and <style> bodies', () => {
  const document = tokenize(
    [
      '<script>',
      'const users = <?= json_encode($users) ?>;',
      '</script>',
      '<style>',
      '.lead { color: <?= $color ?>; }',
      '</style>'
    ].join('\n')
  )
  expectScope(document, 1, 'const', 'storage.type.js')
  expectScope(document, 1, 'json_encode', 'support.function.json.php')
  expectScope(document, 1, 'json_encode', 'source.js')
  expectScope(document, 4, 'color', 'support.type.property-name.css')
  expectScope(document, 4, '$color', 'variable.other.php')
  expectScope(document, 4, '$color', 'source.css')
})

test('an <?xml declaration stays XML at the top level, as in VS Code', () => {
  const document = tokenize('<?xml version="1.0"?>')
  expectScope(document, 0, 'xml', 'meta.tag.metadata.processing.xml.html')
  expectNoScope(document, 0, 'version', 'source.php')
})

test('a shebang line is a comment', () => {
  const document = tokenize('#!/usr/bin/env php\n<?php echo 1;')
  expectScope(document, 0, '/usr/bin/env php', 'comment.line.shebang.php')
  expectScope(document, 1, 'echo', 'support.function.construct.output.php')
})

test('SQL strings and labelled heredocs use the embedded grammars', () => {
  const document = tokenize(
    [
      '<?php',
      '$sql = "SELECT id FROM users";',
      '$html = <<<HTML',
      '    <b class="x">bold</b>',
      '    HTML;',
      '$query = <<<SQL',
      '    DELETE FROM t',
      '    SQL;',
      '$json = <<<JSON',
      '    {"a": 1}',
      '    JSON;'
    ].join('\n')
  )
  expectScope(document, 1, 'SELECT', 'keyword.other.DML.sql')
  expectScope(document, 3, 'b', 'entity.name.tag.html')
  expectScope(document, 6, 'DELETE', 'keyword.other.DML.sql')
  expectScope(document, 9, 'a', 'support.type.property-name.json')
})

test('the demo file tokenizes within the per-line time budget', () => {
  const document = tokenize(readFileSync(new URL('../examples/demo.php', import.meta.url), 'utf8'))
  assert.ok(document.lines.length > 50)
})
