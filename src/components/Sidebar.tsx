'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSidebar } from '@/components/MainLayout';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Package,
  Receipt,
  Users,
  Settings,
  LogOut,
  Menu,
  BarChart3,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Coffee
} from 'lucide-react';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const sidebarItems: SidebarItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="w-5 h-5" />,
  },
  {
    label: 'Produtos',
    href: '/produtos',
    icon: <Package className="w-5 h-5" />,
    roles: ['ADMIN', 'CAIXA'],
  },
  {
    label: 'Comandas',
    href: '/comandas',
    icon: <Receipt className="w-5 h-5" />,
  },
  {
    label: 'Usuários',
    href: '/usuarios',
    icon: <Users className="w-5 h-5" />,
    roles: ['ADMIN'],
  },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: <Settings className="w-5 h-5" />,
    roles: ['ADMIN'],
  },
];

interface SidebarContentProps {
  isMobile?: boolean;
  onClose?: () => void;
}

function SidebarContent({
  isMobile = false,
  onClose
}: SidebarContentProps) {
  const { user, tenant } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  const handleNavigation = (href: string) => {
    router.push(href);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const filteredItems = sidebarItems.filter(item => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  });

  return (
    <div className="flex flex-col h-full bg-background/60 backdrop-blur-xl border-r border-border/50 shadow-sm">
      {/* Header with Logo and Collapse Button - Desktop Only */}
      {!isMobile && (
        <div className={`flex items-center p-4 h-20 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-between'
          }`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="bg-primary/10 p-2 rounded-xl">
              <Coffee className="h-6 w-6 text-primary" />
            </div>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="font-bold text-lg truncate bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60"
              >
                {tenant?.name || 'ComandaSys'}
              </motion.span>
            )}
          </div>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(true)}
              className="h-8 w-8 p-0 flex-shrink-0 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Collapsed State - Expand Button */}
      {!isMobile && isCollapsed && (
        <div className="flex flex-col items-center justify-center p-4 h-20">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-2">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <div key={item.href} className="relative group">
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <Button
                variant="ghost"
                className={`w-full justify-start relative z-10 h-12 rounded-xl transition-all duration-200 ${isActive
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                  } ${isCollapsed ? 'px-0 justify-center' : 'px-4'}`}
                onClick={() => handleNavigation(item.href)}
              >
                <div className="flex items-center">
                  <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-3"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>
              </Button>
            </div>
          );
        })}
      </nav>

      {/* Footer / User Info could go here */}
      {!isCollapsed && !isMobile && (
        <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10">
          <p className="text-xs text-muted-foreground text-center">
            v2.0.0
          </p>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isCollapsed } = useSidebar();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Desktop Sidebar
  if (!isMobile) {
    return (
      <motion.div
        className="fixed left-0 top-0 h-full z-40"
        animate={{ width: isCollapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <SidebarContent />
      </motion.div>
    );
  }

  // Mobile Sidebar (Sheet)
  return (
    <>
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-md border-primary/20 shadow-lg">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-r border-border/50">
            <SidebarContent
              isMobile={true}
              onClose={() => setIsOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}