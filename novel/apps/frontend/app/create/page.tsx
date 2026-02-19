"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectOutline, ChapterOutline, Character, Background } from "../../../../packages/core/type";

interface CharacterCard {
  id: string;
  name: string;
  description: string;
  personality: string;
  background: string;
}

const STEPS = [
  { id: "title", label: "小说标题", icon: "📚", placeholder: "例如：哈利波特与魔法石", type: "input" },
  { id: "worldview", label: "世界观及设定", icon: "🌍", placeholder: "描述故事发生的世界背景、魔法体系、社会结构等...", type: "textarea", rows: 8 },
  { id: "characters", label: "主要角色设定", icon: "👥", type: "characters" },
  { id: "plot", label: "整体剧情", icon: "📖", placeholder: "描述故事的主要情节、起承转合、结局走向等...", type: "textarea", rows: 12 },
] as const;

export default function CreatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: "",
    worldview: "",
    characters: "",
    plot: ""
  });
  const [characterCards, setCharacterCards] = useState<CharacterCard[]>([]);
  const [editingCharacter, setEditingCharacter] = useState<CharacterCard | null>(null);

  const currentField = STEPS[currentStep].id as keyof typeof formData;
  const currentValue = formData[currentField];
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const isCharacterStep = STEPS[currentStep].id === "characters";

  const handleNext = () => {
    if (isCharacterStep) {
      if (characterCards.length === 0) {
        alert("请至少添加一个角色");
        return;
      }
    } else if (!currentValue.trim()) {
      alert("请填写此步骤的内容");
      return;
    }
    if (!isLastStep) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.worldview.trim() || 
        !formData.plot.trim()) {
      alert("请填写所有内容");
      return;
    }
    
    if (characterCards.length === 0) {
      alert("请至少添加一个角色");
      return;
    }

    setLoading(true);
    try {
      const outline = await generateOutline(formData, characterCards);
      localStorage.setItem("currentProject", JSON.stringify(outline));
      router.push("/outline");
    } catch (error) {
      console.error("生成失败:", error);
      alert("生成失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (value: string) => {
    setFormData({ ...formData, [currentField]: value });
  };

  // 角色卡片操作
  const handleAddCharacter = () => {
    const newCharacter: CharacterCard = {
      id: `char-${Date.now()}`,
      name: "",
      description: "",
      personality: "",
      background: ""
    };
    setEditingCharacter(newCharacter);
  };

  const handleSaveCharacter = () => {
    if (!editingCharacter) return;
    
    if (!editingCharacter.name.trim()) {
      alert("请填写角色名称");
      return;
    }

    const existingIndex = characterCards.findIndex(c => c.id === editingCharacter.id);
    let updatedCards: CharacterCard[];
    
    if (existingIndex >= 0) {
      updatedCards = [...characterCards];
      updatedCards[existingIndex] = editingCharacter;
    } else {
      updatedCards = [...characterCards, editingCharacter];
    }
    
    setCharacterCards(updatedCards);
    setEditingCharacter(null);
    
    // 更新 formData.characters
    const charactersText = updatedCards.map(c => 
  `【角色 ID】: ${c.id}\n【姓名】: ${c.name}\n【描述】: ${c.description}\n【性格】: ${c.personality}\n【背景】: ${c.background}`
).join("\n\n");
    setFormData({ ...formData, characters: charactersText });
  };

  const handleEditCharacter = (character: CharacterCard) => {
    setEditingCharacter({ ...character });
  };

  const handleDeleteCharacter = (id: string) => {
    const updatedCards = characterCards.filter(c => c.id !== id);
    setCharacterCards(updatedCards);
    
    const charactersText = updatedCards.map(c => 
      `【${c.name}】\n描述：${c.description}\n性格：${c.personality}\n背景：${c.background}`
    ).join("\n\n");
    setFormData({ ...formData, characters: charactersText });
  };

  const isStepCompleted = (index: number) => {
    const field = STEPS[index].id as keyof typeof formData;
    if (field === "characters") {
      return characterCards.length > 0;
    }
    return formData[field].trim().length > 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左侧目录栏 */}
      <div className="w-80 bg-white border-r border-gray-200 p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">创建新游戏</h1>
          <p className="text-gray-500 text-sm mt-1">填写以下信息生成章节大纲</p>
        </div>

        {/* 步骤列表 */}
        <nav className="flex-1">
          <ul className="space-y-2">
            {STEPS.map((step, index) => (
              <li key={step.id}>
                <button
                  onClick={() => setCurrentStep(index)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                    currentStep === index
                      ? "bg-blue-50 border-2 border-blue-500 text-blue-700"
                      : isStepCompleted(index)
                        ? "bg-green-50 border-2 border-green-300 text-green-700 hover:bg-green-100"
                        : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{step.icon}</span>
                      <span className="font-medium">{step.label}</span>
                    </div>
                    {isStepCompleted(index) && currentStep !== index && (
                      <span className="text-green-500">✓</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* 进度指示 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>进度</span>
            <span>{STEPS.filter((_, i) => isStepCompleted(i)).length} / {STEPS.length}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(STEPS.filter((_, i) => isStepCompleted(i)).length / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 p-8 flex flex-col">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          {/* 步骤标题 */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{STEPS[currentStep].icon}</span>
              <h2 className="text-2xl font-bold text-gray-900">
                {STEPS[currentStep].label}
              </h2>
            </div>
            <p className="text-gray-500">
              步骤 {currentStep + 1} / {STEPS.length}
            </p>
          </div>

          {/* 输入区域 */}
          <div className="flex-1 mb-6">
            {isCharacterStep ? (
              <div className="space-y-4">
                {/* 角色卡片列表 */}
                <div className="grid grid-cols-2 gap-4">
                  {characterCards.map((character) => (
                    <div
                      key={character.id}
                      className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => handleEditCharacter(character)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
                            {character.name ? character.name[0] : "?"}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{character.name || "未命名角色"}</h3>
                            <p className="text-sm text-gray-500 line-clamp-1">{character.description || "点击编辑..."}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCharacter(character.id); }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                      {character.personality && (
                        <div className="mt-3 text-sm text-gray-600">
                          <span className="text-purple-500">性格：</span>
                          {character.personality}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* 添加角色按钮 */}
                  <button
                    onClick={handleAddCharacter}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[120px]"
                  >
                    <span className="text-3xl mb-2">+</span>
                    <span className="text-sm">添加角色</span>
                  </button>
                </div>

                {/* 角色编辑弹窗 */}
                {editingCharacter && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingCharacter(null)}>
                    <div 
                      className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <span className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white text-lg font-bold">
                          {editingCharacter.name ? editingCharacter.name[0] : "?"}
                        </span>
                        {characterCards.find(c => c.id === editingCharacter.id) ? "编辑角色" : "添加角色"}
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">角色名称 *</label>
                          <input
                            type="text"
                            value={editingCharacter.name}
                            onChange={(e) => setEditingCharacter({ ...editingCharacter, name: e.target.value })}
                            placeholder="例如：哈利·波特"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">角色描述</label>
                          <textarea
                            value={editingCharacter.description}
                            onChange={(e) => setEditingCharacter({ ...editingCharacter, description: e.target.value })}
                            placeholder="外貌、身份、特点等..."
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">性格特点</label>
                          <textarea
                            value={editingCharacter.personality}
                            onChange={(e) => setEditingCharacter({ ...editingCharacter, personality: e.target.value })}
                            placeholder="勇敢、聪明、善良..."
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">背景故事</label>
                          <textarea
                            value={editingCharacter.background}
                            onChange={(e) => setEditingCharacter({ ...editingCharacter, background: e.target.value })}
                            placeholder="角色的过去经历、家庭背景..."
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-3 mt-6">
                        <button
                          onClick={() => setEditingCharacter(null)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800"
                        >
                          取消
                        </button>
                        <button
                          onClick={handleSaveCharacter}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 提示信息 */}
                <div className="text-center text-gray-400 text-sm mt-4">
                  已添加 {characterCards.length} 个角色
                </div>
              </div>
            ) : STEPS[currentStep].type === "input" ? (
              <input
                type="text"
                value={currentValue}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder={STEPS[currentStep].placeholder || ""}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            ) : (
              <textarea
                value={currentValue}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder={STEPS[currentStep].type !== "characters" ? (STEPS[currentStep] as { placeholder?: string }).placeholder || "" : undefined}
                rows={(STEPS[currentStep] as { rows?: number }).rows || 8}
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                autoFocus
              />
            )}
            
            {/* 字数统计 */}
            {!isCharacterStep && (
              <div className="mt-2 text-right text-sm text-gray-400">
                {currentValue.length} 字
              </div>
            )}
          </div>

          {/* 导航按钮 */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              onClick={handlePrev}
              disabled={isFirstStep}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              ← 上一步
            </button>

            {isLastStep ? (
              <button
                onClick={handleSubmit}
                disabled={loading || !isStepCompleted(currentStep)}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg font-medium"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    AI 正在规划...
                  </span>
                ) : (
                  "🎬 生成章节大纲"
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={isCharacterStep ? characterCards.length === 0 : !currentValue.trim()}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg font-medium"
              >
                下一步 →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

async function generateOutline(
  formData: { title: string; worldview: string; characters: string; plot: string },
  userCharacters: CharacterCard[]
): Promise<ProjectOutline> {
  try {
    const response = await fetch("http://localhost:3001/outline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error("AI 生成失败");
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "AI 生成失败");
    }

    return transformToProjectOutline(result.data, formData, userCharacters);
  } catch (error) {
    console.log("出现问题", error);
    throw error;
  }
}

function transformToProjectOutline(
  aiData: any, 
  config: { title: string; worldview: string; characters: string; plot: string },
  userCharacters: CharacterCard[]
): ProjectOutline {
  const chapters: Record<string, ChapterOutline> = {};
  const characters: Record<string, Character> = {};
  const backgrounds: Record<string, Background> = {};

  // 首先添加用户创建的角色（标记为用户角色）
  userCharacters.forEach((char) => {
    characters[char.id] = {
      id: char.id,
      name: char.name,
      avatar: "/placeholder-avatar.png",
      description: char.description,
      personality: char.personality,
      background: char.background,
      isUserCreated: true
    };
  });

  // 然后添加 AI 生成的角色（跳过与用户角色 ID 冲突的）
  if (aiData.characters) {
    aiData.characters.forEach((char: any) => {
      const id = String(char.id);
      // 如果 ID 已存在（用户角色），跳过
      if (characters[id]) {
        return;
      }
      characters[id] = {
        id,
        name: char.name,
        avatar: char.avatar || "/placeholder-avatar.png",
        description: char.description,
        personality: char.personality,
        background: char.background,
        isUserCreated: false
      };
    });
  }

  // 转换背景
  if (aiData.backgrounds) {
    aiData.backgrounds.forEach((bg: any) => {
      const id = String(bg.id);
      backgrounds[id] = {
        id,
        url: bg.url || "/placeholder-bg.png",
        description: bg.description
      };
    });
  }

  // 转换章节大纲
  if (aiData.chapters) {
    aiData.chapters.forEach((chapter: any) => {
      const id = String(chapter.id);
      chapters[id] = {
        id,
        title: chapter.title || `章节 ${id}`,
        summary: chapter.summary || "",
        keyEvents: chapter.keyEvents || [],
        involvedCharacters: (chapter.involvedCharacters || []).map(String),
        backgroundId: chapter.backgroundId ? String(chapter.backgroundId) : undefined,
        nextChapterId: chapter.nextChapterId ? String(chapter.nextChapterId) : undefined,
        choices: (chapter.choices || []).map((c: any) => ({
          text: c.text,
          targetChapterId: String(c.targetChapterId)
        }))
      };
    });
  }

  const chapterIds = Object.keys(chapters);
  const startChapterId = chapterIds[0] || "chapter-1";

  return {
    config,
    chapters,
    characters,
    backgrounds,
    startChapterId
  };
}
