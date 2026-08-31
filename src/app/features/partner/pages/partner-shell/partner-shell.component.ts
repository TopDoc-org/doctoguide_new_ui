import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PartnerAuthService } from '../../services/partner-auth.service';
import { RouterLink } from '@angular/router';
import { RouterLinkActive } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../../../design-system/icon/icon.component';

@Component({
  selector: 'app-partner-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, CommonModule, IconComponent],
  templateUrl: './partner-shell.component.html',
})
export class PartnerShellComponent {
  constructor(public auth: PartnerAuthService, private router: Router) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/partner/login']);
  }
}
