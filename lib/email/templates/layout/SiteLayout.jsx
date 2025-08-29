import { BaseLayout } from './BaseLayout';

export function SiteLayout({ branding, children }) {
  return (
    <BaseLayout branding={branding}>
      {children}
    </BaseLayout>
  );
}
