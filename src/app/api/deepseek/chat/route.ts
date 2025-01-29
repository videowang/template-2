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
          temperature: 0.8, // 略微提高创造性
          max_tokens: 3000, // 增加长度上限
          presence_penalty: 0.6, // 减少重复内容
          frequency_penalty: 0.7, // 增加用词多样性
          top_p: 0.9, // 保持输出的连贯性
        }),
      }
    );

    if (!response.ok) {
      const error = (await response.json()) as ErrorResponse;
      throw new Error(error.message || error.error || "API 请求失败");
    }

    const stream = OpenAIStream(response);
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("Error:", error);

    let statusCode = 500;
    let errorMessage = "服务器内部错误";

    if (error instanceof Error) {
      if (
        error.message.includes("无效的消息格式") ||
        error.message.includes("消息内容不能为空")
      ) {
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
