import { Head, Link, useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';
import { ArrowLeft, Building2 } from 'lucide-react';
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
    update,
} from '@/routes/coordinators/companies';

type CompanyPayload = {
    id: number;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    geofence_radius_meters: number;
    geofence_enabled: boolean;
    is_active: boolean;
};

type Props = {
    company: CompanyPayload;
};

export default function CoordinatorCompanyEdit({ company }: Props) {
    const updateRoute = update(company.id);
    const fallback = defaultGeofenceValue();

    const form = useForm({
        name: company.name,
        address: company.address ?? '',
        latitude: company.latitude ?? fallback.latitude,
        longitude: company.longitude ?? fallback.longitude,
        geofence_radius_meters:
            company.geofence_radius_meters || fallback.geofence_radius_meters,
        geofence_enabled: company.geofence_enabled,
        is_active: company.is_active,
    });

    console.log('Coordinator company edit page loaded', {
        companyId: company.id,
    });

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        form.patch(updateRoute.url);
    };

    return (
        <>
            <Head title={`Edit ${company.name}`} />

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
                    title="Edit company"
                    description={`Update ${company.name}, address, and geofence.`}
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
                                Name, address, and status for this OJT partner.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-company-name">
                                    Company name
                                </Label>
                                <Input
                                    id="edit-company-name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    required
                                />
                                <InputError message={form.errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-company-address">
                                    Address
                                </Label>
                                <textarea
                                    id="edit-company-address"
                                    value={form.data.address}
                                    onChange={(event) =>
                                        form.setData(
                                            'address',
                                            event.target.value,
                                        )
                                    }
                                    rows={3}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={form.errors.address} />
                            </div>

                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="edit-company-active"
                                    checked={form.data.is_active}
                                    onCheckedChange={(checked) =>
                                        form.setData(
                                            'is_active',
                                            checked === true,
                                        )
                                    }
                                />
                                <Label htmlFor="edit-company-active">
                                    Active company
                                </Label>
                            </div>

                        </CardContent>
                    </Card>

                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader>
                            <CardTitle>Geofence</CardTitle>
                            <CardDescription>
                                Search, drag the pin, or click the map. Adjust
                                the radius with the slider below the map.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="edit-geofence-enabled"
                                    checked={form.data.geofence_enabled}
                                    onCheckedChange={(checked) =>
                                        form.setData(
                                            'geofence_enabled',
                                            checked === true,
                                        )
                                    }
                                />
                                <Label htmlFor="edit-geofence-enabled">
                                    Enable geofence
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
                            Save changes
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}
