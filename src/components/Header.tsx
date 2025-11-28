'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings, Sun, Moon, Bell, Search } from 'lucide-react';
import PaymentNotification from './PaymentNotification';
import axios from 'axios';
import { Input } from '@/components/ui/input';

export default function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { subscriptionData, shouldShowNotification } = useSubscription();

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrador';
      case 'CAIXA':
        return 'Caixa';
      case 'GARCOM':
        return 'Garçom';
      default:
        return role;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const handlePayment = async () => {
    try {
      const response = await axios.post('/api/subscription/create-checkout');
      const { url } = response.data;
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Erro ao criar sessão de pagamento. Tente novamente.');
    }
  };

  return (
    <>
      {/* Payment Notification */}
      {shouldShowNotification && subscriptionData && (
        <div className="sticky top-0 z-50">
          <PaymentNotification
            daysUntilDue={subscriptionData.daysUntilDue || 0}
            onPaymentClick={handlePayment}
          />
        </div>
      )}

      <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-30 bg-background/60 backdrop-blur-xl border-b border-border/50 transition-all duration-300">
        <div className="flex items-center flex-1 gap-8">
          {/* Search Bar (Optional/Placeholder) */}
          <div className="relative w-full max-w-md hidden md:block">
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
            title={theme === 'light' ? 'Mudar para tema escuro' : 'Mudar para tema claro'}
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5 transition-all" />
            ) : (
              <Sun className="h-5 w-5 transition-all" />
            )}
            <span className="sr-only">Alternar tema</span>
          </Button>

          <div className="h-8 w-1px bg-border/50 mx-2" />

          {/* User Avatar with Logout */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-transparent p-0">
                <Avatar className="h-10 w-10 border-2 border-primary/20 transition-all hover:border-primary">
                  <AvatarFallback className="bg-linear-to-br from-primary to-primary/60 text-primary-foreground font-medium">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
              <div className="flex items-center justify-start gap-3 p-3 bg-muted/30 rounded-lg mb-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-semibold text-sm">{user?.name}</p>
                  <p className="w-[180px] truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                  <div className="pt-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {getRoleLabel(user?.role || '')}
                    </span>
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer rounded-md focus:bg-primary/10 focus:text-primary">
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.location.href = '/configuracoes'}
                className="cursor-pointer rounded-md focus:bg-primary/10 focus:text-primary"
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer rounded-md text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}