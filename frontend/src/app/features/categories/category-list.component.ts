import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models/category';
import { CategoryFormDialog } from './category-form.dialog';
import { openConfirm } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressBarModule
  ],
  template: `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Categories</h1>
        <p class="subtitle">Organize products into browsable categories.</p>
      </div>
      <div class="page-actions">
        <button mat-flat-button color="primary" (click)="openDialog(null)">New category</button>
      </div>
    </div>

    <div class="filter-bar">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Search</mat-label>
        <input matInput [ngModel]="search()" (ngModelChange)="onSearch($event)" placeholder="Search by name" />
      </mat-form-field>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    <table mat-table [dataSource]="items()" class="full-width">
      <ng-container matColumnDef="uniqueId">
        <th mat-header-cell *matHeaderCellDef>ID</th>
        <td mat-cell *matCellDef="let c" class="muted tabular">{{ c.uniqueId }}</td>
      </ng-container>
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let c" style="font-weight: 500;">{{ c.name }}</td>
      </ng-container>
      <ng-container matColumnDef="createdAt">
        <th mat-header-cell *matHeaderCellDef>Created</th>
        <td mat-cell *matCellDef="let c" class="muted">{{ c.createdAt | date:'MMM d, y' }}</td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef style="text-align: right;">Actions</th>
        <td mat-cell *matCellDef="let c" style="text-align: right;">
          <button mat-icon-button (click)="openDialog(c)" aria-label="Edit"><mat-icon>edit</mat-icon></button>
          <button mat-icon-button color="warn" (click)="remove(c)" aria-label="Delete"><mat-icon>delete</mat-icon></button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns"></tr>
    </table>

    @if (!loading() && items().length === 0) {
      <div class="empty">No categories yet. Create your first one.</div>
    }

    <mat-paginator
      [length]="total()"
      [pageSize]="limit()"
      [pageIndex]="page()"
      [pageSizeOptions]="[10, 20, 50, 100]"
      (page)="onPage($event)">
    </mat-paginator>
  `
})
export class CategoryListComponent implements OnInit, OnDestroy {
  private readonly svc = inject(CategoryService);
  private readonly dialog = inject(MatDialog);

  readonly columns = ['uniqueId', 'name', 'createdAt', 'actions'];

  readonly items = signal<Category[]>([]);
  readonly loading = signal(false);
  readonly page = signal(0);
  readonly limit = signal(20);
  readonly total = signal(0);
  readonly search = signal('');

  private readonly search$ = new Subject<string>();
  private subs = new Subscription();

  ngOnInit(): void {
    this.subs.add(this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(v => {
      this.search.set(v); this.page.set(0); this.reload();
    }));
    this.reload();
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  reload(): void {
    this.loading.set(true);
    this.svc.list({
      page: this.page() + 1,
      limit: this.limit(),
      search: this.search() || undefined
    }).subscribe({
      next: res => { this.items.set(res.data); this.total.set(res.pagination.total); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  onSearch(v: string): void { this.search$.next(v); }
  onPage(e: PageEvent): void { this.page.set(e.pageIndex); this.limit.set(e.pageSize); this.reload(); }

  openDialog(c: Category | null): void {
    const ref = this.dialog.open(CategoryFormDialog, { data: c, width: '400px' });
    ref.afterClosed().subscribe((result: { name: string } | undefined) => {
      if (!result) return;
      const req$ = c ? this.svc.update(c.uniqueId, result) : this.svc.create(result);
      req$.subscribe(() => this.reload());
    });
  }

  remove(c: Category): void {
    openConfirm(this.dialog, { title: 'Delete category', message: `Delete "${c.name}"?`, confirmText: 'Delete' })
      .subscribe(ok => {
        if (!ok) return;
        this.svc.remove(c.uniqueId).subscribe(() => this.reload());
      });
  }
}
