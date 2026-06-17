# Scriptora Admin Panel — পরবর্তী Features (Saved Prompts)

প্রতিটা feature বানানোর আগে নিচের প্রম্পট-টা কপি করে নতুন মেসেজে paste করে দিন। প্রতিটা prompt-এ project context আর existing pattern (sidebar.js, RLS admin policy ইত্যাদি) উল্লেখ করা আছে যাতে আগের কাজের সাথে consistent থাকে।

---

## ১. Client List

```
Scriptora admin panel-এর জন্য "Client List" page বানাও।

Context:
- Supabase table: clients (id uuid, name text, email text, phone text,
  created_at timestamptz, University text, subject text, academic_year text,
  avatar_url text)
- orders table client_id দিয়ে clients-এর সাথে linked, তাই প্রতি client-এর
  total orders / total spent (total_price যোগ করে) দেখানো যাবে।
- Page architecture আগের admin-messages.html এর মতই হবে: css/admin.css,
  js/sidebar.js (data-page="clients") ব্যবহার হবে — sidebar.js নিজেই admin
  login check করে নেয়, আলাদা auth guard লেখার দরকার নেই।
- Dark theme, purple accent (#6c63ff, #a78bfa) — আগের admin dashboard এর
  সাথে মিলিয়ে।

আমি চাই:
- সব client-এর card/table list (নাম, email, phone, university, কতগুলো order,
  মোট কত টাকার order)
- Search/filter by name or email
- একটা client-এ ক্লিক করলে তার সব order-এর detail দেখা যাবে
- "clients" table-এ যদি admin_all_access RLS policy এখনো না থাকে সেটাও দিও
  (আগে messages/orders table-এ এই pattern ব্যবহার করেছি — admin email:
  yeasinkabirshifat@gmail.com)

ready-to-use HTML, CSS, JS ফাইল আলাদা করে দিও, ইনলাইন style না।
```

---

## ২. Payments & Billing

```
Scriptora admin panel-এর জন্য "Payments & Billing" page বানাও।

Context:
- orders table-এ আগে থেকেই financial column আছে: total_price (integer),
  advance_paid (integer), due_amount (integer), status (text)
- এখনো আলাদা কোনো payments/transactions table নেই — আগে আমাকে জিজ্ঞেস করো
  কি লাগবে: (a) শুধু orders table-এর এই column গুলো দিয়েই একটা billing
  overview/report বানাবো, নাকি (b) প্রতিটা payment আলাদা row হিসেবে track
  করার জন্য নতুন "payments" table বানাবো (যেমন partial payment, payment
  method, payment date আলাদাভাবে রাখতে চাইলে)।
- Page architecture আগের মতই: css/admin.css, js/sidebar.js
  (data-page="payments")।
- Dark theme, purple accent (#6c63ff, #a78bfa)।

আমি চাই:
- মোট revenue, মোট due amount, কতগুলো invoice pending — এসব summary card
- সব order-এর payment status list (paid/partial/due), search/filter
- নতুন table বানালে সেখানে admin_all_access RLS policy
  (admin email: yeasinkabirshifat@gmail.com) সাথেই দিও।

ready-to-use HTML, CSS, JS ফাইল আলাদা করে দিও।
```

---

## ৩. File Manager

```
Scriptora admin panel-এর জন্য "File Manager" page বানাও — order-এর সাথে
attached/delivered files manage করার জন্য।

Context:
- এটার জন্য Supabase Storage bucket লাগবে (table RLS না, storage policy
  আলাদা syntax এ লিখতে হয়) — bucket আগে থেকে বানানো আছে কিনা আমাকে জিজ্ঞেস
  করো, না থাকলে bucket তৈরি করার SQL/dashboard step সহ দিও।
- File গুলো কোন order-এর সাথে যুক্ত, সেটা track করার জন্য orders table-এ
  নতুন column (যেমন delivered_file_url) লাগবে কিনা, নাকি আলাদা
  "order_files" table লাগবে — সেটাও সাজেস্ট করো।
- Page architecture আগের মতই: css/admin.css, js/sidebar.js
  (data-page="files")।
- Dark theme, purple accent (#6c63ff, #a78bfa)।

আমি চাই:
- Admin কোনো order select করে file upload করতে পারবে (client-কে delivery
  দেওয়ার জন্য)
- Client নিজের order-এর file download করতে পারবে কিন্তু admin ছাড়া অন্য
  কারো file দেখতে/upload করতে পারবে না — storage policy এভাবেই বসাও
  (admin email: yeasinkabirshifat@gmail.com)

ready-to-use HTML, CSS, JS ফাইল আলাদা করে দিও।
```

---

### নোট
এই তিনটার কোনোটা শুরু করার সময় যদি প্রজেক্টের অন্য কোনো ফাইল (যেমন বর্তমান
order-management.html বা admin.css) লাগে রেফারেন্সের জন্য, সেটাও সাথে upload
করে দিলে আরও ভালো মিলিয়ে বানানো যাবে।
