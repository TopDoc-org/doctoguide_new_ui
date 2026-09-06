import {
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subject, Subscription, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../design-system/icon/icon.component';
import { DrawerComponent } from '../../../../design-system/drawer/drawer.component';
import { SpinnerComponent } from '../../../../design-system/spinner/spinner.component';
import { CheckboxComponent } from '../../../../design-system/checkbox/checkbox.component';
import { ThemeToggleComponent } from '../../../../design-system/theme-toggle/theme-toggle.component';
import { ToastService } from '../../../../design-system/toast/toast.service';
import { AuthGateComponent } from '../../components/auth-gate/auth-gate.component';
import { ConsultHistoryComponent } from '../../components/consult-history/consult-history.component';
import { environment } from '../../../../../environments/environment';
import { AiDoctorApiService } from '../../services/ai-doctor-api.service';
import { AiDoctorStateService } from '../../services/ai-doctor-state.service';
import { GeolocationService } from '../../services/geolocation.service';
import { CountryService } from '../../../../core/country/country.service';
import {
  ChatMessage,
  Doctor,
  MessageResponse,
  PartnerOffer,
  PlaceSuggestion,
  Report,
  SpecialtySuggestion,
} from '../../models';
import { ReportPdfService } from '../../services/report-pdf.service';
import { ageFromDob, isLowSignal } from './triage-view.util';
import { FirebaseAnalyticsService } from '../../../../core/analytics/firebase-analytics.service';
import {
  ACCEPTED_TYPES,
  MAX_FILES,
  MAX_FILE_BYTES,
  ReportAnalysis,
  ReportAnalysisService,
  documentsOf,
  shrinkForUpload,
} from '../../services/report-analysis.service';
import { ReportAnalysisCardComponent } from '../../components/report-analysis-card/report-analysis-card.component';
import { BackButtonService } from '../../../../core/native/back-button.service';
import { shareText } from '../../../../core/platform/share';

@Component({
  selector: 'app-triage-shell',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IconComponent,
    DrawerComponent,
    AuthGateComponent,
    ConsultHistoryComponent,
    ReportAnalysisCardComponent,
    SpinnerComponent,
    ThemeToggleComponent,
    CheckboxComponent,
  ],
  templateUrl: './triage-shell.component.html',
  styleUrls: ['./triage-shell.component.scss'],
})
export class TriageShellComponent implements OnInit, OnDestroy {
  @ViewChild('scrollAnchor') scrollAnchor?: ElementRef<HTMLDivElement>;
  @ViewChild('composer') composer?: ElementRef<HTMLTextAreaElement>;
  // One hidden file input shared by every way into an upload — the composer's
  // paperclip, the opening-screen card, and the account drawer — so all three
  // land in the same in-chat flow instead of one of them wandering off to
  // another screen.
  @ViewChild('docPicker') docPicker?: ElementRef<HTMLInputElement>;
  @ViewChild('reportTop') reportTop?: ElementRef<HTMLDivElement>;

  // Greeting doubles as the multilingual hint: the AI mirrors the user's
  // language (backend behaviour), so show it rather than just claim it.
  private readonly WELCOME =
    "Hi! I'm your AI health assistant — an informational guide, not a doctor. Tell me what's bothering you, in any language you like";

  // Composer placeholder cycles through languages to demonstrate that the
  // user can reply in whichever one they're comfortable with.
  private readonly PLACEHOLDERS = [
    'Reply…  (Shift+Enter for a new line)',
    'Kisi bhi bhasha me likh sakte hain…',
    'आप किसी भी भाषा में लिख सकते हैं…',
  ];
  composerPlaceholder = this.PLACEHOLDERS[0];
  private placeholderTimer?: ReturnType<typeof setInterval>;

  // Country-aware emergency numbers + name (resolved by CountryService on init;
  // start with the environment fallback so the UI renders immediately).
  emergencyNumbers = environment.emergencyNumbers;
  countryName: string | null = null;

  // Emergency copy is built by CountryService so it can never render the old
  // "call 911 or 911" (84 of the 204 countries share one number for both), and
  // so an undetected country gets neutral "your local emergency services
  // (112 / 911)" wording instead of a hard-coded 112.
  get emergencySentence(): string {
    return this.country.emergencySentence;
  }
  get emergencyNumbersText(): string {
    return this.country.emergencyNumbersText;
  }

  /** Distinct numbers worth a tel: button — collapses 911/911 down to one. */
  get emergencyDialNumbers(): string[] {
    const { all, ambulance } = this.emergencyNumbers;
    return ambulance && ambulance !== all ? [all, ambulance] : [all];
  }
  appName = environment.appName;
  instagramUrl = environment.instagram.url;
  instagramHandle = environment.instagram.handle;

  input = '';
  loading = false;
  emergency = false;
  // Set when the user dismisses the emergency card to keep building their
  // report. Once on, backend emergency replies are shown as plain advice and
  // never re-lock the composer.
  emergencyOverride = false;

  // First-line spam guard. Backend owns the authoritative semantic low-signal
  // detection (see BACKEND_SPAM_GUARD.md); this only short-circuits OBVIOUS junk
  // (gibberish, repeated messages) so we don't burn a backend round-trip and
  // never advance toward a report on it. Deliberately conservative to avoid
  // blocking real Hinglish answers — anything subtle is left to the backend.
  private junkStreak = 0;
  private readonly JUNK_STREAK_LIMIT = 2;

  // Tap-to-answer chips for the current question (backend-supplied). Empty for
  // open/numeric/detail-bearing questions, which stay free-text. The composer
  // stays enabled either way — the chips are a shortcut, never a cage.
  answerOptions: string[] = [];

  // triage progress toward the report
  progress = 0;
  stepsLeft = 0;
  // Set once the backend signals no questions remain (stepsLeft === 0): the next
  // round-trip is the report itself, so we can show the "creating report" state.
  reportPending = false;

  report: Report | null = null;
  reportOpen = { causes: true, soap: true, confidence: false };

  // Inline report-feedback form (1-5 stars + optional note). Anonymous, tied to
  // the session; submitted state lives in AiDoctorStateService.feedbackSubmitted.
  feedbackRating = 0;
  feedbackText = '';

  // Post-report amend: user opted to add/correct details in the same chat; the
  // composer re-opens and the backend regenerates the report when done.
  amending = false;

  // consent gate (before first AI reply)
  showConsent = false;
  consentChecked = false;
  // EVERY message typed while the consent card is up, in order — not just the
  // last one. The composer stays live behind the card, so a user who types a
  // symptom on the landing page and then adds "hello can you help" while
  // reading the consent text produces two user bubbles. When this was a single
  // slot the second silently overwrote the first, the backend only ever saw
  // the afterthought, and its opening question was "what is the main problem?"
  // — about the symptom the user had already given it. Both bubbles are on
  // screen, so both must reach the AI.
  private pendingTexts: string[] = [];

  // age/sex quick-input
  sex: 'female' | 'male' | '' = '';
  age: number | null = null;
  ageSexDone = false; // hide the panel only AFTER submit (not while typing)
  // Adults-only gate: when the structured age input is under 18 we block the
  // send and surface this message. (Free-text under-18 disclosure is a backend
  // concern — documented as accepted risk in COMPLIANCE_AUDIT.md.)
  ageError = '';

  // Consult subject: a logged-in user may consult for themselves (reuse their
  // saved profile age/gender) or for someone else (ask fresh, don't touch
  // their profile). null = not yet chosen.
  consultFor: 'self' | 'other' | null = null;
  editingDetails = false; // show the raw age/gender inputs
  profileAge: number | null = null; // derived from saved DOB
  profileGender = ''; // 'male' | 'female' | 'other' | ''

  // doctor discovery
  doctors: Doctor[] = [];
  // affiliate-first: partner-clinic doctors shown above the generic results,
  // plus an optional clinic-wide offer banner.
  affiliateDoctors: Doctor[] = [];
  affiliateOffer: PartnerOffer | null = null;
  doctorsLoading = false;
  askCity = false;
  city = '';
  locError = '';
  // Results live on their own screen (a full-height panel over the chat) so the
  // patient isn't scrolling the whole health summary to reach a phone number.
  showDoctors = false;
  // City/area type-ahead for the location prompt.
  citySuggestions: PlaceSuggestion[] = [];
  suggestLoading = false;
  // Set when the user picks a suggestion: carries the exact point, so discovery
  // never has to re-geocode the typed text.
  pickedPlace: PlaceSuggestion | null = null;
  private citySearch$ = new Subject<string>();
  private citySearchSub?: Subscription;
  private unregisterBackOverlay?: () => void;

  // The text of the turn that failed to send, kept so "Try again" can resend it
  // verbatim. Cleared on the next successful turn.
  lastFailedText: string | null = null;
  // Last place we searched (for the "not found here — try another area" offer).
  lastSearchPlace = '';
  // True once a doctor search has returned (gates the "Search another area" CTA).
  doctorsSearched = false;

  // auth gate + consult history
  showAuth = false;
  showHistory = false;
  pendingAction: 'pdf' | 'soap' | 'doctors' | 'home' | 'report' | null = null;

  private readonly toast = inject(ToastService);

  // "leaving the chat" confirmation (anonymous users with an active chat)
  showLeaveDialog = false;

  // side drawer (account menu)
  showDrawer = false;

  // -- Document mode --------------------------------------------------------
  // After a report is analysed in the chat, the next questions are usually about
  // THAT, not about symptoms. The backend cannot infer which: /message
  // short-circuits into the triage interview whenever one is underway, so
  // "what does ESR mean?" would be recorded as a symptom answer. The mode is
  // therefore explicit and visible - a chip above the composer the patient can
  // dismiss - rather than a classifier guessing between two conversations.
  documentContext: { id: string; fileName: string } | null = null;
  // Files waiting on the consent tick or a login before they can be sent.
  private pendingUpload: File[] = [];
  // Asked once per device, before the first upload ever leaves the phone.
  // The upload panel, opened from the opening-screen card or the drawer. It
  // sits IN the message stream rather than on its own screen, so choosing a
  // file never takes the patient out of the conversation.
  showUploadPanel = false;
  showDocConsent = false;
  docConsentChecked = false;
  uploadError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public api: AiDoctorApiService,
    public state: AiDoctorStateService,
    private geo: GeolocationService,
    private country: CountryService,
    private pdf: ReportPdfService,
    private analytics: FirebaseAnalyticsService,
    private reportApi: ReportAnalysisService,
    private backButton: BackButtonService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  /** The post-report follow ask is the only growth surface in the consult, so
   *  it is worth knowing whether anyone actually taps it. */
  trackInstagramFollow(): void {
    this.analytics.logAnalyticsEvent('instagram_follow_click', { source: 'report' });
  }

  get messages(): ChatMessage[] {
    return this.state.messages;
  }

  // Report is the funnel's end artifact: lock free-text chat once it's ready
  // (user can still find a doctor / start a new chat) — unless the user opted
  // to amend, which re-opens the composer until the updated report lands.
  get consultComplete(): boolean {
    // Document mode keeps the composer mounted: a patient who uploads a report
    // after finishing a consult still has to be able to ask about it. Guarded,
    // so a stale context cannot hold the composer open on a chat that has none.
    if (this.activeDocument) return false;
    return !!this.report && !this.emergency && !this.amending;
  }

  // Quick age/sex input is a shortcut for the FIRST triage question only.
  // Show it during that single turn — i.e. exactly one assistant message so far
  // (the age/sex ask) and the user hasn't replied yet. Counting turns (instead
  // of relying on pickAgeSex() to set a flag) keeps the panel from re-rendering
  // on every later question when the user answers age/sex as free text.
  get needAgeSex(): boolean {
    if (this.report || this.emergency || this.ageSexDone) return false;
    const assistantCount = this.messages.filter((m) => m.role === 'assistant').length;
    const last = this.messages[this.messages.length - 1];
    return assistantCount === 1 && last?.role === 'assistant';
  }

  /**
   * The report-reader door belongs to exactly one moment: AFTER the age/sex
   * question is answered and BEFORE a symptom is described.
   *
   * Before: the opening screen asks one thing, and a second door beside it
   * competes with the question the user was asked to answer.
   *
   * After: they are mid-consult and describing symptoms; a second door there is
   * an invitation to abandon what they started. The account drawer still has it.
   *
   * Both edges fall out of the message list, so there is no flag to keep in
   * sync. `ageSexDone` is the near edge (it is also set when a resumed session
   * comes back with an age, which is the same state). The far edge is "at most
   * ONE user message so far" — that one being the age/sex line `pickAgeSex()`
   * sends. A typed symptom makes two, and the door closes on the same tick the
   * message is appended, before any reply arrives.
   *
   * It also means someone who typed a symptom WITHOUT answering age/sex never
   * sees it: `ageSexDone` is false for them, which is the correct answer for
   * the right reason.
   */
  get showReportEntry(): boolean {
    if (this.emergency || this.report || this.showUploadPanel || this.showConsent) return false;
    if (!this.ageSexDone) return false;
    return this.messages.filter((m) => m.role === 'user').length <= 1;
  }

  // Ask "self or someone else?" for a logged-in user so a someone-else consult
  // never overwrites the account holder's profile.
  //
  // Gated on an actual account identity, not merely on a token being present.
  // A signed-out visitor has no profile to protect and no idea what the
  // question means; they get the plain age/sex inputs instead. (An expired
  // token used to satisfy this — see AiDoctorStateService.isLoggedIn, which now
  // clears a dead session rather than reporting it as an account.)
  get askConsultFor(): boolean {
    return this.state.isLoggedIn && !!this.state.userId;
  }

  // Do we have enough saved detail to SKIP the form and just ask them to
  // confirm it?
  //
  // Both, not either. An account with a gender but no date of birth used to
  // satisfy this, which rendered "yrs · Male" — a blank age offered up for
  // confirmation — and validateAge() lets a null age through, so pressing
  // "Yes, that's me" started the consult with no age at all. With only half the
  // picture the inputs are the right answer; they come prefilled with whatever
  // IS known, so nothing is retyped.
  get hasProfileDetails(): boolean {
    return this.profileAge != null && !!this.profileGender;
  }

  ngOnInit(): void {
    // Know the allowance BEFORE the first upload of the session, not after it.
    // Without this the chat only learns the number from an upload response,
    // which is one upload too late to decline anything.
    this.loadDocQuota();
    if (isPlatformBrowser(this.platformId)) {
      this.placeholderTimer = setInterval(() => {
        const i = this.PLACEHOLDERS.indexOf(this.composerPlaceholder);
        this.composerPlaceholder =
          this.PLACEHOLDERS[(i + 1) % this.PLACEHOLDERS.length];
      }, 4000);
    }

    if (isPlatformBrowser(this.platformId)) this.watchCityInput();

    // Android hardware back. Without this the press falls through to
    // history.back() and navigates out of the consult while a drawer or dialog
    // is still on screen — or exits the app outright. Inert in a browser.
    this.unregisterBackOverlay = this.backButton.registerOverlay(() =>
      this.closeTopOverlay()
    );

    // Resolve country context (IP-based, cached) -> swap in local emergency
    // numbers + country name. Server may still override per-message later.
    this.country.init().then(() => {
      this.emergencyNumbers = this.country.emergencyNumbers;
      this.countryName = this.country.countryName;
    });

    const seed = this.route.snapshot.queryParamMap.get('q');
    const wantsLogin = this.route.snapshot.queryParamMap.get('login') === '1';
    // "Explain my report or prescription" on the landing page. It used to be a
    // link to /triage/report-reader, a separate screen with its own upload box;
    // the same upload now lives inline in the chat (openDocPicker), and a
    // document answered there can be asked follow-up questions in the same
    // thread. So the landing door opens the consult with the picker already up.
    const wantsUpload = this.route.snapshot.queryParamMap.get('upload') === '1';
    if (this.state.isLoggedIn) this.loadProfileDetails();
    // Don't create a session up front — that would persist an empty conversation
    // on every load. A session is created lazily on the first user message.
    if (wantsLogin) {
      // Arriving through the account door, not continuing a chat -> never
      // resurrect the stored session here. A chat that was already running
      // when the user logs in keeps its session, because that login goes
      // through openAuth() inside the shell, not this entry point.
      this.startFreshChat();
      this.consumeEntryParams();
      this.openAccount();
    }
    this.rehydrate(() => {
      // A seed means the user typed a symptom into the landing box and pressed
      // Enter / Get started. That text MUST reach the AI.
      //
      // This branch used to drop it whenever a conversation already existed:
      // you typed "my knee hurts", landed on your previous chat about
      // something else, and what you typed was simply gone — no message, no
      // error. It read as "the Enter key does nothing", but the button did the
      // same thing, because both call start().
      //
      // A symptom typed on the landing page is a NEW concern, so it opens a new
      // consult. The old one is not lost: startFreshChat() stashes it as
      // `prevSessionId` (recoverable from the previous-chat banner) for an
      // anonymous user, and a logged-in user finds it under "My consults".
      //
      // consumeEntryParams() runs FIRST and strips `q` with replaceUrl, so a
      // later reload cannot replay the seed — which is what the old guard was
      // really protecting against.
      if (seed) {
        this.consumeEntryParams();
        if (this.state.messages.length > 0) this.startFreshChat();
        this.send(seed);
        return;
      }
      if (this.state.messages.length === 0) {
        this.state.addMessage({ role: 'assistant', text: this.WELCOME });
      }
      // After rehydrate, so the panel lands at the bottom of whatever
      // conversation was restored rather than above it.
      if (wantsUpload) {
        this.consumeEntryParams();
        this.openDocPicker();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.placeholderTimer) clearInterval(this.placeholderTimer);
    this.citySearchSub?.unsubscribe();
    this.unregisterBackOverlay?.();
  }

  /**
   * Close the top-most open overlay, if any. Returns true when the press was
   * consumed, which is what stops BackButtonService from navigating.
   *
   * Order mirrors stacking, not declaration order: the leave dialog and auth
   * gate render above the history panel, which renders above the drawer. The
   * consent card is deliberately absent — it is an inline step in the thread,
   * not an overlay, and dismissing it with `back` would skip a consent gate.
   */
  private closeTopOverlay(): boolean {
    if (this.showLeaveDialog) {
      this.showLeaveDialog = false;
      return true;
    }
    if (this.showAuth) {
      this.showAuth = false;
      return true;
    }
    if (this.showHistory) {
      this.showHistory = false;
      return true;
    }
    if (this.showDoctors) {
      this.closeDoctors();
      return true;
    }
    if (this.showDrawer) {
      this.showDrawer = false;
      return true;
    }
    return false;
  }

  // Drop the stored session so this visit opens a fresh chat. A logged-in
  // user finds the old one under "My consults"; an anonymous one gets it
  // back from the previous-chat banner.
  private startFreshChat(): void {
    if (!this.state.sessionId) return;
    if (this.state.isLoggedIn) this.state.reset();
    else this.state.stashSession();
  }

  // Strip the params we arrived with (`q`, `login`, `upload`), so a reload
  // does not replay the seed or re-open the picker.
  private consumeEntryParams(): void {
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  private ensureSession(done: () => void, fail: (err?: unknown) => void): void {
    if (this.state.sessionId) {
      done();
      return;
    }
    this.api.createSession().subscribe({
      next: (res) => {
        this.state.sessionId = res.sessionId;
        // A session is created lazily on the first message that clears consent,
        // and this method short-circuits once sessionId exists — so this is the
        // one-shot "first symptom actually reached the backend" moment.
        this.analytics.logAnalyticsEvent('first_message_sent', {});
        done();
      },
      error: (err: unknown) => {
        this.analytics.logAnalyticsEvent('session_create_failed', {});
        // Do NOT call done(). The old code did, which sent the message with a
        // null sessionId (`this.state.sessionId!` asserted a value that was not
        // there), guaranteeing a second failed round-trip and a second error.
        // One failure, one message.
        fail();
      },
    });
  }

  // Pull authoritative history from the server so reloads don't lose the chat.
  private rehydrate(done: () => void): void {
    const sid = this.state.sessionId;
    if (!sid) return done();
    this.api.getSession(sid).subscribe({
      next: (s) => {
        this.state.setMessages(
          (s.messages || []).map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            text: m.text,
            intent: m.intent,
            // An analysed report was stored with its id (sessionService's `meta`).
            // The card itself is refetched below — history only carries the
            // pointer, never a copy of the findings.
            ...(m.documentId ? { kind: 'document' as const, documentId: m.documentId } : {}),
          }))
        );
        this.restoreDocumentCards();
        if (s.report) {
          this.report = s.report;
          this.state.report = s.report;
        }
        // Resume an interrupted amend round (composer stays open).
        this.amending = s.triageState?.phase === 'amending';
        this.emergency = !!s.emergency;
        if (s.suggestedSpecialty) this.state.suggestedSpecialty = s.suggestedSpecialty;
        if (s.suggestedSpecialties?.length) {
          this.state.suggestedSpecialties = s.suggestedSpecialties;
        }
        if (s.hasLead) this.state.leadCaptured = true;
        if (s.age != null) {
          this.age = s.age;
          this.ageSexDone = true;
        }
        if (s.sex === 'male' || s.sex === 'female') this.sex = s.sex;
        // Only if the interview is still waiting on an answer — a trailing user
        // message means the reply is already in flight or was sent.
        const lastMsg = this.messages[this.messages.length - 1];
        this.answerOptions =
          !s.report && lastMsg?.role === 'assistant' ? s.lastOptions || [] : [];
        if (this.report) this.scrollReportToTop();
        else this.scrollSoon();
        done();
      },
      error: () => done(), // stale/missing session -> start fresh
    });
  }

  submitInput(): void {
    const text = this.input.trim();
    if (!text || this.loading || this.emergency) return;
    this.input = '';
    this.resetComposerHeight();
    this.send(text);
  }

  // Grow the textarea with content, up to the CSS max-height.
  autoGrow(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  // Enter sends; Shift+Enter inserts a newline.
  onEnter(e: Event): void {
    const ke = e as KeyboardEvent;
    if (ke.shiftKey) return;
    e.preventDefault();
    this.submitInput();
  }

  private resetComposerHeight(): void {
    const el = this.composer?.nativeElement;
    if (el) el.style.height = 'auto';
  }

  // Adults-only check for the structured age input. Returns false (and sets
  // ageError) when a valid age under 18 was entered; true otherwise.
  private validateAge(): boolean {
    if (this.age != null && this.age < 18) {
      this.ageError =
        "DoctoGuide is for adults (18+). For a child's or teen's health concern, a parent or guardian should consult a doctor directly.";
      return false;
    }
    this.ageError = '';
    return true;
  }

  pickAgeSex(): void {
    if (!this.sex && this.age == null) return;
    if (!this.validateAge()) return;
    const parts: string[] = [];
    if (this.age != null) parts.push(`I am ${this.age} years old`);
    if (this.sex) parts.push(`biological sex ${this.sex}`);
    this.ageSexDone = true;
    // Top of the funnel: the user has committed real input. Fires before the
    // consent gate, so consent_shown / consent_accepted can be measured against it.
    this.analytics.logAnalyticsEvent('triage_started', {
      for: this.consultFor === 'other' ? 'other' : 'self',
    });
    this.send(parts.join(', '));
  }

  // --- Consult subject (self vs other) ---
  // Self: prefill from the saved profile and let the user confirm. With nothing
  // saved yet, drop straight to the inputs (and persist on submit).
  chooseSelf(): void {
    this.ageError = '';
    this.consultFor = 'self';
    this.age = this.profileAge;
    this.sex =
      this.profileGender === 'male' || this.profileGender === 'female'
        ? this.profileGender
        : '';
    this.editingDetails = !this.hasProfileDetails;
  }

  // Someone else: ask fresh, never write back to the account holder's profile.
  chooseOther(): void {
    this.ageError = '';
    this.consultFor = 'other';
    this.editingDetails = true;
    this.age = null;
    this.sex = '';
  }

  // Saved details are wrong -> reveal the normal inputs (already prefilled).
  editSelf(): void {
    this.editingDetails = true;
  }

  // Saved details confirmed as-is -> send them straight through (no profile write).
  confirmSelf(): void {
    if (!this.validateAge()) return;
    this.pickAgeSex();
  }

  // Submit from the raw inputs. For a self-consult, persist any edits back to
  // the patient profile before sending the triage message.
  submitDetails(): void {
    if (!this.sex && this.age == null) return;
    // Validate before any profile write so an under-18 DOB is never persisted.
    if (!this.validateAge()) return;
    if (this.consultFor === 'self' && this.state.isLoggedIn) {
      this.saveProfileAgeSex();
    }
    this.pickAgeSex();
  }

  private loadProfileDetails(): void {
    const uid = this.state.userId;
    if (!uid) return;
    this.api.getUserDetails(uid, ['DOB', 'gender']).subscribe({
      next: (res) => {
        const d = res?.results?.[0] || {};
        this.profileAge = this.ageFromDob(d.DOB || d.dob);
        this.profileGender = (d.gender || '').toLowerCase();
      },
      error: () => {},
    });
  }

  // Persist edited self details. age -> approx DOB (Jan 1 of birth year; the
  // profile has no age field), sex -> gender. Fire-and-forget.
  private saveProfileAgeSex(): void {
    const uid = this.state.userId;
    if (!uid) return;
    const payload: any = { id: [uid], role: 'user' };
    if (this.sex) payload.gender = this.sex;
    if (this.age != null && this.age > 0) {
      payload.DOB = `${new Date().getFullYear() - this.age}-01-01`;
    }
    this.profileAge = this.age;
    if (this.sex) this.profileGender = this.sex;
    this.api.updateUserDetails(payload).subscribe({ next: () => {}, error: () => {} });
  }

  // Delegates to the pure helper so the maths is unit-tested in isolation.
  private ageFromDob(v: unknown): number | null {
    return ageFromDob(v);
  }

  // Adds the user bubble, then gates on consent before hitting the backend.
  // Session is created lazily inside dispatch() on the first real message.
  private send(text: string): void {
    this.answerOptions = [];
    this.state.addMessage({ role: 'user', text });
    this.scrollSoon();
    // Obvious junk gets a nudge, not a backend round-trip. Only blocks once the
    // junk streak hits the limit (a single odd message still goes through);
    // a real message resets the streak. Never runs once a report/emergency
    // exists. Semantic low-signal (jokes, deflections in Hinglish) is the
    // backend's job — see BACKEND_SPAM_GUARD.md.
    if (!this.report && !this.emergency && this.isLowSignal(text)) {
      if (++this.junkStreak >= this.JUNK_STREAK_LIMIT) {
        this.nudgeRealQuery();
        return;
      }
    } else {
      this.junkStreak = 0;
    }
    if (!this.state.consented) {
      this.pendingTexts.push(text);
      // Only the first queued message opens the card, so consent_shown still
      // counts gates shown rather than messages typed behind one.
      if (!this.showConsent) {
        this.showConsent = true;
        this.analytics.logAnalyticsEvent('consent_shown', {});
      }
      return;
    }
    this.dispatch(text);
  }

  // Tapping an answer chip sends it as the patient's reply, exactly as if they
  // had typed it — so slot extraction and the report see the same thing either
  // way.
  pickOption(option: string): void {
    if (this.loading || this.emergency) return;
    this.answerOptions = [];
    this.send(option);
  }

  // Spam guard. Logic lives in triage-view.util.ts so it can be unit-tested
  // against real Hinglish / Devanagari fixtures without booting the component —
  // a false positive here silently refuses to help someone with a real symptom.
  private isLowSignal(text: string): boolean {
    return isLowSignal(text, this.messages);
  }


  // Stop the junk loop and ask for a real concern (mirrors the app's bilingual
  // tone). Resets the streak so a genuine reply afterwards proceeds normally.
  private nudgeRealQuery(): void {
    this.junkStreak = 0;
    this.state.addMessage({
      role: 'assistant',
      text:
        "I want to help, but I need a real health concern to go on — a symptom, " +
        "pain, or worry. Tell me what's physically bothering you and I'll take it " +
        'from there. (Aap apni takleef Hindi/Hinglish me bhi bata sakte hain.)',
    });
    this.scrollSoon();
  }

  agreeConsent(): void {
    if (!this.consentChecked) return;
    this.state.consented = true;
    this.showConsent = false;
    // Consent is re-asked on every new chat (state.reset clears it), so this
    // counts consults started, not distinct users.
    this.analytics.logAnalyticsEvent('consent_accepted', {});
    // Queued messages go as ONE turn rather than several round-trips: the
    // backend runs one interview step per message, so dispatching them
    // separately would burn a follow-up question on the afterthought.
    const t = this.pendingTexts.join('\n').trim();
    this.pendingTexts = [];
    if (t) this.dispatch(t);
  }

  private dispatch(text: string): void {
    // Create the session on demand (first message) so empty visits aren't stored.
    this.ensureSession(
      () => this.dispatchToSession(text),
      (err) => this.failTurn(text, err)
    );
  }

  // Re-open the chat after the report so the user can add or correct details;
  // the backend re-runs the interview on the new info and regenerates the report.
  startAmend(): void {
    this.answerOptions = [];
    if (!this.report || this.emergency) return;
    this.amending = true;
    this.state.addMessage({
      role: 'assistant',
      text: "Sure — tell me what you'd like to add or correct, and I'll update your report.",
    });
    this.scrollSoon();
    setTimeout(() => this.composer?.nativeElement?.focus(), 100);
  }

  // Escape hatch from the emergency card: dismiss it and re-open the interview
  // so the user can keep answering and still get a report. The urgent-care
  // advice stays in the transcript; further emergency replies won't re-lock.
  continueWithReport(): void {
    if (!this.emergency) return;
    this.emergency = false;
    this.emergencyOverride = true;
    // Record the user's decision in the transcript so the chat reads naturally.
    this.state.addMessage({
      role: 'user',
      text: "I understand the risk — please continue and create my report.",
    });
    this.state.addMessage({
      role: 'assistant',
      text: "Understood — I'll prepare your report. If your symptoms get worse, please seek urgent care right away. First, a couple more quick questions so your report is accurate — what else can you tell me?",
    });
    this.scrollSoon();
    setTimeout(() => this.composer?.nativeElement?.focus(), 100);
  }

  private dispatchToSession(text: string): void {
    // In document mode the question goes to the document endpoint, never to
    // /message - that handler folds everything into the triage interview.
    //
    // Checked against the messages on screen, not just the flag: "New chat"
    // keeps this component alive, so a stale context once survived into a fresh
    // conversation and filed "I am 28 years old, biological sex male" into a
    // report from the previous chat, which answered it with uric acid. Every
    // reset path now clears it, and this makes forgetting one harmless — a
    // report the patient cannot see is never the thing they are asking about.
    if (this.documentContext && !this.hasDocumentOnScreen(this.documentContext.id)) {
      this.documentContext = null;
    }
    if (this.documentContext) return this.askAboutDocument(text);

    const sid = this.state.sessionId!;
    this.loading = true;
    this.api
      .sendMessage(sid, text, {
        amend: this.amending,
        overrideEmergency: this.emergencyOverride,
      })
      .subscribe({
      next: (res) => {
        this.loading = false;
        this.lastFailedText = null;
        this.handleResponse(res);
        // Report lands -> scroll to its top; any other reply -> follow to bottom.
        if (res.type === 'report' && res.report) this.scrollReportToTop();
        else this.scrollSoon();
      },
      error: (err: unknown) => {
        // This handler covers every turn, so scope the event to the turn that
        // was supposed to return the report.
        if (this.reportPending) {
          this.analytics.logAnalyticsEvent('report_failed', { reason: 'request_error' });
        }
        this.failTurn(text, err);
      },
    });
  }

  /**
   * One place where a failed turn is reported to the patient.
   *
   * Keeps the text so "Try again" can resend it: the message is already on
   * screen as their bubble, and making someone retype a symptom description
   * because our backend blinked is the wrong way to lose them.
   */
  private failTurn(text: string, err?: unknown): void {
    this.loading = false;
    this.lastFailedText = text;
    this.state.addMessage({ role: 'assistant', text: this.describeError(err) });
    this.scrollSoon();
  }

  /**
   * Turn a transport failure into something a patient can act on. "Something
   * went wrong" is the same sentence whether their train went through a tunnel
   * or our backend is on fire, and only one of those is worth retrying now.
   *
   * status 0 is what both an offline device and a refused connection produce.
   */
  private describeError(err: unknown): string {
    const status = (err as { status?: number } | undefined)?.status;
    const offline =
      typeof navigator !== 'undefined' && navigator.onLine === false;

    if (offline) {
      return "You appear to be offline. Your chat is saved — reconnect and tap Try again.";
    }
    if (status === 0 || status === undefined) {
      return "I couldn't reach the server. Check your connection and tap Try again.";
    }
    if (status === 429) {
      return 'Too many requests just now. Wait a few seconds and tap Try again.';
    }
    if (status >= 500) {
      return "Our service is having trouble at the moment. Nothing you did — tap Try again in a few seconds.";
    }
    return 'Sorry, something went wrong. Please tap Try again.';
  }

  /** Resend the turn that failed, without making the patient retype it. */
  retryLastMessage(): void {
    const text = this.lastFailedText;
    if (!text || this.loading) return;
    this.lastFailedText = null;
    this.dispatch(text);
  }

  private handleResponse(res: MessageResponse): void {
    const say = (t?: string) =>
      t && this.state.addMessage({ role: 'assistant', text: t, intent: res.intent });

    // The interview had run out of questions, so this response was expected to
    // carry the report. Captured before the cases below mutate reportPending, so
    // the non-report branches can tell "the report never arrived" from a normal
    // mid-interview turn. See the report_failed events below.
    const expectedReport = this.reportPending;

    // Stale chips must never outlive their question — the question case below
    // is the only thing that puts them back.
    this.answerOptions = [];

    switch (res.type) {
      case 'emergency':
        // Once the user has chosen to keep going, don't re-lock the composer or
        // repeat the urgent-care warning every turn. (The backend should honor
        // overrideEmergency and return questions/report instead of re-flagging.)
        if (this.emergencyOverride) break;
        this.emergency = true;
        say(res.message);
        break;
      case 'report':
        if (res.report) {
          this.report = res.report;
          this.state.report = res.report;
          this.state.suggestedSpecialty = res.report.suggestedSpecialty || null;
          this.state.suggestedSpecialties = res.report.suggestedSpecialties || [];
          // A new/updated report resets the user's pick back to the primary.
          this.state.selectedSpecialty = null;
          // The conversion. Must be read before the amend block below flips
          // this.amending. Latched in state because `report` is re-assigned on
          // every rehydrate (page refresh, opening a past consult) and again on
          // each amend — without the latch one consult would count several times.
          // Deliberately carries no clinical detail: no symptom, condition,
          // urgency or specialty is sent to Google.
          if (this.amending) {
            this.analytics.logAnalyticsEvent('report_amended', {});
          } else if (!this.state.reportTracked) {
            this.state.reportTracked = true;
            this.analytics.logAnalyticsEvent('report_generated', {
              method: 'triage_chat',
              questions_asked: this.messages.filter((m) => m.role === 'user').length,
            });
          }
        }
        if (this.amending) {
          this.amending = false;
          say("I've updated your report with the new details.");
        }
        this.progress = 100;
        this.stepsLeft = 0;
        this.reportPending = false;
        break;
      case 'question': {
        say(res.message || res.question);
        this.answerOptions = res.options || [];
        // The interview was finished but the backend asked another question
        // instead of returning the report. Sometimes legitimate, so it gets its
        // own reason code rather than being lumped in with a hard failure.
        if (expectedReport && !this.amending) {
          this.analytics.logAnalyticsEvent('report_failed', {
            reason: 'question_instead_of_report',
          });
        }
        // During an amend round the report already exists — keep the progress
        // bar at 100 instead of replaying interview progress.
        if (!this.amending) {
          if (res.progress != null) this.progress = res.progress;
          if (res.stepsLeft != null) this.stepsLeft = res.stepsLeft;
          // No questions left -> the next answer triggers report generation.
          this.reportPending = this.stepsLeft <= 0;
        }
        break;
      }
      case 'find_doctor':
        say(res.message);
        if (res.suggestedSpecialty) {
          this.state.suggestedSpecialty = res.suggestedSpecialty;
          // An explicit "find me a <specialty>" request drives the search even
          // when it differs from the report's suggested specialist.
          this.state.selectedSpecialty = res.suggestedSpecialty;
        }
        this.connectDoctor();
        break;
      case 'refusal':
      case 'medicine_info':
      case 'general_health':
      case 'out_of_scope':
      default:
        say(res.message);
        // A degraded model chain can answer HTTP 200 with a non-report type
        // after the interview is over. Nothing else in the client notices that
        // the report simply never arrived, so this is the only signal for it.
        if (expectedReport) {
          this.analytics.logAnalyticsEvent('report_failed', {
            reason: 'no_report_in_response',
            response_type: res.type,
          });
        }
        break;
    }
  }

  // ---- Report actions (auth-gated) ----
  downloadPdf(): void {
    if (!this.state.isLoggedIn) return this.openAuth('pdf');
    this.runPdf();
  }

  downloadSoapPdf(): void {
    if (!this.state.isLoggedIn) return this.openAuth('soap');
    this.runSoapPdf();
  }

  connectDoctor(): void {
    if (!this.state.isLoggedIn) return this.openAuth('doctors');
    // Already searched -> go straight back to the results screen; the patient
    // can change the area from there.
    if (this.hasDoctorResults) {
      this.showDoctors = true;
      return;
    }
    this.openLocationPrompt();
  }

  shareReport(): void {
    void shareText({
      title: 'My Health Summary',
      text: this.report?.summary || `Health summary from ${this.appName}`,
    }).then((result) => {
      if (result === 'copied') alert('Summary copied to your clipboard.');
      else if (result === 'unavailable') alert('Sharing is not supported on this device.');
    });
  }

  private openAuth(action: 'pdf' | 'soap' | 'doctors' | 'home' | 'report' | null): void {
    this.pendingAction = action;
    this.showAuth = true;
    // The auth gate opened. Denominator for sign_up — it covers both signup and
    // returning login, since the gate cannot know which the user will do, and
    // `trigger` records what they were reaching for when it blocked them.
    this.analytics.logAnalyticsEvent('signup_started', { trigger: action || 'direct' });
  }

  /**
   * The auth gate was DISMISSED. This used to be `showAuth = false` inline in
   * the template, which is why "upload a prescription" read as broken:
   *
   *   paperclip -> pick a file -> read and agree a medical-document consent
   *   -> "Just One Step, sign in" -> dismiss -> nothing.
   *
   * The consent card was gone, no message was added, no error was shown, and
   * `pendingUpload` was still holding the file where nobody could see it. The
   * user is back in the chat with no evidence anything happened, and the only
   * way forward is to find the file again — which is indistinguishable from a
   * feature that does not work.
   *
   * The file is KEPT (they chose it and consented; making them repeat both is
   * the other bad option) and the toast is what makes it visible, with the way
   * back in attached to it. Sticky, because a 4-second window is not an answer
   * to "where did my report go".
   */
  cancelAuth(): void {
    this.showAuth = false;
    const action = this.pendingAction;
    this.pendingAction = null;

    if (action === 'report' && this.pendingUpload.length) {
      this.toast.show('Your report is still attached — sign in and I will read it.', {
        duration: 0,
        action: { label: 'Sign in', run: () => this.openAuth('report') },
      });
    }
  }

  // ---- Leaving the chat (logo -> home) ----
  // An anonymous user with a live conversation gets a heads-up first: log in to
  // save it, or continue and recover it later from the "previous chat" banner.
  // Logged-in users' chats are already in "My consults", so they go straight home.
  goHome(): void {
    const hasConversation =
      !!this.state.sessionId && this.messages.some((m) => m.role === 'user');
    if (!this.state.isLoggedIn && hasConversation) {
      this.showLeaveDialog = true;
      return;
    }
    this.state.stashSession();
    this.router.navigate(['/']);
  }

  leaveAndLogin(): void {
    this.showLeaveDialog = false;
    this.openAuth('home');
  }

  leaveWithoutSaving(): void {
    this.showLeaveDialog = false;
    this.state.stashSession();
    this.router.navigate(['/']);
  }

  // ---- Previous (unsaved) chat banner ----
  get hasPrevChat(): boolean {
    return !!this.state.prevSessionId;
  }

  loadPreviousChat(): void {
    const prev = this.state.prevSessionId;
    if (!prev) return;
    this.state.prevSessionId = null;
    this.openPastSession(prev);
  }

  dismissPreviousChat(): void {
    this.state.prevSessionId = null;
  }

  // Header "My consults / Log in": logged-in -> history, else open auth (no action).
  openAccount(): void {
    if (this.state.isLoggedIn) this.showHistory = true;
    else this.openAuth(null);
  }

  // --- Side drawer (account menu) ---
  openDrawer(): void {
    this.showDrawer = true;
  }

  closeDrawer(): void {
    this.showDrawer = false;
  }

  openProfile(): void {
    this.showDrawer = false;
    this.router.navigate(['/triage/profile']);
  }

  openChangePin(): void {
    this.showDrawer = false;
    this.router.navigate(['/triage/change-pin']);
  }

  /**
   * Open the file picker without leaving the chat.
   *
   * Used by the opening-screen card and the account drawer. Both used to
   * navigate to /triage/report-reader; the explanation now arrives as the next
   * message instead, so there is no reason to take the patient off the
   * conversation to get it. The standalone page still exists for anyone who
   * opens it directly.
   */
  openDocPicker(): void {
    this.showDrawer = false;
    this.showUploadPanel = true;
    this.uploadError = '';
    this.scrollSoon();
  }

  closeUploadPanel(): void {
    this.showUploadPanel = false;
    this.uploadError = '';
  }

  // Paperclip in the composer. The upload happens HERE now - the patient stays
  // in the conversation and the explanation arrives as the next message, rather
  // than being thrown onto a separate screen mid-chat.
  async onComposerAttach(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const rawPicked = Array.from(input.files || []);
    input.value = ''; // re-picking the same file must still fire a change
    if (!rawPicked.length) return;

    // The same caps the server enforces, checked before anything leaves the phone.
    if (rawPicked.length > MAX_FILES) {
      this.uploadError = `Please choose up to ${MAX_FILES} files.`;
      return;
    }
    // Scale photos down first, so the size check below judges what we will
    // actually send rather than what came off the camera.
    const picked = await shrinkForUpload(rawPicked);
    const tooBig = picked.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      this.uploadError = `${tooBig.name} is larger than ${MAX_FILE_BYTES / (1024 * 1024)}MB.`;
      return;
    }
    const wrongType = picked.find((f) => f.type && !ACCEPTED_TYPES.includes(f.type));
    if (wrongType) {
      this.uploadError = `${wrongType.name} is not a PDF or a photo.`;
      return;
    }

    this.uploadError = '';
    this.showUploadPanel = false;
    this.pendingUpload = picked;
    this.analytics.logAnalyticsEvent('report_attach_from_chat', { files: picked.length });
    this.startUploadFlow();
  }

  /**
   * The daily document allowance, as the server last reported it.
   *
   * NOT the enforcement. The server decides, and the 429 branch in `runUpload`
   * is what actually stops an over-limit analysis. This is only so the app can
   * decline a request it already knows will be refused, instead of uploading a
   * medical document, spending the user's data and their wait, and then
   * telling them it was never going to work.
   */
  private get docQuota() {
    return this.state.documentQuota;
  }

  /** True only when the server has TOLD us the allowance is spent. */
  private get docLimitReached(): boolean {
    const q = this.docQuota;
    return !!q && q.remaining <= 0;
  }

  /** "Your 2 report explanations for today are used up. …" */
  private docLimitMessage(): string {
    const q = this.docQuota;
    const n = q?.limit ?? 2;
    const when = this.resetPhrase(q?.resetAt);
    return (
      `You've used all ${n} of your report explanations for today. ` +
      `You can upload another ${when}. ` +
      `In the meantime I can still talk through your symptoms — just tell me what's wrong.`
    );
  }

  /** "tomorrow" / "after midnight" — never a raw ISO timestamp. */
  private resetPhrase(iso?: string): string {
    if (!iso) return 'tomorrow';
    const at = new Date(iso);
    if (isNaN(at.getTime())) return 'tomorrow';
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return at.getTime() <= midnight.getTime() + 1000 ? 'tomorrow' : `after ${at.toLocaleDateString()}`;
  }

  /** Pull the allowance once per signed-in session so the check above can fire
   *  BEFORE the first upload rather than only after it. */
  private loadDocQuota(): void {
    if (!this.state.isLoggedIn) return;
    this.reportApi.getQuota().subscribe({
      next: (q) => (this.state.documentQuota = q),
      // A missing counter must never BLOCK an upload — the server is the gate,
      // and failing closed here would deny a patient their allowance because a
      // counter endpoint was down.
      error: () => {},
    });
  }

  /** Consent, then login, then allowance, then upload - each asked once. */
  private startUploadFlow(): void {
    if (!this.state.docConsent) {
      this.docConsentChecked = false;
      this.showDocConsent = true;
      this.scrollSoon();
      return;
    }
    if (!this.state.isLoggedIn) {
      this.analytics.logAnalyticsEvent('signup_started', { trigger: 'report' });
      this.openAuth('report');
      return;
    }
    // Checked after login, not before: a signed-out visitor has no allowance to
    // have spent, and the number is per account.
    if (this.docLimitReached) {
      this.pendingUpload = [];
      this.state.addMessage({ role: 'assistant', text: this.docLimitMessage() });
      this.analytics.logAnalyticsEvent('report_limit_reached', {
        tier: this.docQuota?.tier || 'free',
        surface: 'chat',
      });
      this.scrollSoon();
      return;
    }
    this.runUpload();
  }

  agreeDocConsent(): void {
    this.state.docConsent = true;
    this.showDocConsent = false;
    this.startUploadFlow();
  }

  cancelDocConsent(): void {
    this.showDocConsent = false;
    this.pendingUpload = [];
  }

  private runUpload(): void {
    const files = this.pendingUpload;
    if (!files.length) return;
    this.pendingUpload = [];

    const names = files.map((f) => f.name).join(', ');
    this.state.addMessage({ role: 'user', text: names, kind: 'text' });
    const placeholder: ChatMessage = {
      role: 'assistant',
      text: 'Reading your report...',
      pending: true,
    };
    this.state.addMessage(placeholder);
    this.loading = true;
    this.scrollSoon();

    this.reportApi.analyze(files, true, this.state.sessionId).subscribe({
      next: (res) => {
        this.loading = false;
        // Several documents get a line that says so. The first one's headline
        // standing over three cards claims to sum up all of them, and doesn't.
        const docs = documentsOf(res);
        this.replaceMessage(placeholder, {
          role: 'assistant',
          text:
            docs.length > 1
              ? `I've read all ${docs.length} documents — here is each one, explained.`
              : docs[0]?.headline || 'Here is your report, explained.',
          kind: 'document',
          documentId: res.id,
          analysis: res.analysis,
          analyses: documentsOf(res),
          documentUrgency: res.urgency,
          // So the card can offer its way back in if they switch to symptoms
          // and later want to ask about this report again.
          canAskAbout: true,
        });
        // Everything typed from here is about the report, until they dismiss it.
        this.documentContext = { id: res.id, fileName: names };
        if (res.usage) {
          // Shared, so /report-reader shows the same number without refetching.
          this.state.documentQuota = res.usage;
          const left = res.usage.remaining;
          this.state.addMessage({
            role: 'assistant',
            // Both doors, named. Otherwise the only stated option is asking
            // about the report, and a patient with symptoms to describe types
            // them into the document endpoint.
            text:
              left > 0
                ? `Ask me anything about this report — or say what's troubling you and we'll run the symptom check. You have ${left} more report ${left === 1 ? 'explanation' : 'explanations'} today.`
                : "Ask me anything about this report — or say what's troubling you and we'll run the symptom check. That was your last report explanation for today.",
          });
        }
        this.analytics.logAnalyticsEvent('report_analysed', {
          documentType: res.documentType,
          urgency: res.urgency,
          cached: !!res.cached,
          surface: 'chat',
        });
        // An explained report is a page to read, not a chat reply to catch up
        // with. Jumping to the bottom lands the user under the disclaimer with
        // the headline, the medicines and every value scrolled off above them —
        // so park at the top of the card and let them scroll down themselves.
        // The bottom-scroll stays for actual messages and replies.
        this.scrollDocumentToTop(res.id);
      },
      error: (err: unknown) => {
        this.loading = false;
        const e = err as { status?: number; error?: { message?: string } };
        // An expired session: keep the files so re-login resumes the upload
        // instead of making them find the document again.
        if (e.status === 401) {
          this.pendingUpload = files;
          this.state.logout();
          this.replaceMessage(placeholder, {
            role: 'assistant',
            text: 'Please sign in again and I will read that report for you.',
          });
          this.openAuth('report');
          return;
        }
        // Over the daily allowance. This used to fall through to the generic
        // branch below, which says "please try again in a moment" — an
        // invitation to retry something that cannot succeed until tomorrow, and
        // the reason the limit looked as though it was not being applied at
        // all. /report-reader has always handled this; the chat did not.
        if (e.status === 429) {
          const body = (e.error || {}) as {
            tier?: 'free' | 'premium';
            limit?: number;
            resetAt?: string;
          };
          this.state.documentQuota = {
            tier: body.tier || 'free',
            limit: body.limit ?? 2,
            used: body.limit ?? 2,
            remaining: 0,
            resetAt: body.resetAt || '',
          };
          this.replaceMessage(placeholder, {
            role: 'assistant',
            text: this.docLimitMessage(),
          });
          this.analytics.logAnalyticsEvent('report_limit_reached', {
            tier: this.docQuota?.tier || 'free',
            surface: 'chat',
          });
          this.scrollSoon();
          return;
        }
        this.replaceMessage(placeholder, {
          role: 'assistant',
          text:
            e.error?.message ||
            'I could not read that report just now. Please try again in a moment.',
        });
        this.scrollSoon();
      },
    });
  }

  /** Swap the in-flight placeholder for the real turn, in place. */
  private replaceMessage(placeholder: ChatMessage, next: ChatMessage): void {
    const i = this.messages.indexOf(placeholder);
    if (i === -1) this.state.addMessage(next);
    else this.messages[i] = next;
  }

  /**
   * Rebuild the analysis cards after a refresh.
   *
   * History comes back from the server as text plus a documentId; the findings
   * are fetched by id so the chat never has to store a copy of them. Silently
   * skipped when signed out or if a fetch fails — the turn then reads as the
   * plain headline it was stored as, which is still true, just less rich.
   */
  /**
   * The cards to draw for one document turn.
   *
   * Both places that build such a turn already fill `analyses`; this fills it in
   * for anything that predates them — a turn restored from an older session, or
   * a response from a server not yet serving `documents` — so the list is
   * resolved once per message rather than rebuilt on every change-detection
   * pass, which is what a bare expression in the template would do.
   */
  cardsFor(m: ChatMessage): ReportAnalysis[] {
    if (!m.analyses?.length) m.analyses = m.analysis ? [m.analysis] : [];
    return m.analyses;
  }

  private restoreDocumentCards(): void {
    if (!this.state.isLoggedIn) return;
    const resumeId = this.documentToResume();
    for (const m of this.messages) {
      if (m.kind !== 'document' || !m.documentId || m.analysis) continue;
      const target = m;
      const docId = m.documentId;
      this.reportApi.getDocument(docId).subscribe({
        next: (res) => {
          target.analysis = res.analysis;
          target.analyses = documentsOf(res);
          target.documentUrgency = res.urgency;
          target.canAskAbout = true;
          // Resume document mode only for a report the patient was still
          // sitting on — see documentToResume(). Set here rather than before
          // the fetch so a document the server can no longer serve never
          // becomes the target of the next thing they type.
          if (docId === resumeId) {
            this.documentContext = { id: docId, fileName: target.text || 'your report' };
          }
        },
        error: () => {
          // Leave it as text: better a plain headline than a broken card.
          target.kind = 'text';
        },
      });
    }
  }

  /**
   * The report a refreshed session should still be listening about, or null.
   *
   * Restoring a card is not the same act as uploading one, so this used to
   * resume nothing at all: a patient who refreshed a consult that once held a
   * report and then typed "I also have chest pain since morning" would have had
   * that answered as a question about a lab report.
   *
   * But refusing in every case was worse in the case that actually happens.
   * A patient reads their report, refreshes or comes back later, types "what
   * does a low uric acid mean?" — and because nothing was listening for the
   * report, it went to the symptom interview, which answered a question about a
   * blood test with "are you having any other symptoms?" and then "when did you
   * first notice this?". Nonsense, and the way out of it was a button they had
   * no reason to know they needed to press.
   *
   * So: resume only when the report is where the patient LEFT OFF — the last
   * document card, with nothing of their own said since. Anything they typed
   * after it means the conversation had already moved on, and the symptom
   * check keeps the composer. Either way "Ask about this report" and the
   * document-mode banner stay, so the choice is still theirs to change.
   */
  private documentToResume(): string | null {
    if (this.emergency) return null;
    const last = [...this.messages]
      .reverse()
      .find((m) => m.kind === 'document' && m.documentId);
    if (!last?.documentId) return null;

    const after = this.messages.slice(this.messages.indexOf(last) + 1);
    return after.some((m) => m.role === 'user') ? null : last.documentId;
  }

  /** Leave document mode and go back to talking about symptoms. */
  clearDocumentContext(): void {
    this.documentContext = null;
    setTimeout(() => this.composer?.nativeElement?.focus(), 60);
  }

  /** Is that report actually a card in the conversation on screen? */
  private hasDocumentOnScreen(documentId: string): boolean {
    return this.messages.some((m) => m.kind === 'document' && m.documentId === documentId);
  }

  /**
   * The report the composer is listening about, or null — what the UI should
   * draw, as opposed to what the field happens to hold.
   *
   * Read-only on purpose: a getter runs on every change-detection pass, so it
   * reports the truth rather than writing it. `dispatchToSession` does the
   * clearing, at the one moment it matters. Together they mean a banner can
   * never name a report the patient cannot see on screen.
   */
  get activeDocument(): { id: string; fileName: string } | null {
    const ctx = this.documentContext;
    return ctx && this.hasDocumentOnScreen(ctx.id) ? ctx : null;
  }

  /** Point follow-up questions at one specific restored report. */
  askAboutThisReport(m: ChatMessage): void {
    if (!m.documentId) return;
    this.documentContext = { id: m.documentId, fileName: m.text || 'your report' };
    setTimeout(() => this.composer?.nativeElement?.focus(), 60);
  }

  /** A question about the analysed report, answered from its stored findings. */
  private askAboutDocument(text: string): void {
    const docId = this.documentContext!.id;
    this.loading = true;
    this.reportApi.askAboutDocument(docId, text, this.state.sessionId).subscribe({
      next: (res) => {
        this.loading = false;
        this.lastFailedText = null;
        this.state.addMessage({
          role: 'assistant',
          text: res.answer,
          intent: 'document_followup',
        });
        this.scrollSoon();
      },
      error: (err: unknown) => this.failTurn(text, err),
    });
  }

  // Auth succeeded: link the AI session to the account (keeps server PDF gate
  // working + tags the session for history), then run the pending action.
  onAuthSuccess(ev: {
    name: string;
    mobile: string;
    userId: string;
    district?: string;
    city?: string;
    state?: string;
    lat?: number | null;
    lng?: number | null;
  }): void {
    this.showAuth = false;
    // The allowance is per account, and we may have just become a different
    // one — anything cached against the signed-out state is meaningless now.
    this.state.documentQuota = null;
    this.loadDocQuota();
    // Remember the district/location so the doctor search can reuse it.
    if (ev.lat != null && ev.lng != null) {
      this.state.location = {
        lat: ev.lat,
        lng: ev.lng,
        city: ev.city || null,
        district: ev.district || null,
        state: ev.state || null,
      };
    }
    if (ev.city || ev.district) this.city = ev.city || ev.district || '';
    const sid = this.state.sessionId;
    if (sid) {
      this.state.leadCaptured = true;
      this.api
        .captureLead(sid, ev.name, ev.mobile, ev.userId, {
          district: ev.district,
          city: ev.city,
          state: ev.state,
          lat: ev.lat,
          lng: ev.lng,
        })
        .subscribe({
          next: () => {},
          error: () => {},
        });
    }
    const action = this.pendingAction;
    this.pendingAction = null;
    if (action === 'pdf') this.runPdf();
    if (action === 'soap') this.runSoapPdf();
    if (action === 'doctors') this.openLocationPrompt();
    // They attached a report and were stopped for a login. captureLead above has
    // just linked this chat to the account, so the upload can go now — with the
    // files they already chose, not a second trip to the file picker.
    if (action === 'report') this.startUploadFlow();
    // Chat is now linked to the account (captureLead above) — safe to go home.
    if (action === 'home') this.router.navigate(['/']);
  }

  // --- Report feedback ---
  setFeedbackRating(n: number): void {
    this.feedbackRating = n;
  }

  // Fire-and-forget, like captureLead — never block the UI on the result.
  submitFeedback(): void {
    const sid = this.state.sessionId;
    if (!sid || this.feedbackRating < 1) return;
    this.api
      .submitFeedback(sid, this.feedbackRating, this.feedbackText, this.state.userId)
      .subscribe({ next: () => {}, error: () => {} });
    this.state.feedbackSubmitted = true;
  }

  // Log out -> clear auth + chat and return to landing.
  onLoggedOut(): void {
    this.showHistory = false;
    this.showDrawer = false;
    this.state.logout();
    this.state.reset();
    this.router.navigate(['/']);
  }

  // Open a past consultation and resume it (backend keeps triageState by sessionId).
  openPastSession(sessionId: string): void {
    this.showHistory = false;
    if (!sessionId || sessionId === this.state.sessionId) return;
    this.state.sessionId = sessionId;
    this.state.setMessages([]);
    this.report = null;
    this.state.report = null;
    this.amending = false;
    this.doctors = [];
    this.affiliateDoctors = [];
    this.affiliateOffer = null;
    this.askCity = false;
    this.showDoctors = false;
    this.citySuggestions = [];
    this.pickedPlace = null;
    this.emergency = false;
    this.ageSexDone = false;
    this.age = null;
    this.sex = '';
    this.ageError = '';
    this.consultFor = null;
    this.editingDetails = false;
    this.reportPending = false;
    this.junkStreak = 0;
    // Belongs to the consultation being left, not the one being opened.
    // rehydrate() decides for itself whether the incoming one resumes a report.
    this.documentContext = null;
    this.rehydrate(() => this.scrollSoon());
  }

  // PDFs are built on the client from the report object, so the download works
  // without depending on a server PDF endpoint.
  private runPdf(): void {
    if (!this.report) return;
    const sid = this.state.sessionId || 'summary';
    // downloadReport resolves after jsPDF is fetched, so a sync throw inside it
    // now arrives as a rejection — catch it there, not around the call.
    this.pdf
      .downloadReport(this.report, this.appName, `health-report-${sid}.pdf`)
      .catch(() => alert('Could not generate the report. Please try again.'));
  }

  private runSoapPdf(): void {
    if (!this.report) return;
    const sid = this.state.sessionId || 'summary';
    this.pdf
      .downloadSoap(this.report, this.appName, `soap-note-${sid}.pdf`)
      .catch(() => alert('Could not generate the SOAP note. Please try again.'));
  }

  // ---- Doctor location flow (honors typed locality; geo is optional) ----
  private openLocationPrompt(): void {
    this.locError = '';
    this.citySuggestions = [];
    // Prefill from the district/city captured at sign-in if we have it.
    if (!this.city) {
      this.city =
        this.state.location?.district || this.state.location?.city || '';
    }
    this.askCity = true;
  }

  // Debounced city/area suggestions. Failures are silent — the field still
  // works as a plain text input, which is the whole fallback we need.
  private watchCityInput(): void {
    this.citySearchSub = this.citySearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.trim().length < 3) {
            this.suggestLoading = false;
            return of({ places: [] as PlaceSuggestion[] });
          }
          this.suggestLoading = true;
          return this.api
            .searchPlaces(q.trim(), this.country.countryCode)
            .pipe(catchError(() => of({ places: [] as PlaceSuggestion[] })));
        })
      )
      .subscribe((res) => {
        this.suggestLoading = false;
        this.citySuggestions = res.places || [];
      });
  }

  onCityInput(value: string): void {
    this.city = value;
    // Typing invalidates an earlier pick — the text is the source of truth again.
    this.pickedPlace = null;
    this.locError = '';
    this.citySearch$.next(value);
  }

  // Picking a suggestion searches straight away: the patient already answered
  // the only question this modal asks.
  pickPlace(p: PlaceSuggestion): void {
    this.pickedPlace = p;
    this.city = p.city || p.label;
    this.citySuggestions = [];
    this.submitCity();
  }

  closeLocationPrompt(): void {
    this.askCity = false;
    this.citySuggestions = [];
    this.suggestLoading = false;
  }

  async useMyLocation(): Promise<void> {
    this.locError = '';
    this.doctorsLoading = true;
    const loc = await this.geo.getCurrentPosition();
    this.state.location = loc;
    if (loc.lat == null || loc.lng == null) {
      this.doctorsLoading = false;
      this.locError = "Couldn't get your location — type your city/area instead.";
      return;
    }
    this.closeLocationPrompt();
    this.lastSearchPlace = loc.city || loc.district || 'your area';
    this.openDoctorsScreen();
    this.fetchDoctors({ lat: loc.lat, lng: loc.lng });
  }

  // Re-run the same-specialty search in a different place when nothing matched
  // here. Reuses the existing location modal + submitCity/useMyLocation flow;
  // selectedSpecialty persists, so only the location changes.
  searchAnotherArea(): void {
    this.city = '';
    this.pickedPlace = null;
    this.locError = '';
    this.citySuggestions = [];
    this.askCity = true;
  }

  submitCity(): void {
    const c = this.city.trim();
    if (!c) return;
    this.closeLocationPrompt();
    this.doctorsLoading = true;
    this.lastSearchPlace = this.pickedPlace?.city || c;
    this.openDoctorsScreen();
    // A picked suggestion carries its own coordinates: the Google path still
    // searches by name, and the OSM path skips geocoding the string.
    const picked = this.pickedPlace;
    this.fetchDoctors(
      picked
        ? { city: picked.city || c, lat: picked.lat, lng: picked.lng }
        : { city: c }
    );
  }

  // ---- Doctor results screen ----
  private openDoctorsScreen(): void {
    this.showDoctors = true;
    this.doctors = [];
    this.affiliateDoctors = [];
    this.affiliateOffer = null;
    this.doctorsSearched = false;
  }

  closeDoctors(): void {
    this.showDoctors = false;
  }

  // True once a search has produced something worth reopening the screen for.
  get hasDoctorResults(): boolean {
    return this.doctors.length > 0 || this.affiliateDoctors.length > 0;
  }

  // "Jabalpur, Madhya Pradesh" -> "Jabalpur" for the header line, which has to
  // share one row with the result count on a 320px screen.
  get searchAreaShort(): string {
    return (this.lastSearchPlace || '').split(',')[0].trim();
  }

  get resultCount(): number {
    return this.doctors.length + this.affiliateDoctors.length;
  }

  private fetchDoctors(locPart: { lat?: number; lng?: number; city?: string }): void {
    const sid = this.state.sessionId || undefined;
    const specialty = this.selectedSpecialty || undefined;
    this.doctorsLoading = true;
    this.api.findDoctors({ sessionId: sid, specialty, ...locPart }).subscribe({
      next: (res) => {
        this.doctorsLoading = false;
        this.doctorsSearched = true;
        this.doctors = res.doctors || [];
        this.affiliateDoctors = res.affiliateDoctors || [];
        this.affiliateOffer = res.affiliateOffer || null;
        // No listing states the specialty (covers zero results and "results but
        // none match"). Say it the same way the results screen does, so the
        // chat and the panel don't contradict each other.
        const hasMatch = this.doctors.some((d) => d.matchesSpecialty);
        if (!hasMatch && this.affiliateDoctors.length === 0) {
          const spec = this.selectedSpecialty || 'a specialist';
          const place = this.lastSearchPlace || 'that area';
          const text = this.doctors.length
            ? `No listing in ${place} states ${spec} outright, so I've put the best-rated clinics nearby at the top. Check the specialty when you call, or tap "Search another area" to try somewhere else.`
            : res.error ||
              `I couldn't find any clinic in ${place}. Want me to look in another city or area? Tap "Search another area".`;
          this.state.addMessage({ role: 'assistant', text });
        }
        this.scrollSoon();
      },
      error: () => {
        this.doctorsLoading = false;
        this.doctorsSearched = true;
        this.locError = 'Search failed. Please try again.';
      },
    });
  }

  // Top pick = verified specialty match first, then highest rating, then most
  // reviews. Prefers a true specialist over a higher-rated other-specialty clinic.
  get recommendedDoctor(): Doctor | null {
    if (!this.doctors || !this.doctors.length) return null;
    return [...this.doctors].sort(
      (a, b) =>
        Number(b.matchesSpecialty) - Number(a.matchesSpecialty) ||
        (b.rating || 0) - (a.rating || 0) ||
        (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0)
    )[0];
  }

  // The one result we lift to the top of the screen. Most listings outside big
  // cities come from OpenStreetMap, which rarely states a specialty, so gating
  // this on a verified match left patients with no starting point at all.
  // Instead we always lead with the best pick and let the label carry the truth:
  // a verified match is "Top rated nearby"; anything else is "Best rated nearby"
  // with the unverified-specialty caution on the card.
  get topPick(): Doctor | null {
    return this.recommendedDoctor;
  }

  get topPickVerified(): boolean {
    return !!this.topPick?.matchesSpecialty;
  }

  // OpenStreetMap listings often carry no rating at all. Calling an unrated
  // clinic "best rated" would be a claim the data doesn't support.
  get topPickLabel(): string {
    if (this.topPickVerified) return 'Top rated nearby';
    return this.topPick?.rating ? 'Best rated nearby' : 'Nearest clinic';
  }

  // Any result actually matches the requested specialty?
  get hasSpecialtyMatch(): boolean {
    return (this.doctors || []).some((d) => d.matchesSpecialty);
  }

  // Why the recommended doctor is a good fit (template — no extra LLM cost).
  // Only claim a specialty match when the backend verified it; otherwise stay
  // honest (we can't confirm the specialty from the listing alone).
  recommendReason(d: Doctor): string {
    const spec = this.selectedSpecialty || 'your concern';
    // The caution for an unverified specialty is its own chip on the card, so
    // this line stays about why this result is the pick.
    const bits = d.matchesSpecialty
      ? [`Matches the suggested specialist for you (${spec})`]
      : d.rating
      ? ['Best-rated clinic in this area']
      : ['Closest clinic in this area — no ratings listed'];
    if (d.rating) {
      bits.push(
        `highest rated nearby — ${d.rating}★${d.userRatingsTotal ? ' (' + d.userRatingsTotal + ' reviews)' : ''}`
      );
    }
    if (d.openNow === true) bits.push('open now');
    return bits.join(' · ');
  }

  // Initials for the avatar fallback (no free doctor photos available).
  initials(name?: string): string {
    if (!name) return '?';
    return name
      .replace(/^(dr\.?|the)\s+/i, '')
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  }

  // Deterministic avatar colour from the name.
  avatarColor(name?: string): string {
    // On-brand spread: teal family plus two warm accents. The old set ran to
    // magenta and violet, which read as a different product next to the cards.
    const colors = ['#0D9488', '#0F766E', '#0E7490', '#0891B2', '#B45309', '#4D7C6F'];
    let h = 0;
    for (const c of name || '') h = (h * 31 + c.charCodeAt(0)) % colors.length;
    return colors[h];
  }

  // Unified specialist list: ranked array from the report, or a single entry
  // synthesized from the legacy string — one code path for old and new reports.
  get specialists(): SpecialtySuggestion[] {
    const list =
      this.report?.suggestedSpecialties || this.state.suggestedSpecialties;
    if (list?.length) return list;
    const single = this.report?.suggestedSpecialty || this.state.suggestedSpecialty;
    return single ? [{ specialty: single, primary: true }] : [];
  }

  get multiSpecialist(): boolean {
    return this.specialists.length > 1;
  }

  // The specialty every CTA / doctor search uses: the user's explicit pick (chip
  // tap or a typed "find me a <specialty>" request), else the primary suggested
  // specialist. An explicit pick is honored even when it's not in the report's
  // list — a new/updated report resets the pick to null (see report handler), so
  // a stale off-list selection can't leak across consults.
  get selectedSpecialty(): string | null {
    const sel = this.state.selectedSpecialty;
    if (sel) return sel;
    return this.specialists[0]?.specialty || null;
  }

  // The non-selected alternatives — surfaced as "Also recommended" links.
  get otherSpecialists(): SpecialtySuggestion[] {
    const sel = this.selectedSpecialty;
    return this.specialists.filter((s) => s.specialty !== sel);
  }

  selectSpecialist(specialty: string): void {
    if (specialty === this.selectedSpecialty) return;
    this.state.selectedSpecialty = specialty;
    // Results on screen belong to the previous specialty — refetch in place
    // with the location we already have, else clear so the next search is right.
    if (this.doctors.length || this.affiliateDoctors.length) {
      this.doctors = [];
      this.affiliateDoctors = [];
      this.affiliateOffer = null;
      const loc = this.state.location;
      if (loc?.lat != null && loc?.lng != null) {
        this.fetchDoctors({ lat: loc.lat, lng: loc.lng });
      } else if (this.city.trim()) {
        this.fetchDoctors({ city: this.city.trim() });
      }
    }
  }

  // The specialist recommended by the report, with the right article — used to
  // personalise the "connect with a doctor" surfaces ("an Orthopedist", "a
  // Neurologist"). Falls back to the generic wording when no report yet.
  // A few enum entries name a SERVICE, not a person, so the article reads wrong
  // ("an Emergency Medicine"). Those get a hand-written phrase instead.
  private readonly SPECIALIST_PHRASES: Record<string, string> = {
    'Emergency Medicine': 'emergency care',
  };

  get specialistLabel(): string {
    const s = this.selectedSpecialty;
    if (!s) return 'a licensed doctor';
    const phrase = this.SPECIALIST_PHRASES[s];
    if (phrase) return phrase; // already reads correctly without an article
    // "u" excluded: U-initial specialties (Urologist) start with a "yoo" sound.
    return `${/^[aeio]/i.test(s) ? 'an' : 'a'} ${s}`;
  }

  // The call to action must match the triage level, not the scariest diagnosis
  // in the differential: an undifferentiated acute case is "seek emergency care
  // now", not "connect with a Cardiologist".
  private readonly CTA_BY_URGENCY: Record<string, string> = {
    emergency: 'Seek emergency care now',
    urgent: 'Find urgent medical care',
    routine: 'Talk to a doctor',
    self_care: 'Monitor your symptoms',
  };

  // Headline wording is chosen by the triage level, never written freehand, so
  // "emergency" language can only appear when the engine actually said emergency.
  private readonly URGENCY_HEADLINES: Record<string, string> = {
    emergency: 'Emergency medical evaluation is recommended now',
    urgent: 'Urgent medical evaluation is recommended',
    routine: 'A routine consultation with a doctor is recommended',
  };

  get urgencyHeadline(): string {
    const level = this.report?.urgency?.level;
    return (level && this.URGENCY_HEADLINES[level]) || 'A doctor should review your symptoms';
  }

  get urgencyCta(): string {
    const level = this.report?.urgency?.level;
    return (level && this.CTA_BY_URGENCY[level]) || `Connect with ${this.specialistLabel}`;
  }

  // "AI confidence 65/100" reads as "65% chance this diagnosis is right", which
  // is not what it measures. It reflects how much was established in the chat.
  get completenessLabel(): string {
    const level = this.report?.confidence?.level;
    if (level === 'high') return 'Good';
    if (level === 'moderate') return 'Moderate';
    if (level === 'low') return 'Limited';
    return '';
  }

  // Split a SOAP field into readable bullet lines.
  toBullets(text?: string): string[] {
    if (!text) return [];
    return text
      .split(/(?:\.\s+|\n|;\s*|•\s*)/)
      .map((s) => s.trim().replace(/\.$/, ''))
      .filter((s) => s.length > 1);
  }

  restart(): void {
    this.answerOptions = [];
    this.state.reset();
    this.emergency = false;
    this.emergencyOverride = false;
    this.report = null;
    this.amending = false;
    this.feedbackRating = 0;
    this.feedbackText = '';
    this.doctors = [];
    this.affiliateDoctors = [];
    this.affiliateOffer = null;
    this.askCity = false;
    this.showDoctors = false;
    this.doctorsSearched = false;
    this.citySuggestions = [];
    this.pickedPlace = null;
    this.ageSexDone = false;
    this.age = null;
    this.sex = '';
    this.ageError = '';
    this.consultFor = null;
    this.editingDetails = false;
    this.showConsent = false;
    this.consentChecked = false;
    // Anything typed behind an un-agreed consent card belongs to the chat being
    // discarded, not the new one.
    this.pendingTexts = [];
    this.showAuth = false;
    this.showHistory = false;
    this.showDrawer = false;
    this.progress = 0;
    this.stepsLeft = 0;
    this.reportPending = false;
    this.junkStreak = 0;
    // The report being asked about belonged to the chat just discarded. "New
    // chat" keeps this component alive, so without this the composer opens the
    // fresh chat still saying "Asking about prescrip2.jpg" and quietly files
    // the first thing typed into a document that is no longer on screen.
    this.documentContext = null;
    // Fresh start in place (no new session yet — created on the first message).
    this.state.addMessage({ role: 'assistant', text: this.WELCOME });
    this.scrollSoon();
  }

  private scrollSoon(): void {
    setTimeout(
      () => this.scrollAnchor?.nativeElement?.scrollIntoView({ behavior: 'smooth' }),
      60
    );
  }

  /**
   * Park the freshly analysed document at the top of the viewport.
   *
   * Same reasoning as scrollReportToTop(), for the other long artefact in the
   * chat. Falls back to the bottom-scroll only if the card isn't in the DOM yet
   * — never leave the user staring at a stale position with new content below.
   */
  private scrollDocumentToTop(documentId: string): void {
    setTimeout(() => {
      const el = typeof document !== 'undefined' ? document.getElementById(`doc-${documentId}`) : null;
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else this.scrollSoon();
    }, 80);
  }

  // When the report lands we want the user to read it from the top — not get
  // dumped at the bottom of the page like a normal chat reply.
  private scrollReportToTop(): void {
    setTimeout(
      () =>
        this.reportTop?.nativeElement?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      80
    );
  }

  // True only while the final report is actually being generated — i.e. the
  // backend has signalled no questions remain (stepsLeft === 0) and we're
  // waiting on that in-flight request. Using stepsLeft (not a loose progress
  // threshold) stops the overlay flashing while the AI is still asking things.
  get generatingReport(): boolean {
    return (
      this.loading &&
      !this.report &&
      !this.emergency &&
      this.reportPending
    );
  }
}
