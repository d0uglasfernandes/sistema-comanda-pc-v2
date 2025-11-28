'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, Store, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import LoadingSpinner from '@/components/ui/loading-spinner';

function TenantSettingsContent() {
  const { user, tenant, updateTenant } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (tenant) {
      setFormData({ name: tenant.name });
      setIsEditing(true);
    }
    setIsLoading(false);
  }, [tenant]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!user || user.role !== 'ADMIN') {
      setError('Apenas administradores podem editar as configurações do estabelecimento');
      return;
    }

    try {
      const response = await fetch('/api/tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (response.ok) {
        const updatedTenant = await response.json();
        updateTenant(updatedTenant);
        setIsEditing(false);
        setFormData({ name: updatedTenant.name });
        setError('');
      } else {
        const error = await response.json();
        setError(error.error || 'Falha ao atualizar configurações');
      }
    } catch (error) {
      setError('Erro de conexão');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="md" text="Carregando configurações..." />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Configurações do Estabelecimento</h1>
        {user?.role === 'ADMIN' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="glass-card border-none max-w-2xl mx-auto">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Store className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Informações do Estabelecimento</CardTitle>
                <CardDescription>
                  Configure as informações principais do seu negócio
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base">Nome do Estabelecimento</Label>
                <div className="relative">
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                    required
                    placeholder="Ex: Bar do João"
                    className="w-full pl-10 h-12 text-lg bg-background/50 border-border/50 focus:bg-background transition-all"
                  />
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Este nome será exibido no cabeçalho e nos relatórios.
                </p>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                  className="mr-2"
                >
                  {isEditing ? 'Cancelar' : 'Editar'}
                </Button>
                {isEditing && (
                  <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {isLoading ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

export default function TenantSettingsPage() {
  return (
    <MainLayout>
      <TenantSettingsContent />
    </MainLayout>
  );
}