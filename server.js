// Đoạn code ví dụ dùng OpenAI để tạo cấu hình plugin
async function generateConfigWithAI(userInput) {
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "system", content: "Bạn là chuyên gia Minecraft Server. Hãy viết file config.yml cho plugin EssentialsX dựa trên yêu cầu của người dùng." },
                   { role: "user", content: userInput }]
    });
    return response.choices[0].message.content;
}
