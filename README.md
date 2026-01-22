<div align="center">

# 🍽️ One-Click Restaurant Management System

### **A Modern, Full-Stack Restaurant Management Solution with Real-Time Order Tracking**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)

[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?style=for-the-badge&logo=github-actions&logoColor=white)](.github/workflows)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)]()

**Streamline your restaurant operations with a comprehensive, real-time management system that connects customers, kitchen, cashiers, and administrators seamlessly.**

[Features](#-key-features) • [Screenshots](#-interface-screenshots) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [API Reference](#-api-documentation) • [Deployment](#-deployment)

---

</div>

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
- [📸 Interface Screenshots](#-interface-screenshots)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
  - [Docker Deployment](#option-1-docker-deployment-recommended)
  - [Local Development](#option-2-local-development)
- [⚙️ Configuration](#️-configuration)
- [📚 API Documentation](#-api-documentation)
- [🧪 Testing](#-testing)
- [🔐 Security](#-security)
- [🚢 Deployment](#-deployment)
- [🛠️ Technology Stack](#️-technology-stack)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Key Features

### 🎯 **Multi-Interface System**

<table>
<tr>
<td width="50%">

#### 👥 **Customer Interface**
- 📱 QR Code table scanning
- 🍕 Interactive menu browsing
- 🛒 Real-time cart management
- 📊 Live order status tracking
- 🔔 Table service requests (bell/bill)
- 💳 Multiple payment methods

</td>
<td width="50%">

#### 💰 **Cashier Dashboard**
- 📋 Real-time order management
- 💵 Payment processing (Cash/Card)
- 🧾 Bill generation & printing
- 📊 Shift management (Cash In/Out)
- 📈 Daily sales analytics
- 🔐 Secure authentication

</td>
</tr>
<tr>
<td width="50%">

#### 👨‍🍳 **Kitchen Display**
- ⚡ Instant order notifications
- 🔄 Real-time status updates
- 🔊 Sound alerts for new orders
- 📱 Touch-friendly interface
- ⏱️ Order timing tracking
- ✅ Order completion workflow

</td>
<td width="50%">

#### 👨‍💼 **Admin Panel**
- 🍽️ Complete menu management (CRUD)
- 📂 Category organization
- 🪑 Table configuration
- 👤 Cashier management
- 📊 Comprehensive analytics
- 📝 Activity logging

</td>
</tr>
</table>

### 🔄 **Real-Time Capabilities**

- ⚡ **WebSocket Integration**: Live synchronization across all interfaces
- 🔔 **Instant Notifications**: Real-time order updates and alerts
- 📡 **Socket.IO**: Bidirectional communication for seamless UX
- 🔄 **Auto-Sync**: Automatic data synchronization without page refresh

### 🐳 **DevOps & Infrastructure**

- 🐳 **Docker Support**: Fully containerized with multi-stage builds
- 🔄 **CI/CD Pipeline**: Automated testing and deployment
- 📦 **Production Ready**: Optimized builds and configurations
- 🔒 **Environment Management**: Secure configuration handling

---

## 📸 Interface Screenshots

### **Admin Interface**

<div align="center">

| Admin Dashboard | Admin Settings | Analytics |
|:---:|:---:|:---:|
| <img src="InterfaceImages/admindash.png" alt="Admin Dashboard" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/adminseting.png" alt="Admin Settings" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/analystic.png" alt="Analytics" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> |

| Menu Management | Category Management | Table Management |
|:---:|:---:|:---:|
| <img src="InterfaceImages/manumanagement.png" alt="Menu Management" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/catagorimanagement.png" alt="Category Management" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/tablemanagement.png" alt="Table Management" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> |

| Sales Report | Bill & Invoice | History |
|:---:|:---:|:---:|
| <img src="InterfaceImages/salesreport.png" alt="Sales Report" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/billandinvoice.png" alt="Bill & Invoice" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/histry.png" alt="History" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> |

</div>

### **Cashier Interface**

<div align="center">

| Cashier Dashboard | Cashier Login | Cashier Logout |
|:---:|:---:|:---:|
| <img src="InterfaceImages/cashierDashboad.png" alt="Cashier Dashboard" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/cashierlogin.png" alt="Cashier Login" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/cashierLogout.png" alt="Cashier Logout" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> |

| Cashier Management | Cashier Settings | Order Management |
|:---:|:---:|:---:|
| <img src="InterfaceImages/cashiermanagmt.png" alt="Cashier Management" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/cashiersetting.png" alt="Cashier Settings" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/order.png" alt="Order Management" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> |

</div>

### **Customer & Kitchen Interface**

<div align="center">

| Customer Entrance | Customer Menu | Customer Menu 2 |
|:---:|:---:|:---:|
| <img src="InterfaceImages/customerEntrance.png" alt="Customer Entrance" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/customermanu.png" alt="Customer Menu" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/customermanue2.png" alt="Customer Menu 2" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> |

| Kitchen Display | Table Reserve |
|:---:|:---:|
| <img src="InterfaceImages/kitchenDisplay.png" alt="Kitchen Display" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> | <img src="InterfaceImages/TableReserve.png" alt="Table Reserve" width="450" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/> |

</div>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Restaurant Management System              │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                       │
        ▼                     ▼                       ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │      │    Backend   │      │   Database   │
│   (React)    │◄────►│   (Express)  │◄────►│  (MongoDB)   │
│              │      │              │      │              │
│  Port: 8080  │      │  Port: 3000  │      │   Atlas/Local│
└──────────────┘      └──────────────┘      └──────────────┘
        │                     │
        │                     │
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────┐
        │   Socket.IO      │
        │  (WebSocket)     │
        │  Real-time Sync  │
        └──────────────────┘
```

### **System Flow**

```
Customer → Place Order → Backend API → Database
                              │
                              ▼
                    Socket.IO Broadcast
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                       │
        ▼                     ▼                       ▼
   Kitchen Display      Cashier Dashboard      Customer Screen
   (New Order)          (Order Update)        (Status Change)
```

---

## 🚀 Quick Start

### **Prerequisites**

- ✅ **Node.js** 20+ ([Download](https://nodejs.org/))
- ✅ **Docker** & **Docker Compose** ([Install Guide](https://docs.docker.com/get-docker/))
- ✅ **MongoDB Atlas** account ([Sign Up](https://www.mongodb.com/cloud/atlas)) or Local MongoDB
- ✅ **Git** ([Download](https://git-scm.com/))

---

### **Option 1: Docker Deployment (Recommended)**

<details>
<summary><b>📦 Click to expand Docker setup instructions</b></summary>

#### **Step 1: Clone Repository**

```bash
git clone <your-repository-url>
cd one-click
```

#### **Step 2: Configure Environment**

```bash
# Copy example environment file
cp env.example .env

# Edit .env with your MongoDB credentials
nano .env  # or use your preferred editor
```

#### **Step 3: Start Services**

```bash
# Build and start all containers
docker-compose up -d --build

# View logs
docker-compose logs -f

# Check service status
docker-compose ps
```

#### **Step 4: Access Application**

- 🌐 **Frontend**: http://localhost:8080
- 🔌 **Backend API**: http://localhost:3000
- ❤️ **Health Check**: http://localhost:3000/health

#### **Useful Docker Commands**

```bash
# Stop all services
docker-compose down

# Restart services
docker-compose restart

# View specific service logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Rebuild specific service
docker-compose up -d --build frontend

# Production deployment
docker-compose -f docker-compose.prod.yml up -d --build
```

</details>

---

### **Option 2: Local Development**

<details>
<summary><b>💻 Click to expand local development setup</b></summary>

#### **Step 1: Install Dependencies**

```bash
npm install
```

#### **Step 2: Environment Configuration**

Create a `.env` file in the root directory:

```env
# MongoDB Configuration
MONGODB_USERNAME=your-username
MONGODB_PASSWORD=your-password
MONGODB_CLUSTER=your-cluster.mongodb.net
MONGODB_USE_ATLAS=true
DB_NAME=restaurant
MONGODB_APP_NAME=restaurant-cluster

# Server Configuration
PORT=3000
NODE_ENV=development

# Frontend Configuration
VITE_API_URL=http://localhost:3000/api
VITE_SERVER_URL=http://localhost:3000

# Security
JWT_SECRET=your-secret-key-change-this-in-production
```

#### **Step 3: Start Development Servers**

```bash
# Start both frontend and backend simultaneously
npm run dev:all

# Or start separately:
npm run dev          # Frontend (http://localhost:8080)
npm run dev:server   # Backend (http://localhost:3000)
```

#### **Step 4: Build for Production**

```bash
# Build frontend
npm run build

# Build backend
npm run build:server

# Build both
npm run build:all
```

</details>

---

## ⚙️ Configuration

### **Environment Variables**

<details>
<summary><b>🔧 Click to view all environment variables</b></summary>

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGODB_USERNAME` | MongoDB Atlas username | - | ✅ |
| `MONGODB_PASSWORD` | MongoDB Atlas password | - | ✅ |
| `MONGODB_CLUSTER` | MongoDB cluster URL | - | ✅ |
| `MONGODB_USE_ATLAS` | Use Atlas (true) or Local (false) | `true` | ✅ |
| `DB_NAME` | Database name | `restaurant` | ❌ |
| `PORT` | Backend server port | `3000` | ❌ |
| `NODE_ENV` | Environment mode | `development` | ❌ |
| `VITE_API_URL` | Frontend API base URL | `http://localhost:3000/api` | ❌ |
| `VITE_SERVER_URL` | WebSocket server URL | `http://localhost:3000` | ❌ |
| `JWT_SECRET` | JWT signing secret | - | ✅ (Production) |

</details>

### **MongoDB Setup**

<details>
<summary><b>🗄️ Click for MongoDB configuration guide</b></summary>

#### **Option A: MongoDB Atlas (Cloud)**

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (Free tier available)
3. Create database user with read/write permissions
4. Whitelist your IP address (or `0.0.0.0/0` for development)
5. Get connection string and update `.env`

#### **Option B: Local MongoDB**

1. Install MongoDB locally ([Download](https://www.mongodb.com/try/download/community))
2. Start MongoDB service
3. Set `MONGODB_USE_ATLAS=false` in `.env`
4. Update connection string for local instance

</details>

---

## 📚 API Documentation

### **Base URLs**

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

### **Authentication Endpoints**

<details>
<summary><b>🔐 Click to view authentication endpoints</b></summary>

#### **Admin Login**
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

#### **Cashier Login**
```http
POST /api/admin/cashier/login
Content-Type: application/json

{
  "username": "cashier1",
  "password": "password"
}
```

#### **Change Password**
```http
POST /api/admin/change-password
Content-Type: application/json

{
  "username": "admin",
  "currentPassword": "oldpass",
  "newPassword": "newpass"
}
```

**New setup with no users?** Set `SEED_DEFAULT_ADMIN=true` (and optionally `DEFAULT_ADMIN_USERNAME`, `DEFAULT_ADMIN_PASSWORD`) in `.env` before starting. The app will create a default admin when the `users` collection is empty.

</details>

### **Menu Management**

<details>
<summary><b>🍽️ Click to view menu endpoints</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/menu-items` | List all menu items |
| `POST` | `/api/admin/menu-items` | Create menu item |
| `PUT` | `/api/admin/menu-items/:id` | Update menu item |
| `DELETE` | `/api/admin/menu-items/:id` | Delete menu item |
| `POST` | `/api/admin/menu-items/upload-image` | Upload menu image |
| `GET` | `/api/admin/menu-items/categories` | List categories |
| `POST` | `/api/admin/menu-items/categories` | Create category |

</details>

### **Order Management**

<details>
<summary><b>📦 Click to view order endpoints</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/orders` | List orders (with filters) |
| `POST` | `/api/orders` | Create new order |
| `GET` | `/api/orders/:id` | Get order details |
| `PATCH` | `/api/orders/:id/status` | Update order status |
| `PATCH` | `/api/orders/:id/payment` | Mark order as paid |
| `DELETE` | `/api/orders/:id` | Cancel order |

</details>

### **Cashier Management**

<details>
<summary><b>👤 Click to view cashier endpoints</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/cashiers` | List all cashiers |
| `POST` | `/api/admin/cashiers` | Create cashier |
| `PUT` | `/api/admin/cashiers/:id` | Update cashier |
| `DELETE` | `/api/admin/cashiers/:id` | Delete cashier |
| `PATCH` | `/api/admin/cashiers/:id/status` | Toggle active status |
| `POST` | `/api/admin/cashier/cash-in` | Start shift (Cash In) |
| `POST` | `/api/admin/cashier/cash-out` | End shift (Cash Out) |
| `GET` | `/api/admin/cashier/shifts/:cashierId` | Get shift history |

</details>

### **Table Management**

<details>
<summary><b>🪑 Click to view table endpoints</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/tables` | List all tables |
| `POST` | `/api/admin/tables` | Create table |
| `PUT` | `/api/admin/tables/:id` | Update table |
| `DELETE` | `/api/admin/tables/:id` | Delete table |
| `PATCH` | `/api/admin/tables/:id/availability` | Toggle availability |

</details>

### **Health Check**

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

---

## 🧪 Testing

<details>
<summary><b>🧪 Click to view testing commands</b></summary>

### **Run Tests**

```bash
# Run all server unit tests
npm run test:server

# Run integration tests
npm run test:integration

# Run all tests
npm run test

# Watch mode (development)
npm run test:watch
```

### **Linting**

```bash
# Check code quality
npm run lint

# Auto-fix issues
npm run lint -- --fix
```

### **Test Coverage**

The project includes comprehensive test coverage for:
- ✅ Backend API routes
- ✅ Database connections
- ✅ Integration scenarios
- ✅ Error handling

</details>

---

## 🔐 Security

<details>
<summary><b>🔒 Click to view security features</b></summary>

### **Implemented Security Measures**

- 🔐 **Passwords**: Plain-text storage (no encryption)
- 🛡️ **Authentication**: Secure login for admin and cashiers
- 🔑 **Protected Routes**: Role-based access control
- 🔒 **Environment Variables**: Sensitive data in `.env`
- ✅ **Input Validation**: Backend validation for all inputs
- 🚫 **SQL Injection Protection**: MongoDB parameterized queries
- 🔐 **CORS Configuration**: Controlled cross-origin requests

### **Best Practices**

1. **Never commit `.env` files** to version control
2. **Use strong passwords** for production
3. **Rotate JWT secrets** regularly
4. **Keep dependencies updated**
5. **Enable MongoDB authentication**
6. **Use HTTPS in production**

</details>

---

## 🚢 Deployment

<details>
<summary><b>☁️ Click to view deployment options</b></summary>

### **Production Docker Deployment**

```bash
# Build and start production containers
docker-compose -f docker-compose.prod.yml up -d --build

# Access:
# Frontend: http://your-domain (port 80)
# Backend: http://your-domain:3000
```

### **Cloud Platform Deployment**

#### **Frontend (Vercel/Netlify)**

1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables
5. Deploy!

#### **Backend (Railway/Render)**

1. Connect your GitHub repository
2. Set build command: `npm run build:server`
3. Set start command: `npm run start:prod`
4. Add environment variables
5. Deploy!

#### **Database (MongoDB Atlas)**

1. Create production cluster
2. Configure network access
3. Create production user
4. Update connection string in `.env`

</details>

---

## 🛠️ Technology Stack

<details>
<summary><b>💻 Click to view complete tech stack</b></summary>

### **Frontend**

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.3+ | UI Framework |
| **TypeScript** | Latest | Type Safety |
| **Vite** | Latest | Build Tool |
| **Tailwind CSS** | Latest | Styling |
| **shadcn/ui** | Latest | UI Components |
| **Zustand** | Latest | State Management |
| **React Query** | Latest | Server State |
| **Socket.IO Client** | 4.8+ | Real-time Communication |
| **React Router** | 6.30+ | Routing |
| **Recharts** | Latest | Data Visualization |

### **Backend**

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 20+ | Runtime |
| **Express** | 4.21+ | Web Framework |
| **TypeScript** | Latest | Type Safety |
| **MongoDB** | 7.0+ | Database |
| **Socket.IO** | 4.8+ | WebSocket Server |
| **Multer** | Latest | File Uploads |
| **CORS** | Latest | Cross-Origin |

### **DevOps & Tools**

| Technology | Purpose |
|-----------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **GitHub Actions** | CI/CD Pipeline |
| **Vitest** | Testing Framework |
| **ESLint** | Code Linting |
| **Nginx** | Production reverse proxy |

</details>

---

## 📁 Project Structure

<details>
<summary><b>📂 Click to view project structure</b></summary>

```
one-click/
├── .github/
│   └── workflows/
│       └── ci.yml                 # CI/CD pipeline
├── public/                        # Static assets
│   ├── favicon.ico
│   └── logo.png
├── server/                        # Backend application
│   ├── config/
│   │   └── database.ts           # MongoDB configuration
│   ├── routes/
│   │   ├── admin.ts              # Admin routes
│   │   ├── menuItems.ts          # Menu management
│   │   └── orders.ts             # Order management
│   ├── utils/
│   │   ├── password.ts           # Password utilities (plain-text)
│   │   ├── websocket.ts          # Socket.IO server
│   │   ├── adminLogs.ts          # Admin activity logs
│   │   └── cashierLogs.ts       # Cashier activity logs
│   ├── __tests__/                # Backend tests
│   └── index.ts                  # Server entry point
├── src/                          # Frontend application
│   ├── components/               # React components
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── Analytics.tsx         # Analytics dashboard
│   │   ├── Settings.tsx          # Settings panel
│   │   └── ...
│   ├── pages/                    # Route pages
│   │   ├── CustomerMenu.tsx      # Customer interface
│   │   ├── CashierDashboard.tsx # Cashier dashboard
│   │   ├── KitchenDisplay.tsx   # Kitchen display
│   │   └── AdminDashboard.tsx   # Admin panel
│   ├── stores/                   # Zustand stores
│   │   └── orderStore.ts        # Order state management
│   ├── utils/                    # Utility functions
│   │   ├── api.ts               # API client
│   │   ├── socketService.ts     # Socket.IO client
│   │   └── websocket.ts         # WebSocket utilities
│   └── types/                    # TypeScript types
│       └── order.ts             # Order type definitions
├── tests/                        # Integration tests
│   └── integration/
│       └── health.test.ts       # Health check tests
├── uploads/                      # Uploaded files
├── Dockerfile.frontend          # Frontend Dockerfile
├── Dockerfile.backend           # Backend Dockerfile
├── docker-compose.yml           # Development compose
├── docker-compose.prod.yml      # Production compose
├── docker-compose.test.yml      # Testing compose
├── nginx.conf                   # Nginx configuration
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
└── README.md                    # This file
```

</details>

---

## 🤝 Contributing

<details>
<summary><b>💡 Click to view contribution guidelines</b></summary>

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests**
   ```bash
   npm run test:server && npm run test:integration
   ```
5. **Commit your changes**
   ```bash
   git commit -m "Add amazing feature"
   ```
6. **Push to branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### **Code Style**

- Follow TypeScript best practices
- Use meaningful variable names
- Add comments for complex logic
- Write tests for new features
- Update documentation as needed

</details>

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Contributors

<div align="center">

### **🌟 Our Amazing Development Team**

<table>
<tr>
<td align="center" valign="top">
<a href="https://github.com/Ranuka-Jayesh">
<img src="https://github.com/Ranuka-Jayesh.png" width="120px;" alt="Ranuka Jayesh" style="border-radius: 50%; border: 3px solid #4CAF50; padding: 2px;"/>
<br />
<br />
<sub><b>👨‍💻 Ranuka Jayesh</b></sub>
<br />
<sub>🏆 Founder & Lead Developer</sub>
</a>
<br />
<br />
<a href="https://github.com/Ranuka-Jayesh" style="text-decoration: none;">
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
</a>
</td>
<td align="center" valign="top">
<a href="https://github.com/MPrajakaruna">
<img src="https://github.com/MPrajakaruna.png" width="120px;" alt="R.Y.M.M.P.Rajakaruna" style="border-radius: 50%; border: 3px solid #2196F3; padding: 2px;"/>
<br />
<br />
<sub><b>💻 R.Y.M.M.P.Rajakaruna</b></sub>
<br />
<sub>🚀 Developer</sub>
</a>
<br />
<br />
<a href="https://github.com/MPrajakaruna" style="text-decoration: none;">
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
</a>
</td>
<td align="center" valign="top">
<a href="https://github.com/AshenSuri">
<img src="https://github.com/AshenSuri.png" width="120px;" alt="Ashen Suriyabandara" style="border-radius: 50%; border: 3px solid #FF9800; padding: 2px;"/>
<br />
<br />
<sub><b>⚡ Ashen Suriyabandara</b></sub>
<br />
<sub>🚀 Developer</sub>
</a>
<br />
<br />
<a href="https://github.com/AshenSuri" style="text-decoration: none;">
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
</a>
</td>
</tr>
<tr>
<td align="center" valign="top">
<a href="https://github.com/ruwanthac">
<img src="https://github.com/ruwanthac.png" width="120px;" alt="Ruwantha Bandara" style="border-radius: 50%; border: 3px solid #9C27B0; padding: 2px;"/>
<br />
<br />
<sub><b>🎨 Ruwantha Bandara</b></sub>
<br />
<sub>🚀 Developer</sub>
</a>
<br />
<br />
<a href="https://github.com/ruwanthac" style="text-decoration: none;">
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
</a>
</td>
<td align="center" valign="top">
<a href="https://github.com/Denuwan10">
<img src="https://github.com/Denuwan10.png" width="120px;" alt="Denuwan" style="border-radius: 50%; border: 3px solid #F44336; padding: 2px;"/>
<br />
<br />
<sub><b>🔧 Denuwan</b></sub>
<br />
<sub>🚀 Developer</sub>
</a>
<br />
<br />
<a href="https://github.com/Denuwan10" style="text-decoration: none;">
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
</a>
</td>
<td align="center" valign="top">
<a href="https://github.com/yasasdulneth">
<img src="https://github.com/yasasdulneth.png" width="120px;" alt="Yasas Dulneth" style="border-radius: 50%; border: 3px solid #00BCD4; padding: 2px;"/>
<br />
<br />
<sub><b>✨ Yasas Dulneth</b></sub>
<br />
<sub>🚀 Developer</sub>
</a>
<br />
<br />
<a href="https://github.com/yasasdulneth" style="text-decoration: none;">
<img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
</a>
</td>
</tr>
<tr>
<td align="center" valign="top" colspan="3">
<a href="https://www.ogotechnology.net">
<img src="https://via.placeholder.com/120/1E88E5/FFFFFF?text=OGO" width="120px;" alt="OGO Technology" style="border-radius: 50%; border: 3px solid #1E88E5; padding: 2px;"/>
<br />
<br />
<sub><b>🎨 OGO Technology</b></sub>
<br />
<sub>🎯 Interactive Design Developer</sub>
</a>
<br />
<br />
<a href="https://www.ogotechnology.net" style="text-decoration: none;">
<img src="https://img.shields.io/badge/OGO_Technology-1E88E5?style=for-the-badge&logo=globe&logoColor=white" alt="OGO Technology"/>
</a>
</td>
</tr>
</table>

---

### **📋 Contributors List**

<table>
<tr>
<td align="center">
<a href="https://github.com/Ranuka-Jayesh">
<img src="https://img.shields.io/badge/Ranuka_Jayesh-Founder_%26_Lead_Developer-4CAF50?style=flat-square&logo=github&logoColor=white" alt="Ranuka Jayesh"/>
</a>
</td>
<td align="center">
<a href="https://github.com/MPrajakaruna">
<img src="https://img.shields.io/badge/R.Y.M.M.P.Rajakaruna-Developer-2196F3?style=flat-square&logo=github&logoColor=white" alt="R.Y.M.M.P.Rajakaruna"/>
</a>
</td>
<td align="center">
<a href="https://github.com/AshenSuri">
<img src="https://img.shields.io/badge/Ashen_Suriyabandara-Developer-FF9800?style=flat-square&logo=github&logoColor=white" alt="Ashen Suriyabandara"/>
</a>
</td>
</tr>
<tr>
<td align="center">
<a href="https://github.com/ruwanthac">
<img src="https://img.shields.io/badge/Ruwantha_Bandara-Developer-9C27B0?style=flat-square&logo=github&logoColor=white" alt="Ruwantha Bandara"/>
</a>
</td>
<td align="center">
<a href="https://github.com/Denuwan10">
<img src="https://img.shields.io/badge/Denuwan-Developer-F44336?style=flat-square&logo=github&logoColor=white" alt="Denuwan"/>
</a>
</td>
<td align="center">
<a href="https://github.com/yasasdulneth">
<img src="https://img.shields.io/badge/Yasas_Dulneth-Developer-00BCD4?style=flat-square&logo=github&logoColor=white" alt="Yasas Dulneth"/>
</a>
</td>
</tr>
<tr>
<td align="center" colspan="3">
<a href="https://www.ogotechnology.net">
<img src="https://img.shields.io/badge/OGO_Technology-Interactive_Design_Developer-1E88E5?style=flat-square&logo=globe&logoColor=white" alt="OGO Technology"/>
</a>
</td>
</tr>
</table>

**Made with ❤️ by an amazing team of developers**

</div>

---

## 🙏 Acknowledgments

- [OGO Technology](https://www.ogotechnology.net) for interactive design development
- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) for database hosting
- [Socket.IO](https://socket.io/) for real-time communication
- [Vite](https://vitejs.dev/) for blazing-fast build tool
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS

---

## 📖 Additional Documentation

- 📘 **[System Overview](SYSTEM_OVERVIEW.md)** - Detailed architecture and design
- 🐳 **[Docker Guide](docker-compose.yml)** - Container configuration
- 🧪 **[Testing Guide](tests/)** - Test documentation
- 📝 **[UAT Template](UAT_TEMPLATE.md)** - User acceptance testing

---

<div align="center">

### **⭐ Star this repo if you find it helpful!**

**Made with ❤️ for the restaurant industry**

[⬆ Back to Top](#-one-click-restaurant-management-system)

</div>
