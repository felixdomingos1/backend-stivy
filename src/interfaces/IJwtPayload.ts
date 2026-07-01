export interface IJwtPayload {
  id: string;
  tipo: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}