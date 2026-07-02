import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { Product } from '../../core/models/product';
import { Category } from '../../core/models/category';
import { openConfirm } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatProgressBarModule
  ],
  template: `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Products</h1>
        <p class="subtitle">Browse, search and manage your product catalog.</p>
      </div>
      <div class="page-actions">
        <button mat-flat-button color="primary" routerLink="/products/new">New product</button>
      </div>
    </div>

    <div class="filter-bar">
      <mat-form-field appearance="outline" style="flex: 1 1 300px;">
        <mat-label>Search</mat-label>
        <input matInput [ngModel]="search()" (ngModelChange)="onSearch($event)" placeholder="Search by name" />
      </mat-form-field>
      <mat-form-field appearance="outline" style="flex: 0 0 240px;">
        <mat-label>Category</mat-label>
        <mat-select [ngModel]="categoryUniqueId()" (ngModelChange)="onCategory($event)">
          <mat-option [value]="''">All categories</mat-option>
          @for (c of categories(); track c.uniqueId) {
            <mat-option [value]="c.uniqueId">{{ c.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

    <table mat-table [dataSource]="items()" matSort [matSortActive]="'price'" matSortDisableClear
           (matSortChange)="onSort($event)" class="full-width">
      <ng-container matColumnDef="image">
        <th mat-header-cell *matHeaderCellDef>Image</th>
        <td mat-cell *matCellDef="let p">
          @if (p.imageUrl) { <img class="thumb" [src]="p.imageUrl" alt="" /> }
        </td>
      </ng-container>
      <ng-container matColumnDef="uniqueId">
        <th mat-header-cell *matHeaderCellDef>ID</th>
        <td mat-cell *matCellDef="let p" class="muted tabular">{{ p.uniqueId }}</td>
      </ng-container>
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let p" style="font-weight: 500;">{{ p.name }}</td>
      </ng-container>
      <ng-container matColumnDef="category">
        <th mat-header-cell *matHeaderCellDef>Category</th>
        <td mat-cell *matCellDef="let p" class="muted">{{ p.category?.name }}</td>
      </ng-container>
      <ng-container matColumnDef="price">
        <th mat-header-cell *matHeaderCellDef mat-sort-header class="price-cell">Price</th>
        <td mat-cell *matCellDef="let p" class="price-cell">{{ p.price | number:'1.2-2' }}</td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef style="text-align: right;">Actions</th>
        <td mat-cell *matCellDef="let p" style="text-align: right;">
          <button mat-icon-button [routerLink]="['/products', p.uniqueId, 'edit']" aria-label="Edit"><mat-icon>edit</mat-icon></button>
          <button mat-icon-button color="warn" (click)="remove(p)" aria-label="Delete"><mat-icon>delete</mat-icon></button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr mat-row *matRowDef="let row; columns: columns"></tr>
    </table>

    @if (!loading() && items().length === 0) {
      <div class="empty">No products match your filters.</div>
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
export class ProductListComponent implements OnInit, OnDestroy {
  private readonly productSvc = inject(ProductService);
  private readonly categorySvc = inject(CategoryService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly columns = ['image', 'uniqueId', 'name', 'category', 'price', 'actions'];

  readonly items = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly loading = signal(false);

  readonly page = signal(0);
  readonly limit = signal(20);
  readonly total = signal(0);
  readonly search = signal('');
  readonly categoryUniqueId = signal('');
  readonly sort = signal<'price:asc' | 'price:desc' | undefined>(undefined);

  private readonly search$ = new Subject<string>();
  private subs = new Subscription();

  ngOnInit(): void {
    this.subs.add(
      this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(v => {
        this.search.set(v);
        this.page.set(0);
        this.reload();
      })
    );
    this.categorySvc.list({ limit: 100 }).subscribe(res => this.categories.set(res.data));
    this.reload();
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  reload(): void {
    this.loading.set(true);
    this.productSvc.list({
      page: this.page() + 1,
      limit: this.limit(),
      sort: this.sort(),
      search: this.search() || undefined,
      categoryUniqueId: this.categoryUniqueId() || undefined
    }).subscribe({
      next: res => {
        this.items.set(res.data);
        this.total.set(res.pagination.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearch(v: string): void { this.search$.next(v); }
  onCategory(v: string): void { this.categoryUniqueId.set(v); this.page.set(0); this.reload(); }
  onPage(e: PageEvent): void { this.page.set(e.pageIndex); this.limit.set(e.pageSize); this.reload(); }
  onSort(s: Sort): void {
    this.sort.set(s.direction ? (`price:${s.direction}` as 'price:asc' | 'price:desc') : undefined);
    this.reload();
  }

  remove(p: Product): void {
    openConfirm(this.dialog, { title: 'Delete product', message: `Delete "${p.name}"?`, confirmText: 'Delete' })
      .subscribe(ok => {
        if (!ok) return;
        this.productSvc.remove(p.uniqueId).subscribe(() => this.reload());
      });
  }
}
