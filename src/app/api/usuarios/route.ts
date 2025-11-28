import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { updateSubscriptionPrice, calculateSubscriptionPrice } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const users = await db.user.findMany({
      where: { tenantId },
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
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    const userRole = request.headers.get('x-user-role');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

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
        tenantId,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        tenantId,
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
        where: { id: tenantId },
      });

      if (tenant?.stripeSubscriptionId) {
        const totalUsers = await db.user.count({
          where: { tenantId },
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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}