# 🚀 ROCKET-NOVA

### AI-Powered Real-Time Satellite Health Monitoring & Collision Prevention System

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?logo=react)
![Vite](https://img.shields.io/badge/Vite-8.0.7-646CFF?logo=vite)
![Three.js](https://img.shields.io/badge/Three.js-0.183.2-black?logo=three.js)

---

## 🌍 Overview

**ROCKET-NOVA** is an advanced AI-driven platform for real-time satellite health monitoring and orbital collision prevention. It leverages live satellite telemetry, orbital mechanics (via `satellite.js`), and 3D visualization (via `Three.js`) to provide ground operators with an intelligent command center for monitoring satellite constellations, predicting anomalies, and preventing in-orbit collisions before they happen.

---

## ✨ Features

- **🛰️ Real-Time Satellite Tracking** — Track multiple satellites simultaneously using live TLE (Two-Line Element) data and SGP4/SDP4 orbital propagation.
- **🤖 AI Health Monitoring** — Automated anomaly detection and health scoring for satellite subsystems including power, thermal, attitude control, and communications.
- **⚠️ Collision Prevention Alerts** — Predictive conjunction analysis that identifies close-approach events and triggers avoidance maneuver recommendations.
- **🌐 3D Orbital Visualization** — Interactive globe and orbital path rendering powered by Three.js for intuitive situational awareness.
- **📊 Telemetry Dashboards** — Rich real-time charts and graphs (via Recharts) showing satellite vitals over time.
- **📄 PDF Reporting** — Generate and download detailed satellite health and incident reports using jsPDF and html2canvas.
- **🎨 Modern UI** — Smooth animations with Framer Motion, styled with Tailwind CSS, featuring a dark space-themed interface.
- **🔒 Backend API** — Dedicated backend service for data ingestion, processing, and serving satellite data to the frontend.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 |
| Build Tool | Vite |
| 3D Rendering | Three.js |
| Orbital Mechanics | satellite.js |
| Charts & Graphs | Recharts |
| Animations | Framer Motion |
| Styling | Tailwind CSS |
| PDF Generation | jsPDF + html2canvas |
| Icons | Lucide React |
| Date Handling | date-fns |
| Backend | Node.js (custom `/backend`) |

---

## 📁 Project Structure

```
ROCKET-NOVA/
├── backend/              # Backend API server
│   └── ...               # Data ingestion, satellite APIs, processing logic
├── src/                  # Frontend React application
│   ├── components/       # UI components (dashboard, globe, alerts, charts)
│   ├── pages/            # Application pages/views
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Orbital calculation utilities
│   └── main.jsx          # App entry point
├── index.html            # HTML entry point
├── .env                  # Environment variables (API keys, endpoints)
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── postcss.config.js     # PostCSS configuration
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher
- A valid `.env` configuration file (see [Environment Variables](#-environment-variables))

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/ChethanKumar485/ROCKET-NOVA-AI-for-real-time-satellite-health-monitoring-and-collision-prevention.git

# 2. Navigate to the project directory
cd ROCKET-NOVA-AI-for-real-time-satellite-health-monitoring-and-collision-prevention

# 3. Install frontend dependencies
npm install

# 4. Navigate to the backend directory and install its dependencies
cd backend
npm install
cd ..
```

### Running the Application

**Start the backend server:**
```bash
cd backend
npm start
```

**Start the frontend development server (in a new terminal):**
```bash
npm run dev
```

The application will be available at `http://localhost:5173` by default.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:3000

# Satellite data provider API key (e.g., space-track.org or N2YO)
VITE_SATELLITE_API_KEY=your_api_key_here

# Any additional configuration keys
VITE_APP_TITLE=ROCKET-NOVA
```

> ⚠️ **Never commit your `.env` file to version control.** It is already listed in `.gitignore`.

---

## 🛰️ How It Works

1. **Data Ingestion** — The backend fetches live TLE data from satellite tracking APIs and streams telemetry to the frontend.
2. **Orbital Propagation** — `satellite.js` uses the SGP4/SDP4 model to compute real-time satellite positions and velocities from TLE data.
3. **AI Health Analysis** — The system continuously evaluates satellite subsystem metrics and flags anomalies using rule-based and predictive models.
4. **Conjunction Detection** — Orbital paths are compared across tracked objects to identify potential close approaches within configurable distance thresholds.
5. **Visualization** — Three.js renders a live 3D Earth with satellite orbits, and Recharts displays telemetry timelines on the dashboard.
6. **Alerting** — Operators receive ranked collision risk alerts and AI-suggested avoidance maneuvers.

---

## 📸 Screenshots
🚀 UI Overview
![1](https://github.com/user-attachments/assets/b249e5e1-8daa-4a62-a390-6315c47a342e)
📊 Analytics
![5](https://github.com/user-attachments/assets/c115324a-2cf8-49b8-a138-e7ea8d13678a)
![4](https://github.com/user-attachments/assets/88708570-edf5-455c-be1c-75f5ac98db67)
![3](https://github.com/user-attachments/assets/a90574f6-7dcf-47d3-b31e-52cdfc5424d9)
🛰️ Fleet Management
![2](https://github.com/user-attachments/assets/e694e508-cb3f-4e4b-babe-caddca3f1c9d)
📄 Telemetry Report
![7](https://github.com/user-attachments/assets/52f9a16e-a4fd-4ca4-bd32-2a8d133894f5)

---

## 🤝 Contributing

Contributions are welcome! To contribute:
Contributions are welcome! Feel free to fork this repository and submit pull requests.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Copyright © 2026 Chethan Kumar

---

## 👨‍💻 Author

**Chethan Kumar**
- GitHub: [@ChethanKumar485](https://github.com/ChethanKumar485)

---
##⭐ Support
> *If you like this project, give it a ⭐ on GitHub! — ROCKET-NOVA makes sure it stays safe."* 🚀
