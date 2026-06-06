export type TimeLogSegment = {
    id: number;
    time_in: string;
    time_out: string | null;
    duration_minutes: number | null;
    duration_hours: number | null;
    verification_method: string;
    face_match_score: number | null;
    is_open: boolean;
};

export type InternTimeStatusResponse = {
    face_enrolled: boolean;
    face_enrolled_at: string | null;
    can_punch_in: boolean;
    can_punch_out: boolean;
    open_log: TimeLogSegment | null;
    today_segments: TimeLogSegment[];
    today_minutes: number;
    today_hours: number;
};

export type InternTimeLogsResponse = {
    logs: TimeLogSegment[];
    total_count: number;
};

export type InternTimePunchResponse = {
    message: string;
    log: TimeLogSegment;
};

export type InternFaceEnrollResponse = {
    message: string;
    profile: {
        enrolled_at: string;
        is_active: boolean;
        model?: string;
    };
};

export type CapturedFaceImage = {
    uri: string;
    name: string;
    type: string;
};
