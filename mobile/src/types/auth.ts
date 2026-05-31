export type Role = {
    id: number;
    name: string;
    label: string;
};

export type AuthUser = {
    id: number;
    name: string;
    email: string;
    role_id: number;
    is_active: boolean;
    role?: Role;
};

export type LoginResponse = {
    token_type: string;
    access_token: string;
    expires_at: string | null;
    user: AuthUser;
    student?: {
        id: number;
        student_number: string;
        full_name: string;
    };
};

export type StoredSession = {
    accessToken: string;
    expiresAt: string | null;
    user: AuthUser;
};
