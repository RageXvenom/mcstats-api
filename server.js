import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Helper Middleware ---
const authenticate = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "No token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }
};

// --- Health Route ---
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", time: new Date().toISOString() });
});

// --- Admin Login ---
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const { data: admins } = await supabase
    .from("admins")
    .select("*")
    .eq("email", email)
    .limit(1);

  const admin = admins?.[0];
  if (!admin) return res.status(401).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, admin.password);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
  res.json({ token });
});

// --- Register Admin (manual use only) ---
app.post("/api/register-admin", async (req, res) => {
  const { email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const { error } = await supabase
    .from("admins")
    .insert([{ email, password: hash }]);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Admin created" });
});

// --- Get All Announcements ---
app.get("/api/announcements", async (req, res) => {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- Create Announcement ---
app.post("/api/announcements", authenticate, async (req, res) => {
  const { title, message, type } = req.body;

  const { data, error } = await supabase
    .from("announcements")
    .insert([{ title, message, type }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// --- Delete Announcement ---
app.delete("/api/announcements/:id", authenticate, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: "Deleted successfully" });
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
});
