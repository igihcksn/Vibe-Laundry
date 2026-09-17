import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Supabase client securely on the server-side
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  let supabaseClient: SupabaseClient | null = null;
  if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://')) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      console.log(`[Server] Connected to Supabase at: ${supabaseUrl}`);
    } catch (err) {
      console.error('[Server] Failed to initialize Supabase client:', err);
    }
  } else {
    console.warn('[Server] Supabase credentials not found or invalid in environment');
  }

  // --- API Routes ---

  // Health check & database connection status
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      database: Boolean(supabaseClient),
      url: supabaseUrl || null,
    });
  });

  // GET /api/orders - Fetch all orders
  app.get("/api/orders", async (req, res) => {
    if (!supabaseClient) {
      return res.status(503).json({
        error: "Supabase database client not configured on server",
        fallbackToLocal: true,
      });
    }

    try {
      let queryRes = await supabaseClient
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      // Fallback if ordering clause causes issues
      if (queryRes.error) {
        console.warn("[Server] Retrying orders query without order clause:", queryRes.error.message);
        queryRes = await supabaseClient.from("orders").select("*");
      }

      if (queryRes.error) {
        console.error("[Server] Supabase error fetching orders:", queryRes.error);
        return res.status(500).json({ error: queryRes.error.message });
      }

      return res.json({ orders: queryRes.data || [] });
    } catch (err: any) {
      console.error("[Server] Exception fetching orders:", err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  });

  // POST /api/orders - Create a new order
  app.post("/api/orders", async (req, res) => {
    if (!supabaseClient) {
      return res.status(503).json({
        error: "Supabase database client not configured on server",
        fallbackToLocal: true,
      });
    }

    try {
      const { customer_name, customer_phone, selected_items, total_price, status } = req.body;

      if (!customer_name || !customer_phone) {
        return res.status(400).json({ error: "Missing required fields: customer_name, customer_phone" });
      }

      const orderRow: Record<string, any> = {
        customer_name,
        customer_phone,
        selected_items,
        total_price: Number(total_price) || 0,
        status: status || "pending",
      };

      const { data, error } = await supabaseClient
        .from("orders")
        .insert([orderRow])
        .select()
        .single();

      if (error) {
        console.error("[Server] Supabase error creating order:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.status(201).json({ order: data });
    } catch (err: any) {
      console.error("[Server] Exception creating order:", err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  });

  // PATCH /api/orders/:id - Update order status ('pending' <-> 'processed')
  app.patch("/api/orders/:id", async (req, res) => {
    if (!supabaseClient) {
      return res.status(503).json({
        error: "Supabase database client not configured on server",
        fallbackToLocal: true,
      });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || (status !== "pending" && status !== "processed")) {
        return res.status(400).json({ error: "Invalid status value. Must be 'pending' or 'processed'" });
      }

      const { error } = await supabaseClient
        .from("orders")
        .update({ status })
        .eq("id", id);

      if (error) {
        console.error("[Server] Supabase error updating order status:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[Server] Exception updating order status:", err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  });

  // POST /api/orders/seed - Seed demo orders into Supabase
  app.post("/api/orders/seed", async (req, res) => {
    if (!supabaseClient) {
      return res.status(503).json({
        error: "Supabase database client not configured on server",
        fallbackToLocal: true,
      });
    }

    try {
      const { orders } = req.body;
      if (!Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({ error: "Invalid orders array provided" });
      }

      const rows = orders.map((o: any) => ({
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        selected_items: o.selected_items,
        total_price: Number(o.total_price) || 0,
        status: o.status || "pending",
      }));

      const { data, error } = await supabaseClient
        .from("orders")
        .insert(rows)
        .select();

      if (error) {
        console.error("[Server] Supabase error seeding demo orders:", error);
        return res.status(500).json({ error: error.message });
      }

      return res.json({ success: true, count: data?.length || 0 });
    } catch (err: any) {
      console.error("[Server] Exception seeding demo orders:", err);
      return res.status(500).json({ error: err.message || String(err) });
    }
  });

  // --- Vite / Static Assets Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Sneaker Service API running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
