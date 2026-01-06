/**
 * Factory Canvas Service
 * Handles loading, placing nodes, and managing edges for the Svelte Flow canvas
 */

import pb from '$lib/pocketbase';
import { getItem } from '$lib/data/game-static';

// Types
export interface FactoryNode {
  id: string;
  type: 'machine' | 'deposit' | 'company' | 'zone'; 
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
  // Optional parent/child relationships
  parentId?: string;
  extent?: 'parent' | [number, number, number, number];
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

// Check collision between nodes
export function checkCollision(
  x: number,
  y: number,
  width: number,
  height: number,
  existingNodes: FactoryNode[],
  excludeId?: string
): boolean {
  const nodeSize = 120; // Default node size

  for (const node of existingNodes) {
    if (excludeId && node.id === excludeId) continue;

    const nodeWidth = nodeSize;
    const nodeHeight = nodeSize;

    const overlapsX = x < node.position.x + nodeWidth && x + width > node.position.x;
    const overlapsY = y < node.position.y + nodeHeight && y + height > node.position.y;

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
    const companyLocation = company.location as { lon: number; lat: number } | null;

    nodes.push({
      id: company.id,
      type: "company",
      position: {
        x: companyLocation?.lon ?? 750,
        y: companyLocation?.lat ?? 750,
      },
      data: {
        name: company.name,
        icon: "🏢",
        placed: true,
      },
    });

    // Load placed machines
    const machines = await pb.collection("machines").getFullList({
      filter: `company = "${companyId}" && placed = true`,
    });

    for (const machine of machines) {
      const location = machine.location as { lon: number; lat: number } | null;
      const staticItem = getItem(machine.machine_id);
      
      nodes.push({
        id: machine.id,
        type: "machine",
        position: {
          x: location?.lon ?? 0,
          y: location?.lat ?? 0,
        },
        data: {
          itemId: machine.machine_id,
          name: staticItem?.name ?? "Machine",
          icon: staticItem?.icon || "⚙️",
          placed: true,
        },
      });
    }

    // Load deposits
    const deposits = await pb.collection("deposits").getFullList({
      filter: `company = "${companyId}"`,
    });

    for (const deposit of deposits) {
      const location = deposit.location as { lon: number; lat: number } | null;
      const staticItem = getItem(deposit.ressource_id);
      
      nodes.push({
        id: deposit.id,
        type: "deposit",
        position: {
          x: location?.lon ?? 0,
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

    // Load edges from edge_relation
    const edgeRelations = await pb.collection('edge_relation').getFullList({
      filter: `output_type = "company"`,
    });

    for (const edge of edgeRelations) {
      edges.push({
        id: edge.id,
        source: edge.input_id,
        target: edge.output_id,
        data: {
          item: edge.item,
        },
      });
    }
  } catch (error) {
    console.error('Failed to load factory:', error);
  }

  return { nodes, edges };
}

// Load unplaced machines (inventory for placement)
export async function loadUnplacedMachines(companyId: string): Promise<any[]> {
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
      location: { lon: x, lat: y },
      placed: true,
    });
    return true;
  } catch (error) {
    console.error('Failed to place node:', error);
    return false;
  }
}

// Update node position
export async function updateNodePosition(
  type: 'machine' | 'deposit',
  id: string,
  x: number,
  y: number
): Promise<boolean> {
  try {
    const collection = type === 'machine' ? 'machines' : 'deposits';
    await pb.collection(collection).update(id, {
      location: { lon: x, lat: y },
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
  item: string
): Promise<string | null> {
  try {
    const record = await pb.collection('edge_relation').create({
      input_id: inputId,
      input_type: inputType,
      output_id: outputId,
      output_type: 'company',
      item: item,
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
    return true;
  } catch (error) {
    console.error('Failed to delete edge:', error);
    return false;
  }
}
