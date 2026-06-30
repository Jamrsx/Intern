export type TodayAttendance = {
    status:
        | 'present'
        | 'pending'
        | 'absent'
        | 'off_schedule'
        | 'not_started';
    label: string;
    minutes: number;
    hours: number;
    is_scheduled_today: boolean;
    schedule_label: string | null;
    absence_id: number | null;
    needs_justification: boolean;
};

export type OjtAbsenceRecord = {
    id: number;
    absence_date: string;
    date_label: string;
    status: 'detected' | 'justified';
    reason: string | null;
    has_proof: boolean;
    proof_url?: string | null;
    justification_submitted_at: string | null;
    needs_justification: boolean;
    rendered_hours: number;
    rendered_minutes: number;
};

export type InternAbsencesResponse = {
    today_attendance: TodayAttendance;
    absences: OjtAbsenceRecord[];
    pending_justification_count: number;
};

export type JustifyAbsenceResponse = {
    message: string;
    absence: OjtAbsenceRecord;
    today_attendance: TodayAttendance;
};

export type PickedAbsenceProof = {
    uri: string;
    name: string;
    type: string;
};
