require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ── TEST ──
app.get('/', (req, res) => res.json({ message: 'Scriptora API running ✅' }));

// ══════════════════════════════
// CLIENTS
// ══════════════════════════════

// সব clients
app.get('/api/clients', async (req, res) => {
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// একটা client
app.get('/api/clients/:id', async (req, res) => {
  const { data, error } = await supabase.from('clients').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// নতুন client
app.post('/api/clients', async (req, res) => {
  const { name, email, phone } = req.body;
  const { data, error } = await supabase.from('clients').insert({ name, email, phone }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// ══════════════════════════════
// ORDERS
// ══════════════════════════════

// সব orders (client info সহ)
app.get('/api/orders', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, clients(name, email, phone)')
    .order('order_date', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// একটা order
app.get('/api/orders/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, clients(name, email, phone), messages(*), files(*), payments(*)')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// নতুন order
app.post('/api/orders', async (req, res) => {
  const { data, error } = await supabase.from('orders').insert(req.body).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// order update (status, progress, etc.)
app.patch('/api/orders/:id', async (req, res) => {
  const { data, error } = await supabase.from('orders').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ══════════════════════════════
// PAYMENTS
// ══════════════════════════════

// payment add করো
app.post('/api/payments', async (req, res) => {
  const { order_id, client_id, amount, type, txn_id, method } = req.body;

  // payment insert
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({ order_id, client_id, amount, type, txn_id, method, confirmed: true })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });

  // order-এর advance_paid update
  const { data: order } = await supabase.from('orders').select('advance_paid').eq('id', order_id).single();
  await supabase.from('orders').update({ advance_paid: order.advance_paid + amount }).eq('id', order_id);

  res.status(201).json(payment);
});

// ══════════════════════════════
// MESSAGES
// ══════════════════════════════

// message পাঠাও
app.post('/api/messages', async (req, res) => {
  const { order_id, client_id, text, from_admin } = req.body;
  const { data, error } = await supabase
    .from('messages')
    .insert({ order_id, client_id, text, from_admin })
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// order-এর সব messages
app.get('/api/messages/:order_id', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('order_id', req.params.order_id)
    .order('sent_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ══════════════════════════════
// FILES
// ══════════════════════════════

// file add করো
app.post('/api/files', async (req, res) => {
  const { data, error } = await supabase.from('files').insert(req.body).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// file lock/unlock
app.patch('/api/files/:id', async (req, res) => {
  const { data, error } = await supabase.from('files').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// ══════════════════════════════
// DASHBOARD STATS (admin)
// ══════════════════════════════
app.get('/api/stats', async (req, res) => {
  const [orders, payments] = await Promise.all([
    supabase.from('orders').select('status, total_price, advance_paid, due_amount'),
    supabase.from('payments').select('amount').eq('confirmed', true),
  ]);

  if (orders.error) return res.status(500).json({ error: orders.error.message });

  const all       = orders.data;
  const total     = all.length;
  const active    = all.filter(o => ['writing','draft_ready'].includes(o.status)).length;
  const completed = all.filter(o => o.status === 'completed').length;
  const pending   = all.filter(o => o.status === 'pending').length;
  const revenue   = payments.data.reduce((sum, p) => sum + p.amount, 0);
  const due       = all.reduce((sum, o) => sum + o.due_amount, 0);

  res.json({ total, active, completed, pending, revenue, due });
});

// ── START ──
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Scriptora server running on http://localhost:${PORT}`));
