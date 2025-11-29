import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, JWTPayload } from '@/lib/jwt';

/**
 * Middleware de autenticação
 * Valida o token JWT e retorna o payload do usuário
 * 
 * @param request - NextRequest
 * @returns Payload do usuário ou NextResponse com erro
 */
export async function requireAuth(request: NextRequest): Promise<JWTPayload | NextResponse> {
  try {
    const accessToken = request.cookies.get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    // Verifica a assinatura do token
    const payload = verifyAccessToken(accessToken);
    
    return payload;
  } catch (error) {
    return NextResponse.json(
      { error: 'Token inválido ou expirado' },
      { status: 401 }
    );
  }
}

/**
 * Middleware de autorização
 * Verifica se o usuário tem uma das roles permitidas
 * 
 * @param payload - Payload do usuário autenticado
 * @param allowedRoles - Array de roles permitidas
 * @returns true se autorizado, NextResponse com erro caso contrário
 */
export function requireRole(
  payload: JWTPayload | NextResponse,
  allowedRoles: string[]
): true | NextResponse {
  // Se payload já é um NextResponse (erro), retorna ele
  if (payload instanceof NextResponse) {
    return payload;
  }
  
  if (!allowedRoles.includes(payload.role)) {
    return NextResponse.json(
      { 
        error: 'Acesso negado. Você não tem permissão para acessar este recurso.',
        required_role: allowedRoles,
        your_role: payload.role
      },
      { status: 403 }
    );
  }
  
  return true;
}

/**
 * Helper para verificar se um resultado é erro
 */
export function isErrorResponse(result: any): result is NextResponse {
  return result instanceof NextResponse;
}
