import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { OwnerAuthService } from '../../services/owner-auth.service';
import { RouterLink } from '@angular/router';
import { RouterLinkActive } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { IconComponent } from '../../../../design-system/icon/icon.component';

@Component({
  selector: 'app-owner-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent],
  templateUrl: './owner-shell.component.html',
})
export class OwnerShellComponent {
  constructor(public auth: OwnerAuthService, private router: Router) {}

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/owner/login']);
  }
}
