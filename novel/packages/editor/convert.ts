// packages/editor/src/converters.ts
import { Node, Edge } from 'reactflow';
import { GameManifest, Chapter } from '../core/type';

export function convertToReactFlowNodes(manifest: GameManifest): Node<Chapter>[] {
  const chapters = Object.values(manifest.chapters || {});
  
  return chapters.map((chapter, index) => ({
    id: chapter.id,
    type: 'storyNode',
    position: { x: 0, y: index * 150 },
    data: chapter
  }));
}

export function convertToReactFlowEdges(manifest: GameManifest): Edge[] {
  const edges: Edge[] = [];
  
  Object.values(manifest.chapters || {}).forEach(chapter => {
    if (chapter.choices && chapter.choices.length > 0) {
      chapter.choices.forEach((choice, index) => {
        edges.push({
          id: `${chapter.id}-${choice.targetChapterId}-${index}`,
          source: chapter.id,
          target: choice.targetChapterId,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          label: choice.text,
          type: 'smoothstep',
          animated: true
        });
      });
    }
    else if (chapter.nextChapterId) {
      edges.push({
        id: `${chapter.id}-${chapter.nextChapterId}`,
        source: chapter.id,
        target: chapter.nextChapterId,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'smoothstep',
        animated: true
      });
    }
  });
  
  return edges;
}

export function convertToGameManifest(
  nodes: Node<Chapter>[],
  edges: Edge[],
  project: GameManifest
): GameManifest {
  const manifest: GameManifest = {
    ...project,
    chapters: {},
    characters: project.characters,
    backgrounds: project.backgrounds
  };
  
  nodes.forEach(node => {
    manifest.chapters[node.id] = node.data;
  });
  
  return manifest;
}