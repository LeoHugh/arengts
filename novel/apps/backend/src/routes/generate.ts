import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { GLMService } from '../glm';

const app = new Hono();

app.use('/*', cors({
  origin: 'http://localhost:3000',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 第一轮：生成大纲
const generateOutlineSchema = z.object({
  title: z.string().min(1),
  worldview: z.string().min(1),
  characters: z.string().min(1),
  plot: z.string().min(1),
});

// 第二轮：生成对话
const generateDialogsSchema = z.object({
  // 项目级上下文
  projectTitle: z.string().min(1),
  worldview: z.string().min(1),
  overallPlot: z.string().min(1),
  
  // 角色信息
  characters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    personality: z.string().optional(),
    background: z.string().optional(),
  })),
  
  // 当前章节
  chapterId: z.string().min(1),
  chapterTitle: z.string().min(1),
  chapterSummary: z.string().min(1),
  keyEvents: z.array(z.string()).optional(),
  involvedCharacterIds: z.array(z.string()).optional(),
  backgroundDescription: z.string().optional(),
  
  // 章节关系
  nextChapterTitle: z.string().optional(),
  choices: z.array(z.object({
    text: z.string(),
    targetChapterTitle: z.string(),
  })).optional(),
  
  // 前文上下文
  previousChapterSummary: z.string().optional(),
  previousDialogs: z.array(z.object({
    roleId: z.string(),
    characterName: z.string(),
    text: z.string(),
  })).optional(),
});

const glmService = new GLMService({
  apiKey: '6cac2e2bb0ff4439985e33cda4615085.a6n42n2U6j0oyhAV',
});

// 第一轮：导演模式 - 生成章节大纲
app.post('/outline', async (c) => {
  try {
    const body = await c.req.json();
    const validated = generateOutlineSchema.parse(body);

    const result = await glmService.generateOutline(validated);
    
    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Generate outline error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// 第二轮：编剧模式 - 生成章节对话
app.post('/dialogs', async (c) => {
  try {
    const body = await c.req.json();
    const validated = generateDialogsSchema.parse(body);

    const result = await glmService.generateDialogs(validated);
    
    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Generate dialogs error:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

export const generateApp = app;
export default app;