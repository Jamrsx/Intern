import { Form } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { AppModal } from '@/components/superadmin/app-modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/coordinators/students';

export type PlacementStudent = {
    id: number;
    full_name: string;
    company_id: number | null;
    department_id: number | null;
    supervisor_id: number | null;
};

export type CompanyOption = {
    id: number;
    name: string;
    departments: { id: number; name: string }[];
};

export type SupervisorOption = {
    id: number;
    name: string;
    company_id: number;
    department_id: number | null;
};

type CoordinatorPlacementModalProps = {
    student: PlacementStudent | null;
    companies: CompanyOption[];
    supervisors: SupervisorOption[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function CoordinatorPlacementModal({
    student,
    companies,
    supervisors,
    open,
    onOpenChange,
}: CoordinatorPlacementModalProps) {
    const [companyId, setCompanyId] = useState('none');
    const [departmentId, setDepartmentId] = useState('none');
    const [supervisorId, setSupervisorId] = useState('none');

    const resetFromStudent = (target: PlacementStudent) => {
        setCompanyId(target.company_id ? String(target.company_id) : 'none');
        setDepartmentId(
            target.department_id ? String(target.department_id) : 'none',
        );
        setSupervisorId(
            target.supervisor_id ? String(target.supervisor_id) : 'none',
        );
    };

    useEffect(() => {
        if (student && open) {
            resetFromStudent(student);
        }
    }, [student, open]);

    const departments = useMemo(() => {
        if (companyId === 'none') {
            return [];
        }

        return (
            companies.find((company) => company.id === Number(companyId))
                ?.departments ?? []
        );
    }, [companies, companyId]);

    const filteredSupervisors = useMemo(() => {
        if (companyId === 'none') {
            return [];
        }

        return supervisors.filter((supervisor) => {
            if (supervisor.company_id !== Number(companyId)) {
                return false;
            }

            if (
                departmentId !== 'none' &&
                supervisor.department_id !== null &&
                supervisor.department_id !== Number(departmentId)
            ) {
                return false;
            }

            return true;
        });
    }, [supervisors, companyId, departmentId]);

    if (!student) {
        return null;
    }

    const updateRoute = update(student.id);

    return (
        <AppModal
            open={open}
            onOpenChange={onOpenChange}
            title={
                student.company_id === null
                    ? 'Assign OJT placement'
                    : 'Edit OJT placement'
            }
            description={`Choose company, department, and supervisor for ${student.full_name}.`}
            className="sm:max-w-xl"
        >
            <Form
                action={updateRoute.url}
                method={updateRoute.method}
                options={{ preserveScroll: true }}
                onSuccess={() => onOpenChange(false)}
                className="space-y-4"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label>Company</Label>
                            <input
                                type="hidden"
                                name="company_id"
                                value={companyId === 'none' ? '' : companyId}
                            />
                            <Select
                                value={companyId}
                                onValueChange={(value) => {
                                    setCompanyId(value);
                                    setDepartmentId('none');
                                    setSupervisorId('none');
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
                                            value={String(company.id)}
                                        >
                                            {company.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.company_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Department</Label>
                            <input
                                type="hidden"
                                name="department_id"
                                value={
                                    departmentId === 'none' ? '' : departmentId
                                }
                            />
                            <Select
                                value={departmentId}
                                onValueChange={(value) => {
                                    setDepartmentId(value);
                                    setSupervisorId('none');
                                }}
                                disabled={companyId === 'none'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        No department
                                    </SelectItem>
                                    {departments.map((department) => (
                                        <SelectItem
                                            key={department.id}
                                            value={String(department.id)}
                                        >
                                            {department.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.department_id} />
                        </div>

                        <div className="grid gap-2">
                            <Label>Supervisor</Label>
                            <input
                                type="hidden"
                                name="supervisor_id"
                                value={
                                    supervisorId === 'none' ? '' : supervisorId
                                }
                            />
                            <Select
                                value={supervisorId}
                                onValueChange={setSupervisorId}
                                disabled={companyId === 'none'}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select supervisor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        No supervisor
                                    </SelectItem>
                                    {filteredSupervisors.map((supervisor) => (
                                        <SelectItem
                                            key={supervisor.id}
                                            value={String(supervisor.id)}
                                        >
                                            {supervisor.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.supervisor_id} />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing || companyId === 'none'}
                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                {processing && <Spinner />}
                                Save placement
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </AppModal>
    );
}
