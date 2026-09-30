import { requireOptionalNativeModule, NativeModulesProxy, EventEmitter } from 'expo-modules-core';

export interface SimCardInfo {
  slotIndex: number;
  subscriptionId: number;
  carrierName: string;
  displayName: string;
  countryIso: string;
}

export interface DirectSmsOptions {
  phoneNumber: string;
  message: string;
  simSlot?: number;
}

export interface ScheduleTaskOptions {
  taskId: string;
  timestamp: number;
  message: string;
  recipientsJson: string;
  intervalDelaySec: number;
  simSlot: number;
  frequency?: string;
  customRule?: string;
}

export interface SmsEngineInterface {
  sendDirectSms(options: DirectSmsOptions): Promise<{ success: boolean; messageId: string }>;
  getAvailableSimSlots(): Promise<SimCardInfo[]>;
  isDualSim(): Promise<boolean>;
  scheduleAlarmTask(options: ScheduleTaskOptions): Promise<boolean>;
  runCampaignNow(options: Omit<ScheduleTaskOptions, 'timestamp'>): Promise<boolean>;
  cancelAlarmTask(taskId: string): Promise<boolean>;
  requestIgnoreBatteryOptimizations(): Promise<boolean>;
  getPendingEvents(): Promise<string>;
  clearPendingEvents(): Promise<boolean>;
}

const nativeSmsEngine = requireOptionalNativeModule<SmsEngineInterface>('SmsEngineModule');
console.log('SmsEngine native module resolved:', !!nativeSmsEngine);

const SmsEngine = (nativeSmsEngine ?? NativeModulesProxy.SmsEngineModule ?? {
  async sendDirectSms() { return { success: true, messageId: `mock_${Date.now()}` }; },
  async getAvailableSimSlots() { return [{ slotIndex: 0, subscriptionId: 1, carrierName: 'SIM 1', displayName: 'SIM 1', countryIso: 'MY' }]; },
  async isDualSim() { return false; },
  async scheduleAlarmTask() { return true; },
  async runCampaignNow() { return true; },
  async cancelAlarmTask() { return true; },
  async requestIgnoreBatteryOptimizations() { return true; },
  async getPendingEvents() { return '[]'; },
  async clearPendingEvents() { return true; },
}) as SmsEngineInterface;

export default SmsEngine;
