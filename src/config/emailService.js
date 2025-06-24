const nodemailer = require('nodemailer');

// Configuração do transporter de email
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para outras portas
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Função para enviar email de recuperação de senha
const sendPasswordResetEmail = async (email, token, userName) => {
  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      throw new Error('Configurações de email não estão definidas no arquivo .env');
    }

    const transporter = createTransporter();
    
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password/${token}`;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Recuperação de Senha - BetManager',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f8f9fa; padding: 30px; border-radius: 0 0 5px 5px; }
            .btn { display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .btn:hover { background-color: #0056b3; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 BetManager</h1>
              <h2>Recuperação de Senha</h2>
            </div>
            <div class="content">
              <p>Olá, <strong>${userName}</strong>!</p>
              
              <p>Recebemos uma solicitação para redefinir a senha da sua conta no BetManager.</p>
              
              <p>Se você fez esta solicitação, clique no botão abaixo para criar uma nova senha:</p>
              
              <p style="text-align: center;">
                <a href="${resetUrl}" class="btn">Redefinir Senha</a>
              </p>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este link é válido por apenas <strong>1 hora</strong></li>
                  <li>Se você não solicitou esta recuperação, ignore este email</li>
                  <li>Sua senha atual permanecerá inalterada até que você redefina</li>
                </ul>
              </div>
              
              <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
              <p style="word-break: break-all; background-color: #e9ecef; padding: 10px; border-radius: 3px; font-family: monospace;">
                ${resetUrl}
              </p>
              
              <p>Se você não conseguir acessar o link ou tiver problemas, entre em contato conosco.</p>
              
              <p>Atenciosamente,<br><strong>Equipe BetManager</strong></p>
            </div>
            <div class="footer">
              <p>Este é um email automático, não responda a esta mensagem.</p>
              <p>BetManager - Sistema de Gerenciamento de Apostas</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá, ${userName}!
        
        Recebemos uma solicitação para redefinir a senha da sua conta no BetManager.
        
        Se você fez esta solicitação, acesse o link abaixo para criar uma nova senha:
        ${resetUrl}
        
        IMPORTANTE:
        - Este link é válido por apenas 1 hora
        - Se você não solicitou esta recuperação, ignore este email
        - Sua senha atual permanecerá inalterada até que você redefina
        
        Atenciosamente,
        Equipe BetManager
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email de recuperação enviado:', result.messageId);
    return { success: true, messageId: result.messageId };
    
  } catch (error) {
    console.error('Erro ao enviar email de recuperação:', error);
    return { success: false, error: error.message };
  }
};

// Função para testar configuração de email
const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('✅ Configuração de email está funcionando');
    return true;
  } catch (error) {
    console.error('❌ Erro na configuração de email:', error.message);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  testEmailConfiguration
}; 