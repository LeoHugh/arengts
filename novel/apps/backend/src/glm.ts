// apps/backend/src/services/glm.ts
import OpenAI from 'openai';

export interface GLMConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface GenerateOutlineRequest {
  title: string;
  worldview: string;
  characters: string;
  plot: string;
}

export interface GenerateDialogsRequest {
  // 项目级上下文
  projectTitle: string;
  worldview: string;
  overallPlot: string;
  
  // 角色信息（精细化）
  characters: Array<{
    id: string;
    name: string;
    description: string;
    personality?: string;
    background?: string;
  }>;
  
  // 当前章节信息
  chapterId: string;
  chapterTitle: string;
  chapterSummary: string;
  keyEvents?: string[];
  involvedCharacterIds?: string[];
  backgroundDescription?: string;
  
  // 章节关系
  nextChapterTitle?: string;
  choices?: Array<{ text: string; targetChapterTitle: string }>;
  
  // 前文上下文
  previousChapterSummary?: string;
  previousDialogs?: Array<{ roleId: string; characterName: string; text: string }>;
}

export class GLMService {
  private client: OpenAI;

  constructor(config: GLMConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://open.bigmodel.cn/api/paas/v4/',
    });
  }

  // 第一轮：导演模式 - 生成章节大纲
  async generateOutline(request: GenerateOutlineRequest): Promise<any> {
    const prompt = this.buildOutlinePrompt(request);
    return this.callGLM(prompt);
  }

  // 第二轮：编剧模式 - 生成章节对话
  async generateDialogs(request: GenerateDialogsRequest): Promise<any> {
    const prompt = this.buildDialogsPrompt(request);
    return this.callGLM(prompt);
  }

  private buildOutlinePrompt(request: GenerateOutlineRequest): string {
    return `你是一位精通**非线性叙事**的互动游戏导演。请根据以下信息，规划一个具有**真正分支剧情**的游戏章节大纲。

## 项目信息
- **标题**：${request.title}
- **世界观设定**：${request.worldview}
- **主要角色**：${request.characters}
- **整体剧情**：${request.plot}

## 角色处理规则（非常重要）
1. **用户定义的角色不可修改**：上述"主要角色"是由用户精心设计的核心角色，你必须保留它们的所有信息（名称、性格、背景等），不能修改或删除。
2. **可添加辅助角色**：除了用户定义的角色外，你可以根据剧情需要添加一些辅助角色（如反派、路人、NPC等），但数量不宜过多（1-3个即可）。
3. **角色 ID 规范**：用户角色的 ID 格式为 char-xxx，AI 添加的角色 ID 格式为 ai-char-xxx。

## 核心任务要求（Strict Constraints）
1. **结构要求**：必须设计出**分支剧情**。故事不能是一条直线，必须包含至少 1-2 个关键抉择点（Branching Points）。
2. **ID 命名规范**：
   - 线性章节 ID：chapter-1, chapter-2
   - 分支章节 ID：必须包含分支特征，例如 chapter-2-fight（战斗线）, chapter-2-escape（逃跑线）。
3. **逻辑互斥规则（非常重要）**：
   - 如果一个章节有 **分支选项 (choices)**：则 \`nextChapterId\` 必须为 \`null\` 或空字符串。
   - 如果一个章节是 **线性剧情**：则 \`choices\` 必须为空数组 \`[]\`，且必须提供 \`nextChapterId\` 指向下一章。
   - **严禁**同时出现 \`choices\` 和 \`nextChapterId\`。


## 输出格式示例 (Strict JSON)
返回纯 JSON，不要包含 Markdown 代码块标记：
{
  "characters": [
    { "id": "char-1", "name": "用户角色名", "description": "保留用户设定", "personality": "保留用户设定", "background": "保留用户设定" },
    { "id": "ai-char-1", "name": "AI添加的辅助角色", "description": "...", "personality": "...", "background": "..." }
  ],
  "backgrounds": [
    { "id": "bg-1", "url": "...", "description": "..." }
  ],
  "chapters": [
    {
      "id": "chapter-1",
      "title": "序章：命运的分歧",
      "summary": "主角站在岔路口...",
      "keyEvents": ["遭遇敌人", "面临选择"],
      "involvedCharacters": ["char-1"],
      "backgroundId": "bg-1",
      "nextChapterId": null, 
      "choices": [
        { "text": "正面战斗", "targetChapterId": "chapter-2-fight" },
        { "text": "潜行绕过", "targetChapterId": "chapter-2-stealth" }
      ]
    },
    {
      "id": "chapter-2-fight",
      "title": "激战",
      "summary": "主角选择了战斗，虽然胜利但受了伤...",
      "nextChapterId": "chapter-3",
      "choices": []
    },
    {
      "id": "chapter-2-stealth",
      "title": "暗影之中",
      "summary": "主角利用阴影避开了敌人，发现了一条密道...",
      "nextChapterId": "chapter-3",
      "choices": []
    },
    {
      "id": "chapter-3",
      "title": "殊途同归",
      "summary": "无论之前如何选择，主角最终到达了遗迹核心...",
      "nextChapterId": "chapter-4",
      "choices": []
    }
  ]
}

请开始生成：`;
  }

  private buildDialogsPrompt(request: GenerateDialogsRequest): string {
    // 筛选涉及的角色
    const involvedCharacters = request.involvedCharacterIds
      ? request.characters.filter(c => request.involvedCharacterIds!.includes(c.id))
      : request.characters;

    // 格式化角色信息
    const characterInfo = involvedCharacters
      .map(c => {
        let info = `### ${c.name} (${c.id})`;
        if (c.description) info += `\n   描述：${c.description}`;
        if (c.personality) info += `\n   性格：${c.personality}`;
        if (c.background) info += `\n   背景：${c.background}`;
        return info;
      })
      .join('\n\n');

    // 格式化关键事件
    const keyEventsInfo = request.keyEvents?.length
      ? `\n## 关键事件\n${request.keyEvents.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
      : '';

    // 格式化分支选项
    const choicesInfo = request.choices?.length
      ? `\n## 分支选项\n${request.choices.map(c => `- "${c.text}" → ${c.targetChapterTitle}`).join('\n')}`
      : '';

    // 格式化前文对话
    const previousDialogsInfo = request.previousDialogs?.length
      ? `\n## 上一章节结尾对话\n${request.previousDialogs.slice(-3).map(d => 
          d.roleId ? `${d.characterName}：${d.text}` : `【旁白】${d.text}`
        ).join('\n')}`
      : '';

    return `你是一位专业的游戏编剧。请根据以下信息，生成章节的详细对话内容。

# 项目背景
## 标题
${request.projectTitle}

## 世界观
${request.worldview}

## 整体剧情
${request.overallPlot}

# 当前章节
## 章节信息
- **章节标题**：${request.chapterTitle}
- **剧情概要**：${request.chapterSummary}
${request.backgroundDescription ? `- **场景**：${request.backgroundDescription}` : ''}${keyEventsInfo}${choicesInfo}

# 角色设定
${characterInfo}${request.previousChapterSummary ? `\n# 前情提要\n${request.previousChapterSummary}` : ''}${previousDialogsInfo}

# 创作要求
1. **对话数量**：生成 8-15 条对话
2. **旁白使用**：
   - 开头用旁白描述场景和氛围
   - 角色动作和表情用旁白补充
   - 结尾用旁白过渡到下一场景
3. **角色塑造**：
   - 对话要体现角色性格特点
   - 不同角色有不同的说话风格
   - 角色之间的互动要自然
4. **剧情推进**：
   - 对话要覆盖关键事件
   - 自然地引导到分支选项（如有）
   - 为下一章节做铺垫
5. **场景描写**：
   - 结合世界观设定
   - 描述环境细节
   - 营造沉浸感

# 输出格式
返回纯 JSON：
{
  "dialogs": [
    {
      "id": "dialog-1",
      "text": "对话内容",
      "roleId": "char-1"
    }
  ]
}

**注意**：
- roleId 留空或省略表示旁白
- roleId 必须是上述角色 ID 之一
- 每条对话的 id 必须唯一

请开始创作：`;
  }

  private async callGLM(prompt: string): Promise<any> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'glm-4.7',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in GLM response');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in GLM response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('GLM API error:', error);
      throw error;
    }
  }
}