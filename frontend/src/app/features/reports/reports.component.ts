import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ProductService, ReportParams } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { JobService } from '../../core/services/job.service';
import { Job } from '../../core/models/job';
import { Category } from '../../core/models/category';
import { downloadAuthenticated } from '../../core/utils/download';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatRadioModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressBarModule, MatChipsModule
  ],
  template: `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Reports</h1>
        <p class="subtitle">Generate product exports as CSV or XLSX.</p>
      </div>
    </div>

    <div class="two-col">
      <mat-card>
        <mat-card-header><mat-card-title>New report</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="mb-2">
              <mat-radio-group formControlName="format" class="segmented">
                <mat-radio-button value="xlsx">XLSX</mat-radio-button>
                <mat-radio-button value="csv">CSV</mat-radio-button>
              </mat-radio-group>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Search</mat-label>
              <input matInput formControlName="search" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Category</mat-label>
              <mat-select formControlName="categoryUniqueId">
                <mat-option [value]="''">All categories</mat-option>
                @for (c of categories(); track c.uniqueId) {
                  <mat-option [value]="c.uniqueId">{{ c.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Sort</mat-label>
              <mat-select formControlName="sort">
                <mat-option [value]="''">None</mat-option>
                <mat-option value="price:asc">Price ascending</mat-option>
                <mat-option value="price:desc">Price descending</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" [disabled]="submitting()">
              Generate report
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header><mat-card-title>Job status</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (job(); as j) {
            <div class="row mb-2">
              <span class="status-chip" [class]="'status-chip ' + j.status">{{ j.status }}</span>
            </div>
            <mat-progress-bar mode="determinate" [value]="j.progress ?? 0" />
            <p class="muted" style="font-size: 12px; margin-top: 12px;">
              Job ID: <span class="tabular">{{ j.id }}</span>
            </p>
            @if (j.status === 'failed' && j.error) {
              <p style="color: var(--danger);">{{ j.error }}</p>
            }
            @if (j.status === 'completed') {
              <button mat-flat-button color="primary" class="mt-2" (click)="download(j.id)">
                Download report
              </button>
            }
          } @else {
            <div class="empty" style="padding: 24px 0;">No jobs yet. Generate a report to see its status here.</div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class ReportsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly productSvc = inject(ProductService);
  private readonly categorySvc = inject(CategoryService);
  private readonly jobSvc = inject(JobService);
  private readonly snack = inject(MatSnackBar);

  readonly categories = signal<Category[]>([]);
  readonly job = signal<Job | null>(null);
  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    format: 'xlsx' as 'csv' | 'xlsx',
    search: '',
    categoryUniqueId: '',
    sort: '' as '' | 'price:asc' | 'price:desc'
  });

  private pollSub?: Subscription;

  ngOnInit(): void {
    this.categorySvc.list({ limit: 100 }).subscribe(res => this.categories.set(res.data));
  }

  ngOnDestroy(): void { this.pollSub?.unsubscribe(); }

  submit(): void {
    const v = this.form.getRawValue();
    const body: ReportParams = { format: v.format };
    if (v.search) body.search = v.search;
    if (v.categoryUniqueId) body.categoryUniqueId = v.categoryUniqueId;
    if (v.sort) body.sort = v.sort;

    this.submitting.set(true);
    this.job.set(null);
    this.productSvc.createReport(body).subscribe({
      next: res => {
        this.submitting.set(false);
        this.pollSub?.unsubscribe();
        this.pollSub = this.jobSvc.poll(res.jobId).subscribe(j => this.job.set(j));
      },
      error: () => this.submitting.set(false)
    });
  }

  async download(id: string): Promise<void> {
    const format = this.form.getRawValue().format;
    try {
      await downloadAuthenticated(this.jobSvc.downloadUrl(id), `report-${id}.${format}`);
    } catch {
      this.snack.open('Download failed', 'Dismiss', { duration: 3000 });
    }
  }

  chipColor(status: string): 'primary' | 'accent' | 'warn' {
    if (status === 'completed') return 'primary';
    if (status === 'failed') return 'warn';
    return 'accent';
  }
}
