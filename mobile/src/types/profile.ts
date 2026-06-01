export type InternPlacementCompany = {
    id: number;
    name: string;
    address: string | null;
};

export type InternPlacementDepartment = {
    id: number;
    name: string;
};

export type InternPlacementSupervisor = {
    id: number;
    name: string | null;
    email: string | null;
    position_title: string | null;
};

export type InternProfileResponse = {
    student: {
        id: number;
        student_number: string;
        full_name: string;
    };
    user: {
        id: number;
        name: string;
        email: string;
        role?: {
            id: number;
            name: string;
            label: string;
        };
    };
    section: {
        id: number;
        name: string;
        course: {
            code: string;
            name: string;
        } | null;
    } | null;
    placement: {
        company: InternPlacementCompany | null;
        department: InternPlacementDepartment | null;
        supervisor: InternPlacementSupervisor | null;
    };
};

export type UpdatePasswordPayload = {
    current_password: string;
    password: string;
    password_confirmation: string;
};
