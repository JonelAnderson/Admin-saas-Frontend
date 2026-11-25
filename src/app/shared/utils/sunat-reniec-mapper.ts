import {
  SunatReniecPerudevsApiResponse,
  SunatReniecResultadoRuc
} from '@shared/models/sunat-reniec-perudevs.interface';

export interface SunatRucLookupResult {
  razonSocial: string;
  address: string;
}

export function unwrapPerudevsPayload(raw: unknown): SunatReniecPerudevsApiResponse | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  return raw as SunatReniecPerudevsApiResponse;
}

function parseResultado(raw: unknown): SunatReniecResultadoRuc | null {
  if (!raw) {
    return null;
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as SunatReniecResultadoRuc;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw as SunatReniecResultadoRuc;
  }
  return null;
}

export function mapPerudevsRucResponse(data: SunatReniecPerudevsApiResponse | null | undefined): SunatRucLookupResult | null {
  if (!data) {
    return null;
  }
  const ok = data.estado === true || data.Estado === true;
  if (!ok) {
    return null;
  }
  const r = parseResultado(data.resultado ?? data.Resultado);
  if (!r) {
    return null;
  }
  const razonSocial = (r.razon_social ?? r.razonSocial ?? r.RazonSocial ?? r.nombre_comercial ?? '').trim();
  const address = (r.direccion ?? r.Direccion ?? '').trim();
  if (!razonSocial && !address) {
    return null;
  }
  return { razonSocial, address };
}

export function perudevsErrorMessage(data: SunatReniecPerudevsApiResponse | null | undefined, fallback: string): string {
  if (!data) {
    return fallback;
  }
  return (data.mensaje ?? data.Mensaje ?? data.errors ?? data.Errors ?? fallback).trim() || fallback;
}
