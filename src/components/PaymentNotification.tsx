'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface PaymentNotificationProps {
  daysUntilDue: number;
  onPaymentClick: () => void;
}

export default function PaymentNotification({ daysUntilDue, onPaymentClick }: PaymentNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Fecha a notificação mas ela reaparece ao recarregar a página
  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible || daysUntilDue > 3 || daysUntilDue < 0) {
    return null;
  }

  const getMessage = () => {
    if (daysUntilDue === 0) {
      return 'Sua assinatura vence hoje! Renove agora para manter o acesso ao sistema.';
    } else if (daysUntilDue === 1) {
      return 'Sua assinatura vence amanhã! Renove para evitar interrupção do serviço.';
    } else {
      return `Sua assinatura vence em ${daysUntilDue} dias. Renove para manter o acesso ao sistema.`;
    }
  };

  const getVariant = () => {
    if (daysUntilDue <= 1) return 'destructive';
    return 'default';
  };

  return (
    <Alert 
      className={`relative border-l-4 ${
        daysUntilDue <= 1 
          ? 'border-l-red-500 bg-red-50 dark:bg-red-900/80 dark:border-l-red-400' 
          : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900 dark:border-l-yellow-400'
      }`}
    >
      <AlertCircle className={`h-4 w-4 ${daysUntilDue <= 1 ? 'text-red-600 dark:text-red-300' : 'text-yellow-600 dark:text-yellow-300'}`} />
      <AlertDescription className="flex items-center justify-between">
        <span className={`text-sm ${daysUntilDue <= 1 ? 'text-red-900 dark:text-red-100' : 'text-yellow-900 dark:text-yellow-100'}`}>
          {getMessage()}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={daysUntilDue <= 1 ? "destructive" : "default"}
            onClick={onPaymentClick}
            className="ml-4"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Renovar Agora
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
