import { action, KeyDownEvent, KeyUpEvent, SingletonAction, WillAppearEvent, SendToPluginEvent, DidReceiveSettingsEvent, streamDeck } from "@elgato/streamdeck";

/**
 * Settings for the TriggerAutomation action
 */
interface AutomationSettings {
  automationId?: string;
  automationName?: string;
  [key: string]: string | undefined;
}

/**
 * Global settings shared across all keys
 */
interface GlobalSettings {
  apiKey?: string;
  [key: string]: string | undefined;
}

/**
 * Automation data from API
 */
interface AutomationData {
  id: string;
  name: string;
  description?: string;
  [key: string]: string | undefined;
}

/**
 * API response structure
 */
interface AutomationsResponse {
  automations?: AutomationData[];
}

/**
 * Property Inspector message payload
 */
interface PIPayload {
  action: string;
  data: {
    apiKey?: string;
  };
  [key: string]: any;
}

/**
 * An action that triggers Eeko automations via API calls
 */
@action({ UUID: "com.eeko.eeko.trigger-automation" })
export class TriggerAutomation extends SingletonAction<AutomationSettings> {
  private timeoutHandles: Set<NodeJS.Timeout> = new Set();
  
  /**
   * Get API key from global settings
   */
  private async getApiKey(): Promise<string | undefined> {
    try {
      const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
      return globalSettings.apiKey;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Validate API key format
   */
  private validateApiKey(apiKey: string): boolean {
    // Eeko API keys should start with 'eko_' and be of reasonable length
    return typeof apiKey === 'string' &&
           apiKey.length > 10 &&
           apiKey.length < 200 &&
           /^[a-zA-Z0-9_-]+$/.test(apiKey);
  }

  /**
   * Save API key to global settings
   */
  private async saveApiKey(apiKey: string): Promise<void> {
    if (!this.validateApiKey(apiKey)) {
      throw new Error('Invalid API key format');
    }
    const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
    await streamDeck.settings.setGlobalSettings({ ...globalSettings, apiKey });
  }

  /**
   * Update button title when action becomes visible
   */
  override onWillAppear(ev: WillAppearEvent<AutomationSettings>): void | Promise<void> {
    const settings = ev.payload.settings;
    
    if (settings.automationName) {
      return ev.action.setTitle(settings.automationName);
    } else {
      return ev.action.setTitle("Configure\nAutomation");
    }
  }

  /**
   * Handle settings changes from Property Inspector
   */
  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<AutomationSettings>): Promise<void> {
    const settings = ev.payload.settings;
    
    // Update title when automation is selected
    if (settings.automationName) {
      await ev.action.setTitle(settings.automationName);
    } else {
      const apiKey = await this.getApiKey();
      if (apiKey) {
        await ev.action.setTitle("Select\nAutomation");
      } else {
        await ev.action.setTitle("Configure\nAutomation");
      }
    }
    
    // If we have automation but no API key, validate and fetch automations
    const apiKey = await this.getApiKey();
    if (apiKey && !settings.automationId) {
      await this.validateApiKeyAndFetchAutomations(apiKey);
    }
  }

  /**
   * Handle key press - do nothing visually
   */
  override async onKeyDown(ev: KeyDownEvent<AutomationSettings>): Promise<void> {
    // Don't change the image on key down
  }

  /**
   * Handle key release - trigger automation and show success
   */
  override async onKeyUp(ev: KeyUpEvent<AutomationSettings>): Promise<void> {
    const settings = ev.payload.settings;

    try {
      // Get API key from global settings
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        await ev.action.setTitle("Missing\nAPI Key");
        await ev.action.showAlert();
        const timeout = setTimeout(async () => {
          await ev.action.setTitle("Configure\nAutomation");
          this.timeoutHandles.delete(timeout);
        }, 3000);
        this.timeoutHandles.add(timeout);
        return;
      }

      if (!settings.automationId || !settings.automationName) {
        await ev.action.setTitle("No Automation\nSelected");
        await ev.action.showAlert();
        const timeout = setTimeout(async () => {
          await ev.action.setTitle("Select\nAutomation");
          this.timeoutHandles.delete(timeout);
        }, 3000);
        this.timeoutHandles.add(timeout);
        return;
      }

      await ev.action.setTitle("Triggering\n" + settings.automationName);

      const triggerResponse = await fetch('https://api.eeko.app/api/triggers/streamdeck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-eeko-api-key': apiKey
        },
        body: JSON.stringify({
          context: {
            deviceName: 'Stream Deck Device',
            triggeredAt: new Date().toISOString()
          },
          payload: {
            action: ev.action.id,
            automationId: settings.automationId,
          }
        })
      });

      if (triggerResponse.ok) {

        // Show success with pressed image instead of checkmark
        await ev.action.setTitle("Triggered!\n" + settings.automationName);
        await ev.action.setImage("imgs/actions/automation/key-pressed");

        // Reset image and title after delay
        const timeout = setTimeout(async () => {
          await ev.action.setTitle(settings.automationName);
          await ev.action.setImage("imgs/actions/automation/key");
          this.timeoutHandles.delete(timeout);
        }, 2000);
        this.timeoutHandles.add(timeout);

      } else {
        throw new Error('Failed to trigger automation');
      }

    } catch (error) {

      // Show error state with sanitized message
      const errorMessage = error instanceof Error ?
        (error.message.includes('API') ? 'API Error' : 'Failed') :
        'Error';
      await ev.action.setTitle(`Error\n${errorMessage}`);
      await ev.action.showAlert();

      // Reset title after a brief delay
      const timeout = setTimeout(async () => {
        await ev.action.setTitle(settings.automationName || "Configure\nAutomation");
        this.timeoutHandles.delete(timeout);
      }, 3000);
      this.timeoutHandles.add(timeout);
    }
  }

  /**
   * Clean up all pending timeouts
   */
  private cleanupTimeouts(): void {
    this.timeoutHandles.forEach(timeout => clearTimeout(timeout));
    this.timeoutHandles.clear();
  }

  /**
   * Cleanup on action removal
   */
  override onWillDisappear(): void {
    this.cleanupTimeouts();
  }

  /**
   * Handle messages from property inspector
   */
  override async onSendToPlugin(ev: SendToPluginEvent<any, AutomationSettings>): Promise<void> {
    const payload = ev.payload as PIPayload;
    const { action, data } = payload;
    
    switch (action) {
      case 'saveApiKey':
        if (data.apiKey) {
          await this.saveApiKey(data.apiKey);
          await this.handleTestApiKey(ev, data.apiKey);
        }
        break;
      case 'testApiKey':
        if (data.apiKey) {
          await this.handleTestApiKey(ev, data.apiKey);
        }
        break;
      case 'fetchAutomations':
        if (data.apiKey) {
          await this.handleFetchAutomations(ev, data.apiKey);
        }
        break;
      case 'getApiKey':
        await this.handleGetApiKey(ev);
        break;
      default:
        // Unknown action
    }
  }

  /**
   * Send current API key to Property Inspector
   */
  private async handleGetApiKey(ev: SendToPluginEvent<any, AutomationSettings>): Promise<void> {
    const apiKey = await this.getApiKey();
    await streamDeck.ui.current?.sendToPropertyInspector({
      event: 'apiKeyLoaded',
      payload: { apiKey: apiKey || '' }
    } as any);
  }

  /**
   * Validate API key by testing API access
   */
  private async handleTestApiKey(ev: SendToPluginEvent<any, AutomationSettings>, apiKey: string): Promise<void> {
    
    try {
      
      // Test the API key by calling the API key authenticated endpoint
      const response = await fetch('https://api.eeko.app/api/triggers/automations', {
        method: 'GET',
        headers: {
          'x-eeko-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        
        // API key is valid, send success response
        await streamDeck.ui.current?.sendToPropertyInspector({
          event: 'apiKeyTested',
          payload: { valid: true }
        } as any);
        
        // Also fetch automations immediately
        await this.handleFetchAutomations(ev, apiKey);
      } else {
        // API key is invalid
        let errorMessage = 'Invalid API key';
        if (response.status === 401) {
          errorMessage = 'Invalid or expired API key';
        } else if (response.status === 403) {
          errorMessage = 'API key does not have required permissions';
        } else {
          errorMessage = `API error: ${response.status}`;
        }
        
        
        await streamDeck.ui.current?.sendToPropertyInspector({
          event: 'apiKeyTested',
          payload: { valid: false, error: errorMessage }
        } as any);
      }
    } catch (error) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: 'apiKeyTested',
        payload: { valid: false, error: 'Connection error - check your internet connection' }
      } as any);
    }
  }

  /**
   * Fetch automations for the given API key
   */
  private async handleFetchAutomations(ev: SendToPluginEvent<any, AutomationSettings>, apiKey: string): Promise<void> {
    
    try {
      
      const response = await fetch('https://api.eeko.app/api/triggers/automations', {
        method: 'GET',
        headers: {
          'x-eeko-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });


      if (response.ok) {
        const responseData = await response.json() as AutomationsResponse;
        const streamDeckAutomations = responseData.automations || [];

        await streamDeck.ui.current?.sendToPropertyInspector({
          event: 'automationsLoaded',
          payload: { automations: streamDeckAutomations as any }
        } as any);
      } else {
        throw new Error(`Failed to fetch automations: ${response.status}`);
      }
    } catch (error) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: 'automationsError',
        payload: { error: (error as Error).message || 'Failed to load automations' }
      } as any);
    }
  }

  /**
   * Validate API key and fetch available automations
   */
  private async validateApiKeyAndFetchAutomations(apiKey: string): Promise<void> {
    
    try {
      const response = await fetch('https://api.eeko.app/api/triggers/automations', {
        method: 'GET',
        headers: {
          'x-eeko-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      });


      if (response.ok) {
        const responseData = await response.json() as AutomationsResponse;
        const automations = responseData.automations || [];
        
        // Send automations to Property Inspector via settings
        await streamDeck.ui.current?.sendToPropertyInspector({
          event: 'automationsLoaded',
          payload: { automations: automations as any }
        } as any);
      } else {
        await streamDeck.ui.current?.sendToPropertyInspector({
          event: 'apiKeyError',
          payload: { error: `API key validation failed: ${response.status}` }
        } as any);
      }
    } catch (error) {
      await streamDeck.ui.current?.sendToPropertyInspector({
        event: 'apiKeyError',
        payload: { error: 'Connection error - check your internet connection' }
      } as any);
    }
  }

}