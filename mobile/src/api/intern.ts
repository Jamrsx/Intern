import { apiRequest } from './client';
import type {
    InternProgressResponse,
    InternScheduleUpdateResponse,
} from '../types/intern';
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

export async function updateInternSchedule(
    token: string,
    payload: {
        hours_per_day: number;
        days_per_week: 4 | 5 | 6;
    },
): Promise<InternScheduleUpdateResponse> {
    const response = await apiRequest<InternScheduleUpdateResponse>(
        '/api/intern/schedule',
        {
            method: 'PUT',
            token,
            body: payload,
        },
    );

    console.log('Intern schedule updated', {
        hoursPerDay: response.progress.schedule?.hours_per_day,
        daysPerWeek: response.progress.schedule?.days_per_week,
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
