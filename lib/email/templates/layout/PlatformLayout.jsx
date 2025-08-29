import { BaseLayout } from './BaseLayout';

export function PlatformLayout({ branding, children }) {
  return (
    <BaseLayout branding={branding}>
      {children}
    </BaseLayout>
  );
}
