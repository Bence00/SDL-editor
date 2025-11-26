// src/processExtractor.js
import { state } from "./state.js";

/**
 * Extract all SDL processes from the canvas.
 * Each process starts at a START node.
 * 
 * START.label = process name
 * START.id    = process identifier
 */
export function extractProcesses() {
  const processes = {};

  // 1) Find all START nodes
  const startNodes = state.nodes.filter(n => n.type === "start");

  for (const start of startNodes) {
    const processId = String(start.id);
    const processName =
      (typeof start.name === "string" && start.name.trim().length > 0)
        ? start.name.trim()
        : ("PROCESS_" + processId);

    processes[processId] = {
      id: processId,
      name: processName,
      start: extractStartBlock(start),
      states: extractStatesForProcess(start)
    };
  }

  return processes;
}

/**
 * Extract START block
 */
function extractStartBlock(startNode) {
  return {
    nodeId: startNode.id,
    name: startNode.name || "START",
    x: startNode.x,
    y: startNode.y,
    width: startNode.width,
    height: startNode.height,
    transition: extractTransitionsFrom(startNode),
    newstate: getSingleTargetStateId(startNode)
  };
}

/**
 * Extract all states belonging to the same process.
 * This finds all nodes reachable from the START.
 */
function extractStatesForProcess(startNode) {
  const visited = new Set();
  const queue = [startNode];
  const states = {};

  while (queue.length > 0) {
    const node = queue.shift();
    if (visited.has(node.id)) continue;
    visited.add(node.id);

    // State nodes except START
    if (node.type !== "start") {
      states[node.id] = serializeNodeAsState(node);
    }

    // Follow outgoing edges
    const outgoing = state.edges.filter(e => e.fromNodeId === node.id);

    outgoing.forEach(edge => {
      const target = state.nodes.find(n => n.id === edge.toNodeId);
      if (target && !visited.has(target.id)) {
        queue.push(target);
      }
    });
  }

  return states;
}

/**
 * Convert a node (state / decision / task / input / output) into SDL state JSON.
 */
function serializeNodeAsState(node) {
  // Common block:
  const base = {
    nodeId: node.id,
    name: node.name || ("STATE_" + node.id),
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height
  };

  if (node.type === "decision") {
    return {
      ...base,
      decision: extractDecision(node)
    };
  }

  return {
    ...base,
    transitions: extractTransitionsFrom(node)
  };
}

/**
 * Extract transitions from any non-decision node.
 */
function extractTransitionsFrom(node) {
  const outgoing = state.edges.filter(e => e.fromNodeId === node.id);

  return outgoing.map(edge => {
    const target = state.nodes.find(n => n.id === edge.toNodeId);

    const block = {
      nextstate: target ? target.id : null
    };

    if (edge.label && edge.label.trim() !== "") {
      block.condition = edge.label.trim();
    }

    return block;
  });
}

/**
 * Extract decision structure (branching by edge label).
 */
function extractDecision(node) {
  const outgoing = state.edges.filter(e => e.fromNodeId === node.id);

  const branches = {};

  outgoing.forEach(edge => {
    const label =
      (typeof edge.label === "string" && edge.label.trim().length > 0)
        ? edge.label.trim()
        : "true";

    const target = state.nodes.find(n => n.id === edge.toNodeId);

    branches[label] = {
      transition: [], // SDL-88 would contain actions here; you can extend this later
      nextstate: target ? target.id : null
    };
  });

  return {
    expr: node.name || "decision",
    branches
  };
}

/**
 * If START has only one outgoing edge, return its target.
 */
function getSingleTargetStateId(node) {
  const outgoing = state.edges.filter(e => e.fromNodeId === node.id);
  if (outgoing.length === 1) {
    return outgoing[0].toNodeId;
  }
  return null;
}
