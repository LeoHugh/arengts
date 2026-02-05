import React, { useState, useEffect, useRef } from 'react';
import { Scroll, Settings, User, BookOpen, ChevronRight, Play, RefreshCw, Zap, Shield, Skull, Crown, Sword, Feather, Send, Square, MapPin, Calendar, Brain, BicepsFlexed } from 'lucide-react';

// --- Types & Interfaces ---

interface CharacterConfig {
  name: string;
  role: 'A' | 'B';
  defaultTrait: string;
  altTrait: string;
  defaultLabel: string;
  altLabel: string;
  descDefault: string;
  descAlt: string;
  defaultMartial: number; // New: Default Martial Score
  defaultIntrigue: number; // New: Default Intrigue Score
}

interface Scenario {
  id: string;
  year: string;
  title: string;
  location: string;
  description: string;
  characterA: CharacterConfig;
  characterB: CharacterConfig;
  context: string;
  openingEvent: string;
}

interface WorldState {
  // Replaced global weights with individual character stats
  charAMartial: number;
  charAIntrigue: number;
  charBMartial: number;
  charBIntrigue: number;
  traitA: string;
  traitB: string;
}

interface LogEntry {
  id: number;
  type: 'narrative' | 'monologue' | 'dialogue' | 'system';
  speaker?: string;
  content: string;
  timestamp?: number;
}

// --- Data: Scenarios ---

const SCENARIOS: Record<string, Scenario> = {
  '199_plum': {
    id: '199_plum',
    year: '建安四年 (199 AD)',
    title: '煮酒论英雄',
    location: '许都 (Xu City)',
    description: '曹操设宴试探刘备，雷雨将至，双龙会面。',
    characterA: {
      name: '曹操',
      role: 'A',
      defaultTrait: 'ambitious',
      altTrait: 'loyalist',
      defaultLabel: '乱世枭雄',
      altLabel: '汉室忠臣',
      descDefault: '多疑，霸气，残酷，试图掌控一切',
      descAlt: '真心匡扶汉室，求贤若渴，对刘备抱有厚望',
      defaultMartial: 75,
      defaultIntrigue: 95
    },
    characterB: {
      name: '刘备',
      role: 'B',
      defaultTrait: 'benevolent',
      altTrait: 'ambitious',
      defaultLabel: '仁德君子',
      altLabel: '隐忍野心',
      descDefault: '谦卑，仁慈，以此掩饰锋芒',
      descAlt: '内心充满野心，痛恨曹操，等待时机反咬一口',
      defaultMartial: 70,
      defaultIntrigue: 85
    },
    context: '曹操与刘备在后园青梅煮酒。曹操试图通过对话试探刘备是否有争霸天下的野心。',
    openingEvent: '曹操询问刘备为何在园中种菜。'
  },
  '208_redcliffs': {
    id: '208_redcliffs',
    year: '建安十三年 (208 AD)',
    title: '赤壁决战前夕',
    location: '长江 (Yangtze River)',
    description: '曹操大军压境，周瑜隔江对峙。决战前夜的心理博弈。',
    characterA: {
      name: '曹操',
      role: 'A',
      defaultTrait: 'arrogant',
      altTrait: 'cautious',
      defaultLabel: '骄兵必败',
      altLabel: '深谋远虑',
      descDefault: '因连战连捷而极度自负，轻视东吴水军',
      descAlt: '虽然兵力占优，但对水战极度谨慎，充满怀疑',
      defaultMartial: 70,
      defaultIntrigue: 80 // Lowered due to arrogance/sickness in history context
    },
    characterB: {
      name: '周瑜',
      role: 'B',
      defaultTrait: 'confident',
      altTrait: 'anxious',
      defaultLabel: '雄姿英发',
      altLabel: '忧心忡忡',
      descDefault: '自信满满，已安排好火攻之计，谈笑间樯橹灰飞烟灭',
      descAlt: '虽然定下计策，但对风向和曹操的反应充满深深的焦虑',
      defaultMartial: 85,
      defaultIntrigue: 98
    },
    context: '决战前夜，曹操站在船头横槊赋诗，遥望江对岸的东吴水寨。',
    openingEvent: '曹操饮酒赋诗《短歌行》，感叹人生几何。'
  },
  '228_emptyfort': {
    id: '228_emptyfort',
    year: '建兴六年 (228 AD)',
    title: '空城计',
    location: '西城 (West City)',
    description: '司马懿大军兵临城下，诸葛亮城门大开，独坐抚琴。',
    characterA: {
      name: '司马懿',
      role: 'A',
      defaultTrait: 'suspicious',
      altTrait: 'ruthless',
      defaultLabel: '多疑守成',
      altLabel: '果断冷血',
      descDefault: '生性多疑，深知诸葛亮从不弄险，因此怀疑有埋伏',
      descAlt: '看穿一切或决定冒险一搏，不在乎是否有埋伏，直接进攻',
      defaultMartial: 60,
      defaultIntrigue: 96
    },
    characterB: {
      name: '诸葛亮',
      role: 'B',
      defaultTrait: 'calm',
      altTrait: 'desperate',
      defaultLabel: '泰然自若',
      altLabel: '内心焦灼',
      descDefault: '外表云淡风轻，琴声不乱，用心理战压制对手',
      descAlt: '虽然表面镇定，但内心极度紧张，琴声中暗藏杀机',
      defaultMartial: 30,
      defaultIntrigue: 100
    },
    context: '司马懿率领十五万大军来到西城下。只见城门大开，孔明在城楼上焚香操琴。',
    openingEvent: '司马懿勒马远眺，听到了诸葛亮的琴声。'
  }
};

// --- API & Prompt Logic ---

// --- GLM API HELPER ---
const apiKey = "6cac2e2bb0ff4439985e33cda4615085.a6n42n2U6j0oyhAV"; 

const SYSTEM_PROMPT = `
你是“三国·历史重构”故事引擎。你需要根据世界变量生成特定 JSON 格式的故事片段。
用户扮演“导演”的角色。
请严格输出一个 JSON 对象数组。不要在 JSON 周围添加 markdown 格式。
对象类型：
- { "type": "narrative", "content": "..." } (史官：三国演义风格的半文白风格，第三人称叙述)
- { "type": "dialogue", "speaker": "名字", "content": "..." } (演员：角色的台词)
- { "type": "monologue", "speaker": "名字", "content": "..." } (心声：角色的内心独白，高度依赖属性数值)
`;

// --- Mock Data & Initial State ---

const INITIAL_WORLD_STATE: WorldState = {
  charAMartial: 75,
  charAIntrigue: 95,
  charBMartial: 70,
  charBIntrigue: 85,
  traitA: 'default',
  traitB: 'default',
};

const SCENARIO_STAGES = {
  SETUP: 'setup',
  INTRO: 'intro',
  INTERACTION_1: 'interaction_1',
  CLIMAX: 'climax',
  ENDING: 'ending',
};

// --- Components ---

const Button = ({ onClick, children, variant = 'primary', className = '', disabled = false }: any) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-red-800 hover:bg-red-700 text-amber-50 shadow-md hover:shadow-lg border border-red-900",
    secondary: "bg-stone-200 hover:bg-stone-300 text-stone-800 border border-stone-300",
    ghost: "bg-transparent hover:bg-stone-100 text-stone-600",
    outline: "bg-transparent border border-stone-400 text-stone-700 hover:bg-stone-50",
    danger: "bg-red-900/10 text-red-900 border border-red-900/20 hover:bg-red-900/20",
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, color = 'stone' }: { children: React.ReactNode, color?: string }) => (
  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-${color}-100 text-${color}-800 border border-${color}-200`}>
    {children}
  </span>
);

export default function ThreeKingdomsReforged() {
  const [currentScenarioId, setCurrentScenarioId] = useState<string>('199_plum');
  const [stage, setStage] = useState(SCENARIO_STAGES.SETUP);
  const [worldState, setWorldState] = useState<WorldState>(INITIAL_WORLD_STATE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopTypingRef = useRef(false);

  const scenario = SCENARIOS[currentScenarioId];

  // Reset state when scenario changes
  const switchScenario = (id: string) => {
    setCurrentScenarioId(id);
    const newScenario = SCENARIOS[id];
    setWorldState({
      charAMartial: newScenario.characterA.defaultMartial,
      charAIntrigue: newScenario.characterA.defaultIntrigue,
      charBMartial: newScenario.characterB.defaultMartial,
      charBIntrigue: newScenario.characterB.defaultIntrigue,
      traitA: newScenario.characterA.defaultTrait,
      traitB: newScenario.characterB.defaultTrait
    });
    setStage(SCENARIO_STAGES.SETUP);
    setLogs([]);
  };

  // Auto-scroll to bottom of logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isTyping, showCustomInput]);

  // --- API Integration ---

  const callLLM = async (prompt: string): Promise<any[]> => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const messages = [];

      // Add system prompt
      messages.push({
        role: "system",
        content: SYSTEM_PROMPT
      });

      // Add user prompt
      messages.push({
        role: "user",
        content: prompt
      });

      const response = await fetch(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "glm-4.7",
            messages: messages,
            temperature: 1.0,
            stream: false
          }),
          signal: abortControllerRef.current.signal
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("GLM API Error:", response.status, response.statusText, errorText);
        throw new Error(`GLM API Error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) throw new Error("No response from AI");

      const firstBracket = text.indexOf('[');
      const lastBracket = text.lastIndexOf(']');

      if (firstBracket === -1 || lastBracket === -1) {
         console.warn("Raw AI response (parsing failed):", text);
         throw new Error("No JSON array found in response");
      }

      const jsonString = text.substring(firstBracket, lastBracket + 1);
      return JSON.parse(jsonString);

    } catch (error: any) {
      if (error.name === 'AbortError') {
          console.log('LLM Request Aborted');
          return [];
      }
      console.error("LLM Error:", error);
      return [
        { type: 'system', content: 'Connection to History Archives lost. Using cached records...' },
        { type: 'narrative', content: '(系统离线：AI 生成失败，请检查 API Key 或重试。)' }
      ];
    }
  };

  // --- Engine Logic ---

  const addLog = (type: LogEntry['type'], content: string, speaker?: string) => {
    setLogs(prev => [...prev, { id: Date.now() + Math.random(), type, content, speaker }]);
  };

  const simulateTyping = async (sequence: Array<{type: LogEntry['type'], content: string, speaker?: string, delay?: number}>) => {
    setIsTyping(true);
    stopTypingRef.current = false;

    for (const item of sequence) {
      if (stopTypingRef.current) break;
      const readingDelay = Math.max(800, item.content.length * 20); 
      await new Promise(r => setTimeout(r, item.delay || readingDelay));
      if (stopTypingRef.current) break;
      addLog(item.type, item.content, item.speaker);
    }
    setIsTyping(false);
  };

  const stopSimulation = () => {
      stopTypingRef.current = true;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setIsTyping(false);
      setIsStopped(true);
      addLog('system', '>> 系统指令: 推演已强制中止');
  };

  const startSimulation = async () => {
    setStage(SCENARIO_STAGES.INTRO);
    setLogs([]);
    setIsStopped(false);
    
    addLog('system', `初始化世界状态... 加载历史锚点 [${scenario.year}]...`);
    addLog('system', `生成角色属性: 
      ${scenario.characterA.name} [武:${worldState.charAMartial}/智:${worldState.charAIntrigue}]
      ${scenario.characterB.name} [武:${worldState.charBMartial}/智:${worldState.charBIntrigue}]`);

    const traitADesc = worldState.traitA === scenario.characterA.defaultTrait ? scenario.characterA.descDefault : scenario.characterA.descAlt;
    const traitBDesc = worldState.traitB === scenario.characterB.defaultTrait ? scenario.characterB.descDefault : scenario.characterB.descAlt;

    const prompt = `
    生成“${scenario.title}”的开场片段。
    
    场景背景:
    - 地点: ${scenario.location}
    - 情境: ${scenario.context}
    
    【核心指令】请根据以下属性数值差异来决定角色的行动和心理活动：
    角色A (${scenario.characterA.name}):
    - 描述: ${traitADesc}
    - 武力: ${worldState.charAMartial} (若>80则气场极强，若<50则显得文弱)
    - 智谋: ${worldState.charAIntrigue} (若>90则能洞察一切，若<60则容易被迷惑)
    
    角色B (${scenario.characterB.name}):
    - 描述: ${traitBDesc}
    - 武力: ${worldState.charBMartial}
    - 智谋: ${worldState.charBIntrigue}
    
    任务:
    1. 叙述描写当前场景氛围。
    2. ${scenario.characterA.name} 的内心独白（受智谋数值影响深浅）。
    3. ${scenario.characterB.name} 的内心独白（受智谋数值影响深浅）。
    4. 触发事件：${scenario.openingEvent}
    5. 角色的初步反应或对话。
    `;

    const sequence = await callLLM(prompt);
    if (sequence && sequence.length > 0) {
        simulateTyping(sequence).then(() => {
            if (!stopTypingRef.current) {
                setTimeout(() => setStage(SCENARIO_STAGES.INTERACTION_1), 1000);
            }
        });
    }
  };

  const handleChoice = async (choiceType: string, customText?: string) => {
    setStage(SCENARIO_STAGES.CLIMAX);
    setShowCustomInput(false);
    setIsStopped(false);

    let choicePrompt = "";
    
    if (choiceType === 'option_a') {
      if (currentScenarioId === '199_plum') choicePrompt = "动作：刘备吓掉了筷子，掩饰恐惧。";
      if (currentScenarioId === '208_redcliffs') choicePrompt = "动作：周瑜故作镇定，邀请曹操使者参观军营，实则虚张声势。";
      if (currentScenarioId === '228_emptyfort') choicePrompt = "动作：诸葛亮琴声平稳，笑容可掬，甚至让童子打开城门扫地。";
      addLog('system', '>> 用户干预: 历史正统选择');
    } else if (choiceType === 'option_b') {
      if (currentScenarioId === '199_plum') choicePrompt = "动作：刘备没有掉筷子，直视曹操，不再隐忍。";
      if (currentScenarioId === '208_redcliffs') choicePrompt = "动作：周瑜突然下令处斩曹操使者，直接宣战，不留余地。";
      if (currentScenarioId === '228_emptyfort') choicePrompt = "动作：诸葛亮突然停止弹琴，站起身来，向城下的司马懿大声喊话。";
      addLog('system', '>> 用户干预: 激进重构选择');
    } else if (choiceType === 'custom') {
      choicePrompt = `动作：上帝干预。用户注入了此事件：“${customText}”。角色必须立即对这个突发事件做出反应。`;
      addLog('system', `>> 上帝干预: ${customText}`);
    }

    const traitADesc = worldState.traitA === scenario.characterA.defaultTrait ? scenario.characterA.descDefault : scenario.characterA.descAlt;
    const traitBDesc = worldState.traitB === scenario.characterB.defaultTrait ? scenario.characterB.descDefault : scenario.characterB.descAlt;

    const prompt = `
    生成高潮片段。
    
    角色属性对比:
    - ${scenario.characterA.name}:
      - 武力: ${worldState.charAMartial}
      - 智谋: ${worldState.charAIntrigue}
      - 性格描述: ${traitADesc}
    - ${scenario.characterB.name}:
      - 武力: ${worldState.charBMartial}
      - 智谋: ${worldState.charBIntrigue}
      - 性格描述: ${traitBDesc}
    
    发生事件: ${choicePrompt}
    
    任务:
    1. 叙述描写该事件的发生。
    2. 双方立即的反应对话或动作（高武力者可能选择暴力，高智谋者可能选择诡辩）。
    3. 揭示角色真实想法的内心独白。
    4. 场景的即时结局推演。
    `;

    const sequence = await callLLM(prompt);
    if (sequence && sequence.length > 0) {
        simulateTyping(sequence).then(() => {
             if (!stopTypingRef.current) {
                setStage(SCENARIO_STAGES.ENDING);
             }
        });
    }
  };

  // --- Rendering ---

  return (
    <div className="flex h-screen w-full bg-stone-100 font-sans text-stone-900 overflow-hidden">
      
      {/* LEFT SIDEBAR: CONFIGURATION */}
      <div className="w-80 bg-stone-900 text-stone-300 flex flex-col border-r border-stone-800 shadow-2xl z-10">
        <div className="p-6 border-b border-stone-800 bg-stone-950">
          <h1 className="text-xl font-bold text-stone-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-600" />
            <span>三国·历史重构</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1 uppercase tracking-widest">Three Kingdoms Reforged</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Section: Anchor Selection */}
          <section>
            <div className="flex items-center gap-2 mb-3 text-red-500 text-xs font-bold uppercase tracking-wider">
              <RefreshCw className="w-3 h-3" />
              历史锚点 (Historical Anchor)
            </div>
            <div className="flex flex-col gap-2">
              {Object.values(SCENARIOS).map((s) => (
                <button
                  key={s.id}
                  onClick={() => switchScenario(s.id)}
                  disabled={stage !== SCENARIO_STAGES.SETUP}
                  className={`p-3 rounded-lg border text-left transition-all ${currentScenarioId === s.id ? 'bg-red-900/40 border-red-700 text-white' : 'bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-750'}`}
                >
                  <div className="text-xs font-bold mb-1">{s.year}</div>
                  <div className="font-medium">{s.title}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Section: Character Stats (Revised) */}
          <section className={stage !== SCENARIO_STAGES.SETUP ? 'opacity-50 pointer-events-none' : ''}>
            <div className="flex items-center gap-2 mb-3 text-red-500 text-xs font-bold uppercase tracking-wider">
              <Settings className="w-3 h-3" />
              角色属性 (Attributes)
            </div>
            
            <div className="space-y-6">
              
              {/* Character A Stats */}
              <div className="bg-stone-800/50 p-3 rounded-lg border border-stone-700/50">
                <div className="text-xs font-bold text-stone-400 mb-3 flex items-center gap-2">
                   <div className="w-4 h-4 rounded bg-red-900 flex items-center justify-center text-[10px] text-white">A</div>
                   {scenario.characterA.name}
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-red-300">
                      <span className="flex items-center gap-1"><Sword className="w-3 h-3" /> 武力</span>
                      <span>{worldState.charAMartial}</span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full accent-red-600 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer"
                      value={worldState.charAMartial}
                      onChange={(e) => setWorldState({...worldState, charAMartial: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-indigo-300">
                      <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> 智谋</span>
                      <span>{worldState.charAIntrigue}</span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full accent-indigo-500 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer"
                      value={worldState.charAIntrigue}
                      onChange={(e) => setWorldState({...worldState, charAIntrigue: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              {/* Character B Stats */}
              <div className="bg-stone-800/50 p-3 rounded-lg border border-stone-700/50">
                <div className="text-xs font-bold text-stone-400 mb-3 flex items-center gap-2">
                   <div className="w-4 h-4 rounded bg-emerald-900 flex items-center justify-center text-[10px] text-white">B</div>
                   {scenario.characterB.name}
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-red-300">
                      <span className="flex items-center gap-1"><Sword className="w-3 h-3" /> 武力</span>
                      <span>{worldState.charBMartial}</span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full accent-red-600 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer"
                      value={worldState.charBMartial}
                      onChange={(e) => setWorldState({...worldState, charBMartial: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1 text-indigo-300">
                      <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> 智谋</span>
                      <span>{worldState.charBIntrigue}</span>
                    </div>
                    <input 
                      type="range" 
                      className="w-full accent-indigo-500 h-1 bg-stone-700 rounded-lg appearance-none cursor-pointer"
                      value={worldState.charBIntrigue}
                      onChange={(e) => setWorldState({...worldState, charBIntrigue: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Section: Character Reforge (Dynamic) */}
          <section className={stage !== SCENARIO_STAGES.SETUP ? 'opacity-50 pointer-events-none' : ''}>
            <div className="flex items-center gap-2 mb-3 text-red-500 text-xs font-bold uppercase tracking-wider">
              <User className="w-3 h-3" />
              性格重塑 (Personality)
            </div>

            <div className="space-y-3">
              {/* Character A */}
              <div className="bg-stone-800 p-3 rounded border border-stone-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-red-900/50 flex items-center justify-center text-xs font-bold">{scenario.characterA.name[0]}</div>
                  <span className="text-sm font-bold text-white">{scenario.characterA.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setWorldState({...worldState, traitA: scenario.characterA.defaultTrait})}
                    className={`text-xs p-2 rounded border ${worldState.traitA === scenario.characterA.defaultTrait ? 'bg-red-900/30 border-red-800 text-red-200' : 'bg-stone-900 border-stone-800 text-stone-500'}`}
                  >
                    {scenario.characterA.defaultLabel}
                  </button>
                  <button 
                    onClick={() => setWorldState({...worldState, traitA: scenario.characterA.altTrait})}
                    className={`text-xs p-2 rounded border ${worldState.traitA === scenario.characterA.altTrait ? 'bg-red-900/30 border-red-800 text-red-200' : 'bg-stone-900 border-stone-800 text-stone-500'}`}
                  >
                    {scenario.characterA.altLabel}
                  </button>
                </div>
              </div>

              {/* Character B */}
              <div className="bg-stone-800 p-3 rounded border border-stone-700">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded bg-emerald-900/50 flex items-center justify-center text-xs font-bold">{scenario.characterB.name[0]}</div>
                  <span className="text-sm font-bold text-white">{scenario.characterB.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                     onClick={() => setWorldState({...worldState, traitB: scenario.characterB.defaultTrait})}
                    className={`text-xs p-2 rounded border ${worldState.traitB === scenario.characterB.defaultTrait ? 'bg-emerald-900/30 border-emerald-800 text-emerald-200' : 'bg-stone-900 border-stone-800 text-stone-500'}`}
                  >
                    {scenario.characterB.defaultLabel}
                  </button>
                  <button 
                     onClick={() => setWorldState({...worldState, traitB: scenario.characterB.altTrait})}
                    className={`text-xs p-2 rounded border ${worldState.traitB === scenario.characterB.altTrait ? 'bg-emerald-900/30 border-emerald-800 text-emerald-200' : 'bg-stone-900 border-stone-800 text-stone-500'}`}
                  >
                    {scenario.characterB.altLabel}
                  </button>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Start Button Area */}
        {stage === SCENARIO_STAGES.SETUP && (
          <div className="p-6 border-t border-stone-800 bg-stone-950">
             <Button onClick={startSimulation} className="w-full h-12 text-lg">
                <Play className="w-5 h-5 fill-current" />
                开启历史推演
             </Button>
          </div>
        )}
      </div>

      {/* CENTER: THE NARRATIVE FEED */}
      <div className="flex-1 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/rice-paper-2.png')] bg-stone-100">
        
        {/* Header */}
        <div className="h-16 border-b border-stone-200 bg-white/50 backdrop-blur flex items-center justify-between px-8">
           <div className="flex items-center gap-4">
              <span className="font-serif text-2xl font-bold text-stone-800">历史卷轴 (The Scroll)</span>
              {stage !== SCENARIO_STAGES.SETUP && (
                 <Badge color="red">GLM 驱动中</Badge>
              )}
           </div>
           <div className="flex gap-4 text-sm text-stone-500">
              <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {scenario.year.split(' ')[0]}</div>
              <div className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {scenario.location.split(' ')[0]}</div>
           </div>
        </div>

        {/* Story Stream */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth">
          
          {logs.length === 0 && stage === SCENARIO_STAGES.SETUP && (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 opacity-50">
              <Feather className="w-16 h-16 mb-4" />
              <p>请在左侧选择历史锚点并配置参数</p>
            </div>
          )}

          {logs.map((log) => (
            <div key={log.id} className={`flex flex-col max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500`}>
              
              {/* System Log */}
              {log.type === 'system' && (
                <div className="flex justify-center my-4">
                  <span className="font-mono text-xs text-stone-400 bg-stone-200/50 px-2 py-1 rounded border border-stone-200">
                    {log.content}
                  </span>
                </div>
              )}

              {/* Standard Narrative (The Scribe) */}
              {log.type === 'narrative' && (
                <div className="font-serif text-lg leading-loose text-stone-800 bg-white p-6 shadow-sm border-l-4 border-stone-800 rounded-r-lg">
                  {log.content}
                </div>
              )}

              {/* Character Dialogue */}
              {log.type === 'dialogue' && (
                <div className={`mt-2 flex gap-4 ${log.speaker?.includes(scenario.characterA.name) ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${log.speaker?.includes(scenario.characterA.name) ? 'bg-red-800' : 'bg-emerald-700'}`}>
                    {log.speaker?.includes(scenario.characterA.name) ? scenario.characterA.name[0] : scenario.characterB.name[0]}
                  </div>
                  <div className={`bg-stone-200 p-4 rounded-2xl max-w-[80%] ${log.speaker?.includes(scenario.characterA.name) ? 'rounded-tl-none' : 'rounded-tr-none'}`}>
                     <p className="text-xs font-bold text-stone-500 mb-1">{log.speaker}</p>
                     <p className="text-stone-900 font-medium font-serif text-lg">"{log.content}"</p>
                  </div>
                </div>
              )}

              {/* Internal Monologue (The Ghost) */}
              {log.type === 'monologue' && (
                <div className={`mt-2 mx-12 p-4 rounded-lg border border-dashed border-stone-300 bg-stone-50/50 backdrop-blur-sm relative overflow-hidden group`}>
                   <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400/50"></div>
                   <div className="flex items-center gap-2 mb-1 text-indigo-600/80 text-xs font-bold uppercase tracking-widest">
                      <Zap className="w-3 h-3" />
                      {log.speaker} · 内心独白
                   </div>
                   <p className="text-indigo-900/70 italic font-serif">
                      {log.content}
                   </p>
                </div>
              )}

            </div>
          ))}
          
          {isTyping && (
             <div className="flex justify-center py-4">
                <span className="flex gap-1">
                   <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                   <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                   <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                </span>
             </div>
          )}
          <div ref={logsEndRef} className="h-4" />
        </div>

        {/* BOTTOM: DIRECTOR CONSOLE */}
        {stage !== SCENARIO_STAGES.SETUP && stage !== SCENARIO_STAGES.ENDING && (
           <div className="h-auto bg-stone-900 border-t-4 border-red-900 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-20">
              
              {isStopped ? (
                  <div className="flex flex-col items-center justify-center gap-3">
                      <span className="text-red-400 font-bold flex items-center gap-2">
                          <Square className="w-4 h-4 fill-current" /> 推演已暂停
                      </span>
                      <Button variant="outline" onClick={() => setStage(SCENARIO_STAGES.SETUP)}>重新开始</Button>
                  </div>
              ) : (
                !isTyping && stage === SCENARIO_STAGES.INTERACTION_1 ? (
                 <div className="max-w-4xl mx-auto">
                    {!showCustomInput ? (
                        <>
                            <div className="text-red-500 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Crown className="w-4 h-4" />
                            关键剧情节点 (Critical Junction)
                            </div>
                            <h3 className="text-white text-xl font-serif mb-6">
                              {scenario.characterA.name}正在步步紧逼。{scenario.characterB.name}该如何应对？
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button 
                                onClick={() => handleChoice('option_a')}
                                className="group bg-stone-800 hover:bg-stone-700 p-4 rounded border border-stone-600 text-left transition-all"
                            >
                                <div className="text-red-400 font-bold mb-1 flex items-center gap-2 group-hover:text-red-300">
                                    <Feather className="w-4 h-4" /> 选项 A (原著演绎)
                                </div>
                                <div className="text-stone-300 text-sm">
                                    {currentScenarioId === '199_plum' && "佯装惊恐，失手掉落筷子。"}
                                    {currentScenarioId === '208_redcliffs' && "故作镇定，以虚虚实实惑敌。"}
                                    {currentScenarioId === '228_emptyfort' && "抚琴不乱，以空城疑兵退敌。"}
                                </div>
                            </button>

                            <button 
                                onClick={() => handleChoice('option_b')}
                                className="group bg-stone-800 hover:bg-stone-700 p-4 rounded border border-stone-600 text-left transition-all"
                            >
                                <div className="text-indigo-400 font-bold mb-1 flex items-center gap-2 group-hover:text-indigo-300">
                                    <Sword className="w-4 h-4" /> 选项 B (激进重构)
                                </div>
                                <div className="text-stone-300 text-sm">
                                    {currentScenarioId === '199_plum' && "直视曹操，不再隐忍，自称英雄。"}
                                    {currentScenarioId === '208_redcliffs' && "斩杀来使，正面宣战，激怒对手。"}
                                    {currentScenarioId === '228_emptyfort' && "停止弹琴，起身对峙，正面喊话。"}
                                </div>
                            </button>

                            <button 
                                onClick={() => setShowCustomInput(true)}
                                className="group bg-emerald-900/20 hover:bg-emerald-900/40 p-4 rounded border border-emerald-800 text-left transition-all"
                            >
                                <div className="text-emerald-400 font-bold mb-1 flex items-center gap-2">
                                    <Skull className="w-4 h-4" /> 选项 C (上帝干预)
                                </div>
                                <div className="text-stone-300 text-sm">
                                    输入自定义突发事件...
                                    <span className="block mt-2 text-xs text-emerald-500">已解锁：AI 实时生成</span>
                                </div>
                            </button>
                            </div>
                        </>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                                    <Skull className="w-5 h-5" /> 上帝干预模式 (God Mode)
                                </h3>
                                <button onClick={() => setShowCustomInput(false)} className="text-stone-500 hover:text-stone-300 text-sm">返回选项</button>
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={customInput}
                                    onChange={(e) => setCustomInput(e.target.value)}
                                    placeholder="输入突发事件 (例如：此时一颗陨石坠落...)"
                                    className="flex-1 bg-stone-800 border-stone-700 rounded p-3 text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                    onKeyDown={(e) => e.key === 'Enter' && handleChoice('custom', customInput)}
                                />
                                <Button 
                                    onClick={() => handleChoice('custom', customInput)}
                                    className="bg-emerald-700 hover:bg-emerald-600 border-emerald-800 text-white"
                                >
                                    <Send className="w-4 h-4" /> 执行
                                </Button>
                            </div>
                        </div>
                    )}
                 </div>
              ) : (
                 // Status display while generating
                 <div className="flex flex-col items-center justify-center h-full text-stone-500 gap-3">
                    {stage === SCENARIO_STAGES.ENDING ? (
                       <div className="flex flex-col items-center">
                          <span className="text-white font-serif text-lg mb-2">本章推演结束</span>
                          <Button variant="outline" onClick={() => setStage(SCENARIO_STAGES.SETUP)}>重新推演</Button>
                       </div>
                    ) : (
                       <>
                           <div className="flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                <span className="font-mono text-sm">
                                    {isTyping ? "正在生成历史..." : "GLM 正在推演命运线..."}
                                </span>
                           </div>
                           <Button variant="danger" onClick={stopSimulation} className="mt-2 text-xs px-3 py-1 h-8 opacity-80 hover:opacity-100">
                                <Square className="w-3 h-3 fill-current" /> 停止推演
                           </Button>
                       </>
                    )}
                 </div>
              )
              )}
           </div>
        )}

      </div>
    </div>
  );
}