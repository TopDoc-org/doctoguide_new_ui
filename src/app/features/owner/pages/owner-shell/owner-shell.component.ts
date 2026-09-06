import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { IconComponent } from '../../../../design-system/icon/icon.component';
import { TabItem, TabsComponent } from '../../../../design-system/tabs/tabs.component';
import { ThemeToggleComponent } from '../../../../design-system/theme-toggle/theme-toggle.component';
import { OwnerAuthService } from '../../services/owner-auth.service';

@Component({
  selector: 'app-owner-shell',
  standalone: true,
  imports: [RouterOutlet, IconComponent, TabsComponent, ThemeToggleComponent],
  templateUrl: './owner-shell.component.html',
})
export class OwnerShellComponent {
  /** Public: the template renders the signed-in name. */
  readonly auth = inject(OwnerAuthService);
  private readonly router = inject(Router);

  /** The section strip. `link` makes each tab a real `<a routerLink>`. */
  protected readonly sections: TabItem[] = [
    { id: 'home', label: 'Home', icon: 'space_dashboard', link: '/owner/home' },
    { id: 'campaigns', label: 'Campaigns', icon: 'campaign', link: '/owner/campaigns' },
    { id: 'clinics', label: 'Clinics', icon: 'store', link: '/owner/clinics' },
  ];

  /**
   * Which section the URL is in. Derived rather than tracked by
   * `routerLinkActive`, because `ds-tabs` needs the id to set `aria-selected`
   * and to scroll the strip — a class applied by a directive tells it neither.
   *
   * `startWith(null)` makes this emit synchronously on subscribe, so the right
   * tab is selected on a deep link and not only after the first in-app
   * navigation.
   */
  protected readonly activeSection = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => this.sections.find((s) => this.router.url.startsWith(s.link as string))?.id ?? ''),
    ),
    { initialValue: '' },
  );

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/owner/login']);
  }
}
