import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Template
from ..core.config import settings


ALERT_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #fef2f2; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .header { background: #7c2d12; color: white; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .body { padding: 24px; }
  .alert-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; color: white; margin: 8px 0; }
  .critical { background: #dc2626; }
  .high { background: #ea580c; }
  .medium { background: #f59e0b; }
  .low { background: #22c55e; }
  .details { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; }
  .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>FireWatch Alert</h1>
  </div>
  <div class="body">
    <h2>{{ detection_type }} Detected</h2>
    <span class="alert-badge {{ severity }}">{{ severity | upper }} SEVERITY</span>
    <div class="details">
      <p><strong>Confidence:</strong> {{ confidence }}%</p>
      <p><strong>Camera:</strong> {{ camera_name or "Manual Upload" }}</p>
      <p><strong>Time:</strong> {{ timestamp }}</p>
      <p><strong>Recommendation:</strong> {{ recommendation }}</p>
    </div>
    <p>Please review and acknowledge this alert in the FireWatch dashboard.</p>
  </div>
  <div class="footer">
    <p>FireWatch by Humanoid Maker | www.humanoidmaker.com</p>
  </div>
</div>
</body>
</html>
"""

WELCOME_TEMPLATE = """
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #fff7ed; }
  .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  .header { background: #7c2d12; color: white; padding: 24px; text-align: center; }
  .body { padding: 24px; }
  .footer { text-align: center; padding: 16px; color: #6b7280; font-size: 12px; }
</style></head>
<body>
<div class="container">
  <div class="header"><h1>Welcome to FireWatch</h1></div>
  <div class="body">
    <h2>Hello {{ name }},</h2>
    <p>Your account has been created successfully. FireWatch uses advanced AI to detect fire and smoke in real-time, helping protect lives and property.</p>
    <p>Get started by uploading an image or connecting your camera feeds.</p>
  </div>
  <div class="footer"><p>FireWatch by Humanoid Maker | www.humanoidmaker.com</p></div>
</div>
</body>
</html>
"""


async def send_email(to: str, subject: str, html_body: str):
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        print(f"[Email] SMTP not configured. Would send to {to}: {subject}")
        return False
    try:
        message = MIMEMultipart("alternative")
        message["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM}>"
        message["To"] = to
        message["Subject"] = subject
        message.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=True,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
        )
        print(f"[Email] Sent to {to}: {subject}")
        return True
    except Exception as e:
        print(f"[Email] Failed to send to {to}: {e}")
        return False


async def send_welcome_email(to: str, name: str):
    template = Template(WELCOME_TEMPLATE)
    html = template.render(name=name)
    await send_email(to, "Welcome to FireWatch", html)


async def send_alert_email(
    to: str,
    detection_type: str,
    severity: str,
    confidence: float,
    camera_name: str,
    timestamp: str,
    recommendation: str,
):
    template = Template(ALERT_TEMPLATE)
    html = template.render(
        detection_type=detection_type,
        severity=severity,
        confidence=confidence,
        camera_name=camera_name,
        timestamp=timestamp,
        recommendation=recommendation,
    )
    await send_email(to, f"[{severity.upper()}] {detection_type} Detected - FireWatch Alert", html)
