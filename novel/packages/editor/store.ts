// packages/editor/src/store.ts
import { create } from 'zustand';
import { Node, Edge, OnNodesChange, OnEdgesChange, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import { GameManifest, Chapter } from '../core/type';
import { convertToReactFlowNodes, convertToReactFlowEdges } from './convert';
export interface EditorStore {
  project: GameManifest | null;
  nodes: Node<Chapter>[];
  edges: Edge[];
  selectedNode: string | null;
  
  // 加载项目
  loadProject: (manifest: GameManifest) => void;
  
  // 节点变化
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  
  // 操作函数
  addNode: (node: Chapter) => void;
  updateNode: (nodeId: string, data: Partial<Chapter>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (edge: Edge) => void;
  deleteEdge: (edgeId: string) => void;
  
  // 选择节点
  selectNode: (nodeId: string | null) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  project: null,
  nodes: [],
  edges: [],
  selectedNode: null,
  
  loadProject: (manifest) => {
    set({ 
      project: manifest,
      nodes: convertToReactFlowNodes(manifest),
      edges: convertToReactFlowEdges(manifest)
    });
  },
  
  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes)
    });
  },
  
  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges)
    });
  },
  
  addNode: (node) => {
    const newNode: Node<Chapter> = {
      id: node.id,
      type: 'chapter',
      position: { x: 0, y: 0 },
      data: node
    };
    set({ nodes: [...get().nodes, newNode] });
  },
  
  updateNode: (nodeId, data) => {
    set({
      nodes: get().nodes.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    });
  },
  
  deleteNode: (nodeId) => {
    set({
      nodes: get().nodes.filter(node => node.id !== nodeId),
      edges: get().edges.filter(edge => 
        edge.source !== nodeId && edge.target !== nodeId
      )
    });
  },
  
  addEdge: (edge) => {
    set({ edges: [...get().edges, edge] });
  },
  
  deleteEdge: (edgeId) => {
    set({
      edges: get().edges.filter(edge => edge.id !== edgeId)
    });
  },
  
  selectNode: (nodeId) => {
    set({ selectedNode: nodeId });
  }
}));