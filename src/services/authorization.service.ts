import { Response } from 'express';
import prisma from '../config/database';
import { autenticarOpcional } from '../middleware/auth.middleware';
import { ForbiddenError, ConflictError, NotFoundError, ValidationError, getErrorStatus } from '../utils/errors';
import logger from '../utils/logger';

/**
 * Helpers de autorização/posse partilhados pelos serviços de domínio.
 * Erros: AuthorizationError -> 403, NotFoundError -> 404, ValidationError -> 400 (ver sendDomainError).
 */

export { ForbiddenError, ConflictError };

/** Devolve o id_fazedor do utilizador (ou null se não for fazedor). */
export const getFazedorIdByUsuario = async (idUsuario: string): Promise<string | null> => {
  if (!idUsuario) return null;
  const fazedor = await prisma.fazedor.findUnique({
    where: { id_usuario: idUsuario },
    select: { id_fazedor: true },
  });
  return fazedor?.id_fazedor ?? null;
};

/** Como getFazedorIdByUsuario mas lança 403 se o utilizador não for fazedor. */
export const requireFazedorIdByUsuario = async (idUsuario: string): Promise<string> => {
  const id = await getFazedorIdByUsuario(idUsuario);
  if (!id) throw new ForbiddenError('Acesso restrito a fazedores de moda');
  return id;
};

/** Devolve o id_agencia do utilizador (ou null). */
export const getAgenciaIdByUsuario = async (idUsuario: string): Promise<string | null> => {
  if (!idUsuario) return null;
  const agencia = await prisma.agencia.findFirst({
    where: { fazedor: { id_usuario: idUsuario } },
    select: { id_agencia: true },
  });
  return agencia?.id_agencia ?? null;
};

export const requireAgenciaIdByUsuario = async (idUsuario: string): Promise<string> => {
  const id = await getAgenciaIdByUsuario(idUsuario);
  if (!id) throw new ForbiddenError('Apenas agências podem gerir modelos');
  return id;
};

/** Garante que o serviço pertence ao fazedor do utilizador. Devolve o serviço (id_servico, id_fazedor). */
export const assertFazedorOwnsServico = async (idUsuario: string, idServico: string) => {
  const servico = await prisma.servico.findUnique({
    where: { id_servico: idServico },
    select: { id_servico: true, id_fazedor: true, fazedor: { select: { id_usuario: true } } },
  });
  if (!servico) throw new NotFoundError('Serviço não encontrado');
  if (servico.fazedor.id_usuario !== idUsuario) {
    throw new ForbiddenError('Você não tem permissão para alterar este serviço');
  }
  return servico;
};

/** Garante que o modelo pertence à agência do utilizador. */
export const assertAgenciaOwnsModelo = async (idUsuario: string, idModelo: string) => {
  const modelo = await prisma.modelo.findUnique({
    where: { id_modelo: idModelo },
    select: { id_modelo: true, id_agencia: true, agencia: { select: { fazedor: { select: { id_usuario: true } } } } },
  });
  if (!modelo) throw new NotFoundError('Modelo não encontrado');
  if (modelo.agencia.fazedor.id_usuario !== idUsuario) {
    throw new ForbiddenError('Você não tem permissão para alterar este modelo');
  }
  return modelo;
};

/** Garante que o utilizador participa na conversa. */
export const assertParticipanteConversa = async (idUsuario: string, idConversa: string) => {
  const participante = await prisma.conversaParticipante.findUnique({
    where: { id_conversa_id_usuario: { id_conversa: idConversa, id_usuario: idUsuario } },
  });
  if (!participante) {
    const existe = await prisma.conversa.findUnique({ where: { id_conversa: idConversa }, select: { id_conversa: true } });
    if (!existe) throw new NotFoundError('Conversa não encontrada');
    throw new ForbiddenError('Você não participa desta conversa');
  }
  return participante;
};

/** Autenticação opcional (implementação do BE-SEC em middleware/auth.middleware). */
export const autenticacaoOpcional = autenticarOpcional;

/** Converte Decimal/strings Prisma em number (ou null). */
export const toNumber = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** Distância em km entre dois pontos (fórmula de Haversine). */
export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
};

/** Caixa delimitadora aproximada para pré-filtrar por coordenadas antes do Haversine. */
export const boundingBox = (lat: number, lng: number, raioKm: number) => {
  const dLat = raioKm / 111.32;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = raioKm / (111.32 * Math.max(Math.abs(cosLat), 0.01));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
};

/** Lê lat/lng/raio da query; devolve null para lat/lng se ausentes; lança ValidationError se inválidos. */
export const parseGeoQuery = (query: any, defaultRaio: number) => {
  const hasLat = query.lat !== undefined && query.lat !== '';
  const hasLng = query.lng !== undefined && query.lng !== '';
  let lat: number | null = null;
  let lng: number | null = null;
  if (hasLat || hasLng) {
    lat = Number(query.lat);
    lng = Number(query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new ValidationError('Parâmetros lat/lng inválidos');
    }
  }
  let raio = query.raio_km !== undefined && query.raio_km !== '' ? Number(query.raio_km) : defaultRaio;
  if (!Number.isFinite(raio) || raio <= 0) raio = defaultRaio;
  raio = Math.min(raio, 500);
  return { lat, lng, raio };
};

/** Resposta de erro padronizada para controllers de domínio. */
export const sendDomainError = (error: any, res: Response, context = 'DOMAIN'): void => {
  const status = getErrorStatus(error) ?? (error?.isOperational ? error.statusCode : undefined);
  if (status) {
    res.status(status).json({ success: false, error: error.message });
  } else if (error?.code === 'P2025') {
    res.status(404).json({ success: false, error: 'Registo não encontrado' });
  } else if (error?.code === 'P2002') {
    res.status(409).json({ success: false, error: 'Registo duplicado' });
  } else {
    logger.error(`[${context}] Erro não tratado:`, error);
    const message = process.env.NODE_ENV === 'development' ? error?.message : 'Erro interno do servidor';
    res.status(500).json({ success: false, error: message });
  }
};
