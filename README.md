<div align="center">

# 🏛️ CivicResolver

### Report • Track • Resolve — A Cleaner, Better City Together

Report civic issues, track progress and help build a cleaner, safer and smarter city.

<br/>

<a href="https://github.com/Esingh-byte/CivicResolver">
  <img src="https://img.shields.io/badge/📂_Source_Code-181717?style=for-the-badge&logo=github&logoColor=white" />
</a>

<br/><br/>

<img src="https://skillicons.dev/icons?i=react,vite,nodejs,express,mongodb,git,github,vercel&theme=dark" />

</div>

---

# 📖 About CivicResolver

**CivicResolver** is a full-stack MERN civic issue reporting and resolution platform connecting citizens, municipal officers, field workers, and administrators.

---

# ✨ Core Features & Role Workflows

### 👤 Citizen (`/citizen/dashboard`)
* Public self-registration with unique Citizen ID generation (`CR-CIT-XXXXXX`)
* Sign in via Email Address or Citizen ID
* Report civic issues with category, automatic department routing, map coordinates, and photos
* Unique Complaint ID generation (`CR-CMP-XXXXXX`) and real-time timeline tracking
* Community upvoting, comments, and 5-star resolution feedback

### 🛡️ Municipal Officer (`/officer/dashboard`)
* Onboarded via secure, single-use, expiring invitations
* Manage assigned department complaints and invite Field Workers within their authorized department

### 🔧 Field Worker (`/field-worker/dashboard`)
* Onboarded via department-scoped single-use invitations
* Receive on-ground repair assignments, update work progress, and resolve issues

### 🏛️ System Admin & Super Admin (`/admin/dashboard`, `/super-admin/dashboard`)
* Verify submitted complaints and assign departments/officers
* Issue staff invitations for Municipal Officers and Field Workers
* Real-time analytics across categories, statuses, and departments

---

# 🛠️ Tech Stack

* **Frontend:** React 19, Vite 8, React Router v7, Axios, Leaflet / React-Leaflet
* **Backend:** Node.js, Express 5, JWT + HttpOnly Cookie Authentication, bcryptjs
* **Database:** MongoDB & Mongoose 9

---

# 🚀 Running Locally

### 1. Clone Repository
```bash
git clone https://github.com/Esingh-byte/CivicResolver.git
cd CivicResolver
```

### 2. Configure Backend (`server/`)
```bash
cd server
npm install
cp .env.example .env
# Update MONGO_URI and JWT_SECRET in server/.env
npm run dev
```

### 3. Configure Frontend (`client/`)
```bash
cd ../client
npm install
cp .env.example .env
npm run dev
```

### 4. Run Automated Tests
```bash
cd ../server
npm test
```
