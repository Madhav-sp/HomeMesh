# HomeMesh

> Transform your personal devices into a secure distributed home cloud.

HomeMesh is a distributed systems platform that combines the unused storage and computing power of your own devices into a single intelligent cloud. Instead of depending entirely on third-party cloud providers, HomeMesh allows users to build a private cloud using desktops, laptops, NAS devices, Raspberry Pis, and other personal hardware.

The platform provides secure file storage, synchronization, backups, distributed task execution, and real-time device monitoring while keeping users unaware of where data is physically stored.

---

## ✨ Features

- 🔐 Secure Authentication
- 💻 Device Registration & Pairing
- ❤️ Real-time Heartbeats & Health Monitoring
- 📊 Hardware Resource Monitoring
- 📂 File Upload & Download
- 🔄 Folder Synchronization
- 💾 Automatic Backups
- ⚡ Distributed Task Execution
- 📈 Live Dashboard
- 🔒 Permission-Based Operations
- 📡 Secure WebSocket Communication

---

## 🏗️ Architecture

```
                React Dashboard
                       │
                HTTPS / WebSocket
                       │
          ┌────────────────────────┐
          │     Node.js Backend     │
          │  Scheduler & Metadata   │
          └────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
  Python Agent   Python Agent   Python Agent
     Desktop         Laptop      Raspberry Pi
        │              │              │
     Local Files   Local Files   Local Files
```

---

## 🧩 Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- React Query
- Zustand

### Backend
- Node.js
- Express
- Socket.IO
- PostgreSQL
- Prisma
- Redis

### Agent
- Python
- psutil
- watchdog
- requests
- websockets
- PyInstaller

### Infrastructure
- Docker
- Docker Compose
- Nginx
- GitHub Actions

---

## 📁 Project Structure

```text
homemesh/
│
├── apps/
│   ├── dashboard/
│   ├── backend/
│   └── agent/
│
├── packages/
│   ├── shared/
│   ├── types/
│   └── config/
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   └── scripts/
│
├── docs/
│
└── README.md
```

---

## 🚀 MVP Scope

The first version focuses on building a production-quality distributed home cloud with:

- User Authentication
- Device Pairing
- Hardware Monitoring
- Heartbeat System
- Online/Offline Detection
- File Upload & Download
- Folder Backup
- Distributed Task Execution
- Dashboard
- Secure Communication

---

## 🔒 Security

HomeMesh follows a permission-first architecture.

- Backend coordinates tasks only.
- Agents validate every request.
- No unrestricted remote access.
- Sensitive OS operations are blocked.
- Files remain on user-owned devices.

---

## 🎯 Vision

HomeMesh aims to become a lightweight distributed computing platform where personal devices collaborate as one intelligent cloud—providing secure storage, synchronization, backups, and resource sharing while remaining fully under the user's control.

---

## 📄 License

This project is developed for educational and research purposes as a final-year engineering project, with a long-term vision of evolving into a production-ready distributed home cloud platform.
