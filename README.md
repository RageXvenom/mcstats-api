## 🔐 Generating JWT Secret

To generate a secure JWT secret:

### Linux / macOS / WSL
```bash
openssl rand -hex 64
```

### Node.js
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 🔑 Getting Supabase Credentials

### 1. SUPABASE_URL  
Go to **Project Settings → API** → copy **Project URL**

### 2. SUPABASE_ANON_KEY  
Go to **Project Settings → API** → copy **Anon key**

### 3. SUPABASE_SERVICE_ROLE_KEY**  
Go to **Project Settings → API** → copy **Service Role Key**  
⚠️ Only use this on your backend/server.

### 4. Database Password (Optional)  
Go to **Project Settings → Database → Connection Info**  
Copy your database password if needed.
