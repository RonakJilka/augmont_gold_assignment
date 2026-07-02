import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models/user';
import { UserFormDialog } from './user-form.dialog';
import { openConfirm } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Users</h1>
        <p class="subtitle">Manage accounts with access to the workspace.</p>
      </div>
      <div class="page-actions">
        <button mat-flat-button color="primary" (click)="openDialog(null)">New user</button>
      </div>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    <table mat-table [dataSource]="items()" class="full-width">
      <ng-container matColumnDef="email">
        <th mat-header-cell *matHeaderCellDef>Email</th>
        <td mat-cell *matCellDef="let u" style="font-weight: 500;">{{ u.email }}</td>
      </ng-container>
      <ng-container matColumnDef="createdAt">
        <th mat-header-cell *matHeaderCellDef>Created</th>
        <td mat-cell *matCellDef="let u" class="muted">{{ u.createdAt | date:'MMM d, y' }}</td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef style="text-align: right;">Actions</th>
        <td mat-cell *matCellDef="let u" style="text-align: right;">
          <button mat-icon-button (click)="openDialog(u)" aria-label="Edit"><mat-icon>edit</mat-icon></button>
          <button mat-icon-button color="warn" (click)="remove(u)" aria-label="Delete"><mat-icon>delete</mat-icon></button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns"></tr>
    </table>

    @if (!loading() && items().length === 0) {
      <div class="empty">No users yet.</div>
    }
  `
})
export class UserListComponent implements OnInit {
  private readonly svc = inject(UserService);
  private readonly dialog = inject(MatDialog);

  readonly columns = ['email', 'createdAt', 'actions'];
  readonly items = signal<User[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void { this.reload(); }

  reload(): void {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: res => {
        const data = Array.isArray(res) ? res : res.data;
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openDialog(u: User | null): void {
    const ref = this.dialog.open(UserFormDialog, { data: u, width: '420px' });
    ref.afterClosed().subscribe((result: { email: string; password?: string } | undefined) => {
      if (!result) return;
      if (u) {
        this.svc.update(u.id, result).subscribe(() => this.reload());
      } else {
        if (!result.password) return;
        this.svc.create({ email: result.email, password: result.password }).subscribe(() => this.reload());
      }
    });
  }

  remove(u: User): void {
    openConfirm(this.dialog, { title: 'Delete user', message: `Delete "${u.email}"?`, confirmText: 'Delete' })
      .subscribe(ok => {
        if (!ok) return;
        this.svc.remove(u.id).subscribe(() => this.reload());
      });
  }
}
