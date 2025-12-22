import { GoogleGenerativeAI } from "@google/generative-ai";

// Gemini AI Service
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export const summarizeSymptomsWithAI = async (
  symptoms: string,
  fileInfo: string,
  audioInfo: string
): Promise<string> => {
  if (!genAI) {
    return Promise.resolve(
      `สรุปโดย AI (จำลอง): ผู้ป่วยแจ้งอาการ: "${symptoms}". ${fileInfo}. ${audioInfo}. ข้อมูลนี้จะถูกส่งให้แพทย์เพื่อการวินิจฉัยต่อไป`
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `
ในฐานะผู้ช่วยแพทย์ AI ของแพลตฟอร์ม Izara Anywhere คุณมีหน้าที่คัดกรองเบื้องต้นโดยการสรุปข้อมูลที่ผู้ป่วยส่งมาให้แพทย์อย่างกระชับ ห้ามให้คำวินิจฉัยหรือคำแนะนำทางการแพทย์เด็ดขาด

ข้อมูลที่ผู้ป่วยให้มา:
- อาการที่อธิบาย: "${symptoms}"
- ไฟล์ที่แนบ: ${fileInfo}
- เสียงที่บันทึก: ${audioInfo}

จงสรุปข้อมูลนี้เป็นย่อหน้าที่สั้น กระชับ และเป็นกลาง สำหรับให้แพทย์ตรวจสอบเบื้องต้น เริ่มต้นด้วย "สรุปการคัดกรองโดย AI:"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    return "สรุปการคัดกรองโดย AI: ผู้ป่วยรายงานอาการ " + symptoms + " ข้อมูลนี้ถูกส่งให้แพทย์เพื่อการตรวจสอบต่อไป";
  }
};

export const suggestSymptoms = async (initialSymptoms: string): Promise<string[]> => {
  if (!genAI) return ["ไข้", "ปวดหัว", "คลื่นไส้", "อ่อนเพลีย"];

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const prompt = `
คุณเป็น AI ผู้ช่วยแพทย์ ผู้ป่วยอธิบายอาการว่า: "${initialSymptoms}"
กรุณาแนะนำอาการที่เกี่ยวข้องอื่นๆ ที่ผู้ป่วยอาจพบเห็น 4-6 อาการ โดยตอบเป็น JSON array ของ string เท่านั้น
ตัวอย่าง: ["ไข้", "ปวดหัว", "เจ็บคอ", "น้ำมูกไหล"]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Error suggesting symptoms:", error);
    return ["ไข้", "ปวดหัว", "คลื่นไส้", "อ่อนเพลีย"];
  }
};

export const chatWithAI = async (
  messages: { role: 'user' | 'assistant'; content: string }[],
  context?: string
): Promise<string> => {
  if (!genAI) {
    return "ขออภัย ระบบ AI ไม่พร้อมใช้งานในขณะนี้";
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const contextPrompt = context ? `\n\nบริบทเพิ่มเติม:\n${context}` : '';
    const conversationHistory = messages.map(msg => 
      `${msg.role === 'user' ? 'ผู้ใช้' : 'AI'}: ${msg.content}`
    ).join('\n');

    const prompt = `
คุณเป็นผู้ช่วยแพทย์ AI ของ Izara Anywhere ที่ให้คำปรึกษาเบื้องต้นด้านสุขภาพ
กฎสำคัญ: ห้ามให้การวินิจฉัยโรคขั้นสุดท้าย, แนะนำให้พบแพทย์เมื่อจำเป็น${contextPrompt}

ประวัติการสนทนา:
${conversationHistory}

กรุณาตอบคำถามล่าสุดของผู้ใช้:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error in AI chat:", error);
    return "ขอโทษค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ AI";
  }
};

// Enhanced Google Meet Service with better error handling and retry logic
export class GoogleMeetService {
  private gapiLoaded = false;
  private gisLoaded = false;
  private tokenClient: any = null;
  private accessToken: string | null = null;
  private initializationAttempts = 0;
  private readonly MAX_INIT_ATTEMPTS = 3;

  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  private readonly API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
  private readonly DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  private readonly SCOPES = 'https://www.googleapis.com/auth/calendar.events';

  constructor() {
    this.initializeGoogleAPIs();
  }

  private initializeGoogleAPIs() {
    // Check if credentials are configured
    if (!this.CLIENT_ID || !this.API_KEY || 
        this.CLIENT_ID.includes('your-client-id') || 
        this.API_KEY.includes('your-api-key')) {
      console.warn('⚠️ Google Calendar API credentials not configured.');
      console.info('ℹ️ To enable Google Meet integration:');
      console.info('1. Set VITE_GOOGLE_CLIENT_ID in your .env file');
      console.info('2. Set VITE_GOOGLE_API_KEY in your .env file');
      console.info('3. Enable Google Calendar API in Google Cloud Console');
      return;
    }

    // Load GAPI
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => this.gapiLoad();
    gapiScript.onerror = () => this.handleInitError('GAPI');
    document.head.appendChild(gapiScript);

    // Load GIS
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => this.gisLoad();
    gisScript.onerror = () => this.handleInitError('GIS');
    document.head.appendChild(gisScript);
  }

  private handleInitError(service: string) {
    console.error(`Failed to load ${service}`);
    this.initializationAttempts++;
    
    if (this.initializationAttempts < this.MAX_INIT_ATTEMPTS) {
      console.log(`Retrying ${service} initialization (${this.initializationAttempts}/${this.MAX_INIT_ATTEMPTS})...`);
      setTimeout(() => this.initializeGoogleAPIs(), 2000);
    }
  }

  private gapiLoad() {
    (window as any).gapi.load('client', async () => {
      try {
        await (window as any).gapi.client.init({
          apiKey: this.API_KEY,
          discoveryDocs: [this.DISCOVERY_DOC],
        });
        this.gapiLoaded = true;
        console.log('✅ Google Calendar API loaded successfully');
      } catch (error) {
        console.error('❌ Error loading Google Calendar API:', error);
      }
    });
  }

  private gisLoad() {
    if (!this.CLIENT_ID || this.CLIENT_ID.includes('your-client-id')) {
      return;
    }

    try {
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: this.CLIENT_ID,
        scope: this.SCOPES,
        callback: '',
      });
      this.gisLoaded = true;
      console.log('✅ Google Identity Services loaded successfully');
    } catch (error) {
      console.error('❌ Error loading Google Identity Services:', error);
    }
  }

  async authorize(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Google OAuth not configured. Please add credentials to .env file.'));
        return;
      }

      this.tokenClient.callback = (response: any) => {
        if (response.error) {
          console.error('OAuth error:', response);
          reject(response);
          return;
        }
        this.accessToken = response.access_token;
        console.log('✅ Google authorization successful');
        resolve();
      };

      // Request token with proper prompt
      if (this.accessToken === null) {
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      } else {
        this.tokenClient.requestAccessToken({ prompt: '' });
      }
    });
  }

  async createMeetingWithAppointment(data: {
    summary: string;
    description: string;
    startTime: Date;
    endTime: Date;
    attendees: string[];
  }): Promise<{ eventId: string; meetLink: string; htmlLink: string }> {
    // Check if APIs are properly configured
    if (!this.isConfigured()) {
      console.warn('⚠️ Google Calendar API not configured. Creating functional mock meeting.');
      return this.createMockMeeting(data);
    }

    // Check if APIs are loaded
    if (!this.gapiLoaded || !this.gisLoaded) {
      console.warn('⚠️ Google APIs not loaded yet. Creating functional mock meeting.');
      return this.createMockMeeting(data);
    }

    try {
      // Ensure authorization
      if (!this.accessToken) {
        try {
          await this.authorize();
        } catch (authError: any) {
          console.warn('⚠️ Authorization cancelled or failed:', authError.message);
          return this.createMockMeeting(data);
        }
      }

      // Validate and sanitize attendees
      const validAttendees = data.attendees
        .filter(email => email && email.trim() && this.isValidEmail(email))
        .map(email => ({ email: email.trim() }));

      // Create calendar event with conferencing
      const event = {
        summary: data.summary,
        description: data.description,
        start: {
          dateTime: data.startTime.toISOString(),
          timeZone: 'Asia/Bangkok',
        },
        end: {
          dateTime: data.endTime.toISOString(),
          timeZone: 'Asia/Bangkok',
        },
        attendees: validAttendees,
        conferenceData: {
          createRequest: {
            requestId: `izara-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
            { method: 'popup', minutes: 15 },
          ],
        },
        guestsCanModify: false,
        guestsCanInviteOthers: false,
        guestsCanSeeOtherGuests: true,
      };

      console.log('📅 Creating Google Calendar event with Meet link...');

      const response = await (window as any).gapi.client.calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        sendNotifications: true,
        resource: event,
      });

      const result = response.result;
      
      // Extract Meet link with multiple fallback methods
      let meetLink = this.extractMeetLink(result);

      // If no valid meet link, delete event and create mock
      if (!meetLink) {
        console.warn('⚠️ No Meet link in response, deleting incomplete event and creating mock');
        
        try {
          await (window as any).gapi.client.calendar.events.delete({
            calendarId: 'primary',
            eventId: result.id,
          });
        } catch (deleteError) {
          console.error('Failed to delete incomplete event:', deleteError);
        }
        
        return this.createMockMeeting(data);
      }

      console.log('✅ Successfully created Google Meet:', {
        eventId: result.id,
        meetLink: meetLink,
        summary: data.summary,
        startTime: data.startTime.toLocaleString('th-TH'),
      });

      return {
        eventId: result.id,
        meetLink: meetLink,
        htmlLink: result.htmlLink || `https://calendar.google.com/calendar/event?eid=${result.id}`,
      };

    } catch (error: any) {
      console.error('❌ Error creating Google Calendar event:', error);
      
      // Handle specific error cases
      if (error.status === 401 || error.status === 403) {
        console.warn('🔐 Authorization error. Token may be expired.');
        this.accessToken = null;
      }
      
      // Always fallback to functional mock meeting
      return this.createMockMeeting(data);
    }
  }

  private extractMeetLink(result: any): string {
    // Method 1: Check conferenceData entryPoints
    if (result.conferenceData?.entryPoints) {
      const videoEntry = result.conferenceData.entryPoints.find(
        (ep: any) => ep.entryPointType === 'video'
      );
      if (videoEntry?.uri) return videoEntry.uri;
    }
    
    // Method 2: Check hangoutLink
    if (result.hangoutLink) return result.hangoutLink;
    
    // Method 3: Check conferenceData directly
    if (result.conferenceData?.conferenceId) {
      return `https://meet.google.com/${result.conferenceData.conferenceId}`;
    }

    return '';
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create a real video meeting using Jitsi Meet
   * Jitsi provides free, secure, anonymous video conferencing
   * No Google account required - works for patients, doctors, and guests
   */
  private createMockMeeting(data: {
    summary: string;
    description: string;
    startTime: Date;
    endTime: Date;
  }): { eventId: string; meetLink: string; htmlLink: string } {
    // Use Jitsi Meet instead of fake Google Meet codes
    const JITSI_DOMAIN = 'meet.jit.si';
    
    const meetId = `izara-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate secure room name for medical consultation
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    const roomName = `Izara-Med-${timestamp}-${randomPart}`;
    
    // Build Jitsi URL with medical consultation configuration
    const config = new URLSearchParams({
      'config.prejoinPageEnabled': 'true',
      'config.startWithAudioMuted': 'false',
      'config.startWithVideoMuted': 'false',
      'config.enableClosePage': 'true',
      'config.disableDeepLinking': 'true',
      'config.subject': encodeURIComponent(data.summary),
      'interfaceConfig.TOOLBAR_BUTTONS': JSON.stringify([
        'microphone', 'camera', 'desktop', 'chat', 'raisehand',
        'participants-pane', 'tileview', 'hangup', 'recording'
      ]),
      'interfaceConfig.SETTINGS_SECTIONS': JSON.stringify(['devices', 'language']),
      'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS': 'false',
      'interfaceConfig.SHOW_CHROME_EXTENSION_BANNER': 'false'
    });
    
    // Create real Jitsi Meet link
    const meetLink = `https://${JITSI_DOMAIN}/${roomName}#${config.toString()}`;
    
    // Store meeting details for reference
    const meetingData = {
      id: meetId,
      roomName: roomName,
      jitsiDomain: JITSI_DOMAIN,
      summary: data.summary,
      description: data.description,
      startTime: data.startTime.toISOString(),
      endTime: data.endTime.toISOString(),
      createdAt: new Date().toISOString(),
      type: 'jitsi',
    };
    
    // Save to localStorage for persistence
    try {
      const existingMeetings = JSON.parse(localStorage.getItem('izara_jitsi_meetings') || '[]');
      existingMeetings.push(meetingData);
      localStorage.setItem('izara_jitsi_meetings', JSON.stringify(existingMeetings));
    } catch (error) {
      console.error('Error saving Jitsi meeting:', error);
    }
    
    console.log('🎥 Created Jitsi Meet for medical consultation:', {
      eventId: meetId,
      roomName: roomName,
      link: meetLink,
      summary: data.summary,
      startTime: data.startTime.toLocaleString('th-TH'),
      note: 'Jitsi Meet - Free, secure, anonymous access (no account required)',
    });

    return {
      eventId: meetId,
      meetLink: meetLink,
      htmlLink: `https://calendar.google.com/calendar/event?eid=${meetId}`,
    };
  }

  isInitialized(): boolean {
    return this.gapiLoaded && this.gisLoaded;
  }

  isConfigured(): boolean {
    return !!(
      this.CLIENT_ID && 
      this.API_KEY && 
      !this.CLIENT_ID.includes('your-client-id') && 
      !this.API_KEY.includes('your-api-key')
    );
  }

  getStatus(): {
    configured: boolean;
    initialized: boolean;
    authorized: boolean;
    canCreateMeetings: boolean;
  } {
    return {
      configured: this.isConfigured(),
      initialized: this.isInitialized(),
      authorized: !!this.accessToken,
      canCreateMeetings: this.isConfigured() && this.isInitialized() && !!this.accessToken,
    };
  }

  revokeAccess(): void {
    if (this.accessToken) {
      (window as any).google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('Access revoked');
        this.accessToken = null;
      });
    }
  }
}

export const googleMeetService = new GoogleMeetService();