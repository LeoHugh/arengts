"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ProjectOutline, ChapterOutline, Dialog, Character } from "../../../../packages/core/type";

interface GameState {
  project: ProjectOutline;
  currentChapterId: string;
  currentDialogIndex: number;
  history: Array<{ chapterId: string; dialogIndex: number }>;
}

export default function PlayPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [showChoices, setShowChoices] = useState(false);

  // 加载游戏数据
  useEffect(() => {
    const savedProject = localStorage.getItem("currentProject");
    if (savedProject) {
      try {
        const project: ProjectOutline = JSON.parse(savedProject);
        setGameState({
          project,
          currentChapterId: project.startChapterId,
          currentDialogIndex: 0,
          history: []
        });
      } catch (e) {
        console.error("解析项目数据失败:", e);
        router.push("/create");
      }
    } else {
      router.push("/create");
    }
  }, [router]);

  // 获取当前章节
  const getCurrentChapter = useCallback((): ChapterOutline | null => {
    if (!gameState) return null;
    return gameState.project.chapters[gameState.currentChapterId] || null;
  }, [gameState]);

  // 获取当前对话
  const getCurrentDialog = useCallback((): Dialog | null => {
    const chapter = getCurrentChapter();
    if (!chapter?.dialogs) return null;
    return chapter.dialogs[gameState?.currentDialogIndex || 0] || null;
  }, [getCurrentChapter, gameState?.currentDialogIndex]);

  // 获取角色信息
  const getCharacter = (roleId: string | undefined): Character | null => {
    if (!gameState || !roleId) return null;
    return gameState.project.characters[roleId] || null;
  };

  // 打字机效果
  useEffect(() => {
    const dialog = getCurrentDialog();
    if (!dialog) {
      setDisplayedText("");
      return;
    }

    setIsTyping(true);
    setDisplayedText("");
    
    let index = 0;
    const text = dialog.text;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 30);

    return () => clearInterval(interval);
  }, [gameState?.currentChapterId, gameState?.currentDialogIndex, getCurrentDialog]);

  // 检查是否显示选项
  useEffect(() => {
    const chapter = getCurrentChapter();
    if (!chapter || !gameState) return;

    const isLastDialog = gameState.currentDialogIndex >= (chapter.dialogs?.length || 0) - 1;
    const hasChoices = chapter.choices && chapter.choices.length > 0;
    
    setShowChoices(Boolean(isLastDialog && hasChoices && !isTyping));
  }, [getCurrentChapter, gameState, isTyping]);

  // 推进对话
  const advance = () => {
    if (!gameState || isTyping) return;

    const chapter = getCurrentChapter();
    if (!chapter?.dialogs) return;

    const nextIndex = gameState.currentDialogIndex + 1;
    
    if (nextIndex < chapter.dialogs.length) {
      setGameState({
        ...gameState,
        currentDialogIndex: nextIndex,
        history: [...gameState.history, { chapterId: gameState.currentChapterId, dialogIndex: gameState.currentDialogIndex }]
      });
    }
  };

  // 选择分支
  const makeChoice = (targetChapterId: string) => {
    if (!gameState) return;

    setGameState({
      ...gameState,
      currentChapterId: targetChapterId,
      currentDialogIndex: 0,
      history: [...gameState.history, { chapterId: gameState.currentChapterId, dialogIndex: gameState.currentDialogIndex }]
    });
    setShowChoices(false);
  };

  // 获取背景图片
  const getBackgroundUrl = (): string => {
    const chapter = getCurrentChapter();
    if (!chapter?.backgroundId || !gameState) {
      return "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)";
    }
    const bg = gameState.project.backgrounds[chapter.backgroundId];
    return bg?.url || "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)";
  };

  // 加载中
  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  const chapter = getCurrentChapter();
  const dialog = getCurrentDialog();
  const character = getCharacter(dialog?.roleId);
  const isLastDialog = gameState.currentDialogIndex >= (chapter?.dialogs?.length || 0) - 1;
  const hasNextChapter = chapter?.nextChapterId && !chapter?.choices?.length;

  return (
    <div 
      className="min-h-screen relative overflow-hidden cursor-pointer"
      onClick={advance}
      style={{
        background: getBackgroundUrl().startsWith('http') 
          ? `url(${getBackgroundUrl()}) center/cover no-repeat`
          : getBackgroundUrl()
      }}
    >
      {/* 顶部状态栏 */}
      <div className="absolute top-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4 z-20">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-white text-lg font-bold">{gameState.project.config.title}</h1>
          <div className="flex items-center gap-4">
            <span className="text-white/70 text-sm">
              {chapter?.title}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); router.push("/outline"); }}
              className="text-white/70 hover:text-white text-sm px-3 py-1 rounded bg-white/10 hover:bg-white/20 transition-colors"
            >
              返回编辑
            </button>
          </div>
        </div>
      </div>

      {/* 角色立绘区域 */}
      {character && (
        <div className="absolute bottom-48 left-1/2 transform -translate-x-1/2 z-10">
          <div className="relative">
            <div className="w-48 h-64 rounded-lg overflow-hidden shadow-2xl border-4 border-white/20 bg-gray-800">
              {character.avatar ? (
                <img 
                  src={character.avatar} 
                  alt={character.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%23666" font-size="40">?</text></svg>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl text-gray-500">
                  👤
                </div>
              )}
            </div>
            {/* 角色名称标签 */}
            <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-1 rounded-full shadow-lg">
              <span className="text-white font-bold text-sm whitespace-nowrap">{character.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* 对话框 */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="max-w-4xl mx-auto p-4">
          {/* 对话框主体 */}
          <div className="bg-black/80 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/10">
            {/* 角色名称 */}
            {character ? (
              <div className="mb-3">
                <span className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  {character.name}
                </span>
              </div>
            ) : (
              <div className="mb-3">
                <span className="inline-block bg-gray-600/50 text-gray-300 px-4 py-1 rounded-full text-sm">
                  旁白
                </span>
              </div>
            )}

            {/* 对话文本 */}
            <div className="text-white text-lg leading-relaxed min-h-[60px]">
              {displayedText}
              {isTyping && <span className="animate-pulse">▌</span>}
            </div>

            {/* 继续提示 */}
            {!showChoices && !isTyping && !isLastDialog && (
              <div className="mt-4 text-right">
                <span className="text-white/50 text-sm animate-bounce inline-block">
                  点击继续 ▼
                </span>
              </div>
            )}

            {/* 自动跳转下一章 */}
            {isLastDialog && hasNextChapter && !isTyping && (
              <div className="mt-4 text-right">
                <span className="text-white/50 text-sm animate-pulse inline-block">
                  点击进入下一章 ▶
                </span>
              </div>
            )}
          </div>

          {/* 选项按钮 */}
          {showChoices && chapter?.choices && (
            <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>
              {chapter.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => makeChoice(choice.targetChapterId)}
                  className="w-full bg-gradient-to-r from-purple-600/90 to-blue-600/90 hover:from-purple-500 hover:to-blue-500 text-white py-4 px-6 rounded-xl text-left transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg border border-white/20"
                >
                  <span className="inline-block w-8 h-8 rounded-full bg-white/20 text-center leading-8 mr-3 font-bold">
                    {index + 1}
                  </span>
                  {choice.text}
                </button>
              ))}
            </div>
          )}

          {/* 结局提示 */}
          {isLastDialog && !chapter?.choices && !chapter?.nextChapterId && !isTyping && (
            <div className="mt-4 text-center">
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4">
                <p className="text-yellow-200 text-lg font-bold">🎉 故事结束</p>
                <p className="text-white/60 text-sm mt-1">感谢游玩！</p>
                <button
                  onClick={(e) => { e.stopPropagation(); router.push("/outline"); }}
                  className="mt-3 text-white/80 hover:text-white text-sm underline"
                >
                  返回编辑
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="absolute top-20 right-4 text-white/30 text-xs space-y-1 z-10">
        <p>点击屏幕推进对话</p>
      </div>

      {/* 进度指示 */}
      <div className="absolute top-20 left-4 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-white/70 text-xs">
            对话 {gameState.currentDialogIndex + 1} / {chapter?.dialogs?.length || 0}
          </span>
        </div>
      </div>
    </div>
  );
}