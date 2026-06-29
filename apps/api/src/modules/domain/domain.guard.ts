import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class DomainGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresDomain = this.reflector.get<boolean>('requiresDomain', context.getHandler());
    if (!requiresDomain) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return !!user && !!user.domain;
  }
}
