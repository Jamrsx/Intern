import { OCC_LOGO_URL } from '@/lib/brand';
import { cn } from '@/lib/utils';
import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon({
    className,
    alt = 'OCC Intern',
    ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src={OCC_LOGO_URL}
            alt={alt}
            className={cn('size-full object-contain', className)}
            {...props}
        />
    );
}
