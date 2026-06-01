import { apiRequest } from './client';
import type { InternProgressResponse } from '../types/intern';

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
