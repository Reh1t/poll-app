# 🗳️ Real-time Poll App

A responsive, real-time polling application built with **React + TypeScript** and **Supabase**. Inspired by Strawpoll and Mentimeter, users can create polls, vote (with or without authentication), and view live animated results.

Live at [Vercel](https://poll-app-nine-umber.vercel.app/)

---

## 🚀 Features

✅ Create polls with customizable settings  
✅ Real-time updates for votes and viewers  
✅ Anonymous + authenticated voting support  
✅ Bar chart, pie chart, and list visualizations  
✅ Shareable poll links + export to image/CSV  
✅ Live poll list with search, filters, pagination  
✅ Presence-based viewer counter  
✅ Optimized UI with skeleton loaders and toast notifications  

---

## 🧩 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS  
- **State/Form Management**: React Hook Form  
- **Charts**: Recharts  
- **Animation**: Framer Motion  
- **Realtime Backend**: Supabase (PostgreSQL + Realtime + Auth)  
- **Notifications**: React Hot Toast  
- **Routing**: React Router v6  
- **Deploy**: Vercel / Netlify  

---

## 🔧 Setup Instructions

1. **Clone the repo**
```bash
git clone https://github.com/Reh1t/poll-app.git
cd realtime-poll-app
``` 

2. **Install dependencies**

```bash
npm install
```

3. **Create a `.env` file in the root:**

```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. **Start the dev server**

```bash
npm run dev
```

---

## 📦 Environment Variables

| Variable                 | Description                   |
| ------------------------ | ----------------------------- |
| `VITE_SUPABASE_URL`      | Your Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public anon key |

> These can be found in your Supabase project > Settings > API.

---

## 🗂️ Folder Structure

```
src/
├── app/                # Supabase client setup
├── components/         # Reusable UI components (e.g., PollCard)
├── hooks/              # Custom React hooks (e.g., useDebounce)
├── pages/              # Route pages (Home, CreatePoll, Results)
├── types/              # TypeScript interfaces
├── App.tsx             # Main router
└── main.tsx            # Entry point
```

---

## 🏗️ Architecture Decisions

### Supabase Schema

**Tables:**

* `polls`

  * `id`, `question`, `options[]`, `settings`, `created_by`, `created_at`, `ends_at`

* `votes`

  * `id`, `poll_id`, `user_id`, `ip_hash`, `selected_options[]`, `created_at`

* `profiles`

  * `id`, `email`, `created_polls_count`

### Realtime

* **Live vote updates** via Supabase `channel().on('postgres_changes', ...)`
* **Viewer presence** using `channel({ config: { presence: { key } } })`
* **Live poll feed** using a subscription on `INSERT` to the `polls` table

### Authentication

* Supabase Auth using **email/password**
* Public voting tracked via **localStorage** to prevent double voting
* Private poll creation behind protected routes

### State & Performance

* Debounced search (500ms delay)
* Pagination (10 per page on list, 4 per page in results)
* Skeleton loaders used while loading
* Efficient use of Supabase range queries and conditional filters

---

## ⚠️ Known Limitations

* ❌ No password reset flow (can be added later)
* ❌ No admin panel or user management UI
* ❌ No dark mode (planned as a bonus)
* ❌ LocalStorage can be bypassed (for anonymous users)
* ❌ Viewer presence can show duplicates in incognito or multiple tabs
* ❌ RLS is enforced for safety but needs careful config for voting logic

---

## ✅ RLS Policies Used

```sql
-- polls: Anyone can read
CREATE POLICY "Enable read access to all"
ON public.polls
FOR SELECT
USING (true);

-- polls: Only authenticated users can insert
CREATE POLICY "Authenticated insert only"
ON public.polls
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- votes: Allow vote if user hasn't already voted (anonymous tracked via IP hash or localStorage)
-- Customize as needed
```

---

## 📤 Deployment

This app is designed to be deployed on [Vercel](https://vercel.com/) or [Netlify](https://netlify.com).

1. Connect the repo to Vercel
2. Add the two env vars:

   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
3. Deploy 🚀

---

## 🧪 Example Polls

* Added via seed script or created manually
* At least 12 pre-created polls with variety of settings
* Can be found on `/` home route

---

## 📝 License

MIT – Free to use and modify

---

## 🙌 Acknowledgements

Built as part of a frontend evaluation task by BigOSoft.

Inspired by Strawpoll, profile from invoice template of refine, and the Supabase ecosystem.

---
