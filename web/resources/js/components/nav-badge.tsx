import { cn } from '@/lib/utils';

type Props = {
    count: number;
    className?: string;
};

export function NavBadge({ count, className }: Props) {
    if (count <= 0) {
        return null;
    }

    const label = count > 9 ? '9+' : String(count);

    return (
        <span
            className={cn(
                'ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white',
                className,
            )}
        >
            {label}
        </span>
    );
}
