/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Client {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  document: string; // CPF or CNPJ
  paymentMethod?: string;
  pixKey?: string;
  notes: string;
  createdAt: string;
}

export interface Risco {
  id: string;
  clientId: string;
  date: string;
  model: string;
  amount: number;
  unit: 'm' | 'cm';
  unitCost: number;
  totalCost: number;
  notes: string;
}

export interface Corte {
  id: string;
  clientId: string;
  date: string;
  model: string;
  pieceValue: number;
  quantity: number;
  totalCost: number;
  notes: string;
}

export type Section = 'dashboard' | 'clientes' | 'risco' | 'corte' | 'historico' | 'guia';
