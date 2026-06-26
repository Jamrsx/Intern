import { Link, usePage } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';
import type { Auth } from '@/types';
import { edit as editSuperAdminAppearance } from '@/routes/superadmin/appearance';
import { edit as editSuperAdminProfile } from '@/routes/superadmin/profile';
import { edit as editSuperAdminSecurity } from '@/routes/superadmin/security';
import { edit as editDeanAppearance } from '@/routes/deans/settings/appearance';
import { edit as editDeanProfile } from '@/routes/deans/settings/profile';
import { edit as editDeanSecurity } from '@/routes/deans/settings/security';
import { edit as editCoordinatorAppearance } from '@/routes/coordinators/settings/appearance';
import { edit as editCoordinatorProfile } from '@/routes/coordinators/settings/profile';
import { edit as editCoordinatorSecurity } from '@/routes/coordinators/settings/security';

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const { auth } = usePage<{ auth: Auth }>().props;

    const isSuperAdmin = auth.user?.role?.name === 'super_admin';
    const isDeanPortalUser =
        auth.user?.role?.name === 'dean'
        || auth.user?.role?.name === 'program_head';
    const isCoordinator = auth.user?.role?.name === 'coordinator';

    const sidebarNavItems: NavItem[] = [
        {
            title: 'Profile',
            href: isSuperAdmin
                ? editSuperAdminProfile()
                : isDeanPortalUser
                    ? editDeanProfile()
                    : isCoordinator
                        ? editCoordinatorProfile()
                        : edit(),
            icon: null,
        },
        {
            title: 'Security',
            href: isSuperAdmin
                ? editSuperAdminSecurity()
                : isDeanPortalUser
                    ? editDeanSecurity()
                    : isCoordinator
                        ? editCoordinatorSecurity()
                        : editSecurity(),
            icon: null,
        },
        {
            title: 'Appearance',
            href: isSuperAdmin
                ? editSuperAdminAppearance()
                : isDeanPortalUser
                    ? editDeanAppearance()
                    : isCoordinator
                        ? editCoordinatorAppearance()
                        : editAppearance(),
            icon: null,
        },
    ];

    return (
        <div className="px-4 py-6">
            <Heading
                title="Settings"
                description="Manage your profile and account settings"
            />

            <div className="flex flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav
                        className="flex flex-col space-y-1 space-x-0"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${toUrl(item.href)}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': isCurrentOrParentUrl(item.href),
                                })}
                            >
                                <Link href={item.href}>
                                    {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                    )}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">
                        {children}
                    </section>
                </div>
            </div>
        </div>
    );
}
