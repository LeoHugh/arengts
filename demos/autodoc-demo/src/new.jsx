import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Play, 
  Save, 
  GitCommit, 
  Cpu, 
  Search, 
  FileText, 
  ArrowRight, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  BrainCircuit,
  Settings,
  Database,
  Sparkles,
  Globe
} from 'lucide-react';

// --- MOCK DATA FOR INPUT (Simulating Scraped Content) ---

const MOCK_ARTICLE_1 = {
  url: "https://tech-blog.example/ai-agents-2025",
  title: "The Rise of Autonomous Agents in 2025",
  raw_content: `
    TITLE: The Rise of Autonomous Agents in 2025
    DATE: Oct 12, 2025
    AUTHOR: Sarah Connor
    
    BODY:
    In 2025, artificial intelligence has moved beyond simple chatbots. 
    We are now seeing the rise of autonomous agents capable of complex reasoning.
    
    A recent study shows that 40% of developers use agentic workflows.
    The primary challenge remains reliability and error handling.
    However, new frameworks like AutoDoc are solving this.
    
    [IMAGE: graph_of_adoption.png]
    Figure 1: Adoption rates over time.
    
    Conclusion: The future is bright but requires human oversight.
  `
};

const MOCK_ARTICLE_2 = {
  url: "https://tech-blog.example/multi-modal-systems",
  title: "Multi-Modal Systems Explained",
  raw_content: `
    TITLE: Multi-Modal Systems Explained
    
    BODY:
    Multi-modal systems combine text, image, and audio processing.
    They allow for richer context understanding.
    
    Key benefit: Accessibility.
    Key benefit: improved creative workflows.
    
    [IMAGE: architecture_diagram.png]
    Figure A: System Architecture.
    
    In summary, multi-modality is the next frontier.
  `
};

// --- REAL WEB FETCHING HELPER ---
const fetchUrlContent = async (url) => {
  try {
    // Using AllOrigins as a CORS proxy for the demo
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data.contents; // Returns the raw HTML string
  } catch (error) {
    console.error("Fetch failed:", error);
    return null;
  }
};

const extractTextFromHtml = (html) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Remove scripts and styles to clean up tokens
  const scripts = doc.querySelectorAll('script, style, noscript, iframe, svg');
  scripts.forEach(script => script.remove());
  
  // Get text content and clean up whitespace
  return doc.body.textContent.replace(/\s+/g, ' ').trim().slice(0, 15000); // Limit length for token context
};

// --- GEMINI API HELPER ---
const apiKey = ""; // Injected by environment

const callGemini = async (prompt, systemInstruction = "") => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
        }),
      }
    );
    
    if (!response.ok) {
       console.error("API Error", response.statusText);
       return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Error generating content.";
  } catch (e) {
    console.error("Gemini Request Failed", e);
    return "Error: Could not connect to LLM.";
  }
};

// --- HELPER FUNCTIONS ---

const calculateDiffScore = (original, modified) => {
  const origLen = original.length;
  const modLen = modified.length;
  // Simple heuristic for the UI progress bar, not the actual logic
  const change = Math.abs(origLen - modLen);
  return Math.max(0, 100 - (change * 2)); 
};

export default function SelfEvolutionDemo() {
  // --- STATE ---
  const [activeStep, setActiveStep] = useState('idle'); // idle, working, review, evolving
  const [editorContent, setEditorContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [logs, setLogs] = useState([]);
  const [workflowVersion, setWorkflowVersion] = useState(1);
  const [learnedRules, setLearnedRules] = useState([]);
  const [currentUrl, setCurrentUrl] = useState(MOCK_ARTICLE_1.url);
  const [editMetrics, setEditMetrics] = useState(null);
  const [isGeminiThinking, setIsGeminiThinking] = useState(false);
  
  // Ref for auto-scrolling logs
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // --- ACTIONS ---

  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const runAgent = async () => {
    setActiveStep('working');
    setEditorContent('');
    setEditMetrics(null);
    setLogs([]);
    setIsGeminiThinking(true);
    
    addLog(`Initializing Agent Workflow v${workflowVersion}...`, 'system');
    await wait(500);
    
    let rawContentToProcess = "";
    
    // 1. DETERMINE IF MOCK OR REAL
    const mock1 = MOCK_ARTICLE_1.url === currentUrl ? MOCK_ARTICLE_1 : null;
    const mock2 = MOCK_ARTICLE_2.url === currentUrl ? MOCK_ARTICLE_2 : null;
    
    if (mock1) {
      addLog(`Using Cached Mock Data for ${currentUrl}`, 'info');
      await wait(500);
      rawContentToProcess = mock1.raw_content;
    } else if (mock2) {
      addLog(`Using Cached Mock Data for ${currentUrl}`, 'info');
      await wait(500);
      rawContentToProcess = mock2.raw_content;
    } else {
      // REAL FETCH
      addLog(`Connecting to real internet: ${currentUrl}...`, 'info');
      addLog(`Bypassing CORS via proxy...`, 'system');
      
      const htmlContent = await fetchUrlContent(currentUrl);
      
      if (!htmlContent) {
        addLog("Error: Could not fetch content. URL might be blocked or invalid.", 'warning');
        setIsGeminiThinking(false);
        setActiveStep('idle');
        return;
      }
      
      addLog("Content received. Cleaning HTML tags...", 'info');
      rawContentToProcess = extractTextFromHtml(htmlContent);
      addLog(`Extracted ${rawContentToProcess.length} characters of text.`, 'success');
    }
    
    // 2. SEND TO GEMINI
    addLog(`Sending content to Gemini ✨ for processing...`, 'info');
    
    // BUILD DYNAMIC SYSTEM PROMPT BASED ON LEARNED RULES
    const baseSystemPrompt = `
      You are an automated documentation agent. 
      Your job is to take raw text (which might be messy scraped website data) and format it into a clean Markdown document.
      Always include a Title based on the content.
    `;
    
    const evolutionPrompt = learnedRules.length > 0 
      ? `\nCRITICAL: You must strictly follow these LEARNED USER PREFERENCES:\n${learnedRules.map(r => `- ${r}`).join('\n')}` 
      : `\nSince you have no learned rules yet, just dump the text in a readable format.`;

    const fullSystemPrompt = baseSystemPrompt + evolutionPrompt;

    const userPrompt = `Here is the raw content scraped from the website:\n\n${rawContentToProcess}`;

    const generatedText = await callGemini(userPrompt, fullSystemPrompt);
    
    setIsGeminiThinking(false);
    
    if (generatedText) {
      addLog("Gemini ✨ generation complete.", 'success');
      setEditorContent(generatedText);
      setOriginalContent(generatedText);
      setActiveStep('review');
      addLog("Draft generated. Waiting for human review (Shadow Mode).", 'warning');
    } else {
      addLog("Generation failed. Please try again.", 'warning');
      setActiveStep('idle');
    }
  };

  const handleCommit = async () => {
    setActiveStep('evolving');
    addLog("User committed changes. Calculating semantic diff...", 'system');
    setIsGeminiThinking(true);

    const score = calculateDiffScore(originalContent, editorContent);
    setEditMetrics({ score });

    // USE GEMINI TO EXTRACT THE RULE
    const analysisPrompt = `
      You are the "Meta-Cognition" module of an AI agent.
      
      Task: Analyze the difference between the [ORIGINAL AGENT OUTPUT] and the [USER EDITED VERSION].
      Goal: Identify ONE specific, actionable rule that describes the user's editing style or content preference.
      
      [ORIGINAL AGENT OUTPUT]
      ${originalContent}
      
      [USER EDITED VERSION]
      ${editorContent}
      
      Output format: A single short sentence starting with "Always" or "Never" or "Prefer". 
      Example: "Always add a 'Key Takeaways' section." or "Never include the Author Name." or "Prefer bullet points over paragraphs."
      If the changes are minor or just typos, return "NO_RULE".
    `;

    addLog("Asking Gemini ✨ to extract new workflow rules...", 'info');
    
    const extractedRule = await callGemini(analysisPrompt, "You are a helpful analyst.");
    setIsGeminiThinking(false);

    if (extractedRule && !extractedRule.includes("NO_RULE")) {
      const cleanRule = extractedRule.replace(/['"]+/g, '').trim(); // Remove quotes if present
      
      addLog(`Gemini ✨ detected pattern: "${cleanRule}"`, 'success');
      await wait(800);
      
      if (!learnedRules.includes(cleanRule)) {
        setLearnedRules(prev => [...prev, cleanRule]);
        addLog(`Evolution: Updating 'scraper_agent.yaml' with new rule.`, 'success');
        setWorkflowVersion(prev => prev + 1);
      } else {
        addLog("Pattern already known. Reinforcing weights.", 'info');
      }
    } else {
      addLog("Gemini ✨ detected no significant structural changes.", 'info');
    }
    
    await wait(500);
    setActiveStep('idle');
  };

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // --- RENDER ---

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AutoDoc <span className="text-blue-400">Evolution</span></h1>
            <p className="text-xs text-slate-400">Powered by Gemini ✨</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
            <GitCommit className="w-4 h-4 text-purple-400" />
            <span className="text-slate-300">Workflow Version: <strong className="text-white">v{workflowVersion}.0</strong></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
            <Database className="w-4 h-4 text-green-400" />
            <span className="text-slate-300">Rules Learned: <strong className="text-white">{learnedRules.length}</strong></span>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <main className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        
        {/* LEFT PANEL: AGENT INTERFACE */}
        <div className="col-span-4 bg-slate-900 border-r border-slate-800 flex flex-col">
          
          {/* Controls */}
          <div className="p-6 border-b border-slate-800 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target URL</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={currentUrl}
                  onChange={(e) => setCurrentUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => runAgent()}
                disabled={activeStep === 'working' || activeStep === 'evolving'}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-all ${
                  activeStep === 'working' 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                }`}
              >
                {activeStep === 'working' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Run Agent ✨
              </button>

              <button 
                onClick={() => {
                   setCurrentUrl(MOCK_ARTICLE_2.url);
                   setEditorContent('');
                   // We don't run immediately to let user see the mock URL populated
                }}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition-all"
              >
                <Search className="w-4 h-4" />
                Load Mock
              </button>
            </div>
            
            {learnedRules.length > 0 && (
              <div className="mt-4 p-3 bg-green-900/20 border border-green-800/50 rounded-md animate-in fade-in zoom-in duration-300">
                <h3 className="text-xs font-bold text-green-400 mb-2 flex items-center gap-2">
                  <Sparkles className="w-3 h-3" /> Learned Rules (Active)
                </h3>
                <ul className="space-y-2">
                  {learnedRules.map((rule, i) => (
                    <li key={i} className="text-xs text-green-200/90 flex items-start gap-2 bg-green-950/30 p-1.5 rounded border border-green-900/50">
                      <span className="mt-1 w-1.5 h-1.5 bg-green-500 rounded-full shrink-0"></span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs font-mono text-slate-500 flex justify-between">
              <span>AGENT LOGS</span>
              <span className="text-slate-600">waiting for input...</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
              {logs.length === 0 && (
                <div className="text-slate-600 italic text-center mt-10">
                  System ready.<br/>Initiate a collection task to begin.
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <span className="text-slate-600 shrink-0">{log.timestamp}</span>
                  <span className={`
                    ${log.type === 'system' ? 'text-purple-400' : ''}
                    ${log.type === 'info' ? 'text-blue-300' : ''}
                    ${log.type === 'success' ? 'text-green-400' : ''}
                    ${log.type === 'warning' ? 'text-orange-400' : ''}
                  `}>
                    {log.type === 'success' ? '✔ ' : '> '}{log.message}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: SHARED EDITOR (SHADOW MODE) */}
        <div className="col-span-8 bg-slate-950 flex flex-col relative">
          
          {/* Editor Toolbar */}
          <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50">
            <div className="flex items-center gap-2 text-slate-400">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium text-slate-200">collected_draft.md</span>
              {activeStep === 'review' && (
                <span className="ml-2 px-2 py-0.5 bg-orange-500/10 text-orange-400 text-[10px] rounded uppercase border border-orange-500/20">
                  User Edit Mode
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
               {editMetrics && (
                <div className="flex items-center gap-2 mr-4 text-xs">
                  <span className="text-slate-400">Diff Score:</span>
                  <span className={`font-bold ${editMetrics.score < 80 ? 'text-red-400' : 'text-green-400'}`}>
                    {Math.round(editMetrics.score)}% Match
                  </span>
                </div>
              )}
              
              <button 
                onClick={handleCommit}
                disabled={activeStep !== 'review'}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeStep === 'review'
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                Commit & Teach Agent ✨
              </button>
            </div>
          </div>

          {/* The "Editor" */}
          <div className="flex-1 relative">
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              disabled={activeStep === 'working' || activeStep === 'evolving'}
              className="w-full h-full bg-slate-950 text-slate-300 p-8 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-900/50 leading-relaxed"
              placeholder="Agent output will appear here. Edit it to provide implicit feedback..."
            />
            
            {/* Overlay for Evolving/Thinking State */}
            {(activeStep === 'evolving' || isGeminiThinking) && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl shadow-2xl max-w-md w-full">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="relative">
                      <Sparkles className="w-12 h-12 text-blue-500 animate-pulse" />
                      <div className="absolute -right-1 -top-1 w-3 h-3 bg-purple-500 rounded-full animate-ping"></div>
                    </div>
                    <h2 className="text-xl font-bold text-white">Gemini is Thinking...</h2>
                    <p className="text-slate-400 text-sm">
                      {activeStep === 'evolving' 
                        ? 'Analyzing your edits to extract new semantic rules...' 
                        : 'Generating content based on current workflow rules...'}
                    </p>
                    
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-4">
                      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 h-full w-full animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Instructions Overlay (Only initially) */}
          {activeStep === 'idle' && logs.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="text-center space-y-4 max-w-lg">
                 <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg text-slate-400 text-sm leading-relaxed backdrop-blur-md">
                   <p className="font-semibold text-slate-200 mb-2 flex items-center justify-center gap-2"><Sparkles className="w-4 h-4 text-purple-400"/> Gemini-Powered Shadow Mode</p>
                   <p>1. Enter a <strong>real URL</strong> (like <code>https://example.com</code>) or use the mock.</p>
                   <p>2. <strong>Edit the output</strong> directly (e.g., delete intro, add bullets).</p>
                   <p>3. Commit to let Gemini <strong>analyze your style</strong> and update its rules.</p>
                 </div>
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}