import OpenAI from "openai";
import { NextRequest } from "next/server";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const SYSTEM_PROMPT = `你是一位友善的双语（中英文）晚宴菜单生成助手。

餐厅名称已确定：「Lillian's Bistro」，无需再询问。

请通过自然对话，依次收集以下信息：
1. 活动日期和时间
2. 主人姓名
3. 菜单各区块及菜肴（优先提供中英双语）

每次回复后，请在 <menu_state> 标签内附上完整的当前菜单状态：
<menu_state>
{"restaurantName":"Lillian's Bistro","dateTime":"","hosts":"","sections":[]}
</menu_state>

JSON 结构：
{
  "restaurantName": "字符串",
  "dateTime": "字符串",
  "hosts": "字符串",
  "sections": [
    {
      "english": "全大写英文区块名",
      "chinese": "中文名称",
      "items": [
        { "english": "菜名", "chinese": "中文菜名", "isNote": false }
      ]
    }
  ]
}

规则：
- 用简洁友善的中文回复，每次一两句话，然后询问下一项信息
- 英文区块名必须全大写（如 APPETIZERS、SOUP、HOT DISHES）
- 每次回复必须在 <menu_state> 中输出完整状态（非增量）
- isNote 仅用于特别致谢行，如"— 由 Samuel & Lily 提供 —"
- 菜单收集完毕后，告知用户可以下载 PNG`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const stream = await client.chat.completions.create({
    model: "deepseek-v4-flash",
    max_tokens: 2048,
    stream: true,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
    cancel() {
      stream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
