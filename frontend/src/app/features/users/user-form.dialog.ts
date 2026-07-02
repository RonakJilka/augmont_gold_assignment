import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { User } from '../../core/models/user';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit user' : 'New user' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Password {{ data ? '(leave blank to keep)' : '' }}</mat-label>
          <input matInput type="password" formControlName="password" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="ref.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save</button>
    </mat-dialog-actions>
  `
})
export class UserFormDialog {
  private readonly fb = inject(FormBuilder);
  readonly ref = inject(MatDialogRef<UserFormDialog>);
  readonly data = inject<User | null>(MAT_DIALOG_DATA);

  readonly form = this.fb.nonNullable.group({
    email: [this.data?.email ?? '', [Validators.required, Validators.email]],
    password: ['', this.data ? [] : [Validators.required, Validators.minLength(6)]]
  });

  save(): void {
    const v = this.form.getRawValue();
    const out: { email: string; password?: string } = { email: v.email };
    if (v.password) out.password = v.password;
    this.ref.close(out);
  }
}
