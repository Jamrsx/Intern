import { Form } from '@inertiajs/react';
import { Download, FileSpreadsheet, Plus, Upload } from 'lucide-react';
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type PropsWithChildren,
} from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { AppModal } from '@/components/superadmin/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useDeanPortalRoutes } from '@/contexts/dean-portal-routes-context';
import {
    downloadStudentImportTemplate,
    parseStudentImportFile,
    type BulkImportRow,
} from '@/lib/dean-student-import';

const DEFAULT_STUDENT_PASSWORD = 'password';

type SectionOption = {
    id: number;
    name: string;
    display_name: string;
};

type DeanStudentAccountsContextValue = {
    canManageStudents: boolean;
    openCreateStudent: (sectionId?: number) => void;
    openBulkAdd: (sectionId?: number) => void;
};

const DeanStudentAccountsContext =
    createContext<DeanStudentAccountsContextValue | null>(null);

function useDeanStudentAccounts(): DeanStudentAccountsContextValue {
    const context = useContext(DeanStudentAccountsContext);

    if (context === null) {
        throw new Error(
            'useDeanStudentAccounts must be used within DeanStudentAccountsProvider',
        );
    }

    return context;
}

type DeanStudentAccountsProviderProps = PropsWithChildren<{
    courseCode: string;
    sections: SectionOption[];
}>;

export function DeanStudentAccountsProvider({
    courseCode,
    sections,
    children,
}: DeanStudentAccountsProviderProps) {
    const portalRoutes = useDeanPortalRoutes();
    const [createOpen, setCreateOpen] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [createPassword, setCreatePassword] = useState(DEFAULT_STUDENT_PASSWORD);
    const [selectedSectionId, setSelectedSectionId] = useState(
        String(sections[0]?.id ?? ''),
    );
    const [bulkFallbackSectionId, setBulkFallbackSectionId] = useState(
        String(sections[0]?.id ?? ''),
    );
    const [bulkImportRows, setBulkImportRows] = useState<BulkImportRow[]>([]);
    const [bulkImportError, setBulkImportError] = useState<string | null>(null);
    const [bulkImportFileName, setBulkImportFileName] = useState('');
    const bulkImportInputRef = useRef<HTMLInputElement>(null);

    const storeRoute = portalRoutes.students.store?.();
    const bulkStoreRoute = portalRoutes.students.bulkStore?.();
    const canManageStudents =
        !portalRoutes.studentsReadOnly && Boolean(storeRoute && bulkStoreRoute);

    const bulkImportHasErrors = bulkImportRows.some(
        (row) => row.errors.length > 0,
    );
    const canSubmitBulkImport =
        bulkImportRows.length > 0 && !bulkImportHasErrors;

    const selectedSection = sections.find(
        (section) => String(section.id) === selectedSectionId,
    );

    const resetBulkImport = () => {
        setBulkImportRows([]);
        setBulkImportError(null);
        setBulkImportFileName('');

        if (bulkImportInputRef.current) {
            bulkImportInputRef.current.value = '';
        }
    };

    const openCreateStudent = useCallback(
        (sectionId?: number) => {
            setCreatePassword(DEFAULT_STUDENT_PASSWORD);
            setSelectedSectionId(
                String(sectionId ?? sections[0]?.id ?? ''),
            );
            setCreateOpen(true);
            console.log('Dean open add student modal', { sectionId });
        },
        [sections],
    );

    const openBulkAdd = useCallback(
        (sectionId?: number) => {
            resetBulkImport();
            setBulkFallbackSectionId(
                String(sectionId ?? sections[0]?.id ?? ''),
            );
            setBulkOpen(true);
            console.log('Dean open bulk add modal', { sectionId });
        },
        [sections],
    );

    const contextValue = useMemo(
        () => ({
            canManageStudents,
            openCreateStudent,
            openBulkAdd,
        }),
        [canManageStudents, openBulkAdd, openCreateStudent],
    );

    const handleDownloadTemplate = () => {
        downloadStudentImportTemplate(courseCode, sections);
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
            const parsedRows = await parseStudentImportFile(file, sections);
            setBulkImportRows(parsedRows);

            if (parsedRows.length === 0) {
                setBulkImportError(
                    'No student rows were found. Fill in the Students sheet and try again.',
                );
            }

            console.log('Dean bulk import preview', {
                rowCount: parsedRows.length,
                invalidRows: parsedRows.filter((row) => row.errors.length > 0)
                    .length,
            });
        } catch (error) {
            console.error('Dean student import failed', error);
            setBulkImportRows([]);
            setBulkImportError(
                error instanceof Error
                    ? error.message
                    : 'Failed to import the Excel file.',
            );
        }
    };

    return (
        <DeanStudentAccountsContext.Provider value={contextValue}>
            {children}

            {canManageStudents && storeRoute && bulkStoreRoute ? (
                <>
                    <AppModal
                        open={createOpen}
                        onOpenChange={(open) => {
                            setCreateOpen(open);

                            if (!open) {
                                setCreatePassword(DEFAULT_STUDENT_PASSWORD);
                            }
                        }}
                        title="Add Student"
                        description={
                            selectedSection
                                ? `Create a student account for ${selectedSection.display_name}.`
                                : 'Create a student account and assign them to a section.'
                        }
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
                                        <Label htmlFor="dean-create-section">
                                            Section
                                        </Label>
                                        <Select
                                            value={selectedSectionId}
                                            onValueChange={setSelectedSectionId}
                                        >
                                            <SelectTrigger id="dean-create-section">
                                                <SelectValue placeholder="Select section" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sections.map((section) => (
                                                    <SelectItem
                                                        key={section.id}
                                                        value={String(
                                                            section.id,
                                                        )}
                                                    >
                                                        {section.display_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <input
                                            type="hidden"
                                            name="section_id"
                                            value={selectedSectionId}
                                        />
                                        <InputError
                                            message={errors.section_id}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="dean-create-student-number">
                                            Student ID
                                        </Label>
                                        <Input
                                            id="dean-create-student-number"
                                            name="student_number"
                                            required
                                            placeholder="2022-0-00000"
                                            pattern="\d{4}-\d{1,2}-\d{4,6}"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Format: YYYY-N-##### (e.g.
                                            2022-0-00000)
                                        </p>
                                        <InputError
                                            message={errors.student_number}
                                        />
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <div className="grid gap-2">
                                            <Label htmlFor="dean-create-first-name">
                                                First name
                                            </Label>
                                            <Input
                                                id="dean-create-first-name"
                                                name="first_name"
                                                required
                                            />
                                            <InputError
                                                message={errors.first_name}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="dean-create-middle-name">
                                                Middle name
                                            </Label>
                                            <Input
                                                id="dean-create-middle-name"
                                                name="middle_name"
                                            />
                                            <InputError
                                                message={errors.middle_name}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="dean-create-last-name">
                                            Last name
                                        </Label>
                                        <Input
                                            id="dean-create-last-name"
                                            name="last_name"
                                            required
                                        />
                                        <InputError
                                            message={errors.last_name}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="dean-create-email">
                                            Email
                                        </Label>
                                        <Input
                                            id="dean-create-email"
                                            name="email"
                                            type="email"
                                            required
                                            placeholder="student@gmail.com"
                                        />
                                        <InputError message={errors.email} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="dean-create-password">
                                            Default password
                                        </Label>
                                        <PasswordInput
                                            id="dean-create-password"
                                            name="password"
                                            value={createPassword}
                                            onChange={(event) =>
                                                setCreatePassword(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                            minLength={8}
                                            autoComplete="new-password"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Defaults to &quot;
                                            {DEFAULT_STUDENT_PASSWORD}&quot;.
                                        </p>
                                        <InputError
                                            message={errors.password}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                setCreateOpen(false)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                processing ||
                                                !selectedSectionId
                                            }
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
                        description="Import students into any section in your program. Each row must include a section name."
                        className="sm:max-w-5xl"
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
                                            Row 1 is the header row. Include a
                                            Section column for each student
                                            (e.g. 4A or BSIT 4A). Gmail is
                                            optional.
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
                                        <Label htmlFor="dean-bulk-fallback-section">
                                            Default section (optional)
                                        </Label>
                                        <Select
                                            value={bulkFallbackSectionId}
                                            onValueChange={
                                                setBulkFallbackSectionId
                                            }
                                        >
                                            <SelectTrigger id="dean-bulk-fallback-section">
                                                <SelectValue placeholder="Use section from each row" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sections.map((section) => (
                                                    <SelectItem
                                                        key={section.id}
                                                        value={String(
                                                            section.id,
                                                        )}
                                                    >
                                                        {section.display_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <input
                                            type="hidden"
                                            name="section_id"
                                            value={bulkFallbackSectionId}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Used only when a row does not
                                            specify a section in the Excel
                                            file.
                                        </p>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="dean-bulk-import-file">
                                            Excel file
                                        </Label>
                                        <Input
                                            id="dean-bulk-import-file"
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
                                            <table className="w-full min-w-[860px] text-left text-sm">
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
                                                            Section
                                                        </th>
                                                        <th className="px-3 py-2 font-medium">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {bulkImportRows.map(
                                                        (row, index) => (
                                                            <tr
                                                                key={`${row.student_number}-${index}`}
                                                                className="border-b last:border-0"
                                                            >
                                                                <td className="px-3 py-2">
                                                                    {
                                                                        row.student_number
                                                                    }
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
                                                                        value={
                                                                            row.email
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {
                                                                        row.last_name
                                                                    }
                                                                    ,{' '}
                                                                    {
                                                                        row.first_name
                                                                    }
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
                                                                        value={
                                                                            row.last_name
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {
                                                                        row.section_label
                                                                    }
                                                                    <input
                                                                        type="hidden"
                                                                        name={`students[${index}][section_id]`}
                                                                        value={
                                                                            row.section_id
                                                                        }
                                                                    />
                                                                    <input
                                                                        type="hidden"
                                                                        name={`students[${index}][section_label]`}
                                                                        value={
                                                                            row.section_label
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2">
                                                                    {row.errors
                                                                        .length >
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
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                                            <FileSpreadsheet className="mb-3 size-8 text-muted-foreground" />
                                            Upload an Excel file to preview
                                            students before importing.
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
                                                processing ||
                                                !canSubmitBulkImport
                                            }
                                            className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                        >
                                            {processing && <Spinner />}
                                            Import {bulkImportRows.length}{' '}
                                            student(s)
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </AppModal>
                </>
            ) : null}
        </DeanStudentAccountsContext.Provider>
    );
}

export function DeanStudentHeaderActions() {
    const { canManageStudents, openCreateStudent, openBulkAdd } =
        useDeanStudentAccounts();

    if (!canManageStudents) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => openBulkAdd()}>
                <Upload className="mr-2 size-4" />
                Bulk Add
            </Button>
            <Button
                onClick={() => openCreateStudent()}
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
            >
                <Plus className="mr-2 size-4" />
                Add Student
            </Button>
        </div>
    );
}

export function DeanSectionAddStudentButton({
    sectionId,
    displayName,
    variant = 'outline',
}: {
    sectionId: number;
    displayName: string;
    variant?: 'outline' | 'default';
}) {
    const { canManageStudents, openCreateStudent } = useDeanStudentAccounts();

    if (!canManageStudents) {
        return null;
    }

    return (
        <Button
            type="button"
            size="sm"
            variant={variant}
            className={
                variant === 'default'
                    ? 'bg-brand text-brand-foreground hover:bg-brand-hover'
                    : undefined
            }
            onClick={(event) => {
                event.stopPropagation();
                openCreateStudent(sectionId);
                console.log('Dean section add student clicked', {
                    sectionId,
                    displayName,
                });
            }}
        >
            <Plus className="mr-1.5 size-4" />
            Add Student
        </Button>
    );
}
