## 👨‍💼 Creating the First Admin Account

Before using the dashboard, you must create your **first admin user** because:
- The system does **not** auto-create an admin.
- `/api/login` only works if an admin exists.
- Only the **initial admin** should be created manually.

### 🟦 Step 1 — Start the server
```bash
node server.js
```

(or whatever your main file name is)

### 🟦 Step 2 — Send a request to create admin

You can create the first admin using:

### Option A: cURL
```bash
curl -X POST http://localhost:3000/api/register-admin \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your-admin-email@example.com",
       "password": "your-admin-password"
     }'
```

### Option B: Postman / Thunder Client
- Method: **POST**
- URL: `http://localhost:3000/api/register-admin`
- Body → Raw → JSON:
```json
{
  "email": "your-admin-email@example.com",
  "password": "your-admin-password"
}
```

### 🟩 Success Response
```json
{
  "message": "Admin created"
}
```

---

## 🔐 Logging in as Admin
Once admin is created, login using:

```bash
POST /api/login
```

Body:
```json
{
  "email": "your-admin-email@example.com",
  "password": "your-admin-password"
}
```

You will receive a JWT token:

```json
{
  "token": "xxxx.yyyy.zzzz"
}
```

Use this token in protected routes:

```
Authorization: Bearer <token>
```

---

## 🚀 Start Commands

### 🔹 Development Mode (auto-restart with nodemon)
```bash
npm install -g nodemon
nodemon server.js
```

### 🔹 Production Mode
```bash
node server.js
```

---

## 📦 Environment Variables Needed

Your backend requires this `.env`:

```dotenv
PORT=3000
ADMIN_EMAIL=initial_admin@example.com
ADMIN_PASSWORD=your_admin_password

JWT_SECRET=your_generated_jwt_secret

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

---

## 🔥 Notes

- `/api/register-admin` should be used **only for creating the first admin**  
- After that, **disable** or **protect** it (optional security step)  
- You may delete the route from production if you prefer strict security  

---
