'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Users, Shield, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CAIXA' | 'GARCOM';
  createdAt: string;
  updatedAt: string;
}

function UsuariosContent() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'GARCOM' as 'ADMIN' | 'CAIXA' | 'GARCOM',
  });

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      setError('Access denied. Admin only.');
      setIsLoading(false);
      return;
    }
    fetchUsers();
  }, [user]);

  async function fetchUsers() {
    try {
      const response = await fetch('/api/usuarios', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        setError('Failed to fetch users');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const url = editingUser
        ? `/api/usuarios/${editingUser.id}`
        : '/api/usuarios';

      const method = editingUser ? 'PUT' : 'POST';

      const payload: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
      };

      if (formData.password || !editingUser) {
        payload.password = formData.password || 'temp123';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (response.ok) {
        await fetchUsers();
        setIsDialogOpen(false);
        setEditingUser(null);
        setFormData({
          email: '',
          name: '',
          password: '',
          role: 'GARCOM'
        });
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to save user');
      }
    } catch (error) {
      setError('Network error');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const response = await fetch(`/api/usuarios/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await fetchUsers();
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to delete user');
      }
    } catch (error) {
      setError('Network error');
    }
  }

  function openEditDialog(user: User) {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      role: user.role
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingUser(null);
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 'GARCOM'
    });
    setIsDialogOpen(true);
  }

  function getRoleBadge(role: string) {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Admin</Badge>;
      case 'CAIXA':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20">Caixa</Badge>;
      case 'GARCOM':
        return <Badge variant="secondary" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Garçom</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Access denied. Admin only.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Usuários</h1>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
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
        <Card className="glass-card border-none overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Lista de Usuários</CardTitle>
                <CardDescription>Gerencie os usuários do sistema</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="pl-6">Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userItem) => (
                  <TableRow key={userItem.id} className="hover:bg-muted/30 border-border/50 transition-colors">
                    <TableCell className="font-medium pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {userItem.name.charAt(0).toUpperCase()}
                        </div>
                        {userItem.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {userItem.email}
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(userItem.role)}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(userItem)}
                          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(userItem.id)}
                          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'Edite as informações do usuário' : 'Cadastre um novo usuário'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full p-2 border rounded"
                required
              >
                <option value="GARCOM">Garçom</option>
                <option value="CAIXA">Caixa</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingUser ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UsuariosPage() {
  return (
    <MainLayout>
      <UsuariosContent />
    </MainLayout>
  );
}