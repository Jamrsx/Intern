import { BrandLogoMark } from '@/components/brand-logo-mark';
import { APP_BRAND_NAME } from '@/lib/brand';

export default function AppLogo() {
    return (
        <>
            <BrandLogoMark />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {APP_BRAND_NAME}
                </span>
            </div>
        </>
    );
}
