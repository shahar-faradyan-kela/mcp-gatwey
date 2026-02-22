import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // TODO: Replace this block with your internal API key validation package
    // Expected header: X-API-Key: <key>
    // const request = context.switchToHttp().getRequest();
    // const key = request.headers['x-api-key'];
    // return key === this.config.get<string>('auth.adminApiKey');
    //   OR: return this.internalAuthPackage.validateApiKey(key);

    this.logger.debug(
      'ApiKeyGuard: pass-through (dev mode) — implement real validation before production',
    );
    return true;
  }
}
