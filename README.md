# Company Management System with RBAC

A full-stack company management system with Role-Based Access Control (RBAC).

## Features

1. **RBAC with 6 Roles:**

   - Founder
   - Co-Founder
   - Technical Head
   - Sales Head
   - Finance Head
   - Employee

2. **Authentication:**

   - JWT-based authentication
   - Secure password hashing
   - Protected routes

3. **Role-based Dashboards:**

   - Founder: Full access to all data
   - Co-Founder: Limited scope
   - Department Heads: Department-specific access
   - Employees: Personal data only

4. **Modules:**
   - User Management
   - Attendance Tracking
   - Task Management
   - Salary Management

## Tech Stack

### Backend:

- Node.js + Express
- MongoDB Atlas
- JWT Authentication
- Bcrypt for password hashing

### Frontend:

- React.js
- Material-UI
- React Router
- Axios for API calls
- React Hot Toast for notifications

## Setup Instructions

### Backend Setup:

```bash
cd backend
npm install
npm run dev
```
