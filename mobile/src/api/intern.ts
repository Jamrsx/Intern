import { apiRequest } from './client';
import type { InternProgressResponse } from '../types/intern';
import type {
    InternProfileResponse,
    UpdatePasswordPayload,
} from '../types/profile';

export async function fetchInternProgress(
    token: string,
): Promise<InternProgressResponse> {
    const response = await apiRequest<InternProgressResponse>(
        '/api/intern/progress',
        { token },
    );

    console.log('Intern progress loaded', {
        remainingHours: response.progress.remaining_hours,
        renderedHours: response.progress.rendered_hours,
    });

    return response;
}

export async function fetchInternProfile(
    token: string,
): Promise<InternProfileResponse> {
    const response = await apiRequest<InternProfileResponse>(
        '/api/intern/profile',
        { token },
    );

    console.log('Intern profile loaded', {
        studentNumber: response.student.student_number,
        company: response.placement.company?.name ?? null,
    });

    return response;
}

export async function updateInternPassword(
    token: string,
    payload: UpdatePasswordPayload,
): Promise<{ message: string }> {
    const response = await apiRequest<{ message: string }>(
        '/api/intern/password',
        {
            method: 'PUT',
            token,
            body: payload,
        },
    );

    console.log('Password updated', { message: response.message });

    return response;
}
