# Orange Flybox (Huawei) API Documentation

This document contains a comprehensive list of known API endpoints for the Orange Flybox (which is built on Huawei router firmware). Since these APIs are officially undocumented, this list is compiled from community reverse-engineering efforts.

The API relies on XML for requests and responses.

## 🔓 Exposed / Unauthenticated API Endpoints
These endpoints typically do not require authentication and can be queried directly on the local network. They are safe to query for monitoring scripts.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/monitoring/traffic-statistics` | GET | Returns real-time data usage (Upload/Download totals and current speeds in bytes). |
| `/api/monitoring/status` | GET | Provides the current operational status of the router (connection status, battery level, signal bars). |
| `/api/monitoring/month_statistics` | GET | Returns monthly data usage statistics. |
| `/api/device/information` | GET | Gives hardware details (Hardware version, IMEI, IMSI, Mac address, etc.). |
| `/api/device/basic_information` | GET | Gives firmware version and basic device names. |
| `/api/webserver/SesTokInfo` | GET | Retrieves the session token (`__RequestVerificationToken`) and cookie required to authenticate future API requests. |

## 🔒 Hidden Internal / Authenticated API Endpoints
These endpoints require a valid session cookie and a `__RequestVerificationToken` header. You must first hit `/api/webserver/SesTokInfo` to obtain these tokens before making these requests.

### 📶 Network & Signal Info
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/device/signal` | GET | Retrieves detailed, raw signal strength metrics (RSRP, RSSI, SINR, CQI, etc.). Excellent for optimizing router placement. |
| `/api/net/current-plmn` | GET | Gets current carrier/network information (e.g., Orange, cell tower ID). |
| `/api/net/net-mode` | GET/POST | Query or set the network modes/bands (e.g., locking the router to 4G only). |

### 💻 Devices & Wi-Fi
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/wlan/host-list` | GET | Returns a list of the MAC addresses, IP addresses, and hostnames of all devices currently connected to the router. |
| `/api/wlan/basic-settings` | GET/POST | Gets or sets your Wi-Fi basic configuration information (SSID, Password, Security Mode). |

### ✉️ SMS Management
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/sms/sms-count` | GET | Retrieves the count of read, unread, and total SMS messages. |
| `/api/sms/sms-list` | POST | Retrieves the inbox/outbox messages. Requires an XML payload specifying page index and read status. |
| `/api/sms/send-sms` | POST | Sends an SMS message from the router's SIM card. |
| `/api/sms/delete-sms` | POST | Deletes specific SMS messages by index. |

### 📱 USSD (Short Codes)
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/ussd/send` | POST | Triggers a USSD code (e.g., `#100#`). Requires an XML payload with the code. |
| `/api/ussd/get` | GET | Retrieves the response/menu from the previously sent USSD code. |
| `/api/ussd/status` | GET | Checks if the USSD session is currently active or ready. |

## ⚙️ Device Control & Other Endpoints
These are high-level device management endpoints that can reboot or alter the core connectivity of the device.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/device/control` | POST | Used to reboot the router. Requires XML payload: `<request><Control>1</Control></request>` |
| `/api/dialup/mobile-dataswitch` | GET/POST | Enables or disables mobile data on the router (Turns internet on/off without restarting). |
| `/api/dialup/connection` | GET/POST | Connects or disconnects the dial-up connection to the ISP. |
| `/api/user/login` | POST | Legacy login endpoint (often replaced by SesTokInfo token mechanisms on newer firmwares). |
| `/api/user/logout` | POST | Terminates the current authenticated session. |

---

### 💡 Pro-Tip: How to find more endpoints
If you want to discover more hidden endpoints on your specific firmware version:
1. Log into your router's web admin page (`http://192.168.1.1`) in Chrome or Firefox.
2. Press `F12` to open **Developer Tools**, and go to the **Network** tab.
3. Interact with the dashboard (e.g., turning a setting on/off, checking SMS, rebooting).
4. Watch the `XHR` or `Fetch` requests in the Network tab. You will see the exact `/api/...` URL the dashboard is calling, along with the exact XML payload structure it sends!
