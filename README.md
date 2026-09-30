# AutoSMS 📱

> Automated offline-first SMS campaign manager and scheduled dispatcher for Android.

Built with **React Native**, **Expo**, **SQLite**, and a native Kotlin foreground engine leveraging Android's **AlarmManager** and **SmsManager**.

---

## ✨ Features

- ⏱️ **Exact Scheduling**: Reliable background alarm scheduling via Android `AlarmManager` with automatic reboot recovery (`BOOT_COMPLETED`).
- 📶 **Dual SIM & Hardware Detection**: Automatic detection of active cellular subscriptions (`T-Mobile`, `SIM 1`, `SIM 2`) with slot-specific SMS routing.
- 💬 **Dynamic Templating**: Message personalization tokens (`{FirstName}`, `{LastName}`, `{Date}`, `{Time}`).
- 🛡️ **Carrier Protection**: Configurable throttling intervals (5s, 10s, 15s, 30s) and non-blocking safety tips to prevent carrier rate-limiting.
- 🔋 **Doze Exemption**: Built-in configuration to allow Unrestricted Background Battery so Android Doze mode never delays scheduled dispatches.
- 📊 **Local History & Analytics**: Offline SQLite audit log tracking every sent SMS with status, SIM slot, and timestamps.
- 🎨 **Fluid Dark & Light Theme**: Built-in adaptive theming designed for single-hand mobile workflows.

---

## 🛠️ Tech Stack

- **Framework**: React Native 0.74 / Expo SDK 51
- **Language**: TypeScript & Kotlin (Custom native `sms-engine` module)
- **Database**: SQLite via `expo-sqlite` and `drizzle-orm`
- **UI & Typography**: `@expo-google-fonts/sora`, custom atomic components

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Android Studio & Android SDK (API 34+)
- Physical Android phone or configured Android Emulator

### Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/BadriHilmi/AutoSMS.git
   cd AutoSMS
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npx expo start
   ```

4. Run directly on connected Android device/emulator:
   ```bash
   npx expo run:android
   ```

---

## 🔒 Permissions Used

- `SEND_SMS`: Local message dispatch via hardware SIM.
- `READ_PHONE_STATE`: Detection of SIM slot carrier and subscription ID.
- `READ_CONTACTS`: In-app contact selection.
- `SCHEDULE_EXACT_ALARM` & `USE_EXACT_ALARM`: Punctual automated alarms.
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`: Background execution reliability.
- `RECEIVE_BOOT_COMPLETED`: Rescheduling active alarms after device restart.
