import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, withRole } from '@/middleware/withAuth';

// Handler GET protegido - todos os usuários autenticados podem listar produtos
const getHandler = withAuth(async (request, user) => {
  try {
    const products = await db.product.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Handler POST protegido - apenas ADMIN e CAIXA podem criar produtos
const postHandler = withRole(['ADMIN', 'CAIXA'], async (request, user) => {
  try {
    const { name, priceInCents } = await request.json();

    if (!name || priceInCents === undefined) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }

    const product = await db.product.create({
      data: {
        name,
        priceInCents,
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Create product error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Export dos handlers
export const GET = getHandler;
export const POST = postHandler;