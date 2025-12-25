import React, { useState, useEffect, useRef } from 'react';
import { SiteData, ChatMessage, Part, FunctionResponsePart } from '../types';
import { SendIcon, GeminiIcon } from './icons/Icons';
import { createChatSession, isAiConfigured } from '../services/aiService';
import { executeTool } from '../services/toolExecutor';
import ActionConfirmationModal from './ActionConfirmationModal';
import ThinkingAnimation from './ThinkingAnimation';

interface CoPilotViewProps {
    siteData: SiteData | null;
    displayName: string;
    profilePictureUrl: string | null;
}

const CoPilotView: React.FC<CoPilotViewProps> = ({ siteData, displayName, profilePictureUrl }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatSessionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [pendingAction, setPendingAction] = useState<any | null>(null);

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(-1);

    const commonCommands = [
        "list plugins",
        "list themes",
        "read file",
        "write file",
        "delete plugin",
        "delete theme",
        "install plugin",
        "install theme",
        "toggle plugin status",
        "toggle theme status",
        "get database tables",
        "query database",
        "generate plugin",
        "generate theme",
        "analyze log",
        "analyze page speed",
        "help",
    ];

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
        if (isAiConfigured()) {
            chatSessionRef.current = createChatSession();
            setMessages([{
                id: 'initial-message',
                role: 'model',
                parts: [{ text: "Hello! I'm your Dev-Console Co-Pilot, now with advanced capabilities. I can read/write files, manage plugins, and execute custom database queries. How can I assist you?" }],
            }]);
        } else {
            setError("AI Service is not configured. Please add your API Key in Settings.");
        }
    }, []);

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
                setPendingAction(functionCalls[0]);
            }
        } catch (err) {
            setError(`An error occurred: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSend = async () => {
        if (!input.trim() || isLoading || !isAiConfigured()) return;

        const text = input;
        setInput('');

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            parts: [{ text }],
        }]);

        await processStream(chatSessionRef.current.sendMessageStream({ message: text }));
    };

    const handleConfirmAction = async () => {
        if (!pendingAction || !siteData) {
            setError("Action could not be executed. No pending action or site is not connected.");
            setPendingAction(null);
            return;
        }

        const actionToExecute = { ...pendingAction };
        setPendingAction(null);
        setIsLoading(true);
        setError(null);
        
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'model',
            parts: [{ text: `Executing \`${actionToExecute.name}\`...` }]
        }]);

        try {
            const result = await executeTool(actionToExecute, siteData);
            
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
            handleSend();
        } else if (e.key === 'Tab' && showSuggestions && highlightedSuggestionIndex !== -1) {
            e.preventDefault();
            setInput(suggestions[highlightedSuggestionIndex]);
            setShowSuggestions(false);
        } else if (e.key === 'ArrowUp' && showSuggestions) {
            e.preventDefault();
            setHighlightedSuggestionIndex(prev => (prev === 0 ? suggestions.length - 1 : prev - 1));
        } else if (e.key === 'ArrowDown' && showSuggestions) {
            e.preventDefault();
            setHighlightedSuggestionIndex(prev => (prev === suggestions.length - 1 ? 0 : prev + 1));
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInput(value);

        if (value.length > 2) { // Start suggesting after 2 characters
            const filtered = commonCommands.filter(cmd => 
                cmd.toLowerCase().startsWith(value.toLowerCase())
            );
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
            setHighlightedSuggestionIndex(0);
        } else {
            setShowSuggestions(false);
            setSuggestions([]);
        }
    };

    const renderPart = (part: Part, index: number) => {
        if ('text' in part) {
            return <React.Fragment key={index}>{part.text.split('\n').map((line, i, arr) => <React.Fragment key={i}>{line}{i < arr.length - 1 && <br />}</React.Fragment>)}</React.Fragment>;
        }
        if ('functionCall' in part) {
            return (
                <div key={index} className="bg-blue-900/30 p-2 rounded-md my-2 text-xs font-mono">
                    <p className="text-accent-blue font-bold mb-1">Co-Pilot Action Proposed:</p>
                    <pre className="whitespace-pre-wrap break-all text-text-primary">
                        <code className="language-json">
                            {JSON.stringify(part.functionCall, null, 2)}
                        </code>
                    </pre>
                </div>
            );
        }
        if ('functionResponse' in part) {
            return (
                <div key={index} className="bg-green-900/30 p-2 rounded-md my-2 text-xs font-mono">
                    <p className="text-accent-green font-bold mb-1">Output from `{part.functionResponse.name}`:</p>
                    <pre className="whitespace-pre-wrap break-all text-text-primary">
                        <code className="language-json">
                            {JSON.stringify(part.functionResponse.response, null, 2)}
                        </code>
                    </pre>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full">
            <h1 className="text-4xl font-bold mb-4">Dev-Console Co-Pilot Chat</h1>
            <div className="bg-background-secondary rounded-lg border border-border-primary flex flex-col flex-grow p-4">
                <main className="flex-1 overflow-y-auto pr-2 space-y-6 font-mono text-sm mx-auto w-full max-w-4xl">
                     {messages.map((msg) => (
                        <div key={msg.id} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
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
                                            <div className="flex items-start gap-4">
                                                <GeminiIcon className="w-10 h-10 p-1 rounded-full flex-shrink-0 mt-1 bg-background animate-pulse" />
                                                <div className="chat-bubble chat-bubble-model">
                                                    <ThinkingAnimation className="text-text-secondary" />
                                                </div>
                                            </div>
                                        )}                    <div ref={messagesEndRef} />
                </main>
                {error && <div className="text-center my-2 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm font-mono mx-auto w-full max-w-4xl">{error}</div>}
                <footer className="mt-4 mx-auto w-full max-w-4xl relative">
                    {showSuggestions && suggestions.length > 0 && (
                        <ul className="absolute bottom-full left-0 right-0 bg-background-secondary border border-border-primary rounded-lg mb-2 overflow-hidden shadow-lg z-10 max-h-48 overflow-y-auto">
                            {suggestions.map((suggestion, index) => (
                                <li 
                                    key={suggestion} 
                                    className={`p-2 cursor-pointer hover:bg-border-primary ${highlightedSuggestionIndex === index ? 'bg-border-primary' : ''}`}
                                    onClick={() => {
                                        setInput(suggestion);
                                        setShowSuggestions(false);
                                    }}
                                >
                                    {suggestion}
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex items-center space-x-2 bg-background p-2 border border-border-primary rounded-lg">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={isAiConfigured() ? "Ask a question... (Ctrl+Enter to send)" : "Please configure your API Key in Settings"}
                            rows={1}
                            className="flex-grow bg-transparent focus:outline-none resize-none copilot-textarea font-mono text-sm"
                            disabled={isLoading || !isAiConfigured()}
                        />
                        <button onClick={handleSend} disabled={isLoading || !input.trim() || !isAiConfigured()} className="p-2 bg-accent-blue rounded-md disabled:opacity-50">
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </footer>
            </div>
            {pendingAction && (
                <ActionConfirmationModal
                    functionCall={pendingAction}
                    onConfirm={handleConfirmAction}
                    onCancel={handleCancelAction}
                    disabled={!siteData}
                />
            )}
        </div>
    );
};

export default CoPilotView;