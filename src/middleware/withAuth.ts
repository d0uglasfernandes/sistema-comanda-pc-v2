import { NextRequest, NextResponse } from 'next/server';
import { JWTPayload } from '@/lib/jwt';
import { requireAuth, requireRole, isErrorResponse } from './auth';

type RouteHandler = (
  request: NextRequest,
  user: JWTPayload,
  params?: any
) => Promise<NextResponse>;

/**
 * Higher-order function que adiciona autenticação a uma rota
 * 
 * @param handler - Handler da rota que receberá o usuário autenticado
 * @returns Handler protegido por autenticação
 */
export function withAuth(handler: RouteHandler) {
  return async (request: NextRequest, context?: { params: any }) => {
    const authResult = await requireAuth(request);
    
    if (isErrorResponse(authResult)) {
      return authResult;
    }
    
    return handler(request, authResult, context?.params);
  };
}

/**
 * Higher-order function que adiciona autenticação e autorização a uma rota
 * 
 * @param allowedRoles - Array de roles permitidas
 * @param handler - Handler da rota que receberá o usuário autenticado
 * @returns Handler protegido por autenticação e autorização
 */
export function withRole(allowedRoles: string[], handler: RouteHandler) {
  return async (request: NextRequest, context?: { params: any }) => {
    const authResult = await requireAuth(request);
    
    if (isErrorResponse(authResult)) {
      return authResult;
    }
    
    const roleCheck = requireRole(authResult, allowedRoles);
    
    if (isErrorResponse(roleCheck)) {
      return roleCheck;
    }
    
    return handler(request, authResult, context?.params);
  };
}
