import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getTenantFromRequest } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantFromRequest(request);

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    const whereClause: any = { tenantId };

    if (dateParam) {
      // Ajuste para fuso horário GMT-3 (Brasil)
      // Data vem como YYYY-MM-DD (UTC 00:00)
      // Queremos começar em 00:00 GMT-3 => 03:00 UTC
      const offset = 3 * 60 * 60 * 1000;

      const startDate = new Date(dateParam);
      const startMs = startDate.getTime() + offset;

      const endMs = startMs + (24 * 60 * 60 * 1000) - 1;

      // Busca IDs usando query raw para comparar com timestamp numérico
      const matchingIds = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Order" 
        WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${startMs}
        AND "createdAt" <= ${endMs}
      `;

      const ids = matchingIds.map(r => r.id);
      whereClause.id = { in: ids };
    }

    const orders = await db.order.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getTenantFromRequest(request);

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    const { tableNumber, items } = await request.json();

    if (!tableNumber || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Table number and items are required' },
        { status: 400 }
      );
    }

    let totalInCents = 0;
    const orderItems: { productId: string; quantity: number; unitPrice: number }[] = [];

    for (const item of items) {
      const product = await db.product.findFirst({
        where: {
          id: item.productId,
          tenantId,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      const itemTotal = product.priceInCents * item.quantity;
      totalInCents += itemTotal;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.priceInCents,
      });
    }

    const order = await db.order.create({
      data: {
        tableNumber,
        tenantId,
        totalInCents,
        status: 'OPEN',
        items: {
          create: orderItems,
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}