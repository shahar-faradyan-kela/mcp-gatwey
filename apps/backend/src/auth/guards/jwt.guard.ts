import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Allow routes marked @Public() to bypass auth
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // TODO: Replace this block with your internal JWT validation package
    // Expected header: Authorization: Bearer <token>
    // const request = context.switchToHttp().getRequest();
    // const token = request.headers['authorization']?.split(' ')[1];
    // return this.internalAuthPackage.validateJwt(token);

    this.logger.debug(
      'JwtAuthGuard: pass-through (dev mode) — implement real validation before production',
    );
    return true;
  }
}
