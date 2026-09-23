# PeerDrop — Peer-to-Peer File Transfer Web App

A modern, clean, Send Anywhere-style peer-to-peer file transfer web application built with **React**, **Vite**, **Node.js + Express**, **Socket.IO**, and **WebRTC DataChannel**. Files are transferred directly between sender and receiver without ever storing bytes on an intermediary server.

---

## 🚀 Key Features

1. **Direct Peer-to-Peer Transfer**: Files stream directly through encrypted `RTCDataChannel` connections. 0% server storage.
2. **6-Digit Transfer Key**: Sender selects a file and receives a 6-digit room code with direct link & QR Code generation.
3. **Chunking & Flow Control (Backpressure)**: Files are sliced into 64 KB binary `ArrayBuffer` chunks. WebRTC `bufferedAmountLowThreshold` ensures smooth streaming without overwhelming memory or network buffers.
4. **Real-Time Transfer Metrics**: Live transfer percentage, speed (MB/s / KB/s), estimated time remaining (ETA), and chunks counter.
5. **Universal File Support**: Supports photos, 4K videos, audio, PDF documents, archives (ZIP, TAR, 7z), code repositories, and large binary blobs.
6. **In-Browser File Previews**: Immediate visual preview for images, audio players, video players, and code/text snippets upon download.
7. **STUN/TURN Connectivity**: Out-of-the-box Google STUN integration plus a dedicated settings interface for testing and configuring custom TURN servers (e.g. Coturn, Twilio, Metered).
8. **Transfer History**: In-memory and local session logs of sent and received files.

---

## 📁 Project Structure

```text
peerdrop/
├── server.ts                 # Express + Socket.IO signaling server & Vite middleware
├── src/
│   ├── components/
│   │   ├── FileIcon.tsx          # Contextual file icons by MIME type & extension
│   │   ├── HistoryModal.tsx      # Past transfers drawer with download re-triggers
│   │   ├── Navbar.tsx            # Header, signaling status, mode switcher & modal links
│   │   ├── ReceiverView.tsx      # 6-digit key input, connect, download, & media preview
│   │   ├── SenderView.tsx        # Drag & drop, 6-digit key display, QR code, & progress
│   │   ├── SettingsModal.tsx     # Custom STUN/TURN manager with live ICE diagnostic tester
│   │   ├── TransferProgress.tsx  # Dynamic progress bar, speed, ETA, and chunk counters
│   │   └── WebRtcGuideModal.tsx  # In-app interactive architecture & testing guide
│   ├── hooks/
│   │   ├── useReceiver.ts        # Receiver WebRTC answer & binary buffer reassembly
│   │   ├── useSender.ts          # Sender WebRTC offer & backpressured chunk streamer
│   │   └── useSocket.ts          # Socket.IO connection manager & reconnect resilience
│   ├── utils/
│   │   ├── formatters.ts         # Byte size, speed, duration, and file category helpers
│   │   ├── iceServers.ts         # Default Google STUN list & ICE diagnostic runner
│   │   └── webrtc.ts             # 64 KB chunking, backpressure control, & blob reader
│   ├── App.tsx                   # Main layout container & URL query param detector
│   ├── index.css                 # Tailwind CSS 4 setup
│   ├── main.tsx                  # React 19 root bootstrap
│   └── types.ts                  # Shared TypeScript interfaces & message protocols
├── index.html                # HTML entry point
├── package.json              # Project dependencies and build scripts
├── tsconfig.json             # TypeScript compiler configuration
├── vite.config.ts            # Vite & Tailwind configuration
├── .env.example              # Example environment variables
└── README.md                 # Documentation & architectural guide
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm / yarn / pnpm

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
Runs the TypeScript Express server with Socket.IO and Vite dev middleware on port 3000:
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 3. Production Build
Builds the client bundle into `dist/` and bundles `server.ts` with `esbuild`:
```bash
npm run build
npm start
```

---

## 🔄 How WebRTC Signaling Works

WebRTC allows two browsers to talk directly to each other, but they first need an initial handshake (known as **Signaling**) to exchange network addresses and media capabilities.

```
+----------------+          Socket.IO Signaling          +------------------+
| Sender         | <-----------------------------------> | Receiver         |
| (Creates Offer)|             (Port 3000)               | (Creates Answer) |
+----------------+                                       +------------------+
        |                                                          |
        |============== Direct WebRTC RTCDataChannel ==============|
        |             (100% P2P Encrypted File Stream)             |
```

1. **Room Creation**:
   - Sender picks a file and emits `create-room` with file metadata (name, size, type).
   - Server generates a unique 6-digit code (e.g. `742819`) and joins the sender socket to `room-742819`.
2. **Peer Matching**:
   - Receiver enters `742819` and emits `join-room`.
   - Server notifies the sender with `receiver-joined`.
3. **SDP Offer & Answer**:
   - Sender initializes `new RTCPeerConnection()`, creates an `RTCDataChannel('fileTransfer')`, generates an **SDP Offer** (`pc.createOffer()`), and sends it to the receiver via Socket.IO.
   - Receiver receives the offer, initializes its `RTCPeerConnection()`, applies `setRemoteDescription(offer)`, generates an **SDP Answer** (`pc.createAnswer()`), and sends it back to the sender.
4. **ICE Candidate Exchange**:
   - Both peers gather Interactive Connectivity Establishment (ICE) candidates from STUN servers (their public IPs and ports) and send them through Socket.IO via `ice-candidate` events.
5. **P2P Channel Opened**:
   - As soon as the direct connection is established, the `RTCDataChannel` fires `onopen`. All subsequent file chunks travel directly between the two devices without touching the server.

---

## 📦 How File Chunking & Backpressure Work

### 1. 64 KB Slicing
WebRTC implementations have maximum message size constraints. To guarantee compatibility across Chrome, Firefox, Safari, and mobile browsers:
- We set the chunk size to **64 KB** (`64 * 1024 = 65,536 bytes`).
- Sender reads slices sequentially: `file.slice(offset, offset + CHUNK_SIZE)` using `.arrayBuffer()`.

### 2. Backpressure Flow Control
Sending gigabyte-sized files blindly over a data channel can fill the browser's internal send buffer and crash the tab with Out-Of-Memory errors.
- We monitor `dataChannel.bufferedAmount`.
- We configure `dataChannel.bufferedAmountLowThreshold = 256 * 1024` (256 KB).
- If `bufferedAmount` reaches **1 MB**, the sender pauses reading chunks and awaits the `bufferedamountlow` event before continuing.

### 3. Reassembly & Blob Creation
- Receiver stores incoming `ArrayBuffer` chunks sequentially in a JavaScript array `receivedBuffers`.
- When the `TRANSFER_COMPLETE` control packet is received, receiver constructs:
  ```typescript
  const blob = new Blob(receivedBuffers, { type: metadata.type });
  const downloadUrl = URL.createObjectURL(blob);
  ```
- The receiver can immediately preview (images, audio, video, text) and download the file directly to their filesystem.

---

## 📱 Testing on Two Devices

1. **Sender Device (e.g., Computer)**:
   - Go to `http://<your-local-ip>:3000` or the shared web URL.
   - On the **Send** tab, drag and drop any file.
   - Copy the 6-digit key (or click "Show QR Code").
2. **Receiver Device (e.g., Smartphone or second browser)**:
   - Open the web app on your phone.
   - On the **Receive** tab, enter the 6-digit code or scan the QR code.
   - Tap **Connect & Download**.
3. **Live Streaming**:
   - Watch both screens update in real-time with speed meters, progress bars, and ETA indicators.
   - When finished, tap **Download File** to save to device storage.

---

## 🌐 Configuring STUN & TURN Servers

Under normal conditions (standard home WiFi, cellular LTE/5G), the built-in **Google STUN servers** (`stun:stun.l.google.com:19302`) successfully punch NAT holes for direct peer connection.

If you are on an enterprise/university network with symmetric NAT or strict firewalls:
1. Click the **STUN/TURN Settings** button (gear icon in the top right).
2. Add a TURN relay server (e.g. from Coturn, Twilio, Metered, or Xirsys):
   - **URL**: `turn:turn.example.com:3478`
   - **Username**: `your_username`
   - **Credential**: `your_password`
3. Click **Add Server**.
4. Click **Run Connectivity Test** to test ICE candidate generation and verify your configuration in real time!
