import * as XLSX from 'xlsx';

export type CoordinatorBulkImportRow = {
    student_number: string;
    email: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    errors: string[];
};

type ParsedRowValues = {
    student_number: string;
    email: string;
    last_name: string;
    first_name: string;
    middle_name: string;
};

const TEMPLATE_HEADERS = [
    'studentid',
    'gmail',
    'lastname',
    'firstname',
    'middleinitial',
] as const;

const HEADER_ALIASES: Record<string, keyof ParsedRowValues> = {
    studentid: 'student_number',
    student_id: 'student_number',
    studentnumber: 'student_number',
    student_number: 'student_number',
    id: 'student_number',
    gmail: 'email',
    email: 'email',
    email_address: 'email',
    lastname: 'last_name',
    last_name: 'last_name',
    firstname: 'first_name',
    first_name: 'first_name',
    middleinitial: 'middle_name',
    middle_initial: 'middle_name',
    middlename: 'middle_name',
    middle_name: 'middle_name',
};

function normalizeHeader(value: unknown): string {
    return String(value ?? '')
        .trim()
        .replace(/\([^)]*\)/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

function cellValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value).trim();
}

function autoGenerateEmail(studentNumber: string): string {
    const local = studentNumber
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9.-]/g, '');

    return `${local}@students.occ.edu.ph`;
}

function validateStudentNumber(studentNumber: string): string | null {
    if (studentNumber === '') {
        return 'Student ID is required.';
    }

    if (!/^\d{4}-\d{1,2}-\d{4,6}$/.test(studentNumber)) {
        return 'Student ID must follow YYYY-N-##### (e.g. 2022-0-00000).';
    }

    return null;
}

function validateEmail(
    email: string,
    studentNumber: string,
): { email: string; error: string | null } {
    const normalized = email.trim();

    if (normalized === '') {
        return {
            email: autoGenerateEmail(studentNumber),
            error: null,
        };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
        return {
            email: normalized,
            error: 'Gmail must be a valid email address.',
        };
    }

    return { email: normalized, error: null };
}

export function downloadCoordinatorStudentImportTemplate(
    sectionDisplayName: string,
): void {
    const workbook = XLSX.utils.book_new();
    const studentsSheet = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS]]);

    studentsSheet['!cols'] = [
        { wch: 18 },
        { wch: 28 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Students');
    XLSX.writeFile(workbook, 'student-import-template.xlsx');

    console.log('Coordinator student import template downloaded', {
        sectionDisplayName,
        headers: TEMPLATE_HEADERS,
    });
}

function mapHeaders(headerRow: unknown[]): Record<number, keyof ParsedRowValues> {
    const mapping: Record<number, keyof ParsedRowValues> = {};

    headerRow.forEach((header, index) => {
        const normalized = normalizeHeader(header);
        const field = HEADER_ALIASES[normalized];

        if (field) {
            mapping[index] = field;
        }
    });

    return mapping;
}

function rowFromSheet(
    row: unknown[],
    headerMapping: Record<number, keyof ParsedRowValues>,
): ParsedRowValues {
    const values: ParsedRowValues = {
        student_number: '',
        email: '',
        last_name: '',
        first_name: '',
        middle_name: '',
    };

    Object.entries(headerMapping).forEach(([index, field]) => {
        values[field] = cellValue(row[Number(index)]);
    });

    return values;
}

function isEmptyRow(values: ParsedRowValues): boolean {
    return (
        values.student_number === '' &&
        values.email === '' &&
        values.last_name === '' &&
        values.first_name === '' &&
        values.middle_name === ''
    );
}

function isGuideRow(values: ParsedRowValues): boolean {
    const combined = Object.values(values).join(' ').toLowerCase();

    return (
        combined.includes('enter ') ||
        combined.includes('optional') ||
        combined.includes('e.g.')
    );
}

export function parseCoordinatorStudentImportFile(
    file: File,
): Promise<CoordinatorBulkImportRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const buffer = event.target?.result;

                if (!(buffer instanceof ArrayBuffer)) {
                    reject(new Error('Unable to read the selected file.'));
                    return;
                }

                const workbook = XLSX.read(buffer, { type: 'array' });
                const sheetName =
                    workbook.SheetNames.find((name) =>
                        name.toLowerCase().includes('student'),
                    ) ?? workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
                    header: 1,
                    defval: '',
                });

                const headerRowIndex = rows.findIndex((row) =>
                    row.some((cell) => {
                        const normalized = normalizeHeader(cell);

                        return (
                            normalized in HEADER_ALIASES ||
                            TEMPLATE_HEADERS.some(
                                (header) =>
                                    normalizeHeader(header) === normalized,
                            )
                        );
                    }),
                );

                if (headerRowIndex === -1) {
                    reject(
                        new Error(
                            'No valid header row found. Use the downloaded template.',
                        ),
                    );
                    return;
                }

                const headerMapping = mapHeaders(rows[headerRowIndex]);
                const requiredFields: (keyof ParsedRowValues)[] = [
                    'student_number',
                    'last_name',
                    'first_name',
                ];
                const missingFields = requiredFields.filter(
                    (field) => !Object.values(headerMapping).includes(field),
                );

                if (missingFields.length > 0) {
                    reject(
                        new Error(
                            'Template columns are incomplete. Download the template and try again.',
                        ),
                    );
                    return;
                }

                const parsedRows: CoordinatorBulkImportRow[] = [];

                rows.slice(headerRowIndex + 1).forEach((row) => {
                    const values = rowFromSheet(row, headerMapping);

                    if (isEmptyRow(values) || isGuideRow(values)) {
                        return;
                    }

                    const errors: string[] = [];
                    const studentNumberError = validateStudentNumber(
                        values.student_number,
                    );

                    if (studentNumberError) {
                        errors.push(studentNumberError);
                    }

                    if (values.first_name === '') {
                        errors.push('First name is required.');
                    }

                    if (values.last_name === '') {
                        errors.push('Last name is required.');
                    }

                    const emailResult = validateEmail(
                        values.email,
                        values.student_number,
                    );

                    if (emailResult.error) {
                        errors.push(emailResult.error);
                    }

                    parsedRows.push({
                        student_number: values.student_number,
                        email: emailResult.email,
                        first_name: values.first_name,
                        middle_name: values.middle_name,
                        last_name: values.last_name,
                        errors,
                    });
                });

                console.log('Coordinator student import parsed', {
                    rowCount: parsedRows.length,
                    invalidRows: parsedRows.filter((row) => row.errors.length > 0)
                        .length,
                });

                resolve(parsedRows);
            } catch (error) {
                reject(
                    error instanceof Error
                        ? error
                        : new Error('Failed to parse the Excel file.'),
                );
            }
        };

        reader.onerror = () => {
            reject(new Error('Unable to read the selected file.'));
        };

        reader.readAsArrayBuffer(file);
    });
}
