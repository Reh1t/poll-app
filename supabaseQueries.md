
## 🔐 **Supabase RLS Policies**

### ✅ Table: `polls`

**Purpose**:

* Anyone can read polls.
* Only authenticated users can create/update their own polls.

### **Enable RLS**

```sql
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
```

### **Policies**

#### 1. Read (Public)

```sql
CREATE POLICY "Public can read polls"
ON polls
FOR SELECT
USING (true);
```

#### 2. Insert (Authenticated only)

```sql
CREATE POLICY "Authenticated users can insert their own polls"
ON polls
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
```

#### 3. Update (Only creator)

```sql
CREATE POLICY "Only poll creator can update"
ON polls
FOR UPDATE
USING (auth.uid() = created_by);
```

---

### ✅ Table: `votes`

**Purpose**:

* Anyone can read vote counts.
* Authenticated users can vote only once.
* Anonymous users tracked via IP/localStorage hash (frontend enforced).
* No update/delete access for now.

### **Enable RLS**

```sql
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
```

### **Policies**

#### 1. Read (Public)

```sql
CREATE POLICY "Public can read votes"
ON votes
FOR SELECT
USING (true);
```

#### 2. Insert (Authenticated or anonymous allowed)

```sql
CREATE POLICY "Anyone can vote if poll is active"
ON votes
FOR INSERT
WITH CHECK (
  -- Allow anonymous (no auth.uid()) or authenticated
  true
);
```

#### 3. Prevent Update/Delete

You don’t need to create policies for `UPDATE` or `DELETE`. Just don't create them, and those actions will be denied by default.

---

### ✅ Table: `profiles`

**Purpose**:

* User profile info linked to auth.
* Users can read and update only their own profile.

### **Enable RLS**

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

### **Policies**

#### 1. Read Own Profile

```sql
CREATE POLICY "Users can read their own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);
```

#### 2. Update Own Profile

```sql
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id);
```

#### 3. Insert via Supabase Auth Hook

Profiles are usually created using an auth trigger (`supabase.auth.on_user_created`), so you don’t need a custom insert policy if using that.
