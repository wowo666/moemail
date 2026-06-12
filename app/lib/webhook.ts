import { WEBHOOK_CONFIG } from "@/config"

export interface EmailMessage {
  emailId: string
  messageId: string
  fromAddress: string
  subject: string
  content: string
  html: string
  receivedAt: string
  toAddress: string
}

export interface WebhookPayload {
  event: typeof WEBHOOK_CONFIG.EVENTS[keyof typeof WEBHOOK_CONFIG.EVENTS]
  data: EmailMessage
}

export async function callWebhook(url: string, payload: WebhookPayload) {
  let lastError: Error | null = null
  
  let bodyContent = JSON.stringify(payload.data)

  // 自动适配飞书机器人 Webhook 格式为富文本卡片
  if (url.includes("open.feishu.cn/open-apis/bot/v2/hook/")) {
    const email = payload.data
    bodyContent = JSON.stringify({
      msg_type: "interactive",
      card: {
        header: {
          title: {
            tag: "plain_text",
            content: "📧 MoeMail 收到新邮件"
          },
          template: "purple"
        },
        elements: [
          {
            tag: "div",
            text: {
              tag: "lark_md",
              content: `**发件人:** ${email.fromAddress}\n**收件人:** ${email.toAddress}\n**主题:** ${email.subject}`
            }
          },
          {
            tag: "hr"
          },
          {
            tag: "div",
            text: {
              tag: "plain_text",
              content: email.content.length > 600 ? `${email.content.slice(0, 600)}...` : email.content
            }
          }
        ]
      }
    })
  }
  // 自动适配钉钉机器人 Webhook 格式为 Markdown 消息
  else if (url.includes("oapi.dingtalk.com/robot/send")) {
    const email = payload.data
    bodyContent = JSON.stringify({
      msgtype: "markdown",
      markdown: {
        title: "MoeMail 收到新邮件",
        text: `### 📧 MoeMail 收到新邮件\n- **发件人:** ${email.fromAddress}\n- **收件人:** ${email.toAddress}\n- **主题:** ${email.subject}\n\n---\n\n${email.content.length > 600 ? `${email.content.slice(0, 600)}...` : email.content}`
      }
    })
  }

  for (let i = 0; i < WEBHOOK_CONFIG.MAX_RETRIES; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.TIMEOUT)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": payload.event,
        },
        body: bodyContent,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return true
      }

      lastError = new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
      lastError = error as Error
      
      if (i < WEBHOOK_CONFIG.MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, WEBHOOK_CONFIG.RETRY_DELAY))
      }
    }
  }

  throw lastError
} 