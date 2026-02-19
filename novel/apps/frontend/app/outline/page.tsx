"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProjectOutline, ChapterOutline } from "../../../../packages/core/type";

export default function OutlinePage() {
  const router = useRouter();
  const [project, setProject] = useState<ProjectOutline | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [editingChapter, setEditingChapter] = useState<ChapterOutline | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const savedProject = localStorage.getItem("currentProject");
    if (savedProject) {
      try {
        const parsed = JSON.parse(savedProject);
        setProject(parsed);
      } catch (e) {
        console.error("解析项目数据失败:", e);
        router.push("/create");
      }
    } else {
      router.push("/create");
    }
  }, [router]);

  const handleChapterEdit = (chapterId: string) => {
    setSelectedChapter(chapterId);
    if (project) {
      setEditingChapter({ ...project.chapters[chapterId] });
    }
  };

  const handleChapterUpdate = (field: keyof ChapterOutline, value: any) => {
    if (editingChapter) {
      setEditingChapter({ ...editingChapter, [field]: value });
    }
  };

  const handleSaveChapter = () => {
    if (project && editingChapter && selectedChapter) {
      const updatedProject = {
        ...project,
        chapters: {
          ...project.chapters,
          [selectedChapter]: editingChapter
        }
      };
      setProject(updatedProject);
      localStorage.setItem("currentProject", JSON.stringify(updatedProject));
      setSelectedChapter(null);
      setEditingChapter(null);
    }
  };

  const handleGenerateDialogs = async () => {
    if (!project || !editingChapter) return;
    
    setGenerating(true);
    try {
      // 获取上一章节信息
      const chapterIds = Object.keys(project.chapters);
      const currentIndex = chapterIds.indexOf(editingChapter.id);
      const previousChapter = currentIndex > 0 
        ? project.chapters[chapterIds[currentIndex - 1]] 
        : null;

      // 获取下一章节信息
      const nextChapter = editingChapter.nextChapterId 
        ? project.chapters[editingChapter.nextChapterId] 
        : null;

      // 获取场景背景描述
      const backgroundDescription = editingChapter.backgroundId 
        ? project.backgrounds[editingChapter.backgroundId]?.description 
        : undefined;

      // 获取前一章的对话
      const previousDialogs = previousChapter?.dialogs?.map(d => ({
        roleId: d.roleId || '',
        characterName: d.roleId ? project.characters[d.roleId]?.name || '未知' : '',
        text: d.text
      }));

      const response = await fetch("http://localhost:3001/dialogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 项目级上下文
          projectTitle: project.config.title,
          worldview: project.config.worldview,
          overallPlot: project.config.plot,
          
          // 角色信息（完整）
          characters: Object.values(project.characters).map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            personality: c.personality,
            background: c.background
          })),
          
          // 当前章节
          chapterId: editingChapter.id,
          chapterTitle: editingChapter.title,
          chapterSummary: editingChapter.summary,
          keyEvents: editingChapter.keyEvents,
          involvedCharacterIds: editingChapter.involvedCharacters,
          backgroundDescription,
          
          // 章节关系
          nextChapterTitle: nextChapter?.title,
          choices: editingChapter.choices?.map(c => ({
            text: c.text,
            targetChapterTitle: project.chapters[c.targetChapterId]?.title || '未知章节'
          })),
          
          // 前文上下文
          previousChapterSummary: previousChapter?.summary,
          previousDialogs
        })
      });

      if (!response.ok) throw new Error("生成失败");

      const result = await response.json();
      if (result.success) {
        const updatedChapter = {
          ...editingChapter,
          dialogs: result.data.dialogs
        };
        setEditingChapter(updatedChapter);
      }
    } catch (error) {
      console.error("生成对话失败:", error);
      alert("生成对话失败，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleGoToEditor = () => {
    router.push("/editor");
  };

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const chapters = Object.values(project.chapters);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">{project.config.title}</h1>
          <p className="text-gray-600 mt-1">章节大纲编辑</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-4 gap-6">
          {/* 左侧：章节列表 */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">章节列表 ({chapters.length})</h2>
              <div className="space-y-2">
                {chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    onClick={() => handleChapterEdit(chapter.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedChapter === chapter.id
                        ? "bg-blue-50 border-2 border-blue-500"
                        : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                    }`}
                  >
                    <div className="font-medium">{chapter.title}</div>
                    <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {chapter.summary}
                    </div>
                    {chapter.dialogs && chapter.dialogs.length > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ 已生成 {chapter.dialogs.length} 条对话
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                onClick={handleGoToEditor}
                className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                进入编辑器 →
              </button>
            </div>
          </div>

          {/* 中间：章节编辑 */}
          <div className="col-span-2">
            {editingChapter ? (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold">编辑章节</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateDialogs}
                      disabled={generating}
                      className="bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
                    >
                      {generating ? "生成中..." : "✨ 生成对话"}
                    </button>
                    <button
                      onClick={handleSaveChapter}
                      className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      章节标题
                    </label>
                    <input
                      type="text"
                      value={editingChapter.title}
                      onChange={(e) => handleChapterUpdate("title", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      剧情概要
                    </label>
                    <textarea
                      value={editingChapter.summary}
                      onChange={(e) => handleChapterUpdate("summary", e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      关键事件
                    </label>
                    <textarea
                      value={editingChapter.keyEvents?.join("\n") || ""}
                      onChange={(e) => handleChapterUpdate("keyEvents", e.target.value.split("\n").filter(Boolean))}
                      rows={3}
                      placeholder="每行一个关键事件"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      涉及角色
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(project.characters).map((char) => (
                        <label
                          key={char.id}
                          className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={editingChapter.involvedCharacters?.includes(char.id)}
                            onChange={(e) => {
                              const current = editingChapter.involvedCharacters || [];
                              const updated = e.target.checked
                                ? [...current, char.id]
                                : current.filter((id) => id !== char.id);
                              handleChapterUpdate("involvedCharacters", updated);
                            }}
                          />
                          <span className="text-sm">{char.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {editingChapter.dialogs && editingChapter.dialogs.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        已生成的对话 ({editingChapter.dialogs.length} 条)
                      </label>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {editingChapter.dialogs.map((dialog, index) => (
                          <div
                            key={dialog.id || index}
                            className="p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="text-xs text-gray-500 mb-1">
                              {dialog.roleId
                                ? project.characters[dialog.roleId]?.name || "未知角色"
                                : "旁白"}
                            </div>
                            <div className="text-sm">{dialog.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                点击左侧章节进行编辑
              </div>
            )}
          </div>

          {/* 最右侧：角色卡栏 */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">角色列表 ({Object.keys(project.characters).length})</h2>
              <div className="space-y-3">
                {Object.values(project.characters).map((character) => (
                  <div
                    key={character.id}
                    className={`p-3 rounded-lg transition-colors ${
                      character.isUserCreated 
                        ? "bg-purple-50 border border-purple-200" 
                        : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                        character.isUserCreated 
                          ? "bg-gradient-to-br from-purple-500 to-pink-500" 
                          : "bg-gradient-to-br from-blue-400 to-cyan-500"
                      }`}>
                        {character.name ? character.name[0] : "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">{character.name}</span>
                          {character.isUserCreated && (
                            <span className="text-xs bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded">用户</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{character.id}</div>
                      </div>
                    </div>
                    {character.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {character.description}
                      </p>
                    )}
                    {character.personality && (
                      <div className="text-xs">
                        <span className="text-purple-500 font-medium">性格：</span>
                        <span className="text-gray-600">{character.personality}</span>
                      </div>
                    )}
                    {character.background && (
                      <div className="text-xs mt-1">
                        <span className="text-blue-500 font-medium">背景：</span>
                        <span className="text-gray-600 line-clamp-1">{character.background}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}