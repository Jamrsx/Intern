import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';

type BrandLogoMarkProps = {
    className?: string;
    iconClassName?: string;
};

export function BrandLogoMark({
    className,
    iconClassName,
}: BrandLogoMarkProps) {
    return (
        <div
            className={cn(
                'flex aspect-square size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-0.5',
                className,
            )}
        >
            <AppLogoIcon className={cn('size-full', iconClassName)} />
        </div>
    );
}
