import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AiDoctorApiService } from '../../services/ai-doctor-api.service';
import { AiDoctorStateService } from '../../services/ai-doctor-state.service';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../design-system/icon/icon.component';
import { ButtonComponent } from '../../../../design-system/button/button.component';
import { InputComponent } from '../../../../design-system/input/input.component';
import { SelectComponent } from '../../../../design-system/select/select.component';
import { DateFieldComponent } from '../../../../design-system/date-field/date-field.component';
import { ReactiveFormsModule } from '@angular/forms';

// Full patient profile page (mirrors KnocDoc PatientFront's field set).
// Fetch: POST /doctors/doctorDetail ; Save: PUT /doctors/updateDetails.
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, IconComponent, ButtonComponent, InputComponent, SelectComponent, DateFieldComponent, ReactiveFormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  form: FormGroup;

  loading = true;
  saving = false;
  error = '';
  saved = false;

  /** Upper bound for the date-of-birth picker: nobody is born tomorrow. */
  readonly today = new Date().toISOString().slice(0, 10);

  bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((g) => ({
    label: g,
    value: g,
  }));
  genders = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  private readonly fields = [
    'first_name',
    'last_name',
    'DOB',
    'gender',
    'email',
    'medical_records',
    'mobile',
    'address',
    'city',
    'state',
    'country',
    'Zipcode',
  ];

  constructor(
    private fb: FormBuilder,
    private api: AiDoctorApiService,
    public state: AiDoctorStateService,
    private location: Location
  ) {
    this.form = this.fb.group({
      first_name: ['', Validators.required],
      last_name: [''],
      DOB: [null as Date | null],
      gender: [''],
      email: ['', Validators.email],
      medical_records: this.fb.group({ blood_group: [''] }),
      mobile: [{ value: '', disabled: true }],
      address: [''],
      city: [''],
      state: [''],
      country: [''],
      Zipcode: [''],
    });
  }

  ngOnInit(): void {
    const userId = this.state.userId || '';
    this.form.patchValue({ mobile: this.state.userMobile || '' });
    if (!userId) {
      this.loading = false;
      this.error = 'Please log in to view your profile.';
      return;
    }
    this.api.getUserDetails(userId, this.fields).subscribe({
      next: (res) => {
        this.loading = false;
        const d = res?.results?.[0];
        if (!d) return;
        this.form.patchValue({
          first_name: d.first_name || '',
          last_name: d.last_name || '',
          DOB: this.parseDate(d.DOB || d.dob),
          gender: (d.gender || '').toLowerCase(),
          email: d.email || '',
          medical_records: { blood_group: d.medical_records?.blood_group || '' },
          mobile: d.mobile || this.state.userMobile || '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          country: d.country || '',
          Zipcode: d.Zipcode || '',
        });
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.status === 401
            ? 'Your session expired. Please log in again.'
            : 'Could not load your profile. Please try again.';
      },
    });
  }

  // Return to wherever the user came from (the chat), preserving its state.
  goBack(): void {
    this.location.back();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Please fix the highlighted fields.';
      return;
    }
    const userId = this.state.userId || '';
    if (!userId) {
      this.error = 'Please log in to save your profile.';
      return;
    }
    const raw = this.form.getRawValue();
    const payload = {
      id: [userId],
      role: 'user',
      ...raw,
      DOB: this.formatDate(raw.DOB),
    };

    this.error = '';
    this.saving = true;
    this.api.updateUserDetails(payload).subscribe({
      next: () => {
        this.saving = false;
        this.saved = true;
        const name = `${raw.first_name || ''} ${raw.last_name || ''}`.trim();
        if (name) this.state.userName = name;
        setTimeout(() => (this.saved = false), 2500);
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Could not save your details. Please try again.';
      },
    });
  }

  private parseDate(v: any): Date | null {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  private formatDate(d: Date | null): string {
    if (!d || isNaN(new Date(d).getTime())) return '';
    const dt = new Date(d);
    const m = `${dt.getMonth() + 1}`.padStart(2, '0');
    const day = `${dt.getDate()}`.padStart(2, '0');
    return `${dt.getFullYear()}-${m}-${day}`;
  }
}
