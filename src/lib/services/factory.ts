/**
 * Factory Canvas Service
 * Handles loading, placing nodes, and managing edges for the Svelte Flow canvas
 */

import pb from '$lib/pocketbase';
import { getItem } from '$lib/data/game-static';
import { logAnalyticsEvent } from '$lib/firebase';

// Types
export interface FactoryNode {
  id: string;
  type: 'machine' | 'deposit' | 'company' | 'zone' | 'storage';
  position: { x: number; y: number };
  data: {
    itemId?: string;
    name?: string;
    icon?: string;
    quantity?: number;
    resourceId?: string;
    placed?: boolean;
    // Zone-specific properties
    width?: number;
    height?: number;
    level?: number;
  };
  // Measured dimensions from Svelte Flow
  measured?: { width: number; height: number };
  // Optional parent/child relationships
  parentId?: string;
  extent?: 'parent' | [[number, number], [number, number]];
  // Interactivity flags
  draggable?: boolean;
  selectable?: boolean;
}


export interface FactoryEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
  type?: string;
  data?: {
    item: string;
  };
}

// Canvas bounds based on company level
export function getCanvasBounds(level: number): { width: number; height: number } {
  const base = 1500;
  const bonus = 100 * level;
  const size = base + bonus;
  return { width: size, height: size };
}

// Check if position is within bounds
export function isWithinBounds(
  x: number,
  y: number,
  nodeWidth: number,
  nodeHeight: number,
  bounds: { width: number; height: number }
): boolean {
  return x >= 0 && y >= 0 && x + nodeWidth <= bounds.width && y + nodeHeight <= bounds.height;
}

// Node dimensions for collision detection (fallbacks)
export const NODE_DIMENSIONS = {
  machine: { width: 140, height: 100 },
  deposit: { width: 140, height: 120 },
  company: { width: 220, height: 160 },
  zone: { width: 0, height: 0 },
  storage: { width: 140, height: 140 },
};

// Check collision between nodes
export function checkCollision(
  x: number,
  y: number,
  width: number,
  height: number,
  existingNodes: FactoryNode[],
  excludeId?: string
): boolean {
  for (const node of existingNodes) {
    if (excludeId && node.id === excludeId) continue;
    if (node.type === "zone") continue;

    const dimensions = node.measured || NODE_DIMENSIONS[node.type] || { width: 120, height: 120 };
    const nodeWidth = dimensions.width;
    const nodeHeight = dimensions.height;

    // AABB Collision with a small 2px safety buffer
    const overlapsX = x < node.position.x + nodeWidth - 2 && x + width > node.position.x + 2;
    const overlapsY = y < node.position.y + nodeHeight - 2 && y + height > node.position.y + 2;

    if (overlapsX && overlapsY) {
      return true; // Collision detected
    }
  }

  return false;
}

// Load factory layout from database
export async function loadFactory(companyId: string): Promise<{
  nodes: FactoryNode[];
  edges: FactoryEdge[];
}> {
  const nodes: FactoryNode[] = [];
  const edges: FactoryEdge[] = [];

  try {
    // Load company data for the fixed node
    const company = await pb.collection("companies").getOne(companyId);
    const companyLocation = company.location;

    nodes.push({
      id: company.id,
      type: "company",
      position: {
        x: companyLocation?.lng ?? 750,
        y: companyLocation?.lat ?? 750,
      },
      data: {
        name: company.name,
        icon: "🏢",
        placed: true,
        balance: company.balance,
        level: company.level,
      },
    });

    // Load placed machines
    const machines = await pb.collection("machines").getFullList({
      filter: `company = "${companyId}" && placed = true`,
    });

    for (const machine of machines) {
      const location = machine.location;
      const staticItem = getItem(machine.machine_id);

      // Determine node type: storage vs machine
      const nodeType = staticItem?.type === 'Stockage' ? 'storage' : 'machine';

      nodes.push({
        id: machine.id,
        type: nodeType,
        position: {
          x: location?.lng ?? 0,
          y: location?.lat ?? 0,
        },
        data: {
          itemId: machine.machine_id,
          name: staticItem?.name ?? (nodeType === 'storage' ? 'Stockage' : 'Machine'),
          icon: staticItem?.icon || (nodeType === 'storage' ? '📦' : '⚙️'),
          placed: true,
        },
      });
    }

    // Load deposits that are placed
    const deposits = await pb.collection("deposits").getFullList({
      filter: `company = "${companyId}"`,
    });

    for (const deposit of deposits) {
      const location = deposit.location;
      
      // Skip deposits without valid location (they show in "Gisements à placer")
      if (!location || typeof location !== 'object' || 
          (location.lng === undefined && location.lat === undefined) ||
          Object.keys(location).length === 0) {
        continue;
      }

      const staticItem = getItem(deposit.ressource_id);

      nodes.push({
        id: deposit.id,
        type: "deposit",
        position: {
          x: location?.lng ?? 0,
          y: location?.lat ?? 0,
        },
        data: {
          resourceId: deposit.ressource_id,
          name: staticItem?.name || deposit.ressource_id || "Deposit",
          icon: staticItem?.icon || "💎",
          quantity: deposit.quantity,
          placed: true,
        },
      });
    }

    // Load edges from edge_relation (fetch all accessible edges)
    const edgeRelations = await pb.collection('edge_relation').getFullList();

    for (const edge of edgeRelations) {
      edges.push({
        id: edge.id,
        source: edge.input_id,
        target: edge.output_id,
        sourceHandle: edge.source_handle || undefined,
        targetHandle: edge.target_handle || undefined,
        animated: false, // PipeEdge handles its own animation
        type: 'pipe',
        data: {
          item: edge.item,
          // We could add resourceColor here based on the item if needed
        },
      });
    }
  } catch (error) {
    console.error('Failed to load factory:', error);
  }

  return { nodes, edges };
}

// Load unplaced machines (inventory for placement)
export async function loadUnplacedMachines(companyId: string): Promise<unknown[]> {
  try {
    const machines = await pb.collection("machines").getFullList({
      filter: `company = "${companyId}" && placed = false`,
    });
    return machines;
  } catch (error) {
    console.error('Failed to load unplaced machines:', error);
    return [];
  }
}

// Load unplaced deposits (discovered but not placed on canvas)
export async function loadUnplacedDeposits(companyId: string): Promise<unknown[]> {
  try {
    // Get all deposits for the company
    const allDeposits = await pb.collection("deposits").getFullList({
      filter: `company = "${companyId}" && quantity > 0`,
    });
    
    // Filter those with no location (null, empty, or invalid)
    const unplaced = allDeposits.filter(deposit => {
      const loc = deposit.location;
      // No location, or location is empty object
      if (!loc) return true;
      if (typeof loc === 'object' && Object.keys(loc).length === 0) return true;
      // Location has no coordinates
      if (loc.lng === undefined && loc.lat === undefined) return true;
      return false;
    });

    return unplaced;
  } catch (error) {
    console.error('Failed to load unplaced deposits:', error);
    return [];
  }
}

// Place a node on the canvas
export async function placeNode(
  type: 'machine' | 'deposit',
  id: string,
  x: number,
  y: number
): Promise<boolean> {
  try {
    const collection = type === 'machine' ? 'machines' : 'deposits';
    await pb.collection(collection).update(id, {
      location: { lng: x, lat: y },
      placed: true,
    });
    logAnalyticsEvent("factory_place_node", { type, id, x, y });
    return true;
  } catch (error) {
    console.error('Failed to place node:', error);
    return false;
  }
}

// Update node position
export async function updateNodePosition(
  type: 'machine' | 'deposit' | 'company' | 'storage',
  id: string,
  x: number,
  y: number
): Promise<boolean> {
  try {
    // Map storage to machines collection
    const collection = 
      type === 'machine' || type === 'storage' ? 'machines' : 
      type === 'deposit' ? 'deposits' : 
      'companies';
    
    await pb.collection(collection).update(id, {
      location: { lng: x, lat: y },
    });
    return true;
  } catch (error) {
    console.error('Failed to update node position:', error);
    return false;
  }
}

// Create an edge connection
export async function createEdge(
  inputId: string,
  inputType: 'machine' | 'deposit',
  outputId: string,
  outputType: 'machine' | 'company' | 'deposit', // Added outputType
  item: string,
  sourceHandle?: string,
  targetHandle?: string
): Promise<string | null> {
  try {
    const record = await pb.collection('edge_relation').create({
      input_id: inputId,
      input_type: inputType,
      output_id: outputId,
      output_type: outputType, // Use dynamic outputType
      item: item,
      source_handle: sourceHandle || '',
      target_handle: targetHandle || '',
    });
    return record.id;
  } catch (error) {
    console.error('Failed to create edge:', error);
    return null;
  }
}

// Delete an edge
export async function deleteEdge(edgeId: string): Promise<boolean> {
  try {
    await pb.collection('edge_relation').delete(edgeId);
    logAnalyticsEvent("factory_edge_delete", { edgeId });
    return true;
  } catch (error) {
    console.error('Failed to delete edge:', error);
    return false;
  }
}

export async function unplaceNode(
  type: 'machine' | 'deposit',
  id: string
): Promise<boolean> {
  try {
    const collection = type === 'machine' ? 'machines' : 'deposits';
    await pb.collection(collection).update(id, {
      placed: false,
      location: null,
    });
    logAnalyticsEvent("factory_unplace_node", { type, id });
    return true;
  } catch (error) {
    console.error('Failed to unplace node:', error);
    return false;
  }
}

/**
 * Lightweight node state update - fetches only quantities and states
 * Used for periodic refresh to avoid reloading entire graph structure
 */
export interface NodeStateUpdate {
  machines: Map<string, { quantity?: number; durability?: number }>;
  deposits: Map<string, { quantity: number }>;
}

export async function fetchNodeStates(companyId: string): Promise<NodeStateUpdate> {
  const result: NodeStateUpdate = {
    machines: new Map(),
    deposits: new Map(),
  };

  try {
    // Fetch only placed machines with minimal fields
    const machines = await pb.collection("machines").getFullList({
      filter: `company = "${companyId}" && placed = true`,
      fields: 'id,durability',
    });

    for (const machine of machines) {
      result.machines.set(machine.id, {
        durability: machine.durability,
      });
    }

    // Fetch deposits with minimal fields
    const deposits = await pb.collection("deposits").getFullList({
      filter: `company = "${companyId}"`,
      fields: 'id,quantity',
    });

    for (const deposit of deposits) {
      result.deposits.set(deposit.id, {
        quantity: deposit.quantity,
      });
    }
  } catch (error) {
    console.error('Failed to fetch node states:', error);
  }

  return result;
}

