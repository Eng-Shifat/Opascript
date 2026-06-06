require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════
app.get('/', (req, res) => {
  res.json({ message: 'Scriptora API running ✅' });
});


// ════════════════════════════════════════
// CLIENTS
// ════════════════════════════════════════
// Client login
app.post('/api/clients/login', async (req, res) => {
  const { email, password } = req.body;

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('email', email)
    .eq('password', password) // সাময়িক — পরে bcrypt দিয়ে করবো
    .single();

  if (error || !data) {
    return res.status(401).json({ error: 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।' });
  }

  res.json(data);
});

// সব clients
app.get('/api/clients', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// একটা client
app.get('/api/clients/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// নতুন client তৈরি
app.post('/api/clients', async (req, res) => {
  const { name, email, phone } = req.body;

  const { data, error } = await supabase
    .from('clients')
    .insert({ name, email, phone })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});


// ════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════

// সব orders — admin এর জন্য (client info সহ)
app.get('/api/orders', async (req, res) => {
  const { client_id } = req.query;

  let query = supabase
    .from('orders')
    .select('*, clients(name, email, phone), payments(*)')
    .order('created_at', { ascending: false });

  // client_id দিলে শুধু সেই client এর orders
  if (client_id) {
    query = query.eq('client_id', client_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// একটা order — সব info সহ
app.get('/api/orders/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, clients(name, email, phone), messages(*), files(*), payments(*)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json(data);
});

// নতুন order submit
app.post('/api/orders', async (req, res) => {
  const {
    client_id,
    title,
    pkg,
    dept,
    university,
    supervisor,
    chapters,
    research_type,
    methodology,
    word_count,
    citation,
    urgency,
    deadline,
    addons,
    total_price,
    notes,
  } = req.body;

  // due_amount = total (advance এখনো দেওয়া হয়নি)
  const due_amount  = total_price || 0;
  const advance_paid = 0;

  const { data, error } = await supabase
    .from('orders')
    .insert({
      client_id,
      title,
      pkg,
      dept,
      university,
      supervisor,
      chapters,
      research_type,
      methodology,
      word_count,
      citation,
      urgency,
      deadline,
      addons,
      total_price,
      advance_paid,
      due_amount,
      status: 'pending',
      progress_pct: 0,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// order update — status, progress, notes ইত্যাদি
app.patch('/api/orders/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});


// ════════════════════════════════════════
// PAYMENTS
// ════════════════════════════════════════

// নতুন payment submit — client করে, confirmed = false
app.post('/api/payments', async (req, res) => {
  const { order_id, client_id, amount, method, txn_id, screenshot_url } = req.body;

  // payment insert — confirmed false (admin verify করবে)
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      order_id,
      client_id,
      amount,
      method,
      txn_id,
      screenshot_url: screenshot_url || '',
      confirmed: false,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  // order status → pending_payment (admin verify বাকি)
  await supabase
    .from('orders')
    .update({ status: 'pending_payment' })
    .eq('id', order_id);

  res.status(201).json(payment);
});

// admin — payment verify করো (confirm বা reject)
app.patch('/api/payments/:id/verify', async (req, res) => {
  const { confirmed } = req.body;
  const paymentId = req.params.id;

  // payment update
  const { data: payment, error } = await supabase
    .from('payments')
    .update({ confirmed })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (confirmed) {
    // order এর advance_paid update করো
    const { data: order } = await supabase
      .from('orders')
      .select('advance_paid, total_price')
      .eq('id', payment.order_id)
      .single();

    if (order) {
      const newAdvance = (order.advance_paid || 0) + payment.amount;
      const newDue     = (order.total_price  || 0) - newAdvance;

      await supabase
        .from('orders')
        .update({
          advance_paid: newAdvance,
          due_amount:   Math.max(0, newDue),
          status:       'writing', // payment confirm হলে writing শুরু
        })
        .eq('id', payment.order_id);
    }
  } else {
    // reject হলে order status আবার pending এ
    await supabase
      .from('orders')
      .update({ status: 'pending' })
      .eq('id', payment.order_id);
  }

  res.json(payment);
});

// একটা order এর সব payments
app.get('/api/payments/:order_id', async (req, res) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', req.params.order_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


// ════════════════════════════════════════
// MESSAGES
// ════════════════════════════════════════

// message পাঠাও
app.post('/api/messages', async (req, res) => {
  const { order_id, client_id, text, from_admin } = req.body;

  const { data, error } = await supabase
    .from('messages')
    .insert({ order_id, client_id, text, from_admin })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// একটা order এর সব messages
app.get('/api/messages/:order_id', async (req, res) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('order_id', req.params.order_id)
    .order('sent_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


// ════════════════════════════════════════
// FILES
// ════════════════════════════════════════

// file add করো
app.post('/api/files', async (req, res) => {
  const { data, error } = await supabase
    .from('files')
    .insert(req.body)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

// file lock / unlock
app.patch('/api/files/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('files')
    .update(req.body)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// একটা order এর সব files
app.get('/api/files/:order_id', async (req, res) => {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('order_id', req.params.order_id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


// ════════════════════════════════════════
// DASHBOARD STATS — admin
// ════════════════════════════════════════
app.get('/api/stats', async (req, res) => {
  const [ordersRes, paymentsRes] = await Promise.all([
    supabase.from('orders').select('status, total_price, advance_paid, due_amount'),
    supabase.from('payments').select('amount').eq('confirmed', true),
  ]);

  if (ordersRes.error) return res.status(500).json({ error: ordersRes.error.message });

  const orders    = ordersRes.data;
  const total     = orders.length;
  const active    = orders.filter(o => ['writing', 'draft_ready'].includes(o.status)).length;
  const completed = orders.filter(o => o.status === 'completed').length;
  const pending   = orders.filter(o => ['pending', 'pending_payment'].includes(o.status)).length;
  const overdue   = orders.filter(o => o.status === 'overdue').length;
  const revenue   = (paymentsRes.data || []).reduce((sum, p) => sum + p.amount, 0);
  const due       = orders.reduce((sum, o) => sum + (o.due_amount || 0), 0);

  res.json({ total, active, completed, pending, overdue, revenue, due });
});


// ════════════════════════════════════════
// START SERVER
// ════════════════════════════════════════
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Scriptora server running → http://localhost:${PORT}`);
});
