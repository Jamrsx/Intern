export type DocumentRequirementStatus =
    | 'pending'
    | 'submitted'
    | 'overdue';

export type DocumentRequirementFileType = 'pdf_only' | 'pdf_and_word';

export type InternDocumentRequirement = {
    id: number;
    title: string;
    description: string | null;
    deadline_at: string;
    accepted_file_types: DocumentRequirementFileType;
    accepted_file_types_label?: string;
    accepted_file_types_hint?: string;
    published_at?: string;
    status: DocumentRequirementStatus;
    is_submitted: boolean;
    is_new?: boolean;
    submission: {
        id: number;
        original_filename: string;
        uploaded_at: string;
    } | null;
};

export type DocumentNotificationItem = {
    id: number;
    title: string;
    deadline_at: string;
    status: DocumentRequirementStatus;
    is_new: boolean;
    message: string;
};

export type InternDocumentRequirementsResponse = {
    requirements: InternDocumentRequirement[];
    pending_count: number;
    new_count?: number;
    unread_count?: number;
    notifications?: DocumentNotificationItem[];
    last_seen_at?: string | null;
    server_time?: string;
};

export type InternDocument = {
    id: number;
    title: string | null;
    document_requirement_id: number | null;
    document_type: string;
    document_type_code: string;
    original_filename: string;
    file_size: number | null;
    mime_type: string;
    uploaded_at: string;
};

export type InternDocumentsResponse = {
    documents: InternDocument[];
};

export type UploadInternDocumentResponse = {
    message: string;
    document: InternDocument;
};

export type PickedUploadFile = {
    uri: string;
    name: string;
    type: string;
};
