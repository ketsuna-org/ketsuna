// Données mockées pour le prototype du dashboard canvas

import type { CanvasNode, Connector, CanvasState } from './canvasTypes';

// HQ au centre (position 0,0) - Hub central pour import/export
const hqNode: CanvasNode = {
  id: 'hq-1',
  type: 'hq',
  label: 'Siège Social',
  x: 0,
  y: 0,
  width: 4,
  height: 3,
  inputs: [
    { type: 'input' },  // Port import 1
    { type: 'input' },  // Port import 2
  ],
  outputs: [
    { type: 'output' }, // Port export 1
    { type: 'output' }, // Port export 2
  ],
  data: {
    level: 3,
    balance: 125000,
    spaceUsed: 12,
    spaceTotal: 30,  // 20 + (3-1)*5 = 30
  },
};

// Machines
const machines: CanvasNode[] = [
  {
    id: 'machine-1',
    type: 'machine',
    label: 'Foreuse',
    x: -6,
    y: -3,
    width: 3,
    height: 2,
    inputs: [{ type: 'input' }],
    outputs: [{ type: 'output', itemType: 'fer' }],
    data: {
      productionTime: 10,
      producing: true,
      employees: 2,
      maxEmployees: 4,
      needsEnergy: 5,
      outputItem: 'Minerai de Fer',
    },
  },
  {
    id: 'machine-2',
    type: 'machine',
    label: 'Fonderie',
    x: 5,
    y: -2,
    width: 3,
    height: 2,
    inputs: [{ type: 'input', itemType: 'fer' }, { type: 'input', itemType: 'charbon' }],
    outputs: [{ type: 'output', itemType: 'lingot-fer' }],
    data: {
      productionTime: 20,
      producing: true,
      employees: 3,
      maxEmployees: 6,
      needsEnergy: 15,
      inputItem: 'Minerai de Fer + Charbon',
      outputItem: 'Lingot de Fer',
    },
  },
  {
    id: 'machine-3',
    type: 'machine',
    label: 'Assembleur',
    x: -5,
    y: 3,
    width: 3,
    height: 2,
    inputs: [{ type: 'input', itemType: 'lingot-fer' }],
    outputs: [{ type: 'output', itemType: 'plaque-fer' }],
    data: {
      productionTime: 15,
      producing: false,
      employees: 1,
      maxEmployees: 3,
      needsEnergy: 10,
      inputItem: 'Lingot de Fer',
      outputItem: 'Plaque de Fer',
    },
  },
  {
    id: 'machine-4',
    type: 'machine',
    label: 'Générateur',
    x: 6,
    y: 3,
    width: 2,
    height: 2,
    inputs: [{ type: 'input', itemType: 'charbon' }],
    outputs: [{ type: 'output', itemType: 'energie' }],
    data: {
      productionTime: 5,
      producing: true,
      employees: 1,
      maxEmployees: 2,
      needsEnergy: 0,
      inputItem: 'Charbon',
      outputItem: '⚡ 50 kWh',
    },
  },
];

// Stockages
const storages: CanvasNode[] = [
  {
    id: 'storage-1',
    type: 'storage',
    label: 'Entrepôt A',
    x: -2,
    y: -4,
    width: 3,
    height: 2,
    inputs: [{ type: 'input' }],
    outputs: [{ type: 'output' }],
    data: {
      capacity: 500,
      used: 230,
      storedItems: [
        { itemType: 'Minerai de Fer', quantity: 150 },
        { itemType: 'Charbon', quantity: 80 },
      ],
    },
  },
  {
    id: 'storage-2',
    type: 'storage',
    label: 'Entrepôt B',
    x: 2,
    y: 4,
    width: 3,
    height: 2,
    inputs: [{ type: 'input' }],
    outputs: [{ type: 'output' }],
    data: {
      capacity: 300,
      used: 45,
      storedItems: [
        { itemType: 'Lingot de Fer', quantity: 45 },
      ],
    },
  },
];

// Gisements (hors de la grille de l'entreprise)
const gisements: CanvasNode[] = [
  {
    id: 'gisement-1',
    type: 'gisement',
    label: 'Gisement Fer',
    x: -10,
    y: -5,
    width: 2,
    height: 2,
    inputs: [],
    outputs: [{ type: 'output', itemType: 'fer' }],
    data: {
      resourceType: 'Minerai de Fer',
      quantity: 15000,
      richness: 0.85,
    },
  },
  {
    id: 'gisement-2',
    type: 'gisement',
    label: 'Gisement Cuivre',
    x: 12,
    y: -3,
    width: 2,
    height: 2,
    inputs: [],
    outputs: [{ type: 'output', itemType: 'cuivre' }],
    data: {
      resourceType: 'Minerai de Cuivre',
      quantity: 8000,
      richness: 0.72,
    },
  },
  {
    id: 'gisement-3',
    type: 'gisement',
    label: 'Gisement Charbon',
    x: -8,
    y: 6,
    width: 2,
    height: 2,
    inputs: [],
    outputs: [{ type: 'output', itemType: 'charbon' }],
    data: {
      resourceType: 'Charbon',
      quantity: 25000,
      richness: 0.95,
    },
  },
];

// Connecteurs (liens entre les noeuds)
const connectors: Connector[] = [
  {
    id: 'conn-1',
    from: { nodeId: 'gisement-1', portIndex: 0 },
    to: { nodeId: 'machine-1', portIndex: 0 },
    itemType: 'fer',
    isActive: true,
  },
  {
    id: 'conn-2',
    from: { nodeId: 'machine-1', portIndex: 0 },
    to: { nodeId: 'storage-1', portIndex: 0 },
    itemType: 'fer',
    isActive: true,
  },
  {
    id: 'conn-3',
    from: { nodeId: 'storage-1', portIndex: 0 },
    to: { nodeId: 'machine-2', portIndex: 0 },
    itemType: 'fer',
    isActive: true,
  },
  {
    id: 'conn-4',
    from: { nodeId: 'machine-2', portIndex: 0 },
    to: { nodeId: 'storage-2', portIndex: 0 },
    itemType: 'lingot-fer',
    isActive: true,
  },
  {
    id: 'conn-5',
    from: { nodeId: 'gisement-3', portIndex: 0 },
    to: { nodeId: 'machine-4', portIndex: 0 },
    itemType: 'charbon',
    isActive: true,
  },
];

// État initial du canvas
export const mockCanvasState: CanvasState = {
  nodes: [hqNode, ...machines, ...storages, ...gisements],
  connectors,
  selectedNodeId: null,
  camera: {
    x: 0,
    y: 0,
    zoom: 1,
  },
};

// Helper pour obtenir le niveau actuel (pour calculer l'espace)
export function getCompanyLevel(): number {
  return (hqNode.data as { level: number }).level;
}

// Helper pour obtenir l'espace total disponible
export function getSpaceTotal(): number {
  const level = getCompanyLevel();
  return 20 + (level - 1) * 5;
}
