export type InternCourse = {
    id: number;
    code: string;
    name: string;
    required_hours: number;
};

export type InternProgress = {
    required_hours: number;
    rendered_hours: number;
    remaining_hours: number;
    percent_complete: number;
    time_log_count: number;
    estimated_end_date: string | null;
    estimated_end_is_approximate: boolean;
    estimated_end_basis: 'completed' | 'schedule' | 'default_schedule' | null;
    schedule: {
        hours_per_day: number;
        days_per_week: number;
        start_date: string;
    } | null;
};

export type InternProgressResponse = {
    student: {
        id: number;
        student_number: string;
        full_name: string;
    };
    course: InternCourse | null;
    progress: InternProgress;
};
