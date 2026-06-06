import { types } from '@react-native-documents/picker';
import type { DocumentRequirementFileType } from '../types/documents';

export function getRequirementPickerTypes(
    format: DocumentRequirementFileType | undefined,
): string[] {
    if (format === 'pdf_only') {
        return [types.pdf];
    }

    return [types.pdf, types.doc, types.docx];
}

export function getRequirementUploadHint(
    format: DocumentRequirementFileType | undefined,
    isRequirementUpload: boolean,
): string {
    if (isRequirementUpload) {
        if (format === 'pdf_only') {
            return 'Choose a PDF file for this requirement.';
        }

        return 'Choose a PDF or Word file for this requirement.';
    }

    return 'Name your report, then choose a PDF or Word file.';
}

export function getRequirementPickerLabel(
    format: DocumentRequirementFileType | undefined,
    pickedFileName?: string | null,
): string {
    if (pickedFileName) {
        return pickedFileName;
    }

    if (format === 'pdf_only') {
        return 'Choose PDF file';
    }

    return 'Choose PDF or Word file';
}

export function isFileAllowedForRequirement(
    fileName: string,
    mimeType: string,
    format: DocumentRequirementFileType | undefined,
): boolean {
    if (format !== 'pdf_only') {
        return true;
    }

    const lowerName = fileName.toLowerCase();

    return (
        lowerName.endsWith('.pdf') ||
        mimeType.includes('pdf') ||
        mimeType === 'application/pdf'
    );
}

export function requirementFileTypeError(
    format: DocumentRequirementFileType | undefined,
): string {
    if (format === 'pdf_only') {
        return 'This requirement accepts PDF files only.';
    }

    return 'Choose a PDF or Word file to upload.';
}
