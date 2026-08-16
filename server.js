const express = require('express');
const OpenAI = require('openai');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Khởi tạo OpenAI (Lấy API Key từ biến môi trường của Vercel/Railway)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// API xử lý chính: Nhận yêu cầu, dùng AI viết cấu hình và đóng gói .zip
app.post('/api/generate-ai-smp', async (req, res) => {
    const { serverName, serverDescription, plugins } = req.body;

    const zipName = `SMP_AI_Setup_${Date.now()}.zip`;
    const outputPath = path.join(__dirname, 'downloads', zipName);
    const tempDir = path.join(__dirname, 'temp_' + Date.now());

    if (!fs.existsSync(path.join(__dirname, 'downloads'))) {
        fs.mkdirSync(path.join(__dirname, 'downloads'));
    }
    fs.mkdirSync(tempDir);

    try {
        // 1. Tạo file hướng dẫn cơ bản kèm thông tin server
        let readmeText = `=== HƯỚNG DẪN MÁY CHỦ SMP ===\nTên Server: ${serverName || 'Minecraft SMP'}\nMô tả từ AI: ${serverDescription || 'Không có'}\n\n`;
        readmeText += `Các Plugin đã chọn: ${plugins ? plugins.join(', ') : 'Cơ bản'}\n\n`;
        readmeText += `- Hãy tải các file .jar tương ứng của plugin chính chủ bỏ vào thư mục plugins/.\n`;
        readmeText += `- Các file cấu hình bên dưới đã được AI tối ưu hóa riêng cho bạn.`;
        
        fs.writeFileSync(path.join(tempDir, 'README_HUONG_DAN.txt'), readmeText);

        // 2. Nếu người dùng chọn dùng AI để tạo cấu hình tối ưu cho Essentials hoặc WorldGuard
        if (process.env.OPENAI_API_KEY && plugins && plugins.includes('smp-essentials')) {
            try {
                const aiResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: "Bạn là chuyên gia thiết lập máy chủ Minecraft SMP. Hãy viết nội dung file config.yml tối ưu và ngắn gọn cho plugin EssentialsX dựa trên yêu cầu của người chơi. Chỉ trả về nội dung file YAML, không kèm giải thích." },
                        { role: "user", content: `Yêu cầu cấu hình cho server: ${serverDescription || 'SMP sinh tồn cơ bản'}` }
                    ],
                });
                const configContent = aiResponse.choices[0].message.content;
                
                // Tạo thư mục Essentials và lưu file config do AI tạo ra
                fs.mkdirSync(path.join(tempDir, 'Essentials'), { recursive: true });
                fs.writeFileSync(path.join(tempDir, 'Essentials', 'config.yml'), configContent);
            } catch (aiError) {
                console.error("Lỗi khi gọi OpenAI API:", aiError);
                // Fallback nếu lỗi AI: Dùng config mặc định
                fs.mkdirSync(path.join(tempDir, 'Essentials'), { recursive: true });
                fs.writeFileSync(path.join(tempDir, 'Essentials', 'config.yml'), "# Config mặc định do lỗi kết nối AI\nspawn-protection: 0\n");
            }
        }

        // 3. Đóng gói toàn bộ thành file .zip
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            res.download(outputPath, zipName, (err) => {
                // Dọn dẹp tệp tạm
                fs.rmSync(tempDir, { recursive: true, force: true });
                fs.unlinkSync(outputPath);
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);
        archive.directory(tempDir, false);
        archive.finalize();

    } catch (error) {
        console.error(error);
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        res.status(500).send({ error: 'Lỗi trong quá trình xử lý tạo gói SMP.' });
    }
});

// Chỉ chạy app.listen khi chạy ở máy local, còn trên Vercel thì export module
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server đang chạy tại cổng ${PORT}`);
    });
}

module.exports = app;

