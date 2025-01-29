"use client";

import { useChat } from "ai/react";
import {
  Send,
  Loader2,
  Bot,
  User,
  Copy,
  Share2,
  AlertCircle,
} from "lucide-react";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/deepseek/chat",
      onError: (error) => {
        setError(error.message);
        setTimeout(() => setError(null), 5000); // 5秒后清除错误
      },
    });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // 可以添加一个复制成功的提示
    } catch (err) {
      console.error("复制失败:", err);
    }
  };

  const handleShare = async (content: string) => {
    try {
      await navigator.share({
        text: content,
        title: "DeepSeek Chat 分享",
      });
    } catch (err) {
      console.error("分享失败:", err);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-2xl font-bold text-gray-800">DeepSeek Chat</h1>
          <p className="text-sm text-gray-600">
            像 Perplexity 一样，获取准确的答案和相关引用
          </p>
        </div>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto">
        <div className="space-y-6 p-4 pb-32">
          {messages.map((message) => (
            <div
              key={message.id}
              className="flex items-start gap-4 message-container"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === "user" ? "bg-blue-500" : "bg-gray-700"
                }`}
              >
                {message.role === "user" ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div
                  className={`prose prose-sm md:prose-base max-w-none p-4 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-50"
                      : "bg-white shadow-sm"
                  }`}
                >
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold mb-2">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold mb-2">
                          {children}
                        </h2>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-4 mb-2">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-4 mb-2">{children}</ol>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gray-100 rounded px-1">
                          {children}
                        </code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-gray-100 rounded p-2 overflow-x-auto">
                          {children}
                        </pre>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                {message.role === "assistant" && (
                  <div className="mt-2 flex gap-2 text-sm text-gray-500">
                    <button
                      onClick={() => handleCopy(message.content)}
                      className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      复制
                    </button>
                    <button
                      onClick={() => handleShare(message.content)}
                      className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                      分享
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI 正在思考中...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Container */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 pt-10 pb-4">
        <div className="max-w-4xl mx-auto px-4">
          <form onSubmit={handleSubmit} className="relative">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="问我任何问题..."
              className="w-full p-4 pr-12 rounded-lg border border-gray-200 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
          <p className="text-xs text-center text-gray-500 mt-2">
            Powered by DeepSeek AI
          </p>
        </div>
      </div>
    </main>
  );
}
