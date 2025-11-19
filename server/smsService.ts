interface SMSConfig {
  apiUrl: string;
  apiKey: string;
  senderId: string;
}

interface SMSMessage {
  phoneNumber: string;
  message: string;
}

interface SMSResponse {
  success: boolean;
  message: string;
  smsId?: string;
  cost?: number;
}

export class SMSService {
  private config: SMSConfig;

  constructor() {
    this.config = {
      // Using Africa's Talking SMS API (popular in Kenya)
      apiUrl: process.env.SMS_API_URL || 'https://api.africastalking.com/version1/messaging',
      apiKey: process.env.SMS_API_KEY || '',
      senderId: process.env.SMS_SENDER_ID || 'REMS'
    };
  }

  /**
   * Send SMS notification to a phone number
   */
  async sendSMS(phoneNumber: string, message: string): Promise<SMSResponse> {
    try {
      // For demonstration, log the SMS instead of actually sending
      // In production, integrate with Africa's Talking or other SMS provider
      
      console.log(`📱 SMS Notification:
To: ${phoneNumber}
From: ${this.config.senderId}
Message: ${message}
Timestamp: ${new Date().toISOString()}`);

      // Simulate SMS sending delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return {
        success: true,
        message: 'SMS sent successfully',
        smsId: `sms_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        cost: 0.5 // Simulated cost in KES
      };

    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        message: 'Failed to send SMS'
      };
    }
  }

  /**
   * Send payment reminder SMS
   */
  async sendPaymentReminder(
    phoneNumber: string, 
    tenantName: string, 
    amount: number,
    dueDate: Date
  ): Promise<SMSResponse> {
    const formattedAmount = amount.toLocaleString();
    const formattedDate = dueDate.toLocaleDateString('en-KE');
    
    const message = `Hello ${tenantName}, this is a reminder that your rent payment of KES ${formattedAmount} is due on ${formattedDate}. Please pay via M-Pesa or contact your landlord. Thank you.`;
    
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send overdue payment notification
   */
  async sendOverdueNotification(
    phoneNumber: string,
    tenantName: string,
    overdueAmount: number,
    daysPastDue: number
  ): Promise<SMSResponse> {
    const formattedAmount = overdueAmount.toLocaleString();
    
    const message = `Dear ${tenantName}, your rent payment of KES ${formattedAmount} is ${daysPastDue} days overdue. Please settle this amount immediately to avoid late fees. Contact your landlord for assistance.`;
    
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send payment confirmation SMS
   */
  async sendPaymentConfirmation(
    phoneNumber: string,
    tenantName: string,
    amount: number,
    receiptNumber?: string
  ): Promise<SMSResponse> {
    const formattedAmount = amount.toLocaleString();
    const receipt = receiptNumber ? ` Receipt: ${receiptNumber}` : '';
    
    const message = `Dear ${tenantName}, we have received your rent payment of KES ${formattedAmount}.${receipt} Thank you for your prompt payment!`;
    
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send balance inquiry response
   */
  async sendBalanceInquiry(
    phoneNumber: string,
    tenantName: string,
    totalPaid: number,
    totalDue: number,
    balance: number
  ): Promise<SMSResponse> {
    const status = balance > 0 ? 'Outstanding' : balance < 0 ? 'Credit' : 'Cleared';
    const formattedBalance = Math.abs(balance).toLocaleString();
    const formattedPaid = totalPaid.toLocaleString();
    const formattedDue = totalDue.toLocaleString();
    
    let message = `Dear ${tenantName}, your account status: Paid: KES ${formattedPaid}, Due: KES ${formattedDue}. `;
    
    if (balance > 0) {
      message += `Outstanding balance: KES ${formattedBalance}`;
    } else if (balance < 0) {
      message += `Credit balance: KES ${formattedBalance}`;
    } else {
      message += 'Account is up to date.';
    }
    
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send maintenance update SMS
   */
  async sendMaintenanceUpdate(
    phoneNumber: string,
    tenantName: string,
    requestId: string,
    status: string,
    description?: string
  ): Promise<SMSResponse> {
    const statusText = status.replace('_', ' ').toUpperCase();
    const desc = description ? ` - ${description}` : '';
    
    const message = `Dear ${tenantName}, your maintenance request #${requestId} status: ${statusText}${desc}. Contact your property manager for more details.`;
    
    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Format Kenyan phone number for SMS (254XXXXXXXXX)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return `254${cleaned.substring(1)}`;
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      return `254${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Bulk SMS sending for notifications
   */
  async sendBulkSMS(messages: SMSMessage[]): Promise<SMSResponse[]> {
    const results: SMSResponse[] = [];
    
    for (const msg of messages) {
      const result = await this.sendSMS(msg.phoneNumber, msg.message);
      results.push(result);
      
      // Add small delay between bulk messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  /**
   * Schedule automated rent reminders (to be called by cron job)
   */
  async sendAutomaticRentReminders(tenants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    monthlyRent: number;
    nextDueDate: Date;
    daysToDue: number;
  }>): Promise<void> {
    const reminderMessages: SMSMessage[] = [];
    
    for (const tenant of tenants) {
      const tenantName = `${tenant.firstName} ${tenant.lastName}`;
      
      // Send reminder 3 days before due date
      if (tenant.daysToDue === 3) {
        const message = `Hello ${tenantName}, your rent payment of KES ${tenant.monthlyRent.toLocaleString()} is due in 3 days (${tenant.nextDueDate.toLocaleDateString('en-KE')}). Please prepare your payment. Thank you.`;
        
        reminderMessages.push({
          phoneNumber: this.formatPhoneNumber(tenant.phoneNumber),
          message
        });
      }
      
      // Send reminder on due date
      if (tenant.daysToDue === 0) {
        const message = `Dear ${tenantName}, your rent payment of KES ${tenant.monthlyRent.toLocaleString()} is due today. Please pay via M-Pesa or contact your landlord. Thank you.`;
        
        reminderMessages.push({
          phoneNumber: this.formatPhoneNumber(tenant.phoneNumber),
          message
        });
      }
    }
    
    if (reminderMessages.length > 0) {
      await this.sendBulkSMS(reminderMessages);
      console.log(`📱 Sent ${reminderMessages.length} automatic rent reminders`);
    }
  }
}

export const smsService = new SMSService();