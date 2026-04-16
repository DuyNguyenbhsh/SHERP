import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    employeeId: string;
    privileges: string[];
    contexts: string[];
    role?: string;
  };
}
