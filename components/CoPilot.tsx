import React, { useState, useEffect, useRef } from 'react';
import { SiteData, ChatMessage } from '../types';
import { CloseIcon, SendIcon, CoPilotIcon, FullScreenIcon, ExitFullScreenIcon } from './icons/Icons';
import { createChatSession } from '../services/aiService';
import ThinkingAnimation from './ThinkingAnimation';
import ActionConfirmationCard from './ActionConfirmationCard';
import { executeTool } from '../services/toolExecutor';

interface CoPilotProps {
    onClose: () => void;
    siteData: SiteData | null;
    initialPrompt?: string;
    modalBgColor?: string;
}

const CoPilot: React.FC<CoPilotProps> = ({ onClose, siteData, initialPrompt, modalBgColor }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const chatSessionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // New state for queuing prompts and auto-execution
    const [promptQueue, setPromptQueue] = useState<string[]>([]);
    const [autoExecute, setAutoExecute] = useState(false);
    const [showShortcutInfo, setShowShortcutInfo] = useState(false);
    const componentRootRef = useRef<HTMLDivElement>(null);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            // Reset height to auto to allow shrinking
            textareaRef.current.style.height = 'auto';
            // Set height to scrollHeight to expand
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    // Show shortcut info on first open
    useEffect(() => {
        const isDismissed = localStorage.getItem('dev-console-shortcut-info-dismissed');
        if (!isDismissed) {
            setShowShortcutInfo(true);
        }
    }, []);


    // Keyboard shortcut for toggling auto-execute
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.shiftKey && e.key === 'Tab') {
                e.preventDefault();
                setAutoExecute(prev => !prev);
            }
        };
        const currentRoot = componentRootRef.current;
        currentRoot?.addEventListener('keydown', handleKeyDown);

        return () => {
            currentRoot?.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        chatSessionRef.current = createChatSession();
        if (initialPrompt) {
            handleSend(initialPrompt);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPrompt]);

    const handleSend = async (messageText?: string) => {
        const textToSend = (messageText || input).trim();
        if (!textToSend || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            parts: [{ text: textToSend }],
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const stream = await chatSessionRef.current.sendMessageStream({ message: textToSend });
            let modelResponse = '';
            let currentToolCalls: any[] = [];
            
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', parts: [{ text: '' }], toolCalls: [] }]);

            for await (const chunk of stream) {
                const chunkText = chunk.text;
                const functionCalls = chunk.functionCalls;

                if (chunkText) {
                    modelResponse += chunkText;
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1].parts[0].text = modelResponse;
                        return newMessages;
                    });
                }
                if (functionCalls) {
                    currentToolCalls = functionCalls;
                    if (autoExecute && siteData) {
                        for (const tc of currentToolCalls) {
                            await handleConfirmAction(tc, true);
                        }
                    } else {
                        setMessages(prev => {
                            const newMessages = [...prev];
                            newMessages[newMessages.length - 1].toolCalls = currentToolCalls;
                            return newMessages;
                        });
                    }
                }
            }
        } catch (err) {
            let errorMessage = (err as Error).message;
            try {
                const errorJson = JSON.parse(errorMessage);
                if (errorJson.error && errorJson.error.message) {
                    errorMessage = errorJson.error.message;
                }
            } catch (e) {
                // Not a JSON string, use the original message
            }
            setError(`An error occurred: ${errorMessage}`);
        } finally {
            setIsLoading(false);
            // Check for and process the next prompt in the queue
            if (promptQueue.length > 0) {
                const nextPrompt = promptQueue[0];
                setPromptQueue(prev => prev.slice(1));
                handleSend(nextPrompt);
            }
        }
    };

    const handleConfirmAction = async (toolCall: any, isAutoExecuted = false) => {
        if (!siteData) {
            setError("Cannot execute action: Not connected to a WordPress site.");
            return;
        }

        setIsLoading(true);
        try {
            await executeTool(toolCall, siteData);
            const messageText = isAutoExecuted 
                ? `✅ Auto-Executed: \`${toolCall.name}\` ran successfully.`
                : `✅ Action Confirmed: \`${toolCall.name}\` was executed successfully.`;

            const systemMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                parts: [{ text: messageText }],
            };
            setMessages(prev => {
                const updatedMessages = prev.map(msg => ({
                    ...msg,
                    toolCalls: msg.toolCalls?.filter(tc => tc.name !== toolCall.name)
                }));
                return [...updatedMessages, systemMessage];
            });
        } catch (err) {
            setError(`Action failed: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            if (input.trim()) {
                if (isLoading) {
                    setPromptQueue(prev => [...prev, input.trim()]);
                    setInput('');
                } else {
                    handleSend();
                }
            }
        } else if (e.key === 'ArrowUp' && isLoading && input === '' && promptQueue.length > 0) {
            e.preventDefault();
            const lastPrompt = promptQueue[promptQueue.length - 1];
            setPromptQueue(prev => prev.slice(0, -1));
            setInput(lastPrompt);
        }
    };
    
    const modalStyle = modalBgColor ? { backgroundColor: modalBgColor } : {};

    return (
        <div className={`fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 ${isFullScreen ? '' : 'p-4'}`} ref={componentRootRef} tabIndex={-1}>
            <div
                style={modalStyle}
                className={`bg-background-secondary shadow-2xl border border-border-primary flex flex-col transition-all duration-300 ${isFullScreen ? 'w-full h-full rounded-none' : 'rounded-lg w-full max-w-3xl h-[90vh]' } p-6 modal-content-animation`}
            >
                <header className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center"><CoPilotIcon className="w-6 h-6 mr-3 text-accent-blue" /> Dev-Console Co-Pilot</h2>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-text-secondary hover:text-text-primary p-1">
                            {isFullScreen ? <ExitFullScreenIcon className="w-6 h-6" /> : <FullScreenIcon className="w-6 h-6" />}
                        </button>
                        <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-1"><CloseIcon className="w-6 h-6" /></button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-accent-blue text-white' : 'bg-background'}`}>
                                <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{__html: msg.parts[0].text.replace(/\n/g, '<br />')}}></div>
                                {msg.toolCalls && msg.toolCalls.map((tc, idx) => (
                                    <ActionConfirmationCard 
                                        key={idx}
                                        functionCall={tc} 
                                        onConfirm={() => handleConfirmAction(tc)} 
                                        onCancel={() => setMessages(prev => prev.map(m => m.id === msg.id ? {...m, toolCalls: []} : m))}
                                        disabled={!siteData}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                    {isLoading && messages[messages.length - 1]?.role === 'user' && <ThinkingAnimation />}
                    <div ref={messagesEndRef} />
                </main>
                {error && <div className="text-center my-2 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-accent-red/80">{error}</div>}
                <footer className="mt-4 relative">
                     {showShortcutInfo && (
                        <div className="shortcut-popup-animation absolute bottom-full mb-2 w-full max-w-sm p-3 bg-background border border-border-primary rounded-lg shadow-lg">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-bold">Co-Pilot Shortcuts</h4>
                                <button 
                                    onClick={() => {
                                        setShowShortcutInfo(false);
                                        localStorage.setItem('dev-console-shortcut-info-dismissed', 'true');
                                    }}
                                    className="text-text-secondary hover:text-text-primary"
                                >
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <ul className="text-xs text-text-secondary space-y-1 font-mono">
                                <li><kbd>Ctrl</kbd>+<kbd>Enter</kbd> - Send / Queue</li>
                                <li><kbd>Shift</kbd>+<kbd>Tab</kbd> - Toggle Auto-Execute</li>
                                <li><kbd>↑</kbd> (empty) - Edit last queued prompt</li>
                            </ul>
                        </div>
                    )}
                    {promptQueue.length > 0 && (
                        <div className="mb-2 p-2 bg-background-secondary/50 rounded-md">
                            <p className="text-xs text-text-secondary font-bold">Queued ({promptQueue.length}):</p>
                            <ol className="list-decimal list-inside text-xs text-text-secondary space-y-1 mt-1">
                                {promptQueue.map((prompt, index) => (
                                    <li key={index} className="truncate font-mono">{prompt}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                     {autoExecute && (
                        <div className="absolute -top-6 left-0 flex items-center space-x-2">
                             <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple">AUTO-EXEC ON</span>
                             <span className="text-xs text-text-secondary">(Shift+Tab to toggle)</span>
                        </div>
                    )}
                    <div className={`flex items-center space-x-2 bg-background p-2 border border-border-primary rounded-lg transition-all ${autoExecute ? 'auto-execute-glow' : ''}`}>
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isLoading ? "AI is busy... Add to queue with Ctrl+Enter" : "Ask a question (Ctrl+Enter to send)"}
                            rows={1}
                            className="flex-grow bg-background focus:outline-none resize-none copilot-textarea"
                        />
                        <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="p-2 bg-accent-blue rounded-md disabled:opacity-50">
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default CoPilot;