import smtplib
from email.mime.text import MIMEText
import sys
from email.mime.multipart import MIMEMultipart

# args: subject, body
subject = sys.argv[1]
body = sys.argv[2]

sender = "*************"
receiver = "*****************"
password = "*****************************"

msg = MIMEMultipart("alternative")
msg["Subject"] = subject
msg["From"] = sender
msg["To"] = receiver

# Plain text fallback
text_part = body

# HTML formatting
html_part = f"""
<html>
  <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
    <div style="max-width: 650px; margin: auto; background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
      <h2 style="color: #2d89ef;">🚀 Deployment Update</h2>
      <p style="font-size: 15px;">A new deployment has been applied on <strong>{subject}</strong>.</p>
      <h3>📌 Deployment Details:</h3>
      <pre style="background: #f7f7f7; padding: 12px; border-radius: 6px; font-size: 14px; white-space: pre-wrap;">{body}</pre>
      <hr>
      <p style="color: #777; font-size: 13px;">This is an automated message from your EC2 deployment script.</p>
    </div>
  </body>
</html>
"""

msg.attach(MIMEText(text_part, "plain"))
msg.attach(MIMEText(html_part, "html"))

with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
    server.login(sender, password)
    server.sendmail(sender, [receiver], msg.as_string())
