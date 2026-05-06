// ─── Standard API response envelope ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T;
    errors: ApiError[] | null;
    meta: ApiMeta | null;
}

export interface ApiError {
    code: string;
    message: string;
    field?: string;
}

export interface ApiMeta {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
}