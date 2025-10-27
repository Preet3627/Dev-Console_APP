import React, { useState, useEffect, useRef } from 'react';
import { SiteData, ChatMessage } from '../types';
import { SendIcon } from './icons/Icons';
import { createChatSession, isAiConfigured } from '../services/aiService';
import ThinkingAnimation from './ThinkingAnimation';
import ActionConfirmationCard from './ActionConfirmationCard';
import { executeTool } from '../services/toolExecutor';

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        if (isAiConfigured()) {
            chatSessionRef.current = createChatSession();
            setMessages([{
                id: 'initial-message',
                role: 'model',
                parts: [{ text: "Hello! I'm your Dev-Console Co-Pilot. How can I assist you with your WordPress site today?" }],
            }]);
        } else {
            setError("AI Service is not configured. Please add your Gemini API Key in Settings.");
        }
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLoading || !isAiConfigured()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            parts: [{ text: input }],
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const stream = await chatSessionRef.current.sendMessageStream({ message: userMessage.parts[0].text });
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

     const handleConfirmAction = async (toolCall: any, messageId: string) => {
        if (!siteData) {
            setError("Cannot execute action: Not connected to a WordPress site.");
            return;
        }

        setIsLoading(true);
        try {
            await executeTool(toolCall, siteData);
            const systemMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'model',
                parts: [{ text: `✅ Action Confirmed: \`${toolCall.name}\` was executed successfully.` }],
            };
             setMessages(prev => {
                const updatedMessages = prev.map(msg => 
                    msg.id === messageId 
                    ? {...msg, toolCalls: msg.toolCalls?.filter(tc => tc.name !== toolCall.name) } 
                    : msg
                );
                return [...updatedMessages, systemMessage];
            });
        } catch (err) {
            setError(`Action failed: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <h1 className="text-4xl font-bold mb-4">Dev-Console Co-Pilot Chat</h1>
            <div className="bg-background-secondary rounded-lg border border-border-primary flex flex-col flex-grow p-4">
                <main className="flex-1 overflow-y-auto pr-2 space-y-4">
                     {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-lg max-w-2xl ${msg.role === 'user' ? 'bg-accent-blue text-white' : 'bg-background'}`}>
                                <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{__html: msg.parts[0].text.replace(/\n/g, '<br />')}}></div>
                                {msg.toolCalls && msg.toolCalls.map((tc, idx) => (
                                    <ActionConfirmationCard 
                                        key={idx}
                                        functionCall={tc} 
                                        onConfirm={() => handleConfirmAction(tc, msg.id)} 
                                        onCancel={() => setMessages(prev => prev.map(m => m.id === msg.id ? {...m, toolCalls: []} : m))}
                                        disabled={!siteData}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                    {isLoading && <ThinkingAnimation />}
                    <div ref={messagesEndRef} />
                </main>
                {error && <div className="text-center my-2 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-accent-red/80">{error}</div>}
                <footer className="mt-4">
                    <div className="flex items-center space-x-2 bg-background p-2 border border-border-primary rounded-lg">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={isAiConfigured() ? "Ask a question or give an instruction..." : "Please configure Gemini API Key in Settings"}
                            rows={1}
                            className="flex-grow bg-transparent focus:outline-none resize-none"
                            disabled={isLoading || !isAiConfigured()}
                        />
                        <button onClick={handleSend} disabled={isLoading || !input.trim() || !isAiConfigured()} className="p-2 bg-accent-blue rounded-md disabled:opacity-50">
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default CoPilotView;
