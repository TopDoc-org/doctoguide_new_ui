import { Component, OnInit } from '@angular/core';
import { PartnerApiService } from '../../services/partner-api.service';
import { PartnerOfferRecord } from '../../models';
import { OFFER_TEMPLATES } from '../../data/offer-templates';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../design-system/icon/icon.component';

@Component({
  selector: 'app-partner-offers',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './partner-offers.component.html',
})
export class PartnerOffersComponent implements OnInit {
  offers: PartnerOfferRecord[] = [];
  loading = false;
  saving = false;
  error = '';

  // Edit/create form. `editing` null = creating a new offer.
  showForm = false;
  editing: PartnerOfferRecord | null = null;
  form: PartnerOfferRecord = this.blank();

  // Ready-made offers a clinic can start from. Picking one prefills the form so
  // the clinic can tweak the wording/specialty before saving.
  readonly templates = OFFER_TEMPLATES;

  constructor(private api: PartnerApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.listOffers().subscribe({
      next: (res) => {
        this.loading = false;
        this.offers = res.offers || [];
      },
      error: () => {
        this.loading = false;
        this.error = 'Could not load offers.';
      },
    });
  }

  newOffer(): void {
    this.editing = null;
    this.form = this.blank();
    this.showForm = true;
  }

  edit(o: PartnerOfferRecord): void {
    this.editing = o;
    this.form = { ...o };
    this.showForm = true;
  }

  // Start a new offer prefilled from a template (clinic edits, then saves).
  useTemplate(t: PartnerOfferRecord): void {
    this.editing = null;
    this.form = { ...t };
    this.showForm = true;
  }

  cancel(): void {
    this.showForm = false;
    this.editing = null;
  }

  save(): void {
    if (!this.form.title.trim()) {
      this.error = 'Give the offer a title.';
      return;
    }
    this.saving = true;
    this.error = '';
    const req = this.editing
      ? this.api.updateOffer(this.form)
      : this.api.createOffer(this.form);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.editing = null;
        this.load();
      },
      error: () => {
        this.saving = false;
        this.error = 'Could not save the offer. Try again.';
      },
    });
  }

  private blank(): PartnerOfferRecord {
    return { title: '', description: '', discountText: '', specialty: '', campaigns: [], active: true };
  }
}
