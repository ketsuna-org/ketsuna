// Types pour le système de canvas du dashboard

export interface Port {
  type: 'input' | 'output';
  itemType?: string;  // Type d'item accepté/produit
  connected?: boolean;
}

export interface CanvasNode {
  id: string;
  type: 'hq' | 'machine' | 'storage' | 'gisement';
  label: string;
  x: number;  // Position en unités de grille
  y: number;
  width: number;
  height: number;
  inputs: Port[];
  outputs: Port[];
  data?: MachineData | StorageData | HQData | GisementData;
}

export interface MachineData {
  productionTime: number;  // en secondes
  producing: boolean;
  employees: number;
  maxEmployees: number;
  needsEnergy: number;
  inputItem?: string;
  outputItem?: string;
}

export interface StorageData {
  capacity: number;
  used: number;
  storedItems: { itemType: string; quantity: number }[];
}

export interface HQData {
  level: number;
  balance: number;
  spaceUsed: number;
  spaceTotal: number;  // 20 + (level - 1) * 5
}

export interface GisementData {
  resourceType: string;
  quantity: number;
  richness: number;  // 0-1
}

export interface Connector {
  id: string;
  from: {
    nodeId: string;
    portIndex: number;
  };
  to: {
    nodeId: string;
    portIndex: number;
  };
  itemType?: string;
  isActive?: boolean;  // Pour animation de flux
}

export interface CanvasState {
  nodes: CanvasNode[];
  connectors: Connector[];
  selectedNodeId: string | null;
  camera: {
    x: number;
    y: number;
    zoom: number;
  };
}

// Couleurs par type de noeud
export const NODE_COLORS = {
  hq: { fill: '#1e1b4b', stroke: '#6366f1', text: '#c7d2fe' },        // Indigo
  machine: { fill: '#1e293b', stroke: '#475569', text: '#e2e8f0' },   // Slate
  storage: { fill: '#0c1929', stroke: '#0ea5e9', text: '#7dd3fc' },   // Cyan
  gisement: { fill: '#451a03', stroke: '#f59e0b', text: '#fcd34d' },  // Amber
} as const;

// Constantes du canvas
export const CANVAS_CONFIG = {
  GRID_SIZE: 40,           // Pixels par unité de grille
  PORT_RADIUS: 6,          // Rayon des ports
  PORT_OFFSET: 8,          // Distance du port au bord du noeud
  MIN_ZOOM: 0.3,
  MAX_ZOOM: 2,
  NODE_CORNER_RADIUS: 8,
} as const;
