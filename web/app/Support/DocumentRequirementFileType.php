<?php

namespace App\Support;

enum DocumentRequirementFileType: string
{
    case PdfOnly = 'pdf_only';
    case PdfAndWord = 'pdf_and_word';

    /**
     * @return list<string>
     */
    public function allowedExtensions(): array
    {
        return match ($this) {
            self::PdfOnly => ['pdf'],
            self::PdfAndWord => ['pdf', 'doc', 'docx'],
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::PdfOnly => 'PDF only',
            self::PdfAndWord => 'PDF and Word',
        };
    }

    public function internHint(): string
    {
        return match ($this) {
            self::PdfOnly => 'Upload a PDF file only.',
            self::PdfAndWord => 'Upload a PDF or Word (.doc, .docx) file.',
        };
    }
}
