import React, { useState, useEffect, useRef } from 'react';
import { SiteData, ChatMessage, Part, FunctionCallPart, FunctionResponsePart } from '../types';
import { SendIcon } from './icons/Icons';
import { createChatSession, isAiConfigured } from '../services/aiService';
import { executeTool } from '../services/toolExecutor';
import ActionConfirmationModal from './ActionConfirmationModal';

interface CoPilotViewProps {
    siteData: SiteData | null;
}

const CoPilotView: React.FC<CoPilotViewProps> = ({ siteData }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatSessionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [pendingAction, setPendingAction] = useState<any | null>(null);

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
            // FIX: Updated the initial message to be more informative about the AI's advanced capabilities.
            setMessages([{
                id: 'initial-message',
                role: 'model',
                parts: [{ text: "Hello! I'm your Dev-Console Co-Pilot, now with advanced capabilities. I can read/write files, manage plugins, and execute custom database queries. How can I assist you?" }],
            }]);
        } else {
            setError("AI Service is not configured. Please add your API Key in Settings.");
        }
    }, []);

    // FIX: Refactored the entire chat handling logic to support a full function-calling loop, allowing the AI to use tools and respond with the results.
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
                    response: {
                        name: actionToExecute.name,
                        content: result,
                    }
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
        }
    };

    const renderPart = (part: Part, index: number) => {
        if ('text' in part) {
            return <div key={index} className="prose prose-sm prose-invert max-w-none prose-p:font-mono" dangerouslySetInnerHTML={{ __html: part.text.replace(/\n/g, '<br />') }}></div>;
        }
        if ('functionCall' in part) {
            return <div key={index} className="text-accent-yellow font-mono text-xs">Waiting for confirmation to run: {part.functionCall.name}</div>;
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full">
            <h1 className="text-4xl font-bold mb-4">Dev-Console Co-Pilot Chat</h1>
            <div className="bg-background-secondary rounded-lg border border-border-primary flex flex-col flex-grow p-4">
                <main className="flex-1 overflow-y-auto pr-2 space-y-4 font-mono text-sm">
                     {messages.map((msg) => (
                        <div key={msg.id} className="flex flex-col">
                           <div className={`font-bold ${msg.role === 'user' ? 'text-accent-cyan' : 'text-accent-violet'}`}>
                                {msg.role === 'user' ? 'User >' : 'Co-Pilot >'}
                            </div>
                            {msg.parts.map(renderPart)}
                        </div>
                    ))}
                    {isLoading && <div className="text-accent-yellow animate-pulse">Co-Pilot is thinking...</div>}
                    <div ref={messagesEndRef} />
                </main>
                {error && <div className="text-center my-2 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm font-mono">{error}</div>}
                <footer className="mt-4">
                    <div className="flex items-center space-x-2 bg-background p-2 border border-border-primary rounded-lg">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
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