import { Form, Head, Link, router } from '@inertiajs/react';
import {
    ChevronDown,
    Download,
    FileSpreadsheet,
    Mail,
    Pencil,
    Plus,
    Search,
    Trash2,
    Upload,
    Users,
} from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
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
    coordinator: {
        id: number;
        name: string;
        email: string;
    } | null;
};

type CoordinatorSummary = {
    id: number;
    name: string;
    email: string;
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
        coordinator: CoordinatorSummary | null;
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
    coordinator: CoordinatorSummary | null;
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
const DEFAULT_STUDENT_PASSWORD = 'password';

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
                        <th className="px-4 py-3 font-medium">Section</th>
                        <th className="px-4 py-3 font-medium">Coordinator</th>
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
                            <td className="px-4 py-3">
                                <div className="font-medium">
                                    {student.section?.display_name ?? (
                                        <span className="text-muted-foreground">
                                            Unassigned
                                        </span>
                                    )}
                                </div>
                                {student.section?.school_year ? (
                                    <div className="text-xs text-muted-foreground">
                                        {student.section.school_year}
                                    </div>
                                ) : null}
                            </td>
                            <td className="px-4 py-3">
                                {student.section?.coordinator?.name ?? (
                                    <span className="text-amber-600">
                                        Unassigned
                                    </span>
                                )}
                                {student.section?.coordinator?.email ? (
                                    <div className="text-xs text-muted-foreground">
                                        {student.section.coordinator.email}
                                    </div>
                                ) : null}
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
    disabled = false,
}: {
    sections: SectionOption[];
    value: string;
    onChange: (value: string) => void;
    name?: string;
    disabled?: boolean;
}) {
    const selectedSection = sections.find(
        (section) => String(section.id) === value,
    );
    const selectedLabel = selectedSection
        ? `${selectedSection.display_name}${
              selectedSection.school_year
                  ? ` (${selectedSection.school_year})`
                  : ''
          }`
        : '';

    if (disabled) {
        return (
            <>
                <input type="hidden" name={name} value={value} />
                <Input
                    readOnly
                    disabled
                    value={selectedLabel}
                    className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                    Section is locked because you started from this section group.
                </p>
            </>
        );
    }

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
    const [createSectionLocked, setCreateSectionLocked] = useState(false);
    const [createPassword, setCreatePassword] = useState(DEFAULT_STUDENT_PASSWORD);
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

    const openCreateStudentModal = (sectionId?: number) => {
        if (sectionId !== undefined) {
            setCreateSectionId(String(sectionId));
            setCreateSectionLocked(true);
        } else {
            setCreateSectionId(String(sections[0]?.id ?? ''));
            setCreateSectionLocked(false);
        }

        setCreatePassword(DEFAULT_STUDENT_PASSWORD);
        setCreateOpen(true);

        console.log('Dean open create student modal', {
            sectionId: sectionId ?? null,
            locked: sectionId !== undefined,
        });
    };

    const handleCreateModalChange = (open: boolean) => {
        setCreateOpen(open);

        if (!open) {
            setCreateSectionLocked(false);
            setCreatePassword(DEFAULT_STUDENT_PASSWORD);
        }
    };

    const lockedCreateSection = useMemo(() => {
        if (!createSectionLocked || createSectionId === '') {
            return null;
        }

        return (
            sections.find((section) => String(section.id) === createSectionId) ??
            null
        );
    }, [createSectionId, createSectionLocked, sections]);

    const handleDownloadTemplate = () => {
        if (!course) {
            return;
        }

        downloadStudentImportTemplate(course.code, sections);
    };

    const handleRemoveBulkImportRow = (index: number) => {
        setBulkImportRows((current) => {
            const next = current.filter((_, rowIndex) => rowIndex !== index);

            console.log('Dean bulk import row removed', {
                removedIndex: index,
                remainingRows: next.length,
            });

            return next;
        });
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

        const hasSearch = searchQuery.trim() !== '';

        return sections
            .filter((section) => !hasSearch || bySection.has(section.id))
            .map((section) => ({
                sectionId: section.id,
                displayName: section.display_name,
                schoolYear: section.school_year,
                coordinator: section.coordinator,
                students: bySection.get(section.id) ?? [],
            }));
    }, [filteredStudents, sections, searchQuery]);

    const filteredGroups = useMemo(() => {
        if (filterSectionId === 'all') {
            return studentGroups;
        }

        return studentGroups.filter(
            (group) => String(group.sectionId) === filterSectionId,
        );
    }, [filterSectionId, studentGroups]);

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
                `Send login credentials to ${student.full_name}? Their password will be reset to "${DEFAULT_STUDENT_PASSWORD}" and emailed.`,
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
                `Send login credentials to all ${activeStudentsCount} active student(s)? Each password will be reset to "${DEFAULT_STUDENT_PASSWORD}" and emailed.`,
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
                                    onClick={() => openCreateStudentModal()}
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

                {course && sections.length > 0 && (
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
                                        {sections.map((section) => (
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
                            view or manage its interns. Empty sections are
                            shown so you can add students directly.
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
                                        <div className="flex items-center justify-between gap-3 px-4 py-4">
                                            <CollapsibleTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left transition-colors hover:bg-muted/40"
                                                >
                                                    <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-semibold">
                                                            {group.displayName}
                                                        </h3>
                                                        {group.schoolYear && (
                                                            <Badge variant="secondary">
                                                                {group.schoolYear}
                                                            </Badge>
                                                        )}
                                                        <Badge
                                                            variant={
                                                                group.students.length === 0
                                                                    ? 'secondary'
                                                                    : 'default'
                                                            }
                                                            className={
                                                                group.students.length === 0
                                                                    ? ''
                                                                    : 'bg-brand text-brand-foreground hover:bg-brand'
                                                            }
                                                        >
                                                            {group.students.length === 0
                                                                ? 'Empty section'
                                                                : `${group.students.length} ${
                                                                      group.students.length === 1
                                                                          ? 'student'
                                                                          : 'students'
                                                                  }`}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Coordinator:{' '}
                                                        {group.coordinator ? (
                                                            <span className="text-foreground">
                                                                {
                                                                    group
                                                                        .coordinator
                                                                        .name
                                                                }
                                                                <span className="text-muted-foreground">
                                                                    {' '}
                                                                    (
                                                                    {
                                                                        group
                                                                            .coordinator
                                                                            .email
                                                                    }
                                                                    )
                                                                </span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-600">
                                                                Unassigned
                                                            </span>
                                                        )}
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
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="shrink-0"
                                                onClick={() =>
                                                    openCreateStudentModal(
                                                        group.sectionId,
                                                    )
                                                }
                                            >
                                                <Plus className="mr-1 size-3.5" />
                                                Add Student
                                            </Button>
                                        </div>

                                        <CollapsibleContent>
                                            <div className="border-t">
                                                {group.students.length === 0 ? (
                                                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                                                        No students in this section yet.
                                                        <div className="mt-4">
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                                                onClick={() =>
                                                                    openCreateStudentModal(
                                                                        group.sectionId,
                                                                    )
                                                                }
                                                            >
                                                                <Plus className="mr-1 size-3.5" />
                                                                Add Student
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
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
                                                )}
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
                    onOpenChange={handleCreateModalChange}
                    title="Add Student"
                    description={
                        lockedCreateSection
                            ? `Create a student account and assign them to ${lockedCreateSection.display_name}.`
                            : 'Create a single intern account and assign a section.'
                    }
                >
                    <Form
                        action={storeRoute.url}
                        method={storeRoute.method}
                        onSuccess={() => handleCreateModalChange(false)}
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
                                        Defaults to &quot;{DEFAULT_STUDENT_PASSWORD}&quot;.
                                        You can email credentials to the student later from this page.
                                    </p>
                                    <InputError message={errors.password} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Section</Label>
                                    <SectionSelect
                                        sections={sections}
                                        value={createSectionId}
                                        onChange={setCreateSectionId}
                                        disabled={createSectionLocked}
                                    />
                                    <InputError message={errors.section_id} />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => handleCreateModalChange(false)}
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
                    description="Import students from Excel. Missing sections like 4C-FM will be created automatically in the active school year."
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
                                        per row). If a section code does not
                                        exist yet, it will be created during
                                        import.
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
                                                        <th className="px-3 py-2 text-right font-medium">
                                                            Actions
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
                                                                    {row.section_id ? (
                                                                        <input
                                                                            type="hidden"
                                                                            name={`students[${index}][section_id]`}
                                                                            value={
                                                                                row.section_id
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        <input
                                                                            type="hidden"
                                                                            name={`students[${index}][section_label]`}
                                                                            value={
                                                                                row.section_label
                                                                            }
                                                                        />
                                                                    )}
                                                                    {
                                                                        row.section_label
                                                                    }
                                                                    <InputError
                                                                        message={
                                                                            errors[
                                                                                `students.${index}.section_id`
                                                                            ] ??
                                                                            errors[
                                                                                `students.${index}.section_label`
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
                                                                    ) : row.will_create_section ? (
                                                                        <span className="text-xs text-blue-600">
                                                                            Will
                                                                            create
                                                                            section
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs text-emerald-600">
                                                                            Ready
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 align-top">
                                                                    <div className="flex justify-end">
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="text-red-600 hover:text-red-700"
                                                                            title="Remove from import"
                                                                            onClick={() =>
                                                                                handleRemoveBulkImportRow(
                                                                                    index,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                        </Button>
                                                                    </div>
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
