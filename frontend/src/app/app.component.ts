import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav class="app-nav">
      <a class="brand" routerLink="/">Assignment</a>
      @if (auth.isLoggedIn()) {
        <div class="nav-links">
          <a routerLink="/products" routerLinkActive="active">Products</a>
          <a routerLink="/categories" routerLinkActive="active">Categories</a>
          <a routerLink="/bulk-upload" routerLinkActive="active">Bulk Upload</a>
          <a routerLink="/reports" routerLinkActive="active">Reports</a>
          <a routerLink="/users" routerLinkActive="active">Users</a>
        </div>
      }
      <div class="nav-right">
        @if (auth.isLoggedIn()) {
          @if (auth.user()?.email; as email) {
            <span class="user-email">{{ email }}</span>
          }
          <button type="button" class="link-button" (click)="auth.logout()">Log out</button>
        } @else {
          <a routerLink="/login">Login</a>
          <a routerLink="/register">Register</a>
        }
      </div>
    </nav>
    <main class="container">
      <router-outlet />
    </main>
  `
})
export class AppComponent {
  readonly auth = inject(AuthService);
}
