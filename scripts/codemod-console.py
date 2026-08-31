"""
Console-realm port: collapse the five duplicated CSV-download blocks into
downloadBlob(), and fix import paths that moved in the migration.

The CSV block below was copy-pasted verbatim into admin-leads, owner-campaigns,
owner-clinics, partner-campaigns and partner-leads:

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `<filename>`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

It becomes a single downloadBlob(blob, `<filename>`) call. The filename
expression is preserved exactly — it is user-visible and differs per realm.

Reports every rewrite, and every CSV block it could NOT match, so nothing is
silently left half-ported.
"""
import re
import sys
from pathlib import Path

ROOT = Path('src/app/features')

CSV_BLOCK = re.compile(
    r'[ \t]*const url = window\.URL\.createObjectURL\((\w+)\);\n'
    r'[ \t]*const a = document\.createElement\(\'a\'\);\n'
    r'[ \t]*a\.href = url;\n'
    r'[ \t]*a\.download = (.+?);\n'
    r'[ \t]*document\.body\.appendChild\(a\);\n'
    r'[ \t]*a\.click\(\);\n'
    r'[ \t]*a\.remove\(\);\n'
    r'[ \t]*window\.URL\.revokeObjectURL\(url\);',
)

# module specifier rewrites (v1 layout -> new layout)
PATHS = [
    (r"from '(?:\.\./)+environments/environment'", 'ENV'),
    (r"from '(?:\.\./)+core/seo\.service'", 'SEO'),
    (r"from '(?:\.\./)+shared/session-expiry\.interceptor'", 'INTERCEPTOR'),
]


def depth_to_app(p: Path) -> int:
    return len(p.parent.relative_to(Path('src/app')).parts)


def main():
    check = '--check' in sys.argv
    touched = 0
    csv_total = 0
    leftovers = []

    for p in sorted(ROOT.rglob('*.ts')):
        text = p.read_text(encoding='utf-8')
        orig = text
        up = '../' * depth_to_app(p)

        # 1. CSV blocks -> downloadBlob(...)
        def repl(m):
            indent = re.match(r'[ \t]*', m.group(0)).group(0)
            return f'{indent}downloadBlob({m.group(1)}, {m.group(2)});'

        text, n = CSV_BLOCK.subn(repl, text)
        if n:
            csv_total += n
            stmt = f"import {{ downloadBlob }} from '{up}core/platform/download';"
            if stmt not in text:
                last = list(re.finditer(r'^import .*;$', text, re.M))
                if last:
                    i = last[-1].end()
                    text = text[:i] + '\n' + stmt + text[i:]

        # anything left that still hand-rolls a blob download
        if 'createObjectURL' in text:
            for ln, line in enumerate(text.splitlines(), 1):
                if 'createObjectURL' in line:
                    leftovers.append(f'{p}:{ln}: {line.strip()[:100]}')

        # 2. moved import paths
        for pat, kind in PATHS:
            if re.search(pat, text):
                if kind == 'ENV':
                    text = re.sub(pat, f"from '{'../' * (depth_to_app(p) + 1)}environments/environment'", text)
                elif kind == 'SEO':
                    text = re.sub(pat, f"from '{up}core/seo/seo.service'", text)
                elif kind == 'INTERCEPTOR':
                    text = re.sub(pat, f"from '{up}core/http/session-expiry.interceptor'", text)

        if text != orig:
            touched += 1
            print(f'{p}: {n} CSV block(s) collapsed' if n else f'{p}: paths fixed')
            if not check:
                p.write_text(text, encoding='utf-8')

    print(f'\n{csv_total} CSV block(s) -> downloadBlob across {touched} file(s)'
          f'{" (check only)" if check else ""}')
    if leftovers:
        print(f'\n!! {len(leftovers)} hand-rolled download(s) NOT converted:')
        for l in leftovers:
            print('   ' + l)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
