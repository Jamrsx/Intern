import { getApiBaseUrl } from '../config/api.environment';

export class ApiError extends Error {
    status: number;

    fieldErrors: Record<string, string[]>;

    constructor(
        message: string,
        status: number,
        fieldErrors: Record<string, string[]> = {},
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.fieldErrors = fieldErrors;
    }
}

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: unknown;
    token?: string | null;
};

export async function apiRequest<T>(
    path: string,
    options: RequestOptions = {},
): Promise<T> {
    const url = `${getApiBaseUrl()}${path}`;
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };

    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
    }

    console.log('API request', {
        method: options.method ?? 'GET',
        url,
    });

    const response = await fetch(url, {
        method: options.method ?? 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
        ? await response.json()
        : null;

    if (!response.ok) {
        const fieldErrors =
            payload?.errors && typeof payload.errors === 'object'
                ? (payload.errors as Record<string, string[]>)
                : {};

        const message =
            payload?.message ??
            fieldErrors.email?.[0] ??
            fieldErrors.password?.[0] ??
            'Something went wrong. Please try again.';

        console.log('API error response', {
            status: response.status,
            message,
            fieldErrors,
        });

        throw new ApiError(message, response.status, fieldErrors);
    }

    return payload as T;
}
