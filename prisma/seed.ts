import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Função auxiliar para gerar datas aleatórias
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Função auxiliar para gerar hora específica
function setHour(date: Date, hour: number, minute: number = 0): Date {
  const newDate = new Date(date);
  newDate.setHours(hour, minute, 0, 0);
  return newDate;
}

async function main() {
  console.log('🌱 Iniciando seed...');

  // Limpar dados existentes
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.subscription.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('🗑️  Dados antigos removidos');

  // Criar tenant padrão
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Bar e Restaurante Exemplo',
      ownerEmail: 'admin@exemplo.com',
      isActive: true,
      subscriptionStatus: 'ACTIVE',
    },
  });

  console.log('🏢 Tenant criado:', tenant.name);

  // Criar usuários
  const passwordHash = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@exemplo.com',
      name: 'Administrador',
      passwordHash,
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });

  const caixa = await prisma.user.create({
    data: {
      email: 'caixa@exemplo.com',
      name: 'João Caixa',
      passwordHash,
      role: 'CAIXA',
      tenantId: tenant.id,
    },
  });

  console.log('👥 Usuários criados');

  // Criar produtos por categoria
  const bebidas = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Cerveja Heineken 600ml',
        priceInCents: 1800,
        category: 'Bebidas',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cerveja Skol 600ml',
        priceInCents: 1200,
        category: 'Bebidas',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Caipirinha',
        priceInCents: 1500,
        category: 'Bebidas',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Refrigerante 350ml',
        priceInCents: 600,
        category: 'Bebidas',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Suco Natural 500ml',
        priceInCents: 1000,
        category: 'Bebidas',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Água Mineral 500ml',
        priceInCents: 400,
        category: 'Bebidas',
        tenantId: tenant.id,
      },
    }),
  ]);

  const comidas = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Porção de Batata Frita',
        priceInCents: 2500,
        category: 'Porções',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Porção de Frango à Passarinho',
        priceInCents: 3500,
        category: 'Porções',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Porção de Calabresa Acebolada',
        priceInCents: 3200,
        category: 'Porções',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Hambúrguer Artesanal',
        priceInCents: 2800,
        category: 'Lanches',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Pizza Margherita',
        priceInCents: 4500,
        category: 'Pizzas',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Pizza Calabresa',
        priceInCents: 4800,
        category: 'Pizzas',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Espetinho de Carne (5 unid)',
        priceInCents: 1800,
        category: 'Espetinhos',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Pastel (unidade)',
        priceInCents: 800,
        category: 'Salgados',
        tenantId: tenant.id,
      },
    }),
  ]);

  const sobremesas = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Pudim',
        priceInCents: 1200,
        category: 'Sobremesas',
        tenantId: tenant.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Brownie com Sorvete',
        priceInCents: 1500,
        category: 'Sobremesas',
        tenantId: tenant.id,
      },
    }),
  ]);

  const allProducts = [...bebidas, ...comidas, ...sobremesas];

  console.log('🍕 Produtos criados:', allProducts.length);

  // Criar comandas dos últimos 30 dias
  const hoje = new Date();
  const trintaDiasAtras = new Date();
  trintaDiasAtras.setDate(hoje.getDate() - 30);

  const formasPagamento = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX'];
  const horariosMovimento = [
    { inicio: 11, fim: 14, peso: 3 }, // Almoço
    { inicio: 18, fim: 23, peso: 5 }, // Jantar (maior movimento)
    { inicio: 14, fim: 18, peso: 1 }, // Tarde
  ];

  let comandasCriadas = 0;
  let comandasAbertas = 0;

  // Gerar comandas para cada dia
  for (let dia = new Date(trintaDiasAtras); dia <= hoje; dia.setDate(dia.getDate() + 1)) {
    const diaAtual = new Date(dia);
    const isDiaAtual = diaAtual.toDateString() === hoje.toDateString();
    
    // Número de comandas varia por dia da semana
    const diaSemana = diaAtual.getDay();
    const isWeekend = diaSemana === 0 || diaSemana === 6;
    const numComandas = isWeekend ? Math.floor(Math.random() * 20) + 25 : Math.floor(Math.random() * 15) + 15;

    for (let i = 0; i < numComandas; i++) {
      // Escolher horário baseado nos períodos de movimento
      const periodoAleatorio = Math.random() * 9; // Total de peso
      let horario: number;
      
      if (periodoAleatorio < 5) {
        // Jantar (peso 5)
        horario = 18 + Math.floor(Math.random() * 5);
      } else if (periodoAleatorio < 8) {
        // Almoço (peso 3)
        horario = 11 + Math.floor(Math.random() * 3);
      } else {
        // Tarde (peso 1)
        horario = 14 + Math.floor(Math.random() * 4);
      }

      const minuto = Math.floor(Math.random() * 60);
      const createdAt = setHour(new Date(diaAtual), horario, minuto);

      // Determinar se a comanda está aberta ou fechada
      const isAberta = isDiaAtual && Math.random() < 0.15; // 15% das comandas de hoje estão abertas
      
      // Calcular tempo de permanência (30 min a 3 horas)
      const tempoMinutos = Math.floor(Math.random() * 150) + 30;
      const closedAt = isAberta ? null : new Date(createdAt.getTime() + tempoMinutos * 60000);

      const numeroMesa = Math.floor(Math.random() * 30) + 1;

      // Criar a comanda
      const order = await prisma.order.create({
        data: {
          tableNumber: numeroMesa,
          status: isAberta ? 'OPEN' : 'CLOSED',
          totalInCents: 0,
          paymentMethod: isAberta ? null : formasPagamento[Math.floor(Math.random() * formasPagamento.length)],
          closedAt,
          tenantId: tenant.id,
          createdAt,
          updatedAt: closedAt || createdAt,
        },
      });

      // Adicionar itens à comanda
      const numItens = Math.floor(Math.random() * 6) + 1; // 1 a 6 itens
      let totalComanda = 0;

      const produtosEscolhidos = new Set<string>();
      
      for (let j = 0; j < numItens; j++) {
        let produto;
        let tentativas = 0;
        
        // Evitar produtos duplicados (com algumas tentativas)
        do {
          produto = allProducts[Math.floor(Math.random() * allProducts.length)];
          tentativas++;
        } while (produtosEscolhidos.has(produto.id) && tentativas < 5);
        
        produtosEscolhidos.add(produto.id);
        
        const quantidade = Math.floor(Math.random() * 3) + 1; // 1 a 3 unidades
        
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: produto.id,
            quantity: quantidade,
            unitPrice: produto.priceInCents,
            createdAt,
          },
        });

        totalComanda += produto.priceInCents * quantidade;
      }

      // Atualizar total da comanda
      await prisma.order.update({
        where: { id: order.id },
        data: { totalInCents: totalComanda },
      });

      comandasCriadas++;
      if (isAberta) comandasAbertas++;
    }
  }

  console.log('📊 Comandas criadas:', comandasCriadas);
  console.log('🟢 Comandas abertas:', comandasAbertas);
  console.log('🔴 Comandas fechadas:', comandasCriadas - comandasAbertas);

  // Estatísticas finais
  const totalFaturamento = await prisma.order.aggregate({
    where: { status: 'CLOSED', tenantId: tenant.id },
    _sum: { totalInCents: true },
  });

  const ticketMedio = await prisma.order.aggregate({
    where: { status: 'CLOSED', tenantId: tenant.id },
    _avg: { totalInCents: true },
  });

  console.log('💰 Faturamento total:', (totalFaturamento._sum.totalInCents || 0) / 100, 'R$');
  console.log('🎯 Ticket médio:', (ticketMedio._avg.totalInCents || 0) / 100, 'R$');

  console.log('✅ Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
