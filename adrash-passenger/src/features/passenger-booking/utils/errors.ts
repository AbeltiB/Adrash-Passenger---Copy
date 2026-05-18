import { AxiosError } from 'axios';
export class AppError extends Error { constructor(message: string, public code = 'UNKNOWN', public status?: number) { super(message); } }
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof AxiosError) {
    const data = error.response?.data as { errors?: string[]; message?: string; code?: string } | undefined;
    return new AppError(data?.errors?.[0] ?? data?.message ?? error.message, data?.code ?? 'API_ERROR', error.response?.status);
  }
  return new AppError(error instanceof Error ? error.message : 'Something went wrong');
}
