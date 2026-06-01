export type InternDocument = {
    id: number;
    title: string | null;
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
