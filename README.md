# PHP Syntax for Orca

PHP highlighting for [Orca](https://www.onorca.dev/), built from the grammars VS Code ships:

- PHP code, with the HTML around it.
- PHP tags anywhere in a template: in HTML text, attribute values, inside a tag, in comments, and in
  `<script>` and `<style>` bodies.
- SQL in query strings, and HTML, SQL, JavaScript, CSS, JSON and XML in labelled heredocs.

It is a data-only plugin: no worker, no capabilities, nothing runs.

While it is enabled it colors `.php`, `.php4`, `.php5`, `.phtml` and `.ctp` files in place of Orca's
built-in PHP highlighting. Disable it to get Orca's colors back.

## Install

```sh
orca plugin install 4bdullatif/orca-php-syntax
```

Requires Orca 1.4.246 or newer. A private repository installs with the Git credentials of the
machine running Orca (`gh auth setup-git`, the macOS keychain or an SSH agent).

## Differences from VS Code

Orca does not read grammar injections, so the build lists the PHP tag rule first in the HTML, CSS
and JavaScript grammars instead (see `THIRD_PARTY_NOTICES.md`). On a corpus of WordPress, Laravel,
Symfony and php-src files the tokens match VS Code's, except:

- PHP inside `<script type="text/x-template">` (and other HTML-template scripts) is highlighted;
  VS Code leaves it plain.
- PHP written right after a valueless attribute (`data-dark<?php ... ?>`) is not wrapped in that
  attribute's scope. Colors are unchanged.
- `<?= ... ?>` written inside an HTML, JavaScript or CSS heredoc is highlighted as PHP; VS Code
  shows it as heredoc text.
- A stray `<` in HTML text is not marked invalid.

Comment toggling uses `//` everywhere in the file, including its HTML parts.

## Develop

With Node.js 22 or newer:

```sh
npm ci --ignore-scripts
npm test         # manifest, grammar and token checks with the real TextMate engine
npm run build    # regenerate syntaxes/ from the pinned VS Code commit
npm run check    # fail when syntaxes/ differs from a fresh build
orca plugin validate .
```

To try a change, `orca plugin dev watch .` loads the folder into Orca and reloads it on save.

## License

MIT for this repository's own files. The grammars keep their upstream licenses, listed in
`THIRD_PARTY_NOTICES.md` with the texts in `licenses/`.
