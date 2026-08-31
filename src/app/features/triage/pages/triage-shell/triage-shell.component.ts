import {
  Component,
  ElementRef,
  Inject,
  OnDestroy,
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
  ],
  templateUrl: './triage-shell.component.html',
  styleUrls: ['./triage-shell.component.scss'],
})
export class TriageShellComponent implements OnInit, OnDestroy {
  @ViewChild('scrollAnchor') scrollAnchor?: ElementRef<HTMLDivElement>;
  @ViewChild('composer') composer?: ElementRef<HTMLTextAreaElement>;
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
  private pendingText = '';

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
  // Last place we searched (for the "not found here — try another area" offer).
  lastSearchPlace = '';
  // True once a doctor search has returned (gates the "Search another area" CTA).
  doctorsSearched = false;

  // auth gate + consult history
  showAuth = false;
  showHistory = false;
  pendingAction: 'pdf' | 'soap' | 'doctors' | 'home' | null = null;

  // "leaving the chat" confirmation (anonymous users with an active chat)
  showLeaveDialog = false;

  // side drawer (account menu)
  showDrawer = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public api: AiDoctorApiService,
    public state: AiDoctorStateService,
    private geo: GeolocationService,
    private country: CountryService,
    private pdf: ReportPdfService,
    private analytics: FirebaseAnalyticsService,
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

  // Ask "self or someone else?" for any logged-in user so a someone-else
  // consult never overwrites the account holder's profile.
  get askConsultFor(): boolean {
    return this.state.isLoggedIn;
  }

  // Do we have saved details to prefill/confirm for a self-consult?
  get hasProfileDetails(): boolean {
    return this.profileAge != null || !!this.profileGender;
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.placeholderTimer = setInterval(() => {
        const i = this.PLACEHOLDERS.indexOf(this.composerPlaceholder);
        this.composerPlaceholder =
          this.PLACEHOLDERS[(i + 1) % this.PLACEHOLDERS.length];
      }, 4000);
    }

    if (isPlatformBrowser(this.platformId)) this.watchCityInput();

    // Resolve country context (IP-based, cached) -> swap in local emergency
    // numbers + country name. Server may still override per-message later.
    this.country.init().then(() => {
      this.emergencyNumbers = this.country.emergencyNumbers;
      this.countryName = this.country.countryName;
    });

    const seed = this.route.snapshot.queryParamMap.get('q');
    const wantsLogin = this.route.snapshot.queryParamMap.get('login') === '1';
    if (this.state.isLoggedIn) this.loadProfileDetails();
    // Don't create a session up front — that would persist an empty conversation
    // on every load. A session is created lazily on the first user message.
    if (wantsLogin) {
      // Arriving through the account door, not continuing a chat -> never
      // resurrect the stored session here. A chat that was already running
      // when the user logs in keeps its session, because that login goes
      // through openAuth() inside the shell, not this entry point.
      this.startFreshChat();
      this.consumeSeedParam();
      this.openAccount();
    }
    this.rehydrate(() => {
      if (this.state.messages.length === 0) {
        if (seed) {
          this.consumeSeedParam();
          this.send(seed);
        } else {
          this.state.addMessage({ role: 'assistant', text: this.WELCOME });
        }
      } else if (seed) {
        // history already exists -> don't replay seed; just clean the URL
        this.consumeSeedParam();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.placeholderTimer) clearInterval(this.placeholderTimer);
    this.citySearchSub?.unsubscribe();
  }

  // Drop the stored session so this visit opens a fresh chat. A logged-in
  // user finds the old one under "My consults"; an anonymous one gets it
  // back from the previous-chat banner.
  private startFreshChat(): void {
    if (!this.state.sessionId) return;
    if (this.state.isLoggedIn) this.state.reset();
    else this.state.stashSession();
  }

  private consumeSeedParam(): void {
    this.router.navigate([], { queryParams: {}, replaceUrl: true });
  }

  private ensureSession(done: () => void): void {
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
      error: () => {
        this.analytics.logAnalyticsEvent('session_create_failed', {});
        done();
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
          }))
        );
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
      this.pendingText = text;
      this.showConsent = true;
      this.analytics.logAnalyticsEvent('consent_shown', {});
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
    const t = this.pendingText;
    this.pendingText = '';
    if (t) this.dispatch(t);
  }

  private dispatch(text: string): void {
    // Create the session on demand (first message) so empty visits aren't stored.
    this.ensureSession(() => this.dispatchToSession(text));
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
        this.handleResponse(res);
        // Report lands -> scroll to its top; any other reply -> follow to bottom.
        if (res.type === 'report' && res.report) this.scrollReportToTop();
        else this.scrollSoon();
      },
      error: () => {
        this.loading = false;
        // This handler covers every turn, so scope the event to the turn that
        // was supposed to return the report.
        if (this.reportPending) {
          this.analytics.logAnalyticsEvent('report_failed', { reason: 'request_error' });
        }
        this.state.addMessage({
          role: 'assistant',
          text: 'Sorry, something went wrong. Please try again.',
        });
      },
    });
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
    const nav: any = navigator;
    if (nav.share) {
      nav
        .share({
          title: 'My Health Summary',
          text: this.report?.summary || `Health summary from ${this.appName}`,
        })
        .catch(() => {});
    } else {
      alert('Sharing is not supported on this device.');
    }
  }

  private openAuth(action: 'pdf' | 'soap' | 'doctors' | 'home' | null): void {
    this.pendingAction = action;
    this.showAuth = true;
    // The auth gate opened. Denominator for sign_up — it covers both signup and
    // returning login, since the gate cannot know which the user will do, and
    // `trigger` records what they were reaching for when it blocked them.
    this.analytics.logAnalyticsEvent('signup_started', { trigger: action || 'direct' });
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
    this.rehydrate(() => this.scrollSoon());
  }

  // PDFs are built on the client from the report object, so the download works
  // without depending on a server PDF endpoint.
  private runPdf(): void {
    if (!this.report) return;
    const sid = this.state.sessionId || 'summary';
    try {
      this.pdf.downloadReport(this.report, this.appName, `health-report-${sid}.pdf`);
    } catch {
      alert('Could not generate the report. Please try again.');
    }
  }

  private runSoapPdf(): void {
    if (!this.report) return;
    const sid = this.state.sessionId || 'summary';
    try {
      this.pdf.downloadSoap(this.report, this.appName, `soap-note-${sid}.pdf`);
    } catch {
      alert('Could not generate the SOAP note. Please try again.');
    }
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
    this.showAuth = false;
    this.showHistory = false;
    this.showDrawer = false;
    this.progress = 0;
    this.stepsLeft = 0;
    this.reportPending = false;
    this.junkStreak = 0;
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
