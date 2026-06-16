const Groq = require('groq-sdk');

class GroqService {
    constructor() {
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });
    }

    /**
     * Gửi request lên Groq/Llama để sinh câu trả lời
     * @param {string} systemPrompt Ngữ cảnh và chỉ thị cho AI
     * @param {string} userMessage Câu hỏi của người dùng
     * @param {number} temperature Độ sáng tạo (mặc định 0.4 để hạn chế bịa đặt)
     * @param {number} maxTokens Số lượng token tối đa (mặc định 300)
     * @returns {Promise<string|null>} Câu trả lời text từ AI
     */
    async getChatCompletion(systemPrompt, userMessage, temperature = 0.4, maxTokens = 300) {
        try {
            const chatCompletion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user',   content: userMessage }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: temperature,
                max_tokens: maxTokens,
            });

            return chatCompletion.choices[0]?.message?.content || null;
        } catch (error) {
            console.error('[GroqService] Lỗi khi gọi API Groq:', error);
            throw error; // Ném lỗi ra để Controller xử lý catch chung
        }
    }
}

module.exports = new GroqService();
