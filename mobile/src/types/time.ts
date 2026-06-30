export type TimeLogSegment = {
    id: number;
    session_period?: 'morning' | 'afternoon' | null;
    time_in: string;
    time_out: string | null;
    duration_minutes: number | null;
    duration_hours: number | null;
    verification_method: string;
    face_match_score: number | null;
    is_open: boolean;
    is_auto_lunch?: boolean;
    task_photos?: TimeLogTaskPhoto[];
    task_photos_count?: number;
    submitted_task_photos_count?: number;
};

export type TimeLogTaskPhoto = {
    id: number;
    time_log_id: number;
    original_filename: string;
    file_size: number | null;
    mime_type: string;
    status: 'draft' | 'submitted';
    submitted_at: string | null;
    created_at: string | null;
    image_url?: string | null;
    local_uri?: string;
};

export type LunchBreakInfo = {
    lunch_time: string;
    lunch_time_label: string;
    afternoon_start_time: string;
    afternoon_start_label: string;
    policy_message: string;
};

export type LunchNotice = {
    type: 'auto_lunch_timeout' | 'lunch_break_window';
    message: string;
    can_time_in_now: boolean;
};

export type GeofenceInfo = {
    required: boolean;
    enabled: boolean;
    configured: boolean;
    company_name: string | null;
    latitude: number | null;
    longitude: number | null;
    radius_meters: number | null;
};

export type InternTimeStatusResponse = {
    face_enrolled: boolean;
    face_enrolled_at: string | null;
    face_embedding?: number[] | null;
    can_punch_in: boolean;
    can_punch_out: boolean;
    open_log: TimeLogSegment | null;
    today_segments: TimeLogSegment[];
    today_minutes: number;
    today_hours: number;
    lunch_break?: LunchBreakInfo;
    lunch_notice?: LunchNotice | null;
    geofence?: GeofenceInfo;
};

export type InternTimeLogsResponse = {
    logs: TimeLogSegment[];
    total_count: number;
};

export type InternTimePunchResponse = {
    message: string;
    log: TimeLogSegment;
};

export type UploadTimeLogTaskPhotoResponse = {
    message: string;
    photo: TimeLogTaskPhoto;
};

export type PickedTaskPhoto = {
    uri: string;
    name: string;
    type: string;
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
