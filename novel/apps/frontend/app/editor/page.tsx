"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Handle,
  Position
} from "reactflow";
import "reactflow/dist/style.css";
import { useEditorStore } from "../../../../packages/editor/store";
import { Chapter, Dialog } from "../../../../packages/core/type";

function StoryNode({ data }: { data: Chapter }) {
  return (
    <div className="px-4 py-3 shadow-md rounded-md bg-white border-2 border-stone-400 min-w-[200px]">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />
      
      <div className="font-bold text-lg mb-2">{data.title}</div>
      <div className="text-sm text-gray-600">
        {data.dialogs?.length || 0} 个对话
      </div>
      
      {data.choices && data.choices.length > 0 && (
        <div className="mt-2 text-xs text-blue-600">
          {data.choices.length} 个选项
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500"
      />
    </div>
  );
}

const nodeTypes = {
  storyNode: StoryNode
};

export default function EditorPage() {
  const router = useRouter();
  const { nodes, edges, selectedNode, loadProject, updateNode, selectNode } = useEditorStore();
  const [reactFlowNodes, setReactFlowNodes, onNodesChange] = useNodesState(nodes);
  const [reactFlowEdges, setReactFlowEdges, onEdgesChange] = useEdgesState(edges);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    const savedProject = localStorage.getItem("currentProject");
    console.log('localStorage 数据:', savedProject);
    
    if (savedProject) {
      try {
        const manifest = JSON.parse(savedProject);
        console.log('解析后的 manifest:', manifest);
        console.log('chapters 数量:', Object.keys(manifest.chapters || {}).length);
        loadProject(manifest);
      } catch (e) {
        console.error('解析 localStorage 数据失败:', e);
      }
    }
  }, [loadProject]);

  useEffect(() => {
    setReactFlowNodes(nodes);
    setReactFlowEdges(edges);
  }, [nodes, edges, setReactFlowNodes, setReactFlowEdges]);

  useEffect(() => {
    if (selectedNode) {
      const node = nodes.find(n => n.id === selectedNode);
      if (node) {
        setEditingChapter(node.data);
      }
    } else {
      setEditingChapter(null);
    }
  }, [selectedNode, nodes]);

  const onConnect = (connection: Connection) => {
    setReactFlowEdges((eds: Edge[]) => addEdge({
      ...connection,
      markerEnd: { type: MarkerType.ArrowClosed }
    }, eds));
  };

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    selectNode(node.id);
  };

  const handleChapterUpdate = (field: keyof Chapter, value: any) => {
    if (editingChapter) {
      const updatedChapter = { ...editingChapter, [field]: value };
      setEditingChapter(updatedChapter);
      updateNode(editingChapter.id, { [field]: value });
    }
  };

  const handleAddDialog = () => {
    if (editingChapter) {
      const newDialog: Dialog = {
        id: `dialog-${Date.now()}`,
        text: "新对话",
        roleId: ""
      };
      const updatedDialogs = [...editingChapter.dialogs, newDialog];
      setEditingChapter({ ...editingChapter, dialogs: updatedDialogs });
      updateNode(editingChapter.id, { dialogs: updatedDialogs });
    }
  };

  const handleRemoveDialog = (dialogId: string) => {
    if (editingChapter) {
      const updatedDialogs = editingChapter.dialogs.filter(d => d.id !== dialogId);
      setEditingChapter({ ...editingChapter, dialogs: updatedDialogs });
      updateNode(editingChapter.id, { dialogs: updatedDialogs });
    }
  };

  const handleDialogUpdate = (dialogId: string, field: keyof Dialog, value: any) => {
    if (editingChapter) {
      const updatedDialogs = editingChapter.dialogs.map(dialog =>
        dialog.id === dialogId ? { ...dialog, [field]: value } : dialog
      );
      setEditingChapter({ ...editingChapter, dialogs: updatedDialogs });
      updateNode(editingChapter.id, { dialogs: updatedDialogs });
    }
  };

  const handleAddChoice = () => {
    if (editingChapter) {
      const newChoice = {
        text: "新选项",
        targetChapterId: ""
      };
      const updatedChoices = [...(editingChapter.choices || []), newChoice];
      setEditingChapter({ ...editingChapter, choices: updatedChoices });
      updateNode(editingChapter.id, { choices: updatedChoices });
    }
  };

  const handleRemoveChoice = (index: number) => {
    if (editingChapter && editingChapter.choices) {
      const updatedChoices = editingChapter.choices.filter((_, i) => i !== index);
      setEditingChapter({ ...editingChapter, choices: updatedChoices });
      updateNode(editingChapter.id, { choices: updatedChoices });
    }
  };

  const handleChoiceChange = (index: number, field: 'text' | 'targetChapterId', value: string) => {
    if (editingChapter && editingChapter.choices) {
      const updatedChoices = editingChapter.choices.map((choice, i) => 
        i === index ? { ...choice, [field]: value } : choice
      );
      setEditingChapter({ ...editingChapter, choices: updatedChoices });
      updateNode(editingChapter.id, { choices: updatedChoices });
    }
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1">
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {editingChapter && (
        <div className="w-96 bg-white border-l border-gray-200 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">编辑章节</h2>
            <button
              onClick={() => router.push("/play")}
              className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              ▶ 播放
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                章节 ID
              </label>
              <input
                type="text"
                value={editingChapter.id}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                章节标题
              </label>
              <input
                type="text"
                value={editingChapter.title}
                onChange={(e) => handleChapterUpdate('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  对话列表
                </label>
                <button
                  onClick={handleAddDialog}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  + 添加对话
                </button>
              </div>
              
              {editingChapter.dialogs && editingChapter.dialogs.length > 0 ? (
                <div className="space-y-2">
                  {editingChapter.dialogs.map((dialog) => (
                    <div key={dialog.id} className="border border-gray-200 rounded p-3">
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={dialog.roleId || ""}
                          onChange={(e) => handleDialogUpdate(dialog.id, 'roleId', e.target.value || undefined)}
                          placeholder="角色 ID（留空为旁白）"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <textarea
                          value={dialog.text}
                          onChange={(e) => handleDialogUpdate(dialog.id, 'text', e.target.value)}
                          placeholder="对话内容"
                          rows={3}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => handleRemoveDialog(dialog.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          删除对话
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">暂无对话</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                下一章节 ID（可选）
              </label>
              <input
                type="text"
                value={editingChapter.nextChapterId || ""}
                onChange={(e) => handleChapterUpdate('nextChapterId', e.target.value || undefined)}
                placeholder="点击后跳转到的章节"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  选项
                </label>
                <button
                  onClick={handleAddChoice}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  + 添加选项
                </button>
              </div>
              
              {editingChapter.choices && editingChapter.choices.length > 0 ? (
                <div className="space-y-2">
                  {editingChapter.choices.map((choice, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3">
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={choice.text}
                          onChange={(e) => handleChoiceChange(index, 'text', e.target.value)}
                          placeholder="选项文本"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="text"
                          value={choice.targetChapterId}
                          onChange={(e) => handleChoiceChange(index, 'targetChapterId', e.target.value)}
                          placeholder="目标章节 ID"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          onClick={() => handleRemoveChoice(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          删除选项
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">暂无选项</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                背景图片 ID（可选）
              </label>
              <input
                type="text"
                value={editingChapter.backgroundId || ""}
                onChange={(e) => handleChapterUpdate('backgroundId', e.target.value || undefined)}
                placeholder="背景图片 ID"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}