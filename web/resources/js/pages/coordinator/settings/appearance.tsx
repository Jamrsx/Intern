import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import Heading from '@/components/heading';
import { edit } from '@/routes/coordinators/settings/appearance';

export default function CoordinatorAppearanceSettings() {
    console.log('Coordinator appearance settings loaded');

    return (
        <>
            <Head title="Appearance settings" />

            <h1 className="sr-only">Appearance settings</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Appearance settings"
                    description="Update the appearance settings for your account"
                />
                <AppearanceTabs />
            </div>
        </>
    );
}

CoordinatorAppearanceSettings.layout = {
    breadcrumbs: [
        {
            title: 'Appearance settings',
            href: edit(),
        },
    ],
};
