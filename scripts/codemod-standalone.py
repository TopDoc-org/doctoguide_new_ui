"""
Convert v1's NgModule-declared components to standalone.

For each component it:
  - adds `standalone: true`
  - computes the `imports: [...]` array from what the TEMPLATE actually uses
    (inline template or the templateUrl file), so nothing is imported that is
    not needed and nothing needed is missed
  - adds the matching TS import statements with a correct relative path
  - rewrites v1 import paths that moved during the migration

Deliberately does NOT touch *ngIf / *ngFor. Converting those to @if / @for in
the same commit as the port would make the parity diff unreadable; that is a
separate mechanical commit later.
"""
import re
import sys
from pathlib import Path

SRC_APP = Path('src/app')

# marker -> (symbol, module path relative to src/app, is it an NgModule/standalone cmp)
PROVIDERS = {
    'RouterLink':        ('RouterLink', '@angular/router', True),
    'RouterOutlet':      ('RouterOutlet', '@angular/router', True),
    'RouterLinkActive':  ('RouterLinkActive', '@angular/router', True),
    'CommonModule':      ('CommonModule', '@angular/common', True),
    'FormsModule':       ('FormsModule', '@angular/forms', True),
    'IconComponent':     ('IconComponent', 'design-system/icon/icon.component', False),
    'CarouselComponent': ('CarouselComponent', 'design-system/carousel/carousel.component', False),
    'ButtonComponent':   ('ButtonComponent', 'design-system/button/button.component', False),
    'InputComponent':    ('InputComponent', 'design-system/input/input.component', False),
    'SelectComponent':   ('SelectComponent', 'design-system/select/select.component', False),
    'DateFieldComponent':('DateFieldComponent', 'design-system/date-field/date-field.component', False),
    'DrawerComponent':   ('DrawerComponent', 'design-system/drawer/drawer.component', False),
    'AuthGateComponent': ('AuthGateComponent', 'features/triage/components/auth-gate/auth-gate.component', False),
    'ConsultHistoryComponent': ('ConsultHistoryComponent', 'features/triage/components/consult-history/consult-history.component', False),
    'ReactiveFormsModule': ('ReactiveFormsModule', '@angular/forms', True),
    'SeoPageLayoutComponent': ('SeoPageLayoutComponent', 'layouts/seo-page-layout/seo-page-layout.component', False),
    'LegalLayoutComponent':   ('LegalLayoutComponent', 'layouts/legal-layout/legal-layout.component', False),
}

# v1 path -> new path (module specifier fragments)
PATH_REWRITES = [
    (r"from '(\.\./)+core/seo\.service'", "@@SEO@@"),
    (r"from '(\.\./)+environments/environment'", "@@ENV@@"),
    (r"from '(\.\./)+ai-doctor/services/ai-doctor-state\.service'", "@@STATE@@"),
    (r"from '(\.\./)+ai-doctor/services/country\.service'", "@@COUNTRY@@"),
    (r"from '(\.\./)+core/firebase-analytics\.service'", "@@ANALYTICS@@"),
    (r"from '(\.\./)+ai-doctor/services/affiliate\.service'", "@@AFFILIATE@@"),
]
TARGETS = {
    '@@SEO@@': 'core/seo/seo.service',
    '@@ENV@@': None,  # environments live outside src/app; handled separately
    '@@STATE@@': 'features/triage/services/ai-doctor-state.service',
    '@@COUNTRY@@': 'core/country/country.service',
    '@@ANALYTICS@@': 'core/analytics/firebase-analytics.service',
    '@@AFFILIATE@@': 'core/affiliate/affiliate.service',
}


def rel(from_file: Path, to_module: str) -> str:
    """Relative module specifier from a file to a path under src/app."""
    target = SRC_APP / to_module
    r = Path(*['..'] * (len(from_file.parent.relative_to(SRC_APP).parts))) / target.relative_to(SRC_APP)
    s = str(r).replace('\\', '/')
    return s if s.startswith('.') else './' + s


def rel_env(from_file: Path) -> str:
    depth = len(from_file.parent.relative_to(SRC_APP).parts) + 1  # +1 to leave src/app
    return '/'.join(['..'] * depth) + '/environments/environment'


def needed(template: str, own_selector: str) -> list[str]:
    n = []
    if 'routerLink' in template:
        n.append('RouterLink')
    if 'routerLinkActive' in template:
        n.append('RouterLinkActive')
    if '<router-outlet' in template:
        n.append('RouterOutlet')
    if re.search(r'\*ngIf|\*ngFor|ngClass|ngStyle|ngSwitch|\*ngTemplateOutlet|\| *(date|number|currency|percent|json|slice|titlecase|uppercase|lowercase|async)\b', template):
        n.append('CommonModule')
    if 'ngModel' in template:
        n.append('FormsModule')
    if '<ds-icon' in template:
        n.append('IconComponent')
    if '<ds-carousel' in template:
        n.append('CarouselComponent')
    if '<ds-button' in template:
        n.append('ButtonComponent')
    if '<ds-input' in template:
        n.append('InputComponent')
    if '<ds-select' in template:
        n.append('SelectComponent')
    if '<ds-date-field' in template:
        n.append('DateFieldComponent')
    if '<ds-drawer' in template:
        n.append('DrawerComponent')
    if '<app-auth-gate' in template and own_selector != 'app-auth-gate':
        n.append('AuthGateComponent')
    if '<app-consult-history' in template and own_selector != 'app-consult-history':
        n.append('ConsultHistoryComponent')
    if re.search(r'\[formGroup\]|formControlName|\[formControl\]', template):
        n.append('ReactiveFormsModule')
    # A layout must not import itself.
    if '<app-seo-page-layout' in template and own_selector != 'app-seo-page-layout':
        n.append('SeoPageLayoutComponent')
    if '<app-legal-layout' in template and own_selector != 'app-legal-layout':
        n.append('LegalLayoutComponent')
    return n


def process(path: Path, check: bool) -> str | None:
    text = path.read_text(encoding='utf-8')
    if '@Component' not in text:
        return None

    sel_m = re.search(r"selector:\s*'([^']+)'", text)
    own_selector = sel_m.group(1) if sel_m else ''

    # Template: inline, or the sibling templateUrl file.
    tpl = text
    url_m = re.search(r"templateUrl:\s*'\./([^']+)'", text)
    if url_m:
        tpl_file = path.parent / url_m.group(1)
        if tpl_file.exists():
            tpl = tpl_file.read_text(encoding='utf-8')

    syms = needed(tpl, own_selector)

    new = text
    # 1. standalone: true
    if 'standalone:' not in new:
        new = re.sub(r"(selector:\s*'[^']+',)", r"\1\n  standalone: true,", new, count=1)

    # 2. imports array
    if syms and 'imports:' not in new:
        arr = ', '.join(syms)
        new = re.sub(r"(standalone: true,)", r"\1\n  imports: [" + arr + "],", new, count=1)

    # 3. TS import statements
    lines = []
    for s in syms:
        sym, mod, _ = PROVIDERS[s]
        spec = mod if mod.startswith('@') else rel(path, mod)
        stmt = f"import {{ {sym} }} from '{spec}';"
        if stmt not in new:
            lines.append(stmt)
    if lines:
        # insert after the last existing import.
        # Multi-line imports are common in this codebase; a single-line-only
        # regex silently inserts nothing and leaves an imports: [...] entry
        # with no matching import statement (this bit pin-input once).
        last = list(re.finditer(r'^import\s[\s\S]*?;$', new, re.M))
        if last:
            i = last[-1].end()
            new = new[:i] + '\n' + '\n'.join(lines) + new[i:]

    # 4. moved import paths
    for pat, token in PATH_REWRITES:
        if re.search(pat, new):
            if token == '@@ENV@@':
                new = re.sub(pat, f"from '{rel_env(path)}'", new)
            else:
                new = re.sub(pat, f"from '{rel(path, TARGETS[token])}'", new)

    if new != text and not check:
        path.write_text(new, encoding='utf-8')
    return f'{path}: +standalone, imports=[{", ".join(syms)}]' if new != text else None


def main():
    check = '--check' in sys.argv
    roots = [a for a in sys.argv[1:] if not a.startswith('--')] or ['src/app']
    changed = 0
    for root in roots:
        for p in sorted(Path(root).rglob('*.component.ts')):
            if 'design-system' in p.parts or 'dev' in p.parts:
                continue
            r = process(p, check)
            if r:
                changed += 1
                print(r)
    print(f'\n{changed} component(s) converted{" (check only)" if check else ""}')


if __name__ == '__main__':
    main()
