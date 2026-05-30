import { Form, Head, Link, router } from '@inertiajs/react';
import { ChevronDown, Download, FileSpreadsheet, Mail, Pencil, Plus, Search, Upload, Users } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import InputError from '@/components/input-error';
import { AppModal } from '@/components/superadmin/app-modal';
import { PageHeader } from '@/components/superadmin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
import { cn } from '@/lib/utils';
import {
    downloadStudentImportTemplate,
    parseStudentImportFile,
    type BulkImportRow,
} from '@/lib/dean-student-import';
import { bulkStore, destroy, index as studentsIndex, mailAllCredentials, mailCredentials, store, update } from '@/routes/deans/students';
import { index as sectionsIndex } from '@/routes/deans/sections';

type Course = {
    id: number;
    code: string;
    name: string;
};

type SectionOption = {
    id: number;
    name: string;
    display_name: string;
    school_year: string | null | undefined;
};

type CompanyOption = {
    id: number;
    name: string;
    departments: { id: number; name: string }[];
};

type SupervisorOption = {
    id: number;
    name: string;
    company_id: number;
    department_id: number | null;
};

type StudentRow = {
    id: number;
    student_number: string;
    email: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    full_name: string;
    section_id: number;
    section: {
        id: number;
        display_name: string;
        school_year: string | null | undefined;
    } | null;
    company_id: number | null;
    company: { id: number; name: string } | null;
    department_id: number | null;
    department: { id: number; name: string } | null;
    supervisor_id: number | null;
    supervisor: { id: number; name: string } | null;
    is_active: boolean;
};

type BulkImportPreviewRow = BulkImportRow;

type StudentGroup = {
    sectionId: number;
    displayName: string;
    schoolYear: string | null | undefined;
    students: StudentRow[];
};

type Props = {
    course: Course | null;
    sections: SectionOption[];
    students: StudentRow[];
    companies: CompanyOption[];
    supervisors: SupervisorOption[];
};

const STUDENT_GROUP_STATE_KEY = 'dean-students-group-state';

function readStoredStudentGroupState(): Record<number, boolean> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(STUDENT_GROUP_STATE_KEY);

        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw) as Record<string, boolean>;

        return Object.fromEntries(
            Object.entries(parsed).map(([key, value]) => [Number(key), value]),
        );
    } catch {
        return {};
    }
}

function persistStudentGroupState(state: Record<number, boolean>): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(STUDENT_GROUP_STATE_KEY, JSON.stringify(state));
}

function StudentGroupTable({
    students,
    onEdit,
    onDeactivate,
    onMail,
    mailingStudentId,
}: {
    students: StudentRow[];
    onEdit: (student: StudentRow) => void;
    onDeactivate: (student: StudentRow) => void;
    onMail: (student: StudentRow) => void;
    mailingStudentId: number | null;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/40 text-left">
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">OJT Company</th>
                        <th className="px-4 py-3 font-medium">Supervisor</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((student) => (
                        <tr
                            key={student.id}
                            className="border-b last:border-0"
                        >
                            <td className="px-4 py-3">
                                <div className="font-medium">
                                    {student.full_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Student ID: {student.student_number}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                                {student.email}
                            </td>
                            <td className="px-4 py-3">
                                {student.company?.name ?? (
                                    <span className="text-muted-foreground">
                                        Not assigned
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                {student.supervisor?.name ?? (
                                    <span className="text-muted-foreground">
                                        Not assigned
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <Badge
                                    variant={
                                        student.is_active
                                            ? 'default'
                                            : 'secondary'
                                    }
                                    className={
                                        student.is_active
                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                                            : ''
                                    }
                                >
                                    {student.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                    {student.is_active && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            title="Email login credentials"
                                            disabled={
                                                mailingStudentId === student.id
                                            }
                                            onClick={() => onMail(student)}
                                        >
                                            {mailingStudentId === student.id ? (
                                                <Spinner className="size-3.5" />
                                            ) : (
                                                <Mail className="size-3.5" />
                                            )}
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onEdit(student)}
                                    >
                                        <Pencil className="size-3.5" />
                                    </Button>
                                    {student.is_active && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700"
                                            onClick={() =>
                                                onDeactivate(student)
                                            }
                                        >
                                            Deactivate
                                        </Button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function studentMatchesSearch(student: StudentRow, query: string): boolean {
    const normalized = query.trim().toLowerCase();

    if (normalized === '') {
        return true;
    }

    const searchable = [
        student.student_number,
        student.first_name,
        student.middle_name ?? '',
        student.last_name,
        student.full_name,
    ]
        .join(' ')
        .toLowerCase();

    return searchable.includes(normalized);
}

function SectionSelect({
    sections,
    value,
    onChange,
    name = 'section_id',
}: {
    sections: SectionOption[];
    value: string;
    onChange: (value: string) => void;
    name?: string;
}) {
    return (
        <>
            <input type="hidden" name={name} value={value} />
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                    {sections.map((section) => (
                        <SelectItem key={section.id} value={String(section.id)}>
                            {section.display_name}
                            {section.school_year
                                ? ` (${section.school_year})`
                                : ''}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </>
    );
}

export default function DeanStudents({
    course,
    sections,
    students,
    companies,
    supervisors,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [editStudent, setEditStudent] = useState<StudentRow | null>(null);
    const [createSectionId, setCreateSectionId] = useState('');
    const [editSectionId, setEditSectionId] = useState('');
    const [editCompanyId, setEditCompanyId] = useState('none');
    const [editDepartmentId, setEditDepartmentId] = useState('none');
    const [editSupervisorId, setEditSupervisorId] = useState('none');
    const [bulkImportRows, setBulkImportRows] = useState<BulkImportPreviewRow[]>(
        [],
    );
    const [bulkImportError, setBulkImportError] = useState<string | null>(null);
    const [bulkImportFileName, setBulkImportFileName] = useState('');
    const bulkImportInputRef = useRef<HTMLInputElement>(null);
    const [mailingStudentId, setMailingStudentId] = useState<number | null>(null);
    const [mailingAll, setMailingAll] = useState(false);
    const [filterSectionId, setFilterSectionId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
    const [hasLoadedGroupState, setHasLoadedGroupState] = useState(false);

    useLayoutEffect(() => {
        const storedState = readStoredStudentGroupState();
        setOpenGroups(storedState);
        setHasLoadedGroupState(true);
        console.log('Dean students group state restored', storedState);
    }, []);

    const storeRoute = store();
    const bulkStoreRoute = bulkStore();
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

    const openBulkImportModal = () => {
        resetBulkImport();
        setBulkOpen(true);
    };

    const handleDownloadTemplate = () => {
        if (!course) {
            return;
        }

        downloadStudentImportTemplate(course.code, sections);
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

    console.log('Dean Students page loaded', {
        course,
        sectionsCount: sections.length,
        studentsCount: students.length,
        searchQuery,
        savedGroupState: openGroups,
    });

    const filteredStudents = useMemo(() => {
        return students.filter((student) =>
            studentMatchesSearch(student, searchQuery),
        );
    }, [students, searchQuery]);

    const studentGroups = useMemo(() => {
        const bySection = new Map<number, StudentRow[]>();

        for (const student of filteredStudents) {
            const existing = bySection.get(student.section_id) ?? [];
            existing.push(student);
            bySection.set(student.section_id, existing);
        }

        return sections
            .filter((section) => bySection.has(section.id))
            .map((section) => ({
                sectionId: section.id,
                displayName: section.display_name,
                schoolYear: section.school_year,
                students: bySection.get(section.id) ?? [],
            }));
    }, [filteredStudents, sections]);

    const filteredGroups = useMemo(() => {
        if (filterSectionId === 'all') {
            return studentGroups;
        }

        return studentGroups.filter(
            (group) => String(group.sectionId) === filterSectionId,
        );
    }, [filterSectionId, studentGroups]);

    const sectionsWithStudents = useMemo(
        () =>
            sections.filter((section) =>
                students.some((student) => student.section_id === section.id),
            ),
        [sections, students],
    );

    const isGroupOpen = (group: StudentGroup) => {
        if (searchQuery.trim() !== '') {
            return true;
        }

        if (!hasLoadedGroupState) {
            return false;
        }

        if (openGroups[group.sectionId] !== undefined) {
            return openGroups[group.sectionId];
        }

        return true;
    };

    const toggleGroup = (sectionId: number, open: boolean) => {
        setOpenGroups((current) => {
            const next = {
                ...current,
                [sectionId]: open,
            };

            persistStudentGroupState(next);
            console.log('Dean students group state saved', next);

            return next;
        });
    };

    const editDepartments = useMemo(() => {
        if (editCompanyId === 'none') {
            return [];
        }

        return (
            companies.find(
                (company) => company.id === Number(editCompanyId),
            )?.departments ?? []
        );
    }, [companies, editCompanyId]);

    const editSupervisors = useMemo(() => {
        if (editCompanyId === 'none') {
            return [];
        }

        return supervisors.filter((supervisor) => {
            if (supervisor.company_id !== Number(editCompanyId)) {
                return false;
            }

            if (
                editDepartmentId !== 'none' &&
                supervisor.department_id !== null &&
                supervisor.department_id !== Number(editDepartmentId)
            ) {
                return false;
            }

            return true;
        });
    }, [supervisors, editCompanyId, editDepartmentId]);

    const handleDeactivate = (student: StudentRow) => {
        if (!confirm(`Deactivate ${student.full_name}?`)) {
            return;
        }

        router.delete(destroy(student.id).url, { preserveScroll: true });
    };

    const openEditModal = (student: StudentRow) => {
        setEditStudent(student);
        setEditSectionId(String(student.section_id));
        setEditCompanyId(
            student.company_id ? String(student.company_id) : 'none',
        );
        setEditDepartmentId(
            student.department_id ? String(student.department_id) : 'none',
        );
        setEditSupervisorId(
            student.supervisor_id ? String(student.supervisor_id) : 'none',
        );
    };

    const canManageStudents = course !== null && sections.length > 0;
    const activeStudentsCount = useMemo(
        () => students.filter((student) => student.is_active).length,
        [students],
    );
    const mailAllRoute = mailAllCredentials();

    const handleMailStudent = (student: StudentRow) => {
        if (
            !confirm(
                `Send login credentials to ${student.full_name}? This will reset their password.`,
            )
        ) {
            return;
        }

        console.log('Dean mail student credentials', {
            studentId: student.id,
            email: student.email,
        });

        setMailingStudentId(student.id);
        router.post(mailCredentials(student.id).url, {}, {
            preserveScroll: true,
            onFinish: () => setMailingStudentId(null),
        });
    };

    const handleMailAllStudents = () => {
        if (activeStudentsCount === 0) {
            return;
        }

        if (
            !confirm(
                `Send login credentials to all ${activeStudentsCount} active student(s)? This will reset each student's password.`,
            )
        ) {
            return;
        }

        console.log('Dean mail all student credentials', {
            count: activeStudentsCount,
        });

        setMailingAll(true);
        router.post(mailAllRoute.url, {}, {
            preserveScroll: true,
            onFinish: () => setMailingAll(false),
        });
    };

    return (
        <>
            <Head title="Students" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Students"
                    description={
                        course
                            ? `Create intern accounts for ${course.code} and assign them to sections.`
                            : 'You need an assigned course before you can manage students.'
                    }
                    icon={Users}
                    badgeText="Dean"
                    action={
                        canManageStudents ? (
                            <div className="flex flex-wrap gap-2">
                                {students.length > 0 && (
                                    <Button
                                        variant="outline"
                                        disabled={
                                            mailingAll ||
                                            activeStudentsCount === 0
                                        }
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
                                    onClick={openBulkImportModal}
                                >
                                    <Upload className="mr-2 size-4" />
                                    Bulk Add
                                </Button>
                                <Button
                                    onClick={() => {
                                        setCreateSectionId(
                                            String(sections[0]?.id ?? ''),
                                        );
                                        setCreateOpen(true);
                                    }}
                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                >
                                    <Plus className="mr-2 size-4" />
                                    Add Student
                                </Button>
                            </div>
                        ) : undefined
                    }
                />

                {!course && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No course is assigned to your dean account yet.
                        </CardContent>
                    </Card>
                )}

                {course && sections.length === 0 && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No active sections found.{' '}
                            <Link
                                href={sectionsIndex().url}
                                className="text-brand underline-offset-4 hover:underline"
                            >
                                Create a section first
                            </Link>
                            .
                        </CardContent>
                    </Card>
                )}

                {course && sections.length > 0 && students.length === 0 && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            No students yet. Use{' '}
                            <span className="font-medium text-foreground">
                                Add Student
                            </span>{' '}
                            or{' '}
                            <span className="font-medium text-foreground">
                                Bulk Add
                            </span>{' '}
                            to create accounts and assign them to a section.
                        </CardContent>
                    </Card>
                )}

                {course && sections.length > 0 && students.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="search-students">
                                    Search students
                                </Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="search-students"
                                        value={searchQuery}
                                        onChange={(event) => {
                                            setSearchQuery(event.target.value);
                                            console.log(
                                                'Dean students search',
                                                event.target.value,
                                            );
                                        }}
                                        placeholder="Search by student ID, first name, middle name, or last name"
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="w-full lg:w-64">
                                <Label
                                    htmlFor="filter-section"
                                    className="mb-2 block text-sm"
                                >
                                    Filter by section
                                </Label>
                                <Select
                                    value={filterSectionId}
                                    onValueChange={setFilterSectionId}
                                >
                                    <SelectTrigger
                                        id="filter-section"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="All sections" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All sections
                                        </SelectItem>
                                        {sectionsWithStudents.map((section) => (
                                            <SelectItem
                                                key={section.id}
                                                value={String(section.id)}
                                            >
                                                {section.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Students grouped by section. Expand a section to
                            view or manage its interns.
                            {searchQuery.trim() !== '' && (
                                <>
                                    {' '}
                                    Showing {filteredStudents.length} of{' '}
                                    {students.length} student(s) matching your
                                    search.
                                </>
                            )}
                        </p>

                        {filteredGroups.length === 0 ? (
                            <Card className="border-sidebar-border/70">
                                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                    {searchQuery.trim() !== ''
                                        ? 'No students match your search.'
                                        : 'No students found for the selected section.'}
                                </CardContent>
                            </Card>
                        ) : (
                            filteredGroups.map((group) => (
                                <Collapsible
                                    key={group.sectionId}
                                    open={isGroupOpen(group)}
                                    onOpenChange={(open) =>
                                        toggleGroup(group.sectionId, open)
                                    }
                                >
                                    <Card className="overflow-hidden border-sidebar-border/70 py-0">
                                        <CollapsibleTrigger asChild>
                                            <button
                                                type="button"
                                                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40"
                                            >
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-semibold">
                                                            {group.displayName}
                                                        </h3>
                                                        {group.schoolYear && (
                                                            <Badge variant="secondary">
                                                                {group.schoolYear}
                                                            </Badge>
                                                        )}
                                                        <Badge className="bg-brand text-brand-foreground hover:bg-brand">
                                                            {group.students.length}{' '}
                                                            {group.students.length === 1
                                                                ? 'student'
                                                                : 'students'}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Click to expand or collapse
                                                    </p>
                                                </div>
                                                <ChevronDown
                                                    className={cn(
                                                        'size-5 shrink-0 text-muted-foreground transition-transform',
                                                        isGroupOpen(group) &&
                                                            'rotate-180',
                                                    )}
                                                />
                                            </button>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <div className="border-t">
                                                <StudentGroupTable
                                                    students={group.students}
                                                    onEdit={openEditModal}
                                                    onDeactivate={
                                                        handleDeactivate
                                                    }
                                                    onMail={handleMailStudent}
                                                    mailingStudentId={
                                                        mailingStudentId
                                                    }
                                                />
                                            </div>
                                        </CollapsibleContent>
                                    </Card>
                                </Collapsible>
                            ))
                        )}
                    </div>
                )}
            </div>

            {course && (
                <AppModal
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    title="Add Student"
                    description="Create a single intern account and assign a section."
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
                                        <InputError
                                            message={errors.first_name}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="create-middle-name">
                                            Middle name
                                        </Label>
                                        <Input
                                            id="create-middle-name"
                                            name="middle_name"
                                        />
                                        <InputError
                                            message={errors.middle_name}
                                        />
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
                                    <Label>Section</Label>
                                    <SectionSelect
                                        sections={sections}
                                        value={createSectionId}
                                        onChange={setCreateSectionId}
                                    />
                                    <InputError message={errors.section_id} />
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
                                        disabled={
                                            processing || !createSectionId
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
            )}

            {course && (
                <AppModal
                    open={bulkOpen}
                    onOpenChange={(open) => {
                        setBulkOpen(open);

                        if (!open) {
                            resetBulkImport();
                        }
                    }}
                    title="Bulk Add Students"
                    description="Import students from an Excel file using the provided template."
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
                                        Row 1 is the header row. Enter each
                                        student starting from row 2 (one student
                                        per row).
                                    </p>
                                    <div className="mt-3 overflow-x-auto rounded-md border bg-background">
                                        <table className="w-full min-w-[640px] text-left text-xs">
                                            <thead>
                                                <tr className="border-b bg-muted/50">
                                                    <th className="px-3 py-2 font-medium text-foreground">
                                                        A · studentid
                                                    </th>
                                                    <th className="px-3 py-2 font-medium text-foreground">
                                                        B · gmail
                                                    </th>
                                                    <th className="px-3 py-2 font-medium text-foreground">
                                                        C · lastname
                                                    </th>
                                                    <th className="px-3 py-2 font-medium text-foreground">
                                                        D · firstname
                                                    </th>
                                                    <th className="px-3 py-2 font-medium text-foreground">
                                                        E · middleinitial
                                                    </th>
                                                    <th className="px-3 py-2 font-medium text-foreground">
                                                        F · section
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="px-3 py-2">
                                                        2022-0-00000
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        name@gmail.com
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        Doe
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        John
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        M
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        4A
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <p className="mt-2">
                                        Use section codes only (4A, 4B, 4C).
                                        Gmail and middle initial are optional.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="space-y-1">
                                        <Label htmlFor="bulk-import-file">
                                            Import Excel file
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Upload a .xlsx or .xls file from
                                            the template.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleDownloadTemplate}
                                    >
                                        <Download className="mr-2 size-4" />
                                        Download Template
                                    </Button>
                                </div>

                                <div className="grid gap-2">
                                    <Input
                                        id="bulk-import-file"
                                        ref={bulkImportInputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={handleBulkImportFile}
                                    />
                                    {bulkImportFileName && (
                                        <p className="text-xs text-muted-foreground">
                                            Selected file: {bulkImportFileName}
                                        </p>
                                    )}
                                    {bulkImportError && (
                                        <p className="text-sm text-red-600">
                                            {bulkImportError}
                                        </p>
                                    )}
                                </div>

                                {bulkImportRows.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>
                                                Import preview (
                                                {bulkImportRows.length} student
                                                {bulkImportRows.length === 1
                                                    ? ''
                                                    : 's'}
                                                )
                                            </Label>
                                            {bulkImportHasErrors && (
                                                <Badge variant="secondary">
                                                    Fix highlighted rows before
                                                    importing
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="max-h-80 overflow-auto rounded-lg border">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/40 text-left">
                                                        <th className="px-3 py-2 font-medium">
                                                            Student ID
                                                        </th>
                                                        <th className="px-3 py-2 font-medium">
                                                            Name
                                                        </th>
                                                        <th className="px-3 py-2 font-medium">
                                                            Section
                                                        </th>
                                                        <th className="px-3 py-2 font-medium">
                                                            Email
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
                                                                className={cn(
                                                                    'border-b last:border-0',
                                                                    row.errors
                                                                        .length >
                                                                        0 &&
                                                                        'bg-red-50/70 dark:bg-red-950/20',
                                                                )}
                                                            >
                                                                <td className="px-3 py-2 align-top">
                                                                    <input
                                                                        type="hidden"
                                                                        name={`students[${index}][student_number]`}
                                                                        value={
                                                                            row.student_number
                                                                        }
                                                                    />
                                                                    {
                                                                        row.student_number
                                                                    }
                                                                    <InputError
                                                                        message={
                                                                            errors[
                                                                                `students.${index}.student_number`
                                                                            ]
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2 align-top">
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
                                                                    {[
                                                                        row.first_name,
                                                                        row.middle_name,
                                                                        row.last_name,
                                                                    ]
                                                                        .filter(
                                                                            Boolean,
                                                                        )
                                                                        .join(
                                                                            ' ',
                                                                        )}
                                                                    <InputError
                                                                        message={
                                                                            errors[
                                                                                `students.${index}.first_name`
                                                                            ] ??
                                                                            errors[
                                                                                `students.${index}.last_name`
                                                                            ]
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2 align-top">
                                                                    <input
                                                                        type="hidden"
                                                                        name={`students[${index}][section_id]`}
                                                                        value={
                                                                            row.section_id
                                                                        }
                                                                    />
                                                                    {
                                                                        row.section_label
                                                                    }
                                                                    <InputError
                                                                        message={
                                                                            errors[
                                                                                `students.${index}.section_id`
                                                                            ]
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2 align-top text-muted-foreground">
                                                                    <input
                                                                        type="hidden"
                                                                        name={`students[${index}][email]`}
                                                                        value={
                                                                            row.email
                                                                        }
                                                                    />
                                                                    {row.email}
                                                                    <InputError
                                                                        message={
                                                                            errors[
                                                                                `students.${index}.email`
                                                                            ]
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="px-3 py-2 align-top">
                                                                    {row.errors
                                                                        .length >
                                                                    0 ? (
                                                                        <div className="space-y-1 text-xs text-red-600">
                                                                            {row.errors.map(
                                                                                (
                                                                                    error,
                                                                                ) => (
                                                                                    <p
                                                                                        key={
                                                                                            error
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            error
                                                                                        }
                                                                                    </p>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-emerald-600">
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
                                    </div>
                                )}

                                {bulkImportRows.length === 0 && (
                                    <div className="flex items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                                        <div>
                                            <FileSpreadsheet className="mx-auto mb-3 size-8 opacity-60" />
                                            Download the template, fill in your
                                            students, then upload the Excel
                                            file here.
                                        </div>
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
                                        Import Students
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </AppModal>
            )}

            {editStudent && course && (
                <AppModal
                    open={!!editStudent}
                    onOpenChange={(open) => !open && setEditStudent(null)}
                    title="Edit Student"
                    description={`Update ${editStudent.full_name}`}
                    className="sm:max-w-2xl"
                >
                    <Form
                        action={update(editStudent.id).url}
                        method={update(editStudent.id).method}
                        onSuccess={() => setEditStudent(null)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-student-number">
                                        Student ID
                                    </Label>
                                    <Input
                                        id="edit-student-number"
                                        name="student_number"
                                        defaultValue={editStudent.student_number}
                                        required
                                        placeholder="2022-0-00000"
                                        pattern="\d{4}-\d{1,2}-\d{4,6}"
                                    />
                                    <InputError message={errors.student_number} />
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-first-name">
                                            First name
                                        </Label>
                                        <Input
                                            id="edit-first-name"
                                            name="first_name"
                                            defaultValue={
                                                editStudent.first_name
                                            }
                                            required
                                        />
                                        <InputError
                                            message={errors.first_name}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-middle-name">
                                            Middle name
                                        </Label>
                                        <Input
                                            id="edit-middle-name"
                                            name="middle_name"
                                            defaultValue={
                                                editStudent.middle_name ?? ''
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-last-name">
                                        Last name
                                    </Label>
                                    <Input
                                        id="edit-last-name"
                                        name="last_name"
                                        defaultValue={editStudent.last_name}
                                        required
                                    />
                                    <InputError message={errors.last_name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-email">Email</Label>
                                    <Input
                                        id="edit-email"
                                        name="email"
                                        type="email"
                                        defaultValue={editStudent.email}
                                        required
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Section</Label>
                                    <SectionSelect
                                        sections={sections}
                                        value={editSectionId}
                                        onChange={setEditSectionId}
                                    />
                                    <InputError message={errors.section_id} />
                                </div>

                                <div className="rounded-lg border p-4 space-y-4">
                                    <p className="text-sm font-medium">
                                        OJT placement (optional)
                                    </p>
                                    <div className="grid gap-2">
                                        <Label>Company</Label>
                                        <input
                                            type="hidden"
                                            name="company_id"
                                            value={
                                                editCompanyId === 'none'
                                                    ? ''
                                                    : editCompanyId
                                            }
                                        />
                                        <Select
                                            value={editCompanyId}
                                            onValueChange={(value) => {
                                                setEditCompanyId(value);
                                                setEditDepartmentId('none');
                                                setEditSupervisorId('none');
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select company" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    No company
                                                </SelectItem>
                                                {companies.map((company) => (
                                                    <SelectItem
                                                        key={company.id}
                                                        value={String(
                                                            company.id,
                                                        )}
                                                    >
                                                        {company.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={errors.company_id}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Department</Label>
                                        <input
                                            type="hidden"
                                            name="department_id"
                                            value={
                                                editDepartmentId === 'none'
                                                    ? ''
                                                    : editDepartmentId
                                            }
                                        />
                                        <Select
                                            value={editDepartmentId}
                                            onValueChange={(value) => {
                                                setEditDepartmentId(value);
                                                setEditSupervisorId('none');
                                            }}
                                            disabled={editCompanyId === 'none'}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select department" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    No department
                                                </SelectItem>
                                                {editDepartments.map(
                                                    (department) => (
                                                        <SelectItem
                                                            key={department.id}
                                                            value={String(
                                                                department.id,
                                                            )}
                                                        >
                                                            {department.name}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={errors.department_id}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Supervisor</Label>
                                        <input
                                            type="hidden"
                                            name="supervisor_id"
                                            value={
                                                editSupervisorId === 'none'
                                                    ? ''
                                                    : editSupervisorId
                                            }
                                        />
                                        <Select
                                            value={editSupervisorId}
                                            onValueChange={setEditSupervisorId}
                                            disabled={editCompanyId === 'none'}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select supervisor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    No supervisor
                                                </SelectItem>
                                                {editSupervisors.map(
                                                    (supervisor) => (
                                                        <SelectItem
                                                            key={supervisor.id}
                                                            value={String(
                                                                supervisor.id,
                                                            )}
                                                        >
                                                            {supervisor.name}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={errors.supervisor_id}
                                        />
                                        {editCompanyId !== 'none' &&
                                            editSupervisors.length === 0 && (
                                                <p className="text-xs text-muted-foreground">
                                                    No supervisors available for
                                                    this company yet.
                                                </p>
                                            )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="hidden"
                                        name="is_active"
                                        value="0"
                                    />
                                    <Checkbox
                                        id="edit-is-active"
                                        name="is_active"
                                        value="1"
                                        defaultChecked={editStudent.is_active}
                                    />
                                    <Label htmlFor="edit-is-active">
                                        Account is active
                                    </Label>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditStudent(null)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            processing || !editSectionId
                                        }
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
            )}
        </>
    );
}

DeanStudents.layout = {
    breadcrumbs: [{ title: 'Students', href: studentsIndex().url }],
};
