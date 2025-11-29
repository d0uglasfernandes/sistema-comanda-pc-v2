import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { updateSubscriptionPrice, calculateSubscriptionPrice } from '@/lib/stripe';
import { withRole } from '@/middleware/withAuth';

// Handler GET protegido - apenas ADMIN pode listar usuários
const getHandler = withRole(['ADMIN'], async (request, user) => {
  try {
    const users = await db.user.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Handler POST protegido - apenas ADMIN pode criar usuários
const postHandler = withRole(['ADMIN'], async (request, user) => {
  try {
    const { email, name, password, role } = await request.json();

    if (!email || !name || !password || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findFirst({
      where: {
        email,
        tenantId: user.tenantId,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Atualiza o preço da assinatura se houver uma assinatura ativa
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: user.tenantId },
      });

      if (tenant?.stripeSubscriptionId) {
        const totalUsers = await db.user.count({
          where: { tenantId: user.tenantId },
        });

        const newPriceInCents = calculateSubscriptionPrice(totalUsers);

        await updateSubscriptionPrice(
          tenant.stripeSubscriptionId,
          newPriceInCents
        );

        await db.subscription.updateMany({
          where: { stripeSubscriptionId: tenant.stripeSubscriptionId },
          data: {
            priceInCents: newPriceInCents,
            userCount: totalUsers,
          },
        });
      }
    } catch (subscriptionError) {
      console.error('Error updating subscription price:', subscriptionError);
      // Não falha a criação do usuário se a atualização da assinatura falhar
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// Export dos handlers
export const GET = getHandler;
export const POST = postHandler;