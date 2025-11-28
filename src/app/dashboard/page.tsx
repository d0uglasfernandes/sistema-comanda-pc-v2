'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Clock,
  AlertCircle,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  Package,
  Timer,
  Target,
  Activity,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  period: {
    type: string;
    startDate: string;
    endDate: string;
  };
  kpis: {
    faturamento: number;
    comandasAbertas: number;
    ticketMedio: number;
    totalComandas: number;
    comandasFechadas: number;
  };
  charts: {
    vendasPorHora: Array<{ hour: number; total: number; count: number }>;
    faturamentoDiario: Array<{ date: string; total: number; count: number }>;
    produtosMaisVendidos: Array<{
      productId: string;
      productName: string;
      category: string;
      totalQuantity: number;
      totalRevenue: number;
    }>;
    vendasPorCategoria: Array<{
      category: string;
      totalQuantity: number;
      totalRevenue: number;
    }>;
  };
  comandasAbertas: Array<{
    id: string;
    tableNumber: number;
    totalInCents: number;
    itemCount: number;
    createdAt: string;
    tempoAbertoMinutos: number;
  }>;
  comandasFechadas: Array<{
    id: string;
    tableNumber: number;
    totalInCents: number;
    paymentMethod: string | null;
    itemCount: number;
    createdAt: string;
    closedAt: string | null;
    tempoTotalMinutos: number;
  }>;
  metricas: {
    tempoMedioMinutos: number;
    ticketMaximo: number;
    ticketMinimo: number;
    itensMediosPorComanda: number;
    horarioPico: {
      hora: number;
      faturamento: number;
      comandas: number;
    } | null;
  };
}

const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

function DashboardContent() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('today');

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    setError('');

    try {
      if (!user) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(`/api/dashboard/stats?period=${period}`, {
        credentials: 'include', // Importante: inclui cookies na requisição
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar estatísticas');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Aguarda o AuthContext terminar de carregar antes de buscar dados
    if (isAuthLoading) {
      return;
    }

    // Se não houver usuário após o loading, redireciona para login
    if (!user) {
      window.location.href = '/login';
      return;
    }

    fetchDashboardStats();

    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, [period, user, isAuthLoading]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  const getAlertColor = (comanda: DashboardStats['comandasAbertas'][0]) => {
    if (comanda.tempoAbertoMinutos > 180) return 'border-yellow-500 border-2';
    if (comanda.itemCount === 0) return 'border-gray-400 border-2';
    if (comanda.totalInCents > (stats?.kpis.ticketMedio || 0) * 1.5) return 'border-purple-500 border-2';
    return '';
  };

  if (isLoading && !stats) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                Erro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
              <Button onClick={fetchDashboardStats} className="mt-4">
                Tentar Novamente
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!stats) return null;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                Dashboard Analítico
              </h1>
              <p className="text-muted-foreground mt-2">
                Visão completa do seu negócio em tempo real
              </p>
            </div>

            {/* Filtros de Período */}
            <Tabs value={period} onValueChange={setPeriod} className="w-full md:w-auto">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full md:w-auto">
                <TabsTrigger value="today">Hoje</TabsTrigger>
                <TabsTrigger value="yesterday">Ontem</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="month">Mês</TabsTrigger>
                <TabsTrigger value="year">Ano</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0 }}
          >
            <Card className="overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Faturamento
                </CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(stats.kpis.faturamento)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stats.kpis.comandasFechadas} comandas fechadas
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Comandas Abertas
                </CardTitle>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.kpis.comandasAbertas}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ativas no momento
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ticket Médio
                </CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCurrency(stats.kpis.ticketMedio)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Por comanda fechada
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Comandas
                </CardTitle>
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.kpis.totalComandas}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  No período selecionado
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Vendas por Hora */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Vendas por Hora
                </CardTitle>
                <CardDescription>Movimento ao longo do dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.charts.vendasPorHora}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="hour"
                      tickFormatter={(hour) => `${hour}h`}
                      className="text-xs"
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      className="text-xs"
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-popover text-popover-foreground rounded-xl border border-border shadow-xl p-3">
                              <p className="font-medium mb-1">{label}:00</p>
                              <p className="text-sm">
                                {formatCurrency(Number(payload[0].value))}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      name="Faturamento"
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Faturamento Diário */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Faturamento Diário
                </CardTitle>
                <CardDescription>Últimos dias</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.charts.faturamentoDiario}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => {
                        try {
                          return format(new Date(date), 'dd/MM', { locale: ptBR });
                        } catch {
                          return date;
                        }
                      }}
                      className="text-xs"
                    />
                    <YAxis
                      tickFormatter={(value) => formatCurrency(value)}
                      className="text-xs"
                    />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          let formattedDate = label;
                          try {
                            formattedDate = format(new Date(label), "dd 'de' MMMM", { locale: ptBR });
                          } catch { }

                          return (
                            <div className="bg-popover text-popover-foreground rounded-xl border border-border shadow-xl p-3">
                              <p className="font-medium mb-1">{formattedDate}</p>
                              <p className="text-sm">
                                {formatCurrency(Number(payload[0].value))}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="total"
                      fill="#6366f1"
                      radius={[8, 8, 0, 0]}
                      name="Faturamento"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Produtos Mais Vendidos e Categorias */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Produtos Mais Vendidos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <Card className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary" />
                  Produtos Mais Vendidos
                </CardTitle>
                <CardDescription>Top 10 do período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.charts.produtosMaisVendidos.slice(0, 5).map((produto, index) => (
                    <div key={produto.productId} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{produto.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {produto.totalQuantity} unidades • {formatCurrency(produto.totalRevenue)}
                        </p>
                      </div>
                      <Badge variant="secondary">{produto.category}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Vendas por Categoria */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.7 }}
          >
            <Card className="hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-primary" />
                  Vendas por Categoria
                </CardTitle>
                <CardDescription>Distribuição de receita</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={stats.charts.vendasPorCategoria}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percent }) =>
                        `${category} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalRevenue"
                      nameKey="category"
                    >
                      {stats.charts.vendasPorCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover text-popover-foreground rounded-xl border border-border shadow-xl p-3">
                              <p className="font-medium mb-1">{data.category}</p>
                              <p className="text-sm">{formatCurrency(data.totalRevenue)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Métricas Avançadas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <Card className="mb-8 hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Métricas Avançadas
              </CardTitle>
              <CardDescription>Análise detalhada do desempenho</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Timer className="w-4 h-4" />
                    <span className="text-sm">Tempo Médio</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatTime(stats.metricas.tempoMedioMinutos)}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">Ticket Máximo</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(stats.metricas.ticketMaximo)}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="w-4 h-4" />
                    <span className="text-sm">Itens/Comanda</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {stats.metricas.itensMediosPorComanda}
                  </p>
                </div>

                {stats.metricas.horarioPico && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Horário de Pico</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {stats.metricas.horarioPico.hora}h
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(stats.metricas.horarioPico.faturamento)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Comandas Abertas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.9 }}
        >
          <Card className="mb-8 hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                Comandas Abertas
                <Badge variant="default" className="ml-2">
                  {stats.comandasAbertas.length}
                </Badge>
              </CardTitle>
              <CardDescription>Acompanhamento em tempo real</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.comandasAbertas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma comanda aberta no momento
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.comandasAbertas.map((comanda) => (
                    <Card
                      key={comanda.id}
                      className={`hover:shadow-lg transition-all ${getAlertColor(comanda)}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">Mesa {comanda.tableNumber}</CardTitle>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-300">
                            Aberta
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Valor:</span>
                            <span className="font-bold">{formatCurrency(comanda.totalInCents)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Itens:</span>
                            <span className="font-medium">{comanda.itemCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tempo:</span>
                            <span className="font-medium">{formatTime(comanda.tempoAbertoMinutos)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Abertura:</span>
                            <span className="text-xs">
                              {format(new Date(comanda.createdAt), 'HH:mm', { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Comandas Fechadas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1 }}
        >
          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-green-600" />
                Últimas Comandas Fechadas
              </CardTitle>
              <CardDescription>Histórico do período</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.comandasFechadas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma comanda fechada no período
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                          Mesa
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                          Valor
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                          Itens
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                          Tempo
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                          Pagamento
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                          Fechamento
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.comandasFechadas.slice(0, 10).map((comanda) => (
                        <tr key={comanda.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4">
                            <Badge variant="outline">Mesa {comanda.tableNumber}</Badge>
                          </td>
                          <td className="py-3 px-4 font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(comanda.totalInCents)}
                          </td>
                          <td className="py-3 px-4">{comanda.itemCount}</td>
                          <td className="py-3 px-4 text-sm">
                            {formatTime(comanda.tempoTotalMinutos)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="secondary">{comanda.paymentMethod || 'N/A'}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {comanda.closedAt
                              ? format(new Date(comanda.closedAt), 'dd/MM HH:mm', { locale: ptBR })
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
