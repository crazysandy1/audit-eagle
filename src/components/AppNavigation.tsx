
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AppNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Audit Setup', icon: Home },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  return (
    <nav className="flex space-x-2">
      {navItems.map((item) => (
        <Button
          key={item.href}
          variant={pathname === item.href ? 'secondary' : 'ghost'}
          asChild
          className={cn(
            "justify-start",
            pathname === item.href && "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          <Link href={item.href}>
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
