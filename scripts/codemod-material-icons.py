"""
Rewrite v1's Material-Icons spans to <ds-icon>.

    <span class="material-icons text-teal-600" style="font-size:20px">person</span>
    ->  <ds-icon name="person" [size]="20" class="text-teal-600" />

Handles the shapes that actually occur in the v1 templates:
  - extra classes present or absent
  - style="font-size:NNpx" present or absent (absent -> ds-icon's default 20)
  - aria-hidden="true" present or absent (ds-icon always sets it, so it is dropped)
  - arbitrary Angular bindings kept verbatim, e.g. [class.rotate-180]="offersOpen"

Reports every rewrite and every span it could NOT parse, so nothing is
transformed silently. Run with --check to see the diff without writing.
"""
import re
import sys
from pathlib import Path

# Literal ligature: >person<
SPAN = re.compile(
    r'<span\s+class="material-icons([^"]*)"([^>]*?)>\s*([a-z0-9_]+)\s*</span>',
    re.IGNORECASE,
)
# Interpolated ligature: >{{ s.icon }}<  -> needs a BOUND [name], not a literal.
SPAN_BOUND = re.compile(
    r'<span\s+class="material-icons([^"]*)"([^>]*?)>\s*\{\{\s*(.+?)\s*\}\}\s*</span>',
    re.IGNORECASE,
)
FONT_SIZE = re.compile(r'style="[^"]*font-size:\s*(\d+)px[^"]*"')
ARIA = re.compile(r'\s*aria-hidden="true"')

# The design system defines ds-icon and documents the very markup this script
# rewrites. Transforming its doc comments would be nonsense.
SKIP_DIRS = ('design-system',)


def _shared(match, name_attr):
    classes = match.group(1).strip()
    attrs = match.group(2)

    size = None
    m = FONT_SIZE.search(attrs)
    if m:
        size = m.group(1)
        attrs = FONT_SIZE.sub('', attrs)

    # ds-icon always marks itself aria-hidden, so drop any explicit one.
    attrs = ARIA.sub('', attrs)
    leftover = ' '.join(attrs.split())

    parts = [f'<ds-icon {name_attr}']
    if size and size != '20':
        parts.append(f'[size]="{size}"')
    if classes:
        parts.append(f'class="{classes}"')
    if leftover:
        parts.append(leftover)
    return ' '.join(parts) + ' />'


def convert(match):
    return _shared(match, f'name="{match.group(3)}"')


def convert_bound(match):
    return _shared(match, f'[name]="{match.group(3)}"')


def main():
    check = '--check' in sys.argv
    roots = [a for a in sys.argv[1:] if not a.startswith('--')] or ['src']

    total, files_touched, unparsed = 0, 0, []
    for root in roots:
        for path in sorted(Path(root).rglob('*')):
            if path.suffix not in ('.html', '.ts') or not path.is_file():
                continue
            if any(part in path.parts for part in SKIP_DIRS):
                continue
            text = path.read_text(encoding='utf-8')
            if 'material-icons' not in text:
                continue

            new_text, n_bound = SPAN_BOUND.subn(convert_bound, text)
            new_text, n_literal = SPAN.subn(convert, new_text)
            n = n_bound + n_literal
            # Anything still mentioning material-icons did not match the pattern.
            if 'material-icons' in new_text:
                for line_no, line in enumerate(new_text.splitlines(), 1):
                    if 'material-icons' in line:
                        unparsed.append(f'{path}:{line_no}: {line.strip()[:120]}')

            if n:
                total += n
                files_touched += 1
                print(f'{path}: {n} icon(s)')
                if not check:
                    path.write_text(new_text, encoding='utf-8')

    print(f'\n{total} icons rewritten across {files_touched} files'
          f'{" (check only, nothing written)" if check else ""}')
    if unparsed:
        print(f'\n!! {len(unparsed)} material-icons occurrence(s) NOT converted — fix by hand:')
        for u in unparsed:
            print('   ' + u)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
