export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  type: string;
  status: JobStatus;
  progress: number;
  totalRows?: number;
  successRows?: number;
  failedRows?: number;
  resultPath?: string;
  error?: string;
}
