import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models/category';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatProgressBarModule
  ],
  template: `
    <div class="page-header">
      <div class="page-title-group">
        <h1>{{ uniqueId() ? 'Edit product' : 'New product' }}</h1>
        <p class="subtitle">{{ uniqueId() ? 'Update product details.' : 'Add a new product to the catalog.' }}</p>
      </div>
    </div>

    <mat-card class="form-card">
      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Name</mat-label>
            <input matInput formControlName="name" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Price</mat-label>
            <input matInput type="number" step="0.01" formControlName="price" class="tabular" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Category</mat-label>
            <mat-select formControlName="categoryUniqueId">
              @for (c of categories(); track c.uniqueId) {
                <mat-option [value]="c.uniqueId">{{ c.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="row mb-2">
            <button mat-stroked-button type="button" (click)="fileInput.click()">Choose image</button>
            <input hidden #fileInput type="file" accept="image/*" (change)="onFile($event)" />
            @if (imageFile()) { <span class="muted">{{ imageFile()!.name }}</span> }
          </div>
          @if (previewUrl()) {
            <img [src]="previewUrl()" alt="preview"
                 style="max-width: 240px; display: block; border-radius: 8px; border: 1px solid var(--separator);"
                 class="mb-2" />
          }

          <div class="row" style="justify-content: flex-end; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--separator);">
            <a mat-button routerLink="/products">Cancel</a>
            <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || loading()">Save</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `
})
export class ProductFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productSvc = inject(ProductService);
  private readonly categorySvc = inject(CategoryService);

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(false);
  readonly imageFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly uniqueId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    categoryUniqueId: ['', Validators.required]
  });

  ngOnInit(): void {
    this.categorySvc.list({ limit: 100 }).subscribe(res => this.categories.set(res.data));

    const id = this.route.snapshot.paramMap.get('uniqueId');
    if (id) {
      this.uniqueId.set(id);
      this.loading.set(true);
      this.productSvc.get(id).subscribe({
        next: p => {
          this.form.patchValue({
            name: p.name,
            price: p.price,
            categoryUniqueId: p.category.uniqueId
          });
          if (p.imageUrl) this.previewUrl.set(p.imageUrl);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  onFile(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.imageFile.set(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this.previewUrl.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    const fd = new FormData();
    fd.append('name', v.name);
    fd.append('price', String(v.price));
    fd.append('categoryUniqueId', v.categoryUniqueId);
    const file = this.imageFile();
    if (file) fd.append('image', file);

    this.loading.set(true);
    const id = this.uniqueId();
    const req$ = id ? this.productSvc.update(id, fd) : this.productSvc.create(fd);
    req$.subscribe({
      next: () => { this.loading.set(false); this.router.navigateByUrl('/products'); },
      error: () => this.loading.set(false)
    });
  }
}
