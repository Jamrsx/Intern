import { apiRequest } from './client';
import type { LoginResponse, StoredSession } from '../types/auth';

export async function login(
    studentNumber: string,
    password: string,
): Promise<StoredSession> {
    const response = await apiRequest<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { student_number: studentNumber, password },
    });

    console.log('Login successful', {
        userId: response.user.id,
        studentNumber: response.student?.student_number,
        role: response.user.role?.name,
    });

    return {
        accessToken: response.access_token,
        expiresAt: response.expires_at,
        user: response.user,
    };
}

export async function fetchCurrentUser(
    token: string,
): Promise<StoredSession['user']> {
    const response = await apiRequest<{ user: StoredSession['user'] }>(
        '/api/auth/me',
        { token },
    );

    return response.user;
}

export async function logout(token: string): Promise<void> {
    await apiRequest('/api/auth/logout', {
        method: 'POST',
        token,
    });
}
