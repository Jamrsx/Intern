import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type PageHeaderProps = {
    title: string;
    description: string;
    icon: LucideIcon;
    action?: React.ReactNode;
    badgeText?: string;
};

export function PageHeader({
    title,
    description,
    icon: Icon,
    action,
    badgeText = 'Super Admin',
}: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand shadow-md">
                    <Icon className="size-6 text-brand-foreground" />
                </div>
                <div>
                    <div className="mb-1 flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {title}
                        </h1>
                        <Badge
                            variant="secondary"
                            className="bg-brand/20 text-brand-foreground"
                        >
                            {badgeText}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
