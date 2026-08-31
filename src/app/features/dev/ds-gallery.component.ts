import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../../design-system/button/button.component';
import { CardComponent } from '../../design-system/card/card.component';
import { BadgeComponent } from '../../design-system/badge/badge.component';
import { SpinnerComponent } from '../../design-system/spinner/spinner.component';
import { SkeletonComponent } from '../../design-system/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../design-system/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../design-system/page-header/page-header.component';
import { IconComponent } from '../../design-system/icon/icon.component';
import { InputComponent } from '../../design-system/input/input.component';
import { TextareaComponent } from '../../design-system/textarea/textarea.component';
import { SelectComponent } from '../../design-system/select/select.component';
import { DateFieldComponent } from '../../design-system/date-field/date-field.component';
import { DrawerComponent } from '../../design-system/drawer/drawer.component';
import { CarouselComponent } from '../../design-system/carousel/carousel.component';

/**
 * DEV-ONLY design-system gallery, reachable at /ds.
 * TODO(phase-10): delete this component and its route before release.
 *
 * It exists so every ds-* component is instantiated at least once in a real
 * build — which is how an unregistered lucide name or a dead alpha class gets
 * caught, rather than at the call site three phases later.
 */
@Component({
  selector: 'app-ds-gallery',
  standalone: true,
  imports: [
    ReactiveFormsModule, ButtonComponent, CardComponent, BadgeComponent, SpinnerComponent,
    SkeletonComponent, EmptyStateComponent, PageHeaderComponent, IconComponent,
    InputComponent, TextareaComponent, SelectComponent, DateFieldComponent,
    DrawerComponent, CarouselComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <ds-page-header eyebrow="Internal" title="Design system" subtitle="Every ds-* component, once.">
        <ds-button size="sm" variant="secondary" (pressed)="drawerOpen.set(true)">Open drawer</ds-button>
      </ds-page-header>

      <section class="space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-tight text-muted">Buttons</h2>
        <div class="flex flex-wrap gap-2">
          <ds-button variant="primary">Primary</ds-button>
          <ds-button variant="accent">Accent</ds-button>
          <ds-button variant="secondary">Secondary</ds-button>
          <ds-button variant="ghost">Ghost</ds-button>
          <ds-button variant="danger">Danger</ds-button>
          <ds-button variant="glass">Glass</ds-button>
          <ds-button [loading]="true">Loading</ds-button>
          <ds-button [disabled]="true">Disabled</ds-button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <ds-button size="sm">sm</ds-button>
          <ds-button size="md">md</ds-button>
          <ds-button size="lg">lg</ds-button>
          <ds-button><ds-icon name="download" [size]="18" />With icon</ds-button>
        </div>
      </section>

      <section class="mt-8 space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-tight text-muted">Badges</h2>
        <div class="flex flex-wrap gap-2">
          <ds-badge tone="teal">teal</ds-badge>
          <ds-badge tone="grass">grass</ds-badge>
          <ds-badge tone="success">success</ds-badge>
          <ds-badge tone="warning">warning</ds-badge>
          <ds-badge tone="danger">danger</ds-badge>
          <ds-badge tone="neutral">neutral</ds-badge>
          <ds-badge tone="teal" [solid]="true">solid</ds-badge>
        </div>
      </section>

      <section class="mt-8 space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-tight text-muted">Icons (Material ligature API)</h2>
        <div class="flex flex-wrap items-center gap-3 text-teal-700">
          @for (n of iconProbe; track n) {
            <span class="flex flex-col items-center gap-1 w-20">
              <ds-icon [name]="n" [size]="22" />
              <span class="text-[10px] text-muted truncate w-full text-center">{{ n }}</span>
            </span>
          }
        </div>
      </section>

      <section class="mt-8 grid gap-4 sm:grid-cols-2">
        <ds-card>
          <h3 class="font-semibold text-content-strong mb-2">Card</h3>
          <p class="text-sm text-muted">Default padding, hairline border, elev-1.</p>
        </ds-card>
        <ds-card [hover]="true" [glass]="true">
          <h3 class="font-semibold text-content-strong mb-2">Glass + hover</h3>
          <p class="text-sm text-muted">Backdrop blur over the mesh background.</p>
        </ds-card>
      </section>

      <section class="mt-8 space-y-4 max-w-md">
        <h2 class="text-sm font-semibold uppercase tracking-tight text-muted">Form controls</h2>
        <ds-input label="Text" placeholder="Type here" hint="A hint" [formControl]="text" />
        <ds-input label="Password" type="password" placeholder="••••" [formControl]="pwd" />
        <ds-input label="With error" placeholder="Bad" error="Something is wrong" [formControl]="bad" />
        <ds-select label="Gender" [options]="genders" placeholder="Select" [formControl]="gender" />
        <ds-date-field label="Date of birth" [max]="today" [formControl]="dob" />
        <ds-textarea label="Notes" placeholder="Longer text" [maxlength]="200" [formControl]="notes" />
        <p class="text-xs text-muted">
          select = {{ gender.value ?? 'null' }} · dob = {{ dob.value ? dob.value.toDateString() : 'null' }}
        </p>
      </section>

      <section class="mt-8 space-y-3">
        <h2 class="text-sm font-semibold uppercase tracking-tight text-muted">Feedback</h2>
        <div class="flex items-center gap-4 text-teal-700"><ds-spinner /><ds-spinner [size]="28" /></div>
        <div class="space-y-2 max-w-sm">
          <ds-skeleton height="20px" />
          <ds-skeleton width="70%" height="14px" />
          <ds-skeleton width="40px" height="40px" [circle]="true" />
        </div>
        <ds-card padding="none">
          <ds-empty-state icon="search" title="No results" message="Nothing matched that search." >
            <ds-button size="sm" variant="secondary">Clear filters</ds-button>
          </ds-empty-state>
        </ds-card>
      </section>

      <section class="mt-8 max-w-xl">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-tight text-muted">Carousel</h2>
        <div class="rounded-2xl border border-teal-100 bg-white/60 px-2 py-3">
          <ds-carousel [slides]="slides" [interval]="3000" />
        </div>
      </section>

      <ds-drawer [(open)]="drawerOpen" heading="Account">
        <nav class="p-2">
          @for (item of drawerItems; track item) {
            <button type="button"
                    class="flex w-full items-center gap-3 rounded-lg px-4 h-12 text-left text-sm text-content hover:bg-surface-2">
              <ds-icon [name]="item.icon" [size]="20" />{{ item.label }}
            </button>
          }
        </nav>
      </ds-drawer>
    </div>
  `,
})
export class DsGalleryComponent {
  protected drawerOpen = signal(false);
  protected today = new Date().toISOString().slice(0, 10);

  protected text = new FormControl('');
  protected pwd = new FormControl('');
  protected bad = new FormControl('');
  protected notes = new FormControl('');
  protected gender = new FormControl<string | null>(null);
  protected dob = new FormControl<Date | null>(null);

  protected genders = [
    { label: 'Female', value: 'female' },
    { label: 'Male', value: 'male' },
    { label: 'Other', value: 'other' },
  ];

  protected slides = [
    { title: 'Describe your symptoms', text: 'Plain language is enough.' },
    { title: 'Understand the urgency', text: 'Know whether it can wait.' },
    { title: 'Find the right specialist', text: 'Stop guessing which doctor.' },
  ];

  protected drawerItems = [
    { icon: 'person', label: 'My profile' },
    { icon: 'history', label: 'Past consults' },
    { icon: 'password', label: 'Change PIN' },
    { icon: 'logout', label: 'Log out' },
  ];

  /** One probe per distinct MATERIAL_ICON_MAP target, to smoke out unregistered names. */
  protected iconProbe = [
    'campaign', 'download', 'check_circle', 'close', 'logout', 'arrow_back', 'schedule',
    'place', 'medical_services', 'call', 'auto_awesome', 'arrow_forward', 'translate',
    'local_offer', 'chevron_right', 'star', 'space_dashboard', 'person', 'history', 'add',
    'verified_user', 'storefront', 'password', 'insights', 'how_to_reg', 'group',
    'expand_more', 'expand_less', 'event', 'description', 'credit_card_off', 'chat',
    'verified', 'trending_up', 'travel_explore', 'sort', 'send', 'science', 'remove',
    'refresh', 'my_location', 'menu', 'login', 'lock', 'location_on', 'location_off',
    'link', 'ios_share', 'info', 'hub', 'healing', 'handshake', 'group_add', 'emergency',
    'edit_note', 'edit_location_alt', 'directions', 'bolt', 'biotech', 'ads_click',
    'add_comment', 'chat_bubble_outline',
  ];
}
