import { Form, router } from '@inertiajs/react';
import {
    Download,
    FileSpreadsheet,
    Mail,
    Pencil,
    Plus,
    Trash2,
    Upload,
} from 'lucide-react';
import {
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type ReactNode,
} from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { AppModal } from '@/components/superadmin/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    downloadCoordinatorStudentImportTemplate,
    parseCoordinatorStudentImportFile,
    type CoordinatorBulkImportRow,
} from '@/lib/coordinator-student-import';
import {
    bulkStore,
    destroy,
    mailAllCredentials,
    mailCredentials,
    store,
    update,
} from '@/routes/coordinators/students';

const DEFAULT_STUDENT_PASSWORD = 'password';

export type CoordinatorStudentAccountRow = {
    id: number;
    student_number: string;
    email: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    full_name: string;
    is_active: boolean;
};

type SectionInfo = {
    id: number;
    display_name: string;
};

type CoordinatorStudentAccountsProps = {
    section: SectionInfo;
    students: CoordinatorStudentAccountRow[];
    headerActions?: ReactNode;
};

export function CoordinatorStudentHeaderActions({
    section,
    students,
}: {
    section: SectionInfo;
    students: CoordinatorStudentAccountRow[];
}) {
    const [createOpen, setCreateOpen] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [createPassword, setCreatePassword] = useState(DEFAULT_STUDENT_PASSWORD);
    const [bulkImportRows, setBulkImportRows] = useState<
        CoordinatorBulkImportRow[]
    >([]);
    const [bulkImportError, setBulkImportError] = useState<string | null>(null);
    const [bulkImportFileName, setBulkImportFileName] = useState('');
    const bulkImportInputRef = useRef<HTMLInputElement>(null);
    const [mailingAll, setMailingAll] = useState(false);

    const storeRoute = store();
    const bulkStoreRoute = bulkStore();
    const mailAllRoute = mailAllCredentials();
    const activeStudentsCount = useMemo(
        () => students.filter((student) => student.is_active).length,
        [students],
    );
    const bulkImportHasErrors = bulkImportRows.some(
        (row) => row.errors.length > 0,
    );
    const canSubmitBulkImport =
        bulkImportRows.length > 0 && !bulkImportHasErrors;

    const resetBulkImport = () => {
        setBulkImportRows([]);
        setBulkImportError(null);
        setBulkImportFileName('');

        if (bulkImportInputRef.current) {
            bulkImportInputRef.current.value = '';
        }
    };

    const handleDownloadTemplate = () => {
        downloadCoordinatorStudentImportTemplate(section.display_name);
    };

    const handleBulkImportFile = async (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setBulkImportError(null);
        setBulkImportFileName(file.name);

        try {
            const parsedRows = await parseCoordinatorStudentImportFile(file);
            setBulkImportRows(parsedRows);

            if (parsedRows.length === 0) {
                setBulkImportError(
                    'No student rows were found. Fill in the Students sheet and try again.',
                );
            }
        } catch (error) {
            console.error('Coordinator student import failed', error);
            setBulkImportRows([]);
            setBulkImportError(
                error instanceof Error
                    ? error.message
                    : 'Failed to import the Excel file.',
            );
        }
    };

    const handleMailAllStudents = () => {
        if (activeStudentsCount === 0) {
            return;
        }

        if (
            !confirm(
                `Send login credentials to all ${activeStudentsCount} active student(s)? Each password will be reset to "${DEFAULT_STUDENT_PASSWORD}" and emailed.`,
            )
        ) {
            return;
        }

        console.log('Coordinator mail all student credentials', {
            count: activeStudentsCount,
            sectionId: section.id,
        });

        setMailingAll(true);
        router.post(mailAllRoute.url, {}, {
            preserveScroll: true,
            onFinish: () => setMailingAll(false),
        });
    };

    return (
        <>
            <div className="flex flex-wrap gap-2">
                {students.length > 0 && (
                    <Button
                        variant="outline"
                        disabled={mailingAll || activeStudentsCount === 0}
                        onClick={handleMailAllStudents}
                    >
                        {mailingAll ? (
                            <Spinner className="mr-2 size-4" />
                        ) : (
                            <Mail className="mr-2 size-4" />
                        )}
                        Mail All
                    </Button>
                )}
                <Button
                    variant="outline"
                    onClick={() => {
                        resetBulkImport();
                        setBulkOpen(true);
                    }}
                >
                    <Upload className="mr-2 size-4" />
                    Bulk Add
                </Button>
                <Button
                    onClick={() => {
                        setCreatePassword(DEFAULT_STUDENT_PASSWORD);
                        setCreateOpen(true);
                    }}
                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                >
                    <Plus className="mr-2 size-4" />
                    Add Student
                </Button>
            </div>

            <AppModal
                open={createOpen}
                onOpenChange={(open) => {
                    setCreateOpen(open);

                    if (!open) {
                        setCreatePassword(DEFAULT_STUDENT_PASSWORD);
                    }
                }}
                title="Add Student"
                description={`Create a student account for ${section.display_name}.`}
            >
                <Form
                    action={storeRoute.url}
                    method={storeRoute.method}
                    onSuccess={() => setCreateOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="create-student-number">
                                    Student ID
                                </Label>
                                <Input
                                    id="create-student-number"
                                    name="student_number"
                                    required
                                    placeholder="2022-0-00000"
                                    pattern="\d{4}-\d{1,2}-\d{4,6}"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Format: YYYY-N-##### (e.g. 2022-0-00000)
                                </p>
                                <InputError message={errors.student_number} />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="create-first-name">
                                        First name
                                    </Label>
                                    <Input
                                        id="create-first-name"
                                        name="first_name"
                                        required
                                    />
                                    <InputError message={errors.first_name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-middle-name">
                                        Middle name
                                    </Label>
                                    <Input
                                        id="create-middle-name"
                                        name="middle_name"
                                    />
                                    <InputError message={errors.middle_name} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-last-name">
                                    Last name
                                </Label>
                                <Input
                                    id="create-last-name"
                                    name="last_name"
                                    required
                                />
                                <InputError message={errors.last_name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-email">Email</Label>
                                <Input
                                    id="create-email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="student@gmail.com"
                                />
                                <InputError message={errors.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-password">
                                    Default password
                                </Label>
                                <PasswordInput
                                    id="create-password"
                                    name="password"
                                    value={createPassword}
                                    onChange={(event) =>
                                        setCreatePassword(event.target.value)
                                    }
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Defaults to &quot;{DEFAULT_STUDENT_PASSWORD}
                                    &quot;. You can email credentials later.
                                </p>
                                <InputError message={errors.password} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setCreateOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                >
                                    {processing && <Spinner />}
                                    Create Student
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </AppModal>

            <AppModal
                open={bulkOpen}
                onOpenChange={(open) => {
                    setBulkOpen(open);

                    if (!open) {
                        resetBulkImport();
                    }
                }}
                title="Bulk Add Students"
                description={`Import students into ${section.display_name}. All rows are assigned to your section automatically.`}
                className="sm:max-w-4xl"
            >
                <Form
                    action={bulkStoreRoute.url}
                    method={bulkStoreRoute.method}
                    onSuccess={() => {
                        setBulkOpen(false);
                        resetBulkImport();
                    }}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                                <p className="font-medium text-foreground">
                                    Template format
                                </p>
                                <p className="mt-1">
                                    Row 1 is the header row. Enter each student
                                    starting from row 2. Gmail is optional; a
                                    school email is generated when left blank.
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={handleDownloadTemplate}
                                >
                                    <Download className="mr-2 size-4" />
                                    Download template
                                </Button>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="bulk-import-file">
                                    Excel file
                                </Label>
                                <Input
                                    id="bulk-import-file"
                                    ref={bulkImportInputRef}
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleBulkImportFile}
                                />
                                {bulkImportFileName ? (
                                    <p className="text-xs text-muted-foreground">
                                        Selected: {bulkImportFileName}
                                    </p>
                                ) : null}
                                {bulkImportError ? (
                                    <p className="text-sm text-red-600">
                                        {bulkImportError}
                                    </p>
                                ) : null}
                                <InputError message={errors.students} />
                            </div>

                            {bulkImportRows.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full min-w-[720px] text-left text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/40">
                                                <th className="px-3 py-2 font-medium">
                                                    Student ID
                                                </th>
                                                <th className="px-3 py-2 font-medium">
                                                    Email
                                                </th>
                                                <th className="px-3 py-2 font-medium">
                                                    Name
                                                </th>
                                                <th className="px-3 py-2 font-medium">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bulkImportRows.map((row, index) => (
                                                <tr
                                                    key={`${row.student_number}-${index}`}
                                                    className="border-b last:border-0"
                                                >
                                                    <td className="px-3 py-2">
                                                        {row.student_number}
                                                        <input
                                                            type="hidden"
                                                            name={`students[${index}][student_number]`}
                                                            value={
                                                                row.student_number
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {row.email}
                                                        <input
                                                            type="hidden"
                                                            name={`students[${index}][email]`}
                                                            value={row.email}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {row.last_name},{' '}
                                                        {row.first_name}
                                                        {row.middle_name
                                                            ? ` ${row.middle_name}`
                                                            : ''}
                                                        <input
                                                            type="hidden"
                                                            name={`students[${index}][first_name]`}
                                                            value={
                                                                row.first_name
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name={`students[${index}][middle_name]`}
                                                            value={
                                                                row.middle_name
                                                            }
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name={`students[${index}][last_name]`}
                                                            value={row.last_name}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        {row.errors.length >
                                                        0 ? (
                                                            <span className="text-red-600">
                                                                {row.errors.join(
                                                                    ' ',
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <span className="text-emerald-600">
                                                                Ready
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                                    <FileSpreadsheet className="mb-3 size-8 text-muted-foreground" />
                                    Upload an Excel file to preview students
                                    before importing.
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setBulkOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        processing || !canSubmitBulkImport
                                    }
                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                >
                                    {processing && <Spinner />}
                                    Import {bulkImportRows.length} student(s)
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </AppModal>
        </>
    );
}

export function CoordinatorStudentRowActions({
    student,
}: {
    student: CoordinatorStudentAccountRow;
}) {
    const [editOpen, setEditOpen] = useState(false);
    const [mailing, setMailing] = useState(false);

    const handleMail = () => {
        if (
            !confirm(
                `Send login credentials to ${student.full_name}? Their password will be reset to "${DEFAULT_STUDENT_PASSWORD}" and emailed.`,
            )
        ) {
            return;
        }

        console.log('Coordinator mail student credentials', {
            studentId: student.id,
            email: student.email,
        });

        setMailing(true);
        router.post(mailCredentials(student.id).url, {}, {
            preserveScroll: true,
            onFinish: () => setMailing(false),
        });
    };

    const handleDeactivate = () => {
        if (!confirm(`Deactivate ${student.full_name}?`)) {
            return;
        }

        router.delete(destroy(student.id).url, { preserveScroll: true });
    };

    const updateRoute = update(student.id);

    return (
        <>
            <div className="flex justify-end gap-2">
                {student.is_active && (
                    <Button
                        variant="outline"
                        size="sm"
                        title="Email login credentials"
                        disabled={mailing}
                        onClick={handleMail}
                    >
                        {mailing ? (
                            <Spinner className="size-3.5" />
                        ) : (
                            <Mail className="size-3.5" />
                        )}
                    </Button>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditOpen(true)}
                >
                    <Pencil className="size-3.5" />
                </Button>
                {student.is_active && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={handleDeactivate}
                    >
                        <Trash2 className="size-3.5" />
                    </Button>
                )}
            </div>

            <AppModal
                open={editOpen}
                onOpenChange={setEditOpen}
                title="Edit Student"
                description={`Update ${student.full_name}`}
            >
                <Form
                    action={updateRoute.url}
                    method={updateRoute.method}
                    onSuccess={() => setEditOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor={`edit-student-number-${student.id}`}>
                                    Student ID
                                </Label>
                                <Input
                                    id={`edit-student-number-${student.id}`}
                                    name="student_number"
                                    defaultValue={student.student_number}
                                    required
                                    pattern="\d{4}-\d{1,2}-\d{4,6}"
                                />
                                <InputError message={errors.student_number} />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor={`edit-first-name-${student.id}`}>
                                        First name
                                    </Label>
                                    <Input
                                        id={`edit-first-name-${student.id}`}
                                        name="first_name"
                                        defaultValue={student.first_name}
                                        required
                                    />
                                    <InputError message={errors.first_name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor={`edit-middle-name-${student.id}`}>
                                        Middle name
                                    </Label>
                                    <Input
                                        id={`edit-middle-name-${student.id}`}
                                        name="middle_name"
                                        defaultValue={student.middle_name ?? ''}
                                    />
                                    <InputError message={errors.middle_name} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`edit-last-name-${student.id}`}>
                                    Last name
                                </Label>
                                <Input
                                    id={`edit-last-name-${student.id}`}
                                    name="last_name"
                                    defaultValue={student.last_name}
                                    required
                                />
                                <InputError message={errors.last_name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor={`edit-email-${student.id}`}>
                                    Email
                                </Label>
                                <Input
                                    id={`edit-email-${student.id}`}
                                    name="email"
                                    type="email"
                                    defaultValue={student.email}
                                    required
                                />
                                <InputError message={errors.email} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                >
                                    {processing && <Spinner />}
                                    Save changes
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </AppModal>
        </>
    );
}
