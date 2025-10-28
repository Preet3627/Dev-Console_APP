import React, { useState, useEffect, useRef } from 'react';
import { SiteData, ChatMessage, Part, FunctionResponsePart } from '../types';
import { CloseIcon, SendIcon, FullScreenIcon, ExitFullScreenIcon, GeminiIcon } from './icons/Icons';
import { createChatSession } from '../services/aiService';
import { executeTool } from '../services/toolExecutor';
import ActionConfirmationModal from './ActionConfirmationModal';

interface CoPilotProps {
    onClose: () => void;
    siteData: SiteData | null;
    initialPrompt?: string;
    modalBgColor?: string;
    displayName: string;
    profilePictureUrl: string | null;
}

const CoPilot: React.FC<CoPilotProps> = ({ onClose, siteData, initialPrompt, modalBgColor, displayName, profilePictureUrl }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const chatSessionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [pendingAction, setPendingAction] = useState<any | null>(null);

    const [promptQueue, setPromptQueue] = useState<string[]>([]);
    const [autoExecute, setAutoExecute] = useState(false);
    const [showShortcutInfo, setShowShortcutInfo] = useState(false);
    const componentRootRef = useRef<HTMLDivElement>(null);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    useEffect(() => {
        const isDismissed = localStorage.getItem('dev-console-shortcut-info-dismissed');
        if (!isDismissed) {
            setShowShortcutInfo(true);
        }
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
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
    }, []);

    // FIX: Refactored chat logic into a stream processing function to handle the full function-calling loop correctly.
    const processStream = async (streamPromise: Promise<any>) => {
        setIsLoading(true);
        setError(null);

        let currentModelMessageId = Date.now().toString();
        setMessages(prev => [...prev, { id: currentModelMessageId, role: 'model', parts: [{ text: '' }] }]);

        try {
            const stream = await streamPromise;
            let modelResponseText = '';
            let functionCalls: any[] = [];

            for await (const chunk of stream) {
                const chunkText = chunk.text;
                if (chunkText) {
                    modelResponseText += chunkText;
                    setMessages(prev => prev.map(msg => msg.id === currentModelMessageId ? { ...msg, parts: [{ text: modelResponseText }] } : msg));
                }
                if (chunk.functionCalls) {
                    functionCalls.push(...chunk.functionCalls);
                }
            }
            
            if (functionCalls.length > 0) {
                if (autoExecute && siteData) {
                    // In auto-execute mode, immediately execute and send back response
                    const toolCall = functionCalls[0];
                    await handleConfirmAction(toolCall, true);
                } else {
                    setPendingAction(functionCalls[0]);
                }
            }

        } catch (err) {
            setError(`An error occurred: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
             if (promptQueue.length > 0 && !pendingAction) {
                const nextPrompt = promptQueue[0];
                setPromptQueue(prev => prev.slice(1));
                handleSend(nextPrompt);
            }
        }
    };

    const handleSend = async (messageText?: string) => {
        const textToSend = (messageText || input).trim();
        if (!textToSend || isLoading) return;

        setInput('');
        
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            parts: [{ text: textToSend }],
        }]);
        
        await processStream(chatSessionRef.current.sendMessageStream({ message: textToSend }));
    };

    const handleConfirmAction = async (toolCall: any, isAutoExecuted = false) => {
        const actionToExecute = toolCall || pendingAction;
        if (!actionToExecute || !siteData) {
            setError("Action could not be executed.");
            return;
        }

        setPendingAction(null);
        setIsLoading(true);
        setError(null);
        
        const executingMessage = isAutoExecuted 
            ? `Auto-executing \`${actionToExecute.name}\`...`
            : `Executing \`${actionToExecute.name}\`...`;
        
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            parts: [{ text: executingMessage }]
        }]);

        try {
            const result = await executeTool(actionToExecute, siteData);
            
            // FIX: Correctly structure the function response part to resolve AI errors.
            const functionResponsePart: FunctionResponsePart = {
                functionResponse: {
                    name: actionToExecute.name,
                    response: result
                }
            };
            
            await processStream(chatSessionRef.current.sendMessageStream({ parts: [functionResponsePart] as Part[] }));

        } catch (err) {
            setError(`Action \`${actionToExecute.name}\` failed: ${(err as Error).message}`);
            setIsLoading(false);
        }
    };
    
    const handleCancelAction = () => {
        setPendingAction(null);
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            parts: [{ text: `Action cancelled by user.` }],
        }]);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            if (input.trim()) {
                if (isLoading || pendingAction) {
                    setPromptQueue(prev => [...prev, input.trim()]);
                    setInput('');
                } else {
                    handleSend();
                }
            }
        } else if (e.key === 'ArrowUp' && (isLoading || pendingAction) && input === '' && promptQueue.length > 0) {
            e.preventDefault();
            const lastPrompt = promptQueue[promptQueue.length - 1];
            setPromptQueue(prev => prev.slice(0, -1));
            setInput(lastPrompt);
        }
    };
    
    const modalStyle = modalBgColor ? { backgroundColor: modalBgColor } : {};

    const renderPart = (part: Part, index: number) => {
        if ('text' in part) {
            // FIX: Replaced `dangerouslySetInnerHTML` with React fragments to handle text and newlines safely and correctly.
            return <React.Fragment key={index}>{part.text.split('\n').map((line, i, arr) => <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>)}</React.Fragment>;
        }
        if ('functionCall' in part) {
            return <div key={index} className="text-accent-yellow font-mono text-xs">Waiting for confirmation to run: {part.functionCall.name}</div>;
        }
        return null;
    };

    return (
        <div className={`fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 ${isFullScreen ? '' : 'p-4'}`} ref={componentRootRef} tabIndex={-1}>
            <div
                style={modalStyle}
                className={`bg-background-secondary shadow-2xl border border-border-primary flex flex-col transition-all duration-300 ${isFullScreen ? 'w-full h-full rounded-none' : 'rounded-lg w-full max-w-5xl h-[90vh]' } p-6 modal-content-animation`}
            >
                <header className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold flex items-center"><GeminiIcon className="w-8 h-8 mr-3" /> Dev-Console Co-Pilot</h2>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-text-secondary hover:text-text-primary p-1">
                            {isFullScreen ? <ExitFullScreenIcon className="w-6 h-6" /> : <FullScreenIcon className="w-6 h-6" />}
                        </button>
                        <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-1"><CloseIcon className="w-6 h-6" /></button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto pr-2 space-y-6 font-mono text-sm min-h-0">
                    {messages.map((msg) => (
                       <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            {msg.role === 'model' ? (
                                <GeminiIcon className="w-10 h-10 p-1 rounded-full flex-shrink-0 mt-1 bg-background" />
                            ) : (
                                profilePictureUrl ? (
                                    <img src={profilePictureUrl} alt={displayName} className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-1" />
                                ) : (
                                    <div className="user-avatar mt-1">
                                        {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                                    </div>
                                )
                            )}
                            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-model'}`}>
                                <div className="prose prose-sm prose-invert max-w-none prose-p:my-0">
                                     {msg.parts.map(renderPart)}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <GeminiIcon className="w-10 h-10 p-1 rounded-full flex-shrink-0 mt-1 bg-background animate-pulse" />
                            <div className="chat-bubble chat-bubble-model">
                                <div className="text-text-secondary animate-pulse">Co-Pilot is thinking...</div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </main>
                {error && <div className="text-center my-2 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm font-mono flex-shrink-0">{error}</div>}
                <footer className="mt-4 relative flex-shrink-0">
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
                                <li><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>A</kbd> - Toggle Auto-Execute</li>
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
                             <span className="text-xs text-text-secondary">(Ctrl+Shift+A to toggle)</span>
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
                            className="flex-grow bg-transparent focus:outline-none resize-none copilot-textarea font-mono text-sm"
                        />
                        <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="p-2 bg-accent-blue rounded-md disabled:opacity-50">
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </footer>

                 {pendingAction && (
                    <ActionConfirmationModal
                        functionCall={pendingAction}
                        onConfirm={() => handleConfirmAction(pendingAction)}
                        onCancel={handleCancelAction}
                        disabled={!siteData}
                    />
                )}
            </div>
        </div>
    );
};

export default CoPilot;