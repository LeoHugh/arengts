export interface Dialog {
  id: string;
  roleId: string;
  text: string;
}

export interface ChapterOutline {
  id: string;
  title: string;
  summary: string;           // 章节剧情概要
  keyEvents?: string[];      // 关键事件
  involvedCharacters?: string[]; // 涉及的角色ID
  backgroundId?: string;
  nextChapterId?: string;
  choices?: {
    text: string;
    targetChapterId: string;
  }[];
  dialogs?: Dialog[];       // 生成的对话（可选）
}

export interface Chapter extends ChapterOutline {
  dialogs: Dialog[];
  characterState?: { 
    roleId: string; 
    expression: string;
  }[];
}

export interface Character {
  id: string;
  name: string;
  avatar: string;
  description: string;
  personality?: string;     // 性格特点
  background?: string;      // 背景故事
  isUserCreated?: boolean;
}

export interface Background {
  id: string;
  url: string;
  description: string;
}

export interface ProjectConfig {
  title: string;            // 小说标题
  worldview: string;        // 世界观及设定
  characters: string;       // 主要角色性格及设定
  plot: string;             // 整体剧情
}

export interface ProjectOutline {
  config: ProjectConfig;
  characters: Record<string, Character>;
  backgrounds: Record<string, Background>;
  chapters: Record<string, ChapterOutline>;
  startChapterId: string;
}

export interface GameManifest {
  worldview: string;
  chapters: Record<string, Chapter>;
  characters: Record<string, Character>;
  backgrounds: Record<string, Background>;
  startChapterId: string;
}