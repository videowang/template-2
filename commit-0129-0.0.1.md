以下为Cursor Composer针对生成的perplexity-like app所做的改进，作为v.0.1版本，已于月29日提交/commit-0129-0.0.1.md：

好的，让我们逐一改进这些功能：

1. 首先改进 API 路由，优化系统提示词和参数：

```typescript:src/app/api/deepseek/chat/route.ts
import { OpenAIStream, StreamingTextResponse } from "ai";

export const runtime = "edge";

const systemPrompt = `你是一个专业的 AI 助手，请严格按照以下格式和规则回答：

# 思考过程
- 首先，我会仔细分析你的问题
- 然后，我会列出解答这个问题需要的关键点
- 最后，我会给出完整的答案

# 回答格式
1. 主要回答
   - 用清晰的步骤解释
   - 使用要点和列表
   - 重要内容用**加粗**标注
   - 专业术语用\`代码格式\`标注

2. 相关知识
   - 补充必要的背景信息
   - 解释相关的概念
   - 提供进一步学习的方向

3. 参考来源
   - 引用可靠的信息来源
   - 标注参考资料的发布时间
   - 尽可能提供官方文档链接

# 注意事项
- 如果不确定的内容，明确说明"这是我的推测"或"我不确定"
- 使用 Markdown 格式美化回答
- 保持专业、客观的语气
- 回答要既有广度又有深度
- 使用中文回答，但保留必要的英文专业术语`;

interface ErrorResponse {
  error: string;
  message?: string;
  type?: string;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // 验证输入
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("无效的消息格式");
    }

    // 验证最后一条消息不为空
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage.content || lastMessage.content.trim() === "") {
      throw new Error("消息内容不能为空");
    }

    const response = await fetch(
      "https://api.deepseek.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer sk-1ea9b8e1909246229c68c046471756f8`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            ...messages,
          ],
          stream: true,
          temperature: 0.8,        // 略微提高创造性
          max_tokens: 3000,        // 增加长度上限
          presence_penalty: 0.6,    // 减少重复内容
          frequency_penalty: 0.7,   // 增加用词多样性
          top_p: 0.9,              // 保持输出的连贯性
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json() as ErrorResponse;
      throw new Error(
        error.message || error.error || "API 请求失败"
      );
    }

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Error:", error);
    
    let statusCode = 500;
    let errorMessage = "服务器内部错误";
    
    if (error instanceof Error) {
      if (error.message.includes("无效的消息格式") || error.message.includes("消息内容不能为空")) {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.message.includes("API 请求失败")) {
        statusCode = 502;
        errorMessage = "AI 服务暂时不可用，请稍后重试";
      }
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error instanceof Error ? error.message : "未知错误",
        timestamp: new Date().toISOString(),
      }),
      {
        status: statusCode,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
```






2. 然后优化前端页面，添加更好的 Markdown 渲染和错误处理：

```typescript jsx:src/app/page.tsx
'use client';

import { useChat } from 'ai/react';
import { Send, Loader2, Bot, User, Copy, Share2, AlertCircle } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/deepseek/chat',
    onError: (error) => {
      setError(error.message);
      setTimeout(() => setError(null), 5000); // 5秒后清除错误
    },
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // 可以添加一个复制成功的提示
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleShare = async (content: string) => {
    try {
      await navigator.share({
        text: content,
        title: 'DeepSeek Chat 分享',
      });
    } catch (err) {
      console.error('分享失败:', err);
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
                  message.role === 'user' ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div
                  className={`prose prose-sm md:prose-base max-w-none p-4 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-50'
                      : 'bg-white shadow-sm'
                  }`}
                >
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold mb-2">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold mb-2">{children}</h2>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-4 mb-2">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-4 mb-2">{children}</ol>
                      ),
                      code: ({ children }) => (
                        <code className="bg-gray-100 rounded px-1">{children}</code>
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
                {message.role === 'assistant' && (
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
```


主要改进包括：

1. API 端改进：
   - 更详细的系统提示词，包含思考过程和格式要求
   - 增加输入验证（空消息检查）
   - 优化模型参数（temperature、max_tokens 等）
   - 更好的错误处理和状态码
   - TypeScript 类型定义

2. 前端改进：
   - 添加错误提示组件
   - 优化 Markdown 渲染样式
   - 实现复制和分享功能
   - 改进加载状态显示
   - 优化响应式设计

现在的功能更加完善：
1. 回答更加结构化，包含思考过程、主要回答、相关知识和参考来源
2. Markdown 渲染更美观，支持标题、列表、代码块等
3. 错误处理更完善，包含友好的错误提示
4. 复制和分享功能可用
5. 空消息提交已被禁用
6. 加载状态更直观

您可以测试以下类型的问题来体验改进：
1. 技术问题（会显示代码块和专业术语）
2. 知识性问题（会提供参考来源）
3. 分析性问题（会显示思考过程）

需要我进一步优化某个具体的功能吗？
