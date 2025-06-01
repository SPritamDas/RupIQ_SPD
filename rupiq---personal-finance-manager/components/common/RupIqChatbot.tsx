

import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { ChatMessage } from '../../types';
import { createRupIqChat } from '../../services/geminiService';
import { Button } from './Button';
import { Input } from './Input';
import { SparklesIcon, ExclamationTriangleIcon } from '../icons/IconComponents'; // Added ExclamationTriangleIcon
import type { Chat, GenerateContentResponse } from '@google/genai';

interface RupIqChatbotProps {
  // Props like isOpen and onClose will be handled by the Modal component wrapping this
}

const RupIqChatbot: React.FC<RupIqChatbotProps> = () => {
  const [chatInstance, setChatInstance] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const newChatInstance = createRupIqChat();
    setChatInstance(newChatInstance);
    
    let initialText = "Hello! I'm RupIQ, your personal finance assistant. How can I help you today?";
    if (newChatInstance && (newChatInstance as any).isMock) {
        initialText = "Hello! RupIQ Chatbot is in mock mode (API key not set). Ask me anything about finance!";
    }
    
    setMessages([
        { 
            id: Date.now().toString(), 
            role: 'model', 
            text: initialText
        }
    ]);
    inputRef.current?.focus();

  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedInput = userInput.trim();
    if (!trimmedInput || isLoading || !chatInstance) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: trimmedInput };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    const modelMessageId = (Date.now() + 1).toString(); 
    setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '', isLoading: true }]);

    try {
      const stream = await chatInstance.sendMessageStream({ message: trimmedInput });
      let currentModelText = '';
      for await (const chunk of stream) { 
        currentModelText += chunk.text; 
        setMessages(prev => prev.map(msg => 
            msg.id === modelMessageId ? { ...msg, text: currentModelText, isLoading: true } : msg
        ));
      }
      setMessages(prev => prev.map(msg => 
        msg.id === modelMessageId ? { ...msg, text: currentModelText, isLoading: false } : msg
      ));

    } catch (err: any) {
      console.error("Chatbot error:", err);
      const errorMessage = err.message || "Sorry, something went wrong while fetching the response.";
      setError(errorMessage);
       setMessages(prev => {
            const filtered = prev.filter(msg => msg.id !== modelMessageId);
            return [...filtered, {id: Date.now().toString(), role: 'model', text: `Error: ${errorMessage}` }];
       });
    } finally {
      setIsLoading(false);
       setMessages(prev => prev.map(msg => 
        msg.id === modelMessageId ? { ...msg, isLoading: false } : msg
      ));
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col h-[70vh] bg-base-200 text-content">
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] p-3 rounded-lg shadow ${
                msg.role === 'user'
                  ? 'bg-primary text-white rounded-br-none'
                  : 'bg-base-300 text-content rounded-bl-none flex items-start'
              }`}
            >
              {msg.role === 'model' && !(chatInstance as any)?.isMock && ( // Show icon only for real AI responses
                <SparklesIcon className="w-5 h-5 mr-2 text-secondary flex-shrink-0 mt-0.5" />
              )}
               {msg.role === 'model' && (chatInstance as any)?.isMock && ( // Optional: different icon or indicator for mock
                <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-amber-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="whitespace-pre-wrap break-words">
                {msg.text}
                {msg.isLoading && msg.role === 'model' && <span className="animate-pulse">...</span>}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {error && (
        <div className="p-2 text-center text-sm bg-red-100 text-red-700 border-t border-red-300">
            {error} Please try again.
        </div>
      )}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-base-300 flex items-center space-x-2">
        <Input
          ref={inputRef}
          containerClassName="flex-grow !mb-0"
          className="!rounded-full"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask RupIQ about finance..."
          aria-label="Chat message input"
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !userInput.trim()} className="rounded-full !px-5">
          Send
        </Button>
      </form>
    </div>
  );
};

export default RupIqChatbot;