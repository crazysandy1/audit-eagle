import type { SVGProps } from 'react';
import { ShieldCheck } from 'lucide-react';

export function AuditEagleLogo(props: SVGProps<SVGSVGElement>) {
  return <ShieldCheck className="h-8 w-8 text-primary" {...props} />;
}
