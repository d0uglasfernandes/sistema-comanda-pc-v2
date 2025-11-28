import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/jwt';

interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}



// Função de intervalo
function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  let startDate = new Date(now);

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startDate.setDate(now.getDate() - 365);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
  }

  return { startDate, endDate };
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const tenantId = user.tenantId;
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'today';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    let startDate: Date;
    let endDate: Date;

    if (period === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    } else {
      ({ startDate, endDate } = getDateRange(period));
    }

    const startSql = startDate.getTime();
    const endSql = endDate.getTime();

    // 1 — KPIs
    const [closedOrders, openOrders, totalOrders] = await Promise.all([
      db.order.aggregate({
        where: {
          tenantId,
          status: 'CLOSED',
          closedAt: { gte: startDate, lte: endDate },
        },
        _sum: { totalInCents: true },
        _count: true,
        _avg: { totalInCents: true },
      }),
      db.order.count({ where: { tenantId, status: 'OPEN' } }),
      db.order.count({
        where: { tenantId, createdAt: { gte: startDate, lte: endDate } },
      }),
    ]);

    const faturamento = Number(closedOrders._sum.totalInCents || 0);
    const ticketMedio = Number(closedOrders._avg.totalInCents || 0);
    const comandasFechadas = Number(closedOrders._count);

    // 2 — Vendas por hora
    const vendasPorHora = await db.$queryRaw`
      SELECT 
        CAST(strftime('%H', closedAt / 1000, 'unixepoch') AS INTEGER) as hour,
        SUM(totalInCents) as total,
        COUNT(*) as count
      FROM "Order"
      WHERE tenantId = ${tenantId}
        AND status = 'CLOSED'
        AND closedAt >= ${startSql}
        AND closedAt <= ${endSql}
      GROUP BY hour
      ORDER BY hour ASC;
    `;

    // 3 — Faturamento diário
    const dias = period === 'week' ? 7 : period === 'month' ? 30 : 30;

    const faturamentoDiario = await db.$queryRaw`
      SELECT
        strftime('%Y-%m-%d', closedAt / 1000, 'unixepoch') as date,
        SUM(totalInCents) as total,
        COUNT(*) as count
      FROM "Order"
      WHERE tenantId = ${tenantId}
        AND status = 'CLOSED'
        AND closedAt >= ${startSql}
        AND closedAt <= ${endSql}
      GROUP BY date
      ORDER BY date DESC
      LIMIT ${dias};
    `;

    // 4 — Produtos mais vendidos
    const produtosMaisVendidos = await db.$queryRaw`
      SELECT
        p.id as productId,
        p.name as productName,
        p.category as category,
        SUM(oi.quantity) as totalQuantity,
        SUM(oi.quantity * oi.unitPrice) as totalRevenue
      FROM OrderItem oi
      JOIN Product p ON oi.productId = p.id
      JOIN "Order" o ON oi.orderId = o.id
      WHERE o.tenantId = ${tenantId}
        AND o.status = 'CLOSED'
        AND o.closedAt >= ${startSql}
        AND o.closedAt <= ${endSql}
      GROUP BY p.id, p.name, p.category
      ORDER BY totalQuantity DESC
      LIMIT 10;
    `;

    // 5 — Vendas por categoria
    const vendasPorCategoria = await db.$queryRaw`
      SELECT
        p.category as category,
        SUM(oi.quantity) as totalQuantity,
        SUM(oi.quantity * oi.unitPrice) as totalRevenue
      FROM OrderItem oi
      JOIN Product p ON oi.productId = p.id
      JOIN "Order" o ON oi.orderId = o.id
      WHERE o.tenantId = ${tenantId}
        AND o.status = 'CLOSED'
        AND o.closedAt >= ${startSql}
        AND o.closedAt <= ${endSql}
      GROUP BY p.category
      ORDER BY totalRevenue DESC;
    `;

    // 6 — Comandas abertas
    const comandasAbertas = await db.order.findMany({
      where: { tenantId, status: 'OPEN' },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // 7 — Comandas fechadas
    const comandasFechadasList = await db.order.findMany({
      where: {
        tenantId,
        status: 'CLOSED',
        closedAt: { gte: startDate, lte: endDate },
      },
      include: { items: { include: { product: true } } },
      orderBy: { closedAt: 'desc' },
      take: 20,
    });

    // 8 — Métricas avançadas
    const comandasComTempo = await db.order.findMany({
      where: {
        tenantId,
        status: 'CLOSED',
        closedAt: { gte: startDate, lte: endDate },
      },
      select: { createdAt: true, closedAt: true, totalInCents: true },
    });

    const tempoMedio = comandasComTempo.reduce((acc, o) => {
      if (!o.closedAt) return acc;
      const diff = new Date(o.closedAt).getTime() - new Date(o.createdAt).getTime();
      return acc + diff;
    }, 0) / (comandasComTempo.length || 1);

    const tempoMedioMinutos = Math.round(tempoMedio / 60000);
    const ticketMaximo = Math.max(...comandasComTempo.map(o => o.totalInCents));
    const ticketMinimo = Math.min(...comandasComTempo.map(o => o.totalInCents));

    const totalItens = await db.orderItem.aggregate({
      where: {
        order: {
          tenantId,
          status: 'CLOSED',
          closedAt: { gte: startDate, lte: endDate },
        },
      },
      _sum: { quantity: true },
    });

    const itensMediosPorComanda = (totalItens._sum.quantity || 0) / (comandasFechadas || 1);

    const horarioPico = vendasPorHora.length
      ? vendasPorHora.reduce((m, c) => (c.total > m.total ? c : m))
      : null;

    // Preparar resposta
    const response = {
      period: {
        type: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      kpis: {
        faturamento,
        comandasAbertas: Number(openOrders),
        ticketMedio,
        totalComandas: Number(totalOrders),
        comandasFechadas,
      },
      charts: {
        vendasPorHora: vendasPorHora.map(v => ({
          hour: Number(v.hour),
          total: Number(v.total),
          count: Number(v.count),
        })),
        faturamentoDiario: faturamentoDiario.map(f => ({
          date: f.date,
          total: Number(f.total),
          count: Number(f.count),
        })).reverse(),
        produtosMaisVendidos: produtosMaisVendidos.map(p => ({
          productId: p.productId,
          productName: p.productName,
          category: p.category,
          totalQuantity: Number(p.totalQuantity),
          totalRevenue: Number(p.totalRevenue),
        })),
        vendasPorCategoria: vendasPorCategoria.map(v => ({
          category: v.category,
          totalQuantity: Number(v.totalQuantity),
          totalRevenue: Number(v.totalRevenue),
        })),
      },
      comandasAbertas: comandasAbertas.map(c => ({
        id: c.id,
        tableNumber: c.tableNumber,
        totalInCents: c.totalInCents,
        itemCount: c.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: c.createdAt.toISOString(),
        tempoAbertoMinutos: Math.round((new Date().getTime() - new Date(c.createdAt).getTime()) / 60000),
      })),
      comandasFechadas: comandasFechadasList.map(c => ({
        id: c.id,
        tableNumber: c.tableNumber,
        totalInCents: c.totalInCents,
        paymentMethod: c.paymentMethod,
        itemCount: c.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: c.createdAt.toISOString(),
        closedAt: c.closedAt?.toISOString(),
        tempoTotalMinutos: c.closedAt
          ? Math.round((new Date(c.closedAt).getTime() - new Date(c.createdAt).getTime()) / 60000)
          : 0,
      })),
      metricas: {
        tempoMedioMinutos,
        ticketMaximo,
        ticketMinimo,
        itensMediosPorComanda: Number(itensMediosPorComanda.toFixed(1)),
        horarioPico: horarioPico ? {
          hora: Number(horarioPico.hour),
          faturamento: Number(horarioPico.total),
          comandas: Number(horarioPico.count),
        } : null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
