import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Building2, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import {
    CompanyGeofenceMap,
    defaultGeofenceValue,
} from '@/components/coordinators/company-geofence-map';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/superadmin/page-header';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    index as companiesIndex,
    store,
} from '@/routes/coordinators/companies';

type DepartmentDraft = {
    name: string;
};

const emptyDepartment = (): DepartmentDraft => ({ name: '' });

export default function CoordinatorCompanyCreate() {
    const storeRoute = store();
    const initialGeofence = defaultGeofenceValue();
    const [departments, setDepartments] = useState<DepartmentDraft[]>([
        emptyDepartment(),
    ]);

    const form = useForm({
        name: '',
        address: '',
        latitude: initialGeofence.latitude,
        longitude: initialGeofence.longitude,
        geofence_radius_meters: initialGeofence.geofence_radius_meters,
        geofence_enabled: true,
        departments: [emptyDepartment()],
    });

    console.log('Coordinator company create page loaded');

    const updateDepartment = (index: number, name: string) => {
        const next = departments.map((row, rowIndex) =>
            rowIndex === index ? { name } : row,
        );
        setDepartments(next);
        form.setData('departments', next);
    };

    const addDepartmentRow = () => {
        const next = [...departments, emptyDepartment()];
        setDepartments(next);
        form.setData('departments', next);
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.setData('departments', departments);
        form.post(storeRoute.url);
    };

    return (
        <>
            <Head title="Add Company" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="-ml-2 w-fit"
                >
                    <Link href={companiesIndex().url} prefetch>
                        <ArrowLeft className="mr-1 size-4" />
                        Back to companies
                    </Link>
                </Button>

                <PageHeader
                    title="Add company"
                    description="Register an OJT partner with address, departments, and a geofence for time-in location."
                    icon={Building2}
                    badgeText="Coordinator"
                />

                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-6"
                >
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader>
                            <CardTitle>Company details</CardTitle>
                            <CardDescription>
                                Basic information and departments for intern
                                placement.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="company-name">Company name</Label>
                                <Input
                                    id="company-name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    required
                                    placeholder="Opol LGU"
                                />
                                <InputError message={form.errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="company-address">Address</Label>
                                <textarea
                                    id="company-address"
                                    value={form.data.address}
                                    onChange={(event) =>
                                        form.setData(
                                            'address',
                                            event.target.value,
                                        )
                                    }
                                    rows={3}
                                    placeholder="Company address"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={form.errors.address} />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Departments</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addDepartmentRow}
                                    >
                                        <Plus className="mr-1 size-3.5" />
                                        Add department
                                    </Button>
                                </div>

                                {departments.map((row, index) => (
                                    <div key={index} className="grid gap-2">
                                        <Input
                                            value={row.name}
                                            onChange={(event) =>
                                                updateDepartment(
                                                    index,
                                                    event.target.value,
                                                )
                                            }
                                            required
                                            placeholder="HR"
                                        />
                                        <InputError
                                            message={
                                                form.errors[
                                                    `departments.${index}.name` as keyof typeof form.errors
                                                ]
                                            }
                                        />
                                    </div>
                                ))}
                            </div>

                        </CardContent>
                    </Card>

                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader>
                            <CardTitle>Geofence</CardTitle>
                            <CardDescription>
                                Search a location, place the pin, and adjust the
                                radius (default 10 m). The map uses the full
                                width below so you can set the fence clearly.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="geofence-enabled"
                                    checked={form.data.geofence_enabled}
                                    onCheckedChange={(checked) =>
                                        form.setData(
                                            'geofence_enabled',
                                            checked === true,
                                        )
                                    }
                                />
                                <Label htmlFor="geofence-enabled">
                                    Enable geofence for this company
                                </Label>
                            </div>
                            <CompanyGeofenceMap
                                value={{
                                    latitude: form.data.latitude,
                                    longitude: form.data.longitude,
                                    geofence_radius_meters:
                                        form.data.geofence_radius_meters,
                                }}
                                onChange={(geofence) => {
                                    form.setData((current) => ({
                                        ...current,
                                        latitude: geofence.latitude,
                                        longitude: geofence.longitude,
                                        geofence_radius_meters:
                                            geofence.geofence_radius_meters,
                                    }));
                                }}
                            />
                            <InputError message={form.errors.latitude} />
                            <InputError message={form.errors.longitude} />
                            <InputError
                                message={form.errors.geofence_radius_meters}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" asChild>
                            <Link href={companiesIndex().url}>Cancel</Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="bg-brand text-brand-foreground hover:bg-brand-hover"
                        >
                            {form.processing && <Spinner />}
                            Create company
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
