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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        chatSessionRef.current = createChatSession();
        if (initialPrompt) {
            handleSend(initialPrompt);
        }
    }, [initialPrompt]);

    const handleSend = async (messageText?: string) => {
        const textToSend = messageText || input;
        if (!textToSend.trim() || isLoading) return;

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
                     setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1].toolCalls = currentToolCalls;
                        return newMessages;
                    });
                }
            }
        } catch (err) {
            setError(`An error occurred: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmAction = async (toolCall: any) => {
        if (!siteData) {
            setError("Cannot execute action: Not connected to a WordPress site.");
            return;
        }

        setIsLoading(true);
        try {
            await executeTool(toolCall, siteData);
            // This would ideally send a FunctionResponse back to the model, but for simplicity, we'll just show the result.
            const systemMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                parts: [{ text: `✅ Action Confirmed: \`${toolCall.name}\` was executed successfully.` }],
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
    
    const modalStyle = modalBgColor ? { backgroundColor: modalBgColor } : {};

    return (
        <div className={`fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 ${isFullScreen ? '' : 'p-4'}`}>
            <div
                style={modalStyle}
                className={`bg-background-secondary shadow-2xl border border-border-primary flex flex-col transition-all duration-300 ${isFullScreen ? 'w-full h-full rounded-none' : 'rounded-lg w-full max-w-3xl h-[90vh]' } p-6`}
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
                <footer className="mt-4">
                    <div className="flex items-center space-x-2 bg-background p-2 border border-border-primary rounded-lg">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder="Ask a question or give an instruction..."
                            rows={1}
                            className="flex-grow bg-transparent focus:outline-none resize-none"
                            disabled={isLoading}
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
