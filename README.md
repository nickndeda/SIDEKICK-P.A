# Sidekick P.A. — Personal Assistant

**An offline-first, intelligent personal assistant designed to help students manage their academic, professional and everyday lives.**

Sidekick P.A. is a Windows desktop personal assistant designed to help users organise their schedules, manage tasks, improve productivity, monitor learning progress, track personal finances and maintain healthy routines. Its current assistant combines deterministic rules with optional local-model conversation and carefully gated intelligence features.

Unlike conventional productivity applications that depend heavily on cloud services, Sidekick is being designed around an **offline-first, local-by-default architecture**. It aims to provide a persistent desktop presence, useful reminders and contextual assistance while keeping personal information under the user's control.

---

## 1. Project Overview

Sidekick P.A. is being developed as a desktop application that combines productivity management, personal organisation, learning assistance and proactive reminders in one environment.

The application is intended to operate in the background while remaining accessible through a floating desktop interface, system tray controls and a full dashboard.

Its intelligence will initially be powered by configurable rules and scheduled events. Machine learning and optional local AI capabilities may be introduced as the application matures.

### Core objectives

- Help users organise their daily activities and responsibilities.
- Encourage consistent study habits and better time management.
- Track learning progress and identify topics requiring additional attention.
- Provide useful reminders for breaks, hydration and other personal routines.
- Manage manually entered expenses, bills and subscriptions.
- Reduce dependence on internet connectivity.
- Keep personal information stored locally by default.
- Provide a lightweight, accessible and intuitive desktop experience.

---

## 2. Core Features

### 2.1 Desktop Assistant

- Persistent desktop presence through a floating assistant widget.
- Compact floating orb that can be expanded when needed.
- Expanded conversational interface.
- Contextual suggestions and proactive reminders.
- Voice interaction as a planned capability.
- Desktop notifications and system tray integration.

### 2.2 Productivity Management

- Focus sessions with configurable durations.
- Support for 25-, 50- and 90-minute focus sessions.
- Break reminders and activity tracking.
- Active and idle time estimates.
- Daily productivity summaries.
- Focus mode to minimise interruptions.

### 2.3 Learning Management

- Organise subjects, topics and learning activities.
- Monitor topic mastery and learning progress.
- Identify subjects or concepts that require additional revision.
- Create quizzes and assessments.
- Provide immediate explanations after quiz attempts.
- Support spaced revision and study reminders.

### 2.4 Personal Finance

- Track manually entered expenses.
- Manage recurring bills and subscriptions.
- Monitor monthly spending.
- Set savings targets.
- Display financial summaries in Kenyan Shillings (KES).

**Privacy principle:** The initial application will not connect to bank accounts or collect banking credentials. Financial information will be entered and managed by the user.

### 2.5 Wellness Management

- Hydration reminders.
- Movement reminders.
- Eye-rest reminders.
- Short-break notifications.
- Sleep routine reminders.
- Custom personal routines.

### 2.6 Planner

- Create and manage tasks.
- Set deadlines and priorities.
- Organise appointments and milestones.
- View upcoming activities.
- Connect conversational requests to actual planner actions after user confirmation.

### 2.7 Notifications

- Critical, High, Normal and Low priority levels.
- Notification history.
- Snooze, complete and dismiss actions.
- Configurable quiet hours.
- Focus mode notification controls.
- Critical notifications can be allowed through Focus mode.

### 2.8 Conversational Assistant

- Interact with Sidekick through a dedicated chat interface.
- Receive contextual suggestions.
- Convert confirmed conversational requests into tasks and reminders.
- Access relevant information from other application modules.

### 2.9 Settings and Privacy

- Light, Dark and Follow Windows themes.
- Application startup preferences.
- Notification and reminder preferences.
- Voice permissions.
- Data backup and restoration.
- Local data management and integrity checks.

---

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| Electron | Windows desktop application framework |
| React | User interface |
| TypeScript | Type-safe application development |
| Node.js | Backend application logic |
| Vite | Frontend development and bundling |
| MySQL / MariaDB | Local development database through XAMPP |
| SQLite | Planned primary local database |
| Font Awesome | Application iconography |
| Inter | Primary application typography |
| CSS | Custom styling and design system |

### Development environment

The application is currently being developed on Windows 11 using Visual Studio Code, Node.js, npm and XAMPP.

---

## 4. System Architecture

Sidekick follows a modular architecture designed to keep its interface, business logic, database operations and assistant intelligence separate.

### Main application layers

**Desktop layer**
- Electron application lifecycle.
- Window management.
- System tray.
- Desktop notifications.
- Application startup management.

**Application core**
- Assistant engine.
- Event bus.
- Scheduler.
- Command router.

**Feature modules**
- Productivity.
- Learning.
- Finance.
- Wellness.
- Planner.
- Notifications.

**Data layer**
- Database connections.
- Database migrations.
- Repositories.
- Local persistence.
- Future synchronisation services.

**Renderer layer**
- Dashboard.
- Desktop widget.
- Conversational interface.
- Reusable UI components.
- Application layouts and pages.

### Proposed architecture

```text
Sidekick P.A.
│
├── Electron Main Process
│   ├── Application Lifecycle
│   ├── Window Manager
│   ├── Tray Manager
│   ├── Core Engine
│   │   ├── Assistant Engine
│   │   ├── Event Bus
│   │   ├── Scheduler
│   │   └── Command Router
│   ├── Feature Modules
│   │   ├── Productivity
│   │   ├── Learning
│   │   ├── Finance
│   │   ├── Wellness
│   │   └── Planner
│   ├── Services
│   │   ├── Notifications
│   │   └── Activity Monitoring
│   ├── Database
│   └── IPC Handlers
│
├── Preload
│   └── Secure Application Bridge
│
├── Shared
│   └── Types and IPC Contracts
│
└── React Renderer
    ├── Dashboard
    ├── Desktop Widget
    ├── Chat
    ├── Components
    ├── Layout
    ├── Pages
    ├── Hooks
    └── Styles
```

---

## 5. Database Strategy

Sidekick is designed around an offline-first data architecture.

### Local development

XAMPP provides the MySQL/MariaDB server used for database development and integration testing.

The development database is:

```text
Database: sidekick_dev
Character Set: utf8mb4
Collation: utf8mb4_unicode_ci
```

The Node.js application uses the `mysql2` package to communicate with MySQL.

### Production data storage

SQLite is intended to become the primary local database for the desktop application.

This allows users to access their tasks, learning records, reminders and other personal information without an internet connection.

### Future cloud integration

An optional hosted service may eventually support synchronisation across multiple devices.

The cloud service will not be a requirement for normal application operation.

---

## 6. Project Structure

The approved project structure is organised as follows:

```text
SIDEKICK-P.A/
│
├── src/
│   ├── main/
│   │   ├── main.ts
│   │   ├── window-manager.ts
│   │   ├── tray-manager.ts
│   │   ├── startup-manager.ts
│   │   │
│   │   ├── core/
│   │   │   ├── event-bus.ts
│   │   │   ├── scheduler.ts
│   │   │   ├── command-router.ts
│   │   │   └── assistant-engine.ts
│   │   │
│   │   ├── modules/
│   │   │   ├── planner/
│   │   │   ├── productivity/
│   │   │   ├── wellness/
│   │   │   ├── finance/
│   │   │   └── learning/
│   │   │
│   │   ├── services/
│   │   │   ├── notification-service.ts
│   │   │   └── activity-monitor.ts
│   │   │
│   │   ├── database/
│   │   │   ├── connection.ts
│   │   │   ├── migrations/
│   │   │   └── repositories/
│   │   │
│   │   └── ipc/
│   │       └── handlers.ts
│   │
│   ├── preload/
│   │   └── index.ts
│   │
│   ├── shared/
│   │
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── app.tsx
│           ├── components/
│           ├── layout/
│           ├── pages/
│           ├── widget/
│           ├── hooks/
│           └── styles/
│
├── ai/
├── tests/
├── docs/
├── assets/
│   └── icons/
│
├── package.json
├── tsconfig.json
├── vite.config.mts
└── README.md
```

Some directories are reserved for upcoming implementation stages.

---

## 7. Installation and Setup

### Prerequisites

- Windows 10 or Windows 11.
- Node.js and npm.
- Visual Studio Code or another suitable code editor.
- XAMPP for local MySQL/MariaDB development.
- Git (recommended).

### Clone the repository

```bash
git clone https://github.com/nickndeda/SIDEKICK-P.A.git
```

Navigate into the project:

```bash
cd SIDEKICK-P.A
```

Install dependencies:

```bash
npm install
```

### Configure XAMPP

1. Open XAMPP Control Panel.
2. Start MySQL.
3. Start Apache if you intend to access phpMyAdmin through your browser.
4. Open `http://localhost/phpmyadmin`.
5. Create the development database:

```sql
CREATE DATABASE sidekick_dev
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

### Start the development environment

```bash
npm run dev
```

This starts the TypeScript watcher, Vite development server and Electron application.

### Create a production build

```bash
npm run build
```

### Run the built application

```bash
npm start
```

---

## 8. Privacy and Security Principles

Privacy is a fundamental part of Sidekick's design.

The application aims to follow these principles:

- Personal data is stored locally by default.
- Internet access is not required for core functionality.
- No keylogging or covert monitoring.
- No continuous microphone recording.
- No automatic collection of private messages or passwords.
- No unrelated file scanning.
- No automatic bank account access.
- Secure communication between Electron processes.
- Context isolation enabled and Node integration disabled in renderer windows.
- Database credentials must not be exposed to the renderer process.
- Optional cloud synchronisation must be explicit and securely implemented.

---

## 9. Intelligence and Future AI Capabilities

Sidekick keeps a rule-based system for scheduled events, reminders and predictable contextual decisions. The Assistant page also supports optional loopback-only local-model chat, explicit user-managed memories, opt-in background reasoning, approved Planner task drafts, feedback, and an optional personal task-delay model with strict data-quality gates.

Further intelligence work includes:

- More local machine learning for personalised activity insights once enough real user data is available.
- Adaptive reminder scheduling.
- Learning recommendations based on performance history.
- Context-aware task prioritisation.
- Local language models for conversational assistance.
- Voice recognition and speech synthesis.

These capabilities will be introduced incrementally, with consideration for the available hardware and offline requirements.

---

## 10. Development Roadmap

| Phase | Development focus |
|---|---|
| Phase 1 | Project foundation, Electron configuration and UI design |
| Phase 2 | Database architecture and data persistence |
| Phase 3 | Planner and task management |
| Phase 4 | Notifications and scheduling engine |
| Phase 5 | Productivity and focus tracking |
| Phase 6 | Learning management |
| Phase 7 | Finance and wellness modules |
| Phase 8 | Assistant engine and conversational workflows |
| Phase 9 | Desktop widget, system tray and Windows integration |
| Phase 10 | Testing, optimisation and deployment |
| Phase 11 | Optional AI, voice and cloud synchronisation |

---

## 11. Current Development Status

**Project stage:** Active development — feature modules and local assistant intelligence foundation.

Currently established:

- Electron desktop application foundation.
- React and TypeScript renderer.
- Vite development environment.
- Inter typography and Font Awesome icon library.
- Light and Dark theme foundations.
- Dashboard shell and navigation.
- Overview dashboard.
- Focus mode interface state.
- Production build configuration.
- XAMPP development environment.
- `sidekick_dev` MySQL database.
- `mysql2` Node.js database driver.
- MySQL/MariaDB repositories and sequential migrations for current local development.
- Electron tray/background runtime and desktop notifications.
- Cross-module deterministic assistant monitoring and local notifications.
- Persistent assistant chat and explicit memory management.
- Optional structured local-model chat and low-frequency background reasoning.
- User-approved Planner task proposal execution and response feedback.
- Opt-in personal task-delay model with chronological evaluation and versioning.

Not yet implemented:

- SQLite production migration and database backup/restore.
- Installed local model runtime and live inference verification.
- Full data export/retention and per-domain model context controls.
- Broader permissioned action catalog and unattended outcome reporting.
- Voice interaction, external connectors, and floating assistant orb.
- Production installer and deployment.

---

## 12. Project Vision

Sidekick P.A. aims to become more than a conventional task manager or reminder application.

The long-term vision is to build a personal digital assistant that understands a user's routines, supports their learning, helps manage responsibilities and provides timely assistance without requiring constant internet connectivity.

The initial focus is a reliable Windows desktop application, with potential future expansion to mobile devices and environments where internet access is limited.

**Sidekick P.A. — Your day, organised. Your progress, supported.**

---

## 13. License

The project is currently under active development. Licensing and distribution terms will be established before public release.

---

*Built with Electron, React, TypeScript and Node.js.*
