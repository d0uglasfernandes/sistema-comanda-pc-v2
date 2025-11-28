'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Eye, Coffee, Trash2, TrendingUp, DollarSign, Clock } from 'lucide-react';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { motion } from 'framer-motion';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  product: {
    id: string;
    name: string;
    priceInCents: number;
  };
}

interface Order {
  id: string;
  tableNumber: number;
  status: 'OPEN' | 'CLOSED' | 'PAID';
  totalInCents: number;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  name: string;
  priceInCents: number;
}

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [newOrderTable, setNewOrderTable] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<{ productId: string; quantity: string }[]>([]);

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchProducts();
    }
  }, [user]);

  async function fetchOrders() {
    try {
      const response = await fetch('/api/comandas', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setIsDataLoading(false);
    }
  }

  async function fetchProducts() {
    try {
      const response = await fetch('/api/produtos', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to fetch products');
    }
  }

  async function handleCreateOrder() {
    if (!newOrderTable || selectedProducts.length === 0) {
      return;
    }

    try {
      const items = selectedProducts
        .filter(p => p.productId && p.quantity)
        .map(p => ({
          productId: p.productId,
          quantity: parseInt(p.quantity),
        }));

      const response = await fetch('/api/comandas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableNumber: parseInt(newOrderTable),
          items,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        await fetchOrders();
        setIsNewOrderDialogOpen(false);
        setNewOrderTable('');
        setSelectedProducts([]);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to create order');
      }
    } catch (error) {
      setError('Network error');
    }
  }

  function addProductToOrder() {
    setSelectedProducts([...selectedProducts, { productId: '', quantity: '1' }]);
  }

  function updateProductInOrder(index: number, field: 'productId' | 'quantity', value: string) {
    const updated = [...selectedProducts];
    updated[index][field] = value;
    setSelectedProducts(updated);
  }

  function removeProductFromOrder(index: number) {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'OPEN':
        return <Badge variant="default">Aberta</Badge>;
      case 'CLOSED':
        return <Badge variant="secondary">Fechada</Badge>;
      case 'PAID':
        return <Badge variant="outline">Paga</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  }

  const openOrders = orders.filter(order => order.status === 'OPEN');
  const totalRevenue = orders
    .filter(order => order.status === 'PAID')
    .reduce((sum, order) => sum + order.totalInCents, 0);

  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="md" text="Carregando dados..." />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <Dialog open={isNewOrderDialogOpen} onOpenChange={setIsNewOrderDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nova Comanda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nova Comanda</DialogTitle>
              <DialogDescription>
                Crie uma nova comanda para uma mesa
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Número da Mesa</label>
                <input
                  type="number"
                  min="1"
                  value={newOrderTable}
                  onChange={(e) => setNewOrderTable(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="1"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Itens</label>
                  <Button type="button" variant="outline" size="sm" onClick={addProductToOrder}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar Produto
                  </Button>
                </div>

                {selectedProducts.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <select
                      value={item.productId}
                      onChange={(e) => updateProductInOrder(index, 'productId', e.target.value)}
                      className="flex-1 p-2 border rounded"
                    >
                      <option value="">Selecione um produto</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - R$ {(product.priceInCents / 100).toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateProductInOrder(index, 'quantity', e.target.value)}
                      className="w-20 p-2 border rounded"
                      placeholder="Qtd"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeProductFromOrder(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewOrderDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateOrder}>
                  Criar Comanda
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-red-200 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className={`grid gap-4 mb-6 ${(user?.role === 'ADMIN' || user?.role === 'CAIXA')
          ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
          : 'grid-cols-1 md:grid-cols-2'
        }`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="glass-card glass-card-hover border-none overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Comandas Abertas</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Coffee className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openOrders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {openOrders.length > 0 ? 'Mesas ativas no momento' : 'Nenhuma mesa ativa'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="glass-card glass-card-hover border-none overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de Comandas</CardTitle>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Eye className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{orders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Todas as comandas criadas
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {(user?.role === 'ADMIN' || user?.role === 'CAIXA') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="glass-card glass-card-hover border-none overflow-hidden relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl -mr-10 -mt-10" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">R$ {(totalRevenue / 100).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total já pago
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="glass-card border-none">
          <CardHeader>
            <CardTitle>Comandas Recentes</CardTitle>
            <CardDescription>Últimas comandas criadas no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders.slice(0, 5).map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + (index * 0.1) }}
                  className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/50 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 text-primary px-3 py-2 rounded-lg text-sm font-bold">
                      #{order.tableNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Mesa {order.tableNumber}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(order.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary">R$ {(order.totalInCents / 100).toFixed(2)}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {orders.length > 5 && (
              <div className="text-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => router.push('/comandas')}
                  className="w-full sm:w-auto hover:bg-primary hover:text-primary-foreground transition-all"
                >
                  Ver Todas as Comandas
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <MainLayout>
      <DashboardContent />
    </MainLayout>
  );
}