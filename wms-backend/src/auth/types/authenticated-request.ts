import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    employeeId: string;
    privileges: string[];
    contexts: string[];
    role?: string;
    jti?: string;
    exp?: number;
  };
}

// Payload thô được sign trong JWT (snake_case khớp backend convention)
export interface JwtPayload {
  sub: string;
  username: string;
  employee_id: string;
  privileges: string[];
  contexts: string[];
  jti?: string;
  exp?: number;
  iat?: number;
}
