'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Sparkles, Loader2, Maximize2, Minimize2 } from 'lucide-react';

const GEMINI_API_KEY = 'AIzaSyBIiVho0owJ2QW7EkGLw70BWUrXP8czbp0';

export default function DFMEAAIAssistant({ 
  data, 
  filteredEdges, 
  nodesIndex, 
  highlightedNodeId,
  onClearHighlight 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false); // State for main chat maximization
  const [isNodeChatMaximized, setIsNodeChatMaximized] = useState(false); // NEW state for node chat
  const [nodeChat, setNodeChat] = useState({ 
    visible: false, 
    node: null, 
    messages: [], 
    position: { x: 0, y: 0 } 
  });
  const messagesEndRef = useRef(null);
  const nodeChatRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, nodeChat.messages]);

  // Reset node chat maximization state when a new node is highlighted
  useEffect(() => {
    if (highlightedNodeId) {
      setIsNodeChatMaximized(false);
    }
  }, [highlightedNodeId]);

  // Open node chat when a node is highlighted and calculate position
  useEffect(() => {
    if (highlightedNodeId && nodesIndex) {
      const node = nodesIndex.get(highlightedNodeId);
      if (node) {
        // --- POSITION CALCULATION LOGIC ---
        let x, y;
        
        // Maximize state takes precedence for positioning
        if (isNodeChatMaximized) {
          x = 20; // Near full screen
          y = 20; // Near full screen
        } else {
          // Calculate standard position based on main chat's state
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;
          const standardNodeChatWidth = 320;
          const standardNodeChatHeight = 420;

          if (isOpen && !isMaximized) {
              // Main chat is open and minimized (bottom-right)
              // Position node chat above and slightly left of the main chat
              x = screenWidth - 400; 
              y = screenHeight - 620; 
          } else if (isOpen && isMaximized) {
              // Main chat is open and maximized (center)
              // Position node chat in the top-right of the screen area
              x = screenWidth - standardNodeChatWidth - 24; 
              y = 24; 
          } else {
              // Main chat is closed, position node chat bottom-right
              x = screenWidth - standardNodeChatWidth - 24;
              y = screenHeight - standardNodeChatHeight - 24;
          }
          
          x = Math.max(20, x); // Ensure minimum 20px from left
          y = Math.max(20, y); // Ensure minimum 20px from top
        }
        // --- END POSITION CALCULATION LOGIC ---

        setNodeChat(prev => ({
          visible: true,
          node: node,
          // Only reset messages if the node ID has changed, otherwise keep existing messages
          messages: prev.node?.id !== node.id ? [] : prev.messages,
          position: { x, y }
        }));
      }
    }
  }, [highlightedNodeId, nodesIndex, isOpen, isMaximized, isNodeChatMaximized]); // Added isNodeChatMaximized dependency

  const captureGraphSnapshot = () => {
    // Get visible nodes from the current filtered state
    const visibleNodeIds = new Set();
    filteredEdges.forEach(e => {
      visibleNodeIds.add(e.from);
      visibleNodeIds.add(e.to);
    });

    const visibleNodes = Array.from(visibleNodeIds)
      .map(id => nodesIndex.get(id))
      .filter(Boolean)
      .map(n => ({
        id: n.id,
        type: n.type,
        label: n.label,
        attributes: n.attrs || {}
      }));

    const relationships = filteredEdges.map(e => ({
      from: e.from,
      to: e.to,
      type: e.type,
      step: e.step,
      fromNode: nodesIndex.get(e.from)?.label || e.from,
      toNode: nodesIndex.get(e.to)?.label || e.to
    }));

    return {
      nodes: visibleNodes,
      relationships: relationships,
      totalNodes: visibleNodes.length,
      totalRelationships: relationships.length
    };
  };

  const callGeminiAPI = async (prompt, isNodeSpecific = false, nodeId = null) => {
    const snapshot = captureGraphSnapshot();
    
    let systemContext = '';
    
    // --- GEMINI API CONTEXT LOGIC (OMITTED FOR BREVITY, ASSUMED CORRECT) ---
    // (Your existing context logic is here)
    if (isNodeSpecific && nodeId) {
        const selectedNode = nodesIndex.get(nodeId);
        systemContext = `You are an expert DFMEA (Design Failure Mode and Effects Analysis) consultant specializing in Ford Automotive standards and AIAG-VDA FMEA methodologies.

🔴 CRITICAL CONTEXT - SELECTED NODE:
The user has SPECIFICALLY SELECTED this node for analysis:
- Node ID: ${nodeId}
- Type: ${selectedNode?.type}
- Label: ${selectedNode?.label}
- Attributes: ${JSON.stringify(selectedNode?.attrs || {}, null, 2)}

⚠️ YOUR RESPONSE MUST FOCUS ON THIS SELECTED NODE AS THE PRIMARY SUBJECT.

CURRENT DFMEA GRAPH STATE (${snapshot.totalNodes} nodes, ${snapshot.totalRelationships} relationships):

VISIBLE NODES:
${snapshot.nodes.slice(0, 20).map(n => `- [${n.type}] ${n.label} (ID: ${n.id}) ${Object.keys(n.attributes).length > 0 ? '| Attrs: ' + JSON.stringify(n.attributes) : ''}`).join('\n')}
${snapshot.nodes.length > 20 ? `... and ${snapshot.nodes.length - 20} more nodes` : ''}

KEY RELATIONSHIPS INVOLVING SELECTED NODE:
${snapshot.relationships
  .filter(r => r.from === nodeId || r.to === nodeId)
  .map(r => `- ${r.fromNode} --[${r.type}]--> ${r.toNode} (Step: ${r.step || 'N/A'})`)
  .join('\n')}

ALL RELATIONSHIPS IN GRAPH:
${snapshot.relationships.slice(0, 30).map(r => `- ${r.fromNode} --[${r.type}]--> ${r.toNode}`).join('\n')}
${snapshot.relationships.length > 30 ? `... and ${snapshot.relationships.length - 30} more relationships` : ''}

FORD AUTOMOTIVE DFMEA GUIDELINES:
- Follow AIAG-VDA FMEA Handbook standards
- Consider Severity (S), Occurrence (O), Detection (D) ratings (1-10 scale)
- Focus on customer impact and safety
- Identify Special Characteristics (SC) where applicable
- Recommend preventive controls (reduce occurrence) and detective controls (improve detection)
- Consider design validation and verification activities
- Reference Ford-specific quality standards and requirements

USER QUESTION ABOUT SELECTED NODE "${selectedNode?.label}":
${prompt}

Provide expert DFMEA analysis focusing specifically on the selected node and how it relates to the broader system. Be concise, actionable, and use automotive DFMEA terminology correctly.`;
    } else {
      // General chat context
      systemContext = `You are an expert DFMEA (Design Failure Mode and Effects Analysis) consultant specializing in Ford Automotive standards and AIAG-VDA FMEA methodologies.

CURRENT DFMEA GRAPH STATE (${snapshot.totalNodes} nodes, ${snapshot.totalRelationships} relationships):

VISIBLE NODES IN GRAPH:
${snapshot.nodes.slice(0, 25).map(n => `- [${n.type}] ${n.label} (ID: ${n.id}) ${Object.keys(n.attributes).length > 0 ? '| Attrs: ' + JSON.stringify(n.attributes) : ''}`).join('\n')}
${snapshot.nodes.length > 25 ? `... and ${snapshot.nodes.length - 25} more nodes` : ''}

RELATIONSHIPS IN GRAPH:
${snapshot.relationships.slice(0, 40).map(r => `- ${r.fromNode} --[${r.type}]--> ${r.toNode} (Step: ${r.step || 'N/A'})`).join('\n')}
${snapshot.relationships.length > 40 ? `... and ${snapshot.relationships.length - 40} more relationships` : ''}

FORD AUTOMOTIVE DFMEA CONTEXT:
- System: Power Liftgate (automotive closure system)
- Standards: AIAG-VDA FMEA Handbook, Ford-specific quality requirements
- Focus areas: Safety, reliability, customer satisfaction
- Severity/Occurrence/Detection rating scale: 1-10
- Special Characteristics: Critical/Significant features requiring enhanced controls

ANALYSIS GUIDELINES:
1. Reference specific nodes and relationships from the current graph
2. Consider S/O/D ratings and RPN (Risk Priority Number)
3. Suggest preventive controls (reduce occurrence) and detective controls (improve detection)
4. Identify potential failure modes, effects, and causes
5. Recommend actions following Ford FMEA best practices
6. Consider Special Characteristics when applicable
7. Be concise but thorough, using correct DFMEA terminology

USER QUESTION:
${prompt}

Provide expert analysis based on the current DFMEA graph state shown above.`;
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: systemContext }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          })
        }
      );

      const data = await response.json();
      
      if (data.error) {
        console.error('Gemini API Error:', data.error);
        return `Error: ${data.error.message || 'Failed to get response from AI'}`;
      }
      
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received from AI.';
    } catch (error) {
      console.error('Gemini API Error:', error);
      return 'Error communicating with AI. Please check your connection and try again.';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const aiResponse = await callGeminiAPI(input);
    setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    setIsLoading(false);
  };

  const handleNodeChatSend = async () => {
    if (!nodeChat.node || !input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setNodeChat(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage]
    }));
    setInput('');
    setIsLoading(true);

    const aiResponse = await callGeminiAPI(input, true, nodeChat.node.id);
    setNodeChat(prev => ({
      ...prev,
      messages: [...prev.messages, { role: 'assistant', content: aiResponse }]
    }));
    setIsLoading(false);
  };

  const handleKeyPress = (e, handler) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handler();
    }
  };

  const closeNodeChat = () => {
    setNodeChat({ visible: false, node: null, messages: [], position: { x: 0, y: 0 } });
    setIsNodeChatMaximized(false); // Reset maximization on close
    if (onClearHighlight) onClearHighlight();
  };

  // Toggle maximization state for main chat
  const toggleMaximize = () => {
    setIsMaximized(prev => !prev);
  };

  // Toggle maximization state for node chat
  const toggleNodeChatMaximize = () => {
    setIsNodeChatMaximized(prev => !prev);
  };

  // Dynamic classNames and styles for main chat
  const mainChatClass = isMaximized
    ? 'fixed inset-5 w-[calc(100vw-40px)] h-[calc(100vh-40px)] rounded-xl'
    : 'fixed bottom-6 right-6 w-96 h-[500px] rounded-2xl';

  const mainChatStyle = isMaximized 
    ? { transition: 'width 0.3s ease, height 0.3s ease, top 0.3s ease, right 0.3s ease, bottom 0.3s ease, left 0.3s ease' }
    : {};
  
  // Dynamic classNames and styles for node chat
  const nodeChatClass = isNodeChatMaximized
    ? 'fixed inset-5 w-[calc(100vw-40px)] h-[calc(100vh-40px)] rounded-xl' // Almost full screen
    : 'fixed w-80 h-[420px] rounded-2xl'; // Original size

  const nodeChatStyle = isNodeChatMaximized 
    ? { transition: 'width 0.3s ease, height 0.3s ease, top 0.3s ease, right 0.3s ease, bottom 0.3s ease, left 0.3s ease' }
    : { 
        left: `${nodeChat.position.x}px`,
        top: `${nodeChat.position.y}px`,
        transition: 'left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease' 
    };

  return (
    <>
      {/* Main Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300 group z-40"
          title="Ask DFMEA Expert AI"
        >
          <MessageCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Main Chat Box */}
      {isOpen && (
        <div 
          className={`${mainChatClass} bg-slate-800 shadow-2xl flex flex-col overflow-hidden border border-slate-700 z-40`}
          style={mainChatStyle}
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <h3 className="font-bold text-white">DFMEA Expert AI</h3>
            </div>
            <div className='flex items-center gap-2'>
                {/* Main Chat Maximize/Minimize Button */}
                <button 
                  onClick={toggleMaximize} 
                  className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                  title={isMaximized ? "Minimize Main Chat" : "Maximize Main Chat"}
                >
                  {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                {/* Close Button */}
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 mt-8">
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                <p className="font-medium text-slate-300">Ask me anything about your DFMEA!</p>
                <div className="text-sm mt-3 space-y-1">
                  <p>💡 "What other causes could affect Engine Stall?"</p>
                  <p>💡 "Suggest controls for Signal Loss failure"</p>
                  <p>💡 "What are the critical failure modes?"</p>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-sm' 
                    : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700'
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl rounded-bl-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-slate-700 bg-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleSend)}
                placeholder="Ask about your DFMEA..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-100 placeholder-slate-500 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-2 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                title="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Node-Specific Chat */}
      {nodeChat.visible && (
        <div 
          ref={nodeChatRef}
          className={`${nodeChatClass} bg-slate-800 shadow-2xl flex flex-col overflow-hidden border-2 border-magenta-500 z-50 animate-fadeIn`}
          style={nodeChatStyle}
        >
          <div className="bg-gradient-to-r from-fuchsia-600 to-pink-600 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-2 h-2 bg-yellow-300 rounded-full animate-pulse" />
              <h3 className="font-bold text-white text-sm truncate" title={nodeChat.node?.label}>
                {nodeChat.node?.type}: {nodeChat.node?.label}
              </h3>
            </div>
            <div className='flex items-center gap-2'>
                {/* Node Chat Maximize/Minimize Button */}
                <button 
                  onClick={toggleNodeChatMaximize} 
                  className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors flex-shrink-0"
                  title={isNodeChatMaximized ? "Minimize Node Chat" : "Maximize Node Chat"}
                >
                  {isNodeChatMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                {/* Close Button */}
                <button 
                  onClick={closeNodeChat}
                  className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors flex-shrink-0 ml-2"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-900">
            {nodeChat.messages.length === 0 && (
              <div className="text-center text-slate-400 mt-6">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm font-medium text-slate-300">Ask about this node</p>
                <div className="text-xs mt-2 space-y-1">
                  <p>💡 "How does this affect everything?"</p>
                  <p>💡 "What are the root causes?"</p>
                  <p>💡 "Suggest mitigation actions"</p>
                </div>
              </div>
            )}
            {nodeChat.messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-2 rounded-xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white rounded-br-sm' 
                    : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 p-2 rounded-xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-fuchsia-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-slate-700 bg-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleNodeChatSend)}
                placeholder="Ask about this node..."
                disabled={isLoading}
                className="flex-1 px-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent text-slate-100 placeholder-slate-500 disabled:opacity-50"
              />
              <button
                onClick={handleNodeChatSend}
                disabled={isLoading || !input.trim()}
                className="bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white p-1.5 rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
}