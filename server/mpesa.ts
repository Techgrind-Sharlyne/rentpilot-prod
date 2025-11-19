import axios from 'axios';

// M-Pesa Configuration - Using Sandbox for development
const MPESA_CONFIG = {
  CONSUMER_KEY: process.env.MPESA_CONSUMER_KEY || 'your_consumer_key',
  CONSUMER_SECRET: process.env.MPESA_CONSUMER_SECRET || 'your_consumer_secret',
  BUSINESS_SHORT_CODE: process.env.MPESA_BUSINESS_SHORT_CODE || '174379',
  PASSKEY: process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://api.safaricom.co.ke' 
    : 'https://sandbox.safaricom.co.ke',
  CALLBACK_URL: process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/api/mpesa/callback',
};

export interface MPesaPaymentRequest {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
}

export interface MPesaCallbackData {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: Array<{
      Name: string;
      Value: string | number;
    }>;
  };
}

// Paybill callback data structure
export interface MPesaPaybillCallbackData {
  TransactionType: string;
  TransID: string;
  TransTime: string;
  TransAmount: number;
  BusinessShortCode: string;
  BillRefNumber: string;
  InvoiceNumber?: string;
  OrgAccountBalance?: string;
  ThirdPartyTransID?: string;
  MSISDN: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
}

class MPesaService {
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  // Generate access token
  private async generateAccessToken(): Promise<string> {
    try {
      if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${MPESA_CONFIG.CONSUMER_KEY}:${MPESA_CONFIG.CONSUMER_SECRET}`).toString('base64');
      
      const response = await axios.get(
        `${MPESA_CONFIG.BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in * 1000));
      
      return this.accessToken;
    } catch (error) {
      console.error('Error generating M-Pesa access token:', error);
      throw new Error('Failed to generate M-Pesa access token');
    }
  }

  // Generate timestamp for M-Pesa requests
  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  // Generate password for M-Pesa STK Push
  private generatePassword(timestamp: string): string {
    const data = `${MPESA_CONFIG.BUSINESS_SHORT_CODE}${MPESA_CONFIG.PASSKEY}${timestamp}`;
    return Buffer.from(data).toString('base64');
  }

  // Format phone number for M-Pesa (254XXXXXXXXX)
  public formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
      // Convert 0712345678 to 254712345678
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      // Already in correct format
      return cleaned;
    } else if (cleaned.startsWith('7')) {
      // Convert 712345678 to 254712345678
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  }

  // Initiate STK Push (Lipa na M-Pesa Online)
  public async initiateSTKPush(paymentRequest: MPesaPaymentRequest): Promise<any> {
    try {
      const accessToken = await this.generateAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);
      const formattedPhone = this.formatPhoneNumber(paymentRequest.phoneNumber);

      const requestBody = {
        BusinessShortCode: MPESA_CONFIG.BUSINESS_SHORT_CODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(paymentRequest.amount),
        PartyA: formattedPhone,
        PartyB: MPESA_CONFIG.BUSINESS_SHORT_CODE,
        PhoneNumber: formattedPhone,
        CallBackURL: MPESA_CONFIG.CALLBACK_URL,
        AccountReference: paymentRequest.accountReference,
        TransactionDesc: paymentRequest.transactionDesc,
      };

      const response = await axios.post(
        `${MPESA_CONFIG.BASE_URL}/mpesa/stkpush/v1/processrequest`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error initiating M-Pesa STK Push:', error.response?.data || error);
      throw new Error('Failed to initiate M-Pesa payment');
    }
  }

  // Query STK Push status
  public async querySTKPushStatus(checkoutRequestId: string): Promise<any> {
    try {
      const accessToken = await this.generateAccessToken();
      const timestamp = this.generateTimestamp();
      const password = this.generatePassword(timestamp);

      const requestBody = {
        BusinessShortCode: MPESA_CONFIG.BUSINESS_SHORT_CODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await axios.post(
        `${MPESA_CONFIG.BASE_URL}/mpesa/stkpushquery/v1/query`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error querying M-Pesa STK Push status:', error.response?.data || error);
      throw new Error('Failed to query M-Pesa payment status');
    }
  }

  // Process M-Pesa callback data
  public processCallback(callbackData: MPesaCallbackData): {
    success: boolean;
    transactionId?: string;
    receiptNumber?: string;
    amount?: number;
    phoneNumber?: string;
    transactionDate?: string;
  } {
    const { ResultCode, CallbackMetadata } = callbackData;

    if (ResultCode !== 0) {
      return { success: false };
    }

    if (!CallbackMetadata?.Item) {
      return { success: false };
    }

    const metadata: { [key: string]: string | number } = {};
    CallbackMetadata.Item.forEach(item => {
      metadata[item.Name] = item.Value;
    });

    return {
      success: true,
      transactionId: metadata.MpesaReceiptNumber as string,
      receiptNumber: metadata.MpesaReceiptNumber as string,
      amount: metadata.Amount as number,
      phoneNumber: metadata.PhoneNumber as string,
      transactionDate: metadata.TransactionDate as string,
    };
  }

  // Process M-Pesa paybill callback data
  public processPaybillCallback(callbackData: MPesaPaybillCallbackData): {
    success: boolean;
    transactionId: string;
    amount: number;
    phoneNumber: string;
    accountReference: string;
    transactionTime: string;
    customerName?: string;
  } {
    return {
      success: true,
      transactionId: callbackData.TransID,
      amount: callbackData.TransAmount,
      phoneNumber: callbackData.MSISDN,
      accountReference: callbackData.BillRefNumber || callbackData.InvoiceNumber || '',
      transactionTime: callbackData.TransTime,
      customerName: [callbackData.FirstName, callbackData.MiddleName, callbackData.LastName]
        .filter(Boolean)
        .join(' ') || undefined
    };
  }
}

export const mpesaService = new MPesaService();