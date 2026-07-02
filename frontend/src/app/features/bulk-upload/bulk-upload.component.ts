import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { ProductService } from '../../core/services/product.service';
import { JobService } from '../../core/services/job.service';
import { Job } from '../../core/models/job';

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatChipsModule],
  template: `
    <div class="page-header">
      <div class="page-title-group">
        <h1>Bulk upload</h1>
        <p class="subtitle">Import products in bulk from a CSV or XLSX file.</p>
      </div>
    </div>

    <mat-card class="mb-2">
      <mat-card-content>
        <div class="dropzone"
             [class.dragover]="dragover()"
             (click)="fileInput.click()"
             (dragover)="onDragOver($event)"
             (dragleave)="onDragLeave($event)"
             (drop)="onDrop($event)">
          <div class="dz-title">Drop your file here, or click to browse</div>
          <div class="dz-sub">Supports .csv and .xlsx up to a few thousand rows</div>
          @if (file(); as f) {
            <div class="dz-file">{{ f.name }}</div>
          }
          <input hidden #fileInput type="file" accept=".csv,.xlsx" (change)="onFile($event)" />
        </div>

        <div class="row" style="justify-content: flex-end; margin-top: 20px;">
          <button mat-flat-button color="primary" [disabled]="!file() || uploading()" (click)="upload()">
            Upload
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    @if (job(); as j) {
      <mat-card class="mb-2">
        <mat-card-header>
          <mat-card-title>Job status</mat-card-title>
          <mat-card-subtitle>
            <span class="status-chip" [class]="'status-chip ' + j.status">{{ j.status }}</span>
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <mat-progress-bar mode="determinate" [value]="j.progress ?? 0" />
          <p class="mt-2 muted tabular" style="font-size: 13px;">
            Total {{ j.totalRows ?? 0 }} &middot; Success {{ j.successRows ?? 0 }} &middot; Failed {{ j.failedRows ?? 0 }}
          </p>
          <p class="muted" style="font-size: 12px;">Job ID: <span class="tabular">{{ j.id }}</span></p>
          @if (j.status === 'failed' && j.error) {
            <p style="color: var(--danger);">{{ j.error }}</p>
          }
          @if (j.status === 'completed') {
            <p style="color: var(--text-primary); font-weight: 500;">Upload complete.</p>
            @if ((j.failedRows ?? 0) > 0) {
              <a mat-flat-button color="warn" [href]="errorsUrl(j.id)" target="_blank" download>
                Download error CSV
              </a>
            }
          }
        </mat-card-content>
      </mat-card>
    }

    <mat-card>
      <mat-card-content>
        <p class="muted" style="margin: 0; font-size: 13px;">
          Uploads run asynchronously. The API returns immediately with a job ID and the UI polls for
          progress, avoiding gateway timeouts on large files.
        </p>
      </mat-card-content>
    </mat-card>
  `
})
export class BulkUploadComponent implements OnDestroy {
  private readonly productSvc = inject(ProductService);
  private readonly jobSvc = inject(JobService);

  readonly file = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly job = signal<Job | null>(null);
  readonly dragover = signal(false);

  onDragOver(e: DragEvent): void { e.preventDefault(); this.dragover.set(true); }
  onDragLeave(e: DragEvent): void { e.preventDefault(); this.dragover.set(false); }
  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragover.set(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) this.file.set(f);
  }

  private pollSub?: Subscription;

  ngOnDestroy(): void { this.pollSub?.unsubscribe(); }

  onFile(evt: Event): void {
    const input = evt.target as HTMLInputElement;
    this.file.set(input.files?.[0] ?? null);
  }

  upload(): void {
    const f = this.file();
    if (!f) return;
    this.uploading.set(true);
    this.job.set(null);
    this.productSvc.bulkUpload(f).subscribe({
      next: res => {
        this.uploading.set(false);
        this.pollSub?.unsubscribe();
        this.pollSub = this.jobSvc.poll(res.jobId).subscribe(j => this.job.set(j));
      },
      error: () => this.uploading.set(false)
    });
  }

  errorsUrl(id: string): string { return this.jobSvc.errorsUrl(id); }

  chipColor(status: string): 'primary' | 'accent' | 'warn' {
    if (status === 'completed') return 'primary';
    if (status === 'failed') return 'warn';
    return 'accent';
  }
}
