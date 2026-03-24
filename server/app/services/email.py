import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from datetime import datetime, timedelta

# 邮箱配置（使用你的 QQ 邮箱）
SMTP_SERVER = "smtp.qq.com"
SMTP_PORT = 465  # SSL 端口
SMTP_USER = "3274647417@qq.com"
SMTP_PASSWORD = "yrurlaojmnobdbaj"  # QQ 邮箱授权码
FROM_EMAIL = "3274647417@qq.com"


def generate_verification_code(length: int = 6) -> str:
    """生成随机验证码"""
    return ''.join(random.choices(string.digits, k=length))


def send_email(to_email: str, subject: str, content: str) -> bool:
    """
    发送邮件
    
    Args:
        to_email: 收件人邮箱
        subject: 邮件主题
        content: 邮件内容（HTML）
    
    Returns:
        bool: 发送成功返回 True
    """
    try:
        # 创建邮件
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = FROM_EMAIL
        msg["To"] = to_email
        
        # 添加 HTML 内容
        html_part = MIMEText(content, "html", "utf-8")
        msg.attach(html_part)
        
        # 连接 SMTP 服务器并发送
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, to_email, msg.as_string())
        
        print(f"✅ 邮件已发送到 {to_email}")
        return True
        
    except smtplib.SMTPAuthenticationError:
        print("❌ SMTP 认证失败，请检查邮箱账号和授权码")
        return False
    except smtplib.SMTPConnectError:
        print("❌ 无法连接到 SMTP 服务器")
        return False
    except Exception as e:
        print(f"❌ 邮件发送失败：{e}")
        return False


def send_verification_code(email: str, code: str) -> bool:
    """
    发送验证码邮件
    
    Args:
        email: 收件人邮箱
        code: 验证码
    
    Returns:
        bool: 发送成功返回 True
    """
    subject = "【PlanFlow AI】邮箱验证码"
    
    content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">PlanFlow AI 邮箱验证</h2>
            
            <p>您好！</p>
            
            <p>您正在注册 PlanFlow AI 账号，请使用以下验证码完成邮箱验证：</p>
            
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">{code}</span>
            </div>
            
            <p>验证码有效期为 <strong>10 分钟</strong>。</p>
            
            <p style="color: #666; font-size: 14px;">
                如果这不是您本人的操作，请忽略此邮件。
            </p>
            
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 20px 0;">
            
            <p style="color: #9CA3AF; font-size: 12px;">
                此邮件由系统自动发送，请勿回复。<br>
                © 2026 PlanFlow AI
            </p>
        </div>
    </body>
    </html>
    """
    
    return send_email(email, subject, content)


# 内存存储验证码（生产环境建议用 Redis）
# 格式：{email: {"code": "123456", "expires": datetime}}
verification_codes: dict[str, dict] = {}


def store_verification_code(email: str, code: str, expires_minutes: int = 10) -> None:
    """存储验证码"""
    verification_codes[email] = {
        "code": code,
        "expires": datetime.now() + timedelta(minutes=expires_minutes)
    }


def verify_code(email: str, code: str) -> bool:
    """
    验证验证码
    
    Args:
        email: 邮箱
        code: 验证码
    
    Returns:
        bool: 验证成功返回 True
    """
    if email not in verification_codes:
        return False
    
    data = verification_codes[email]
    
    # 检查是否过期
    if datetime.now() > data["expires"]:
        del verification_codes[email]
        return False
    
    # 验证验证码
    return data["code"] == code


def clear_verification_code(email: str) -> None:
    """清除验证码"""
    if email in verification_codes:
        del verification_codes[email]
