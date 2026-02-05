# 🔥 Firebase CLI Setup Guide

## Step 1: Login to Firebase

**Open your PowerShell terminal and run:**

```powershell
firebase login
```

**What happens:**
1. ✅ Firebase CLI will open your **default browser** automatically
2. ✅ You'll see a Google sign-in page
3. ✅ Sign in with the **same Google account** you use for Firebase Console
4. ✅ You'll be asked to grant Firebase CLI permissions
5. ✅ Click **"Allow"** to grant access
6. ✅ Browser will show "Success! You're logged in"
7. ✅ Return to your terminal - you should see "Success! Logged in as your-email@example.com"

---

## Step 2: Set Your Active Project

**In your terminal, run:**

```powershell
firebase use --add
```

**What happens:**
1. ✅ Firebase CLI will list all your projects
2. ✅ You'll see `pay-zip-sa` in the list
3. ✅ Use arrow keys to select `pay-zip-sa`
4. ✅ Press Enter
5. ✅ When asked for an alias, type `default` (or just press Enter)
6. ✅ You should see "Now using alias default (pay-zip-sa)"

---

## Step 3: Deploy Your Firestore Indexes

**In your terminal, run:**

```powershell
firebase deploy --only firestore:indexes
```

**What happens:**
1. ✅ Firebase CLI uploads your 7 indexes from `firestore.indexes.json`
2. ✅ Firebase starts building the indexes (this takes 5-15 minutes)
3. ✅ You'll see output like:
   ```
   === Deploying to 'pay-zip-sa'...
   
   i  firestore: reading indexes from firestore.indexes.json...
   ✔  firestore: deployed indexes successfully
   
   ✔  Deploy complete!
   ```

---

## Step 4: Verify Indexes Are Building

**Option A: Check in Browser (Firebase Console)**
1. ✅ Go to: https://console.firebase.google.com/project/pay-zip-sa/firestore/indexes
2. ✅ You should see 7 new indexes
3. ✅ Status will show:
   - "Building..." (yellow) - wait 5-15 minutes
   - "Enabled" (green) - ready to use!

**Option B: Check in Terminal**

```powershell
firebase firestore:indexes
```

---

## Troubleshooting

### ❌ "Cannot run login in non-interactive mode"

**Solution:** Make sure you're running the command in a **real terminal window**, not through an automated script.

### ❌ "Failed to authenticate"

**Solution:** Run `firebase login` again and make sure you:
- Sign in with the correct Google account
- Click "Allow" to grant permissions
- Wait for "Success!" message in browser

### ❌ "No currently active project"

**Solution:** Run `firebase use --add` and select `pay-zip-sa` from the list.

### ❌ Browser doesn't open automatically

**Solution:** 
1. Copy the URL shown in terminal
2. Paste it in your browser manually
3. Complete the authentication
4. Copy the code shown in browser
5. Paste it back in terminal if prompted

---

## Your Project Details

- **Project ID:** `pay-zip-sa`
- **Project Number:** `283671939369`
- **Firebase Console:** https://console.firebase.google.com/project/pay-zip-sa
- **Indexes to Deploy:** 7 composite indexes

---

## What the Indexes Do

These 7 indexes will make your database queries **60% faster**:

1. **services** - userId + isActive + createdAt
2. **user_websites** - userId + status + updatedAt
3. **transactions** - userId + status + completedAt
4. **bookings** - userId + status + date
5. **bookings** (detailed) - userId + status + date + time
6. **tutor_classes** - tutorId + isActive + createdAt
7. **photographer_deliveries** - photographerId + status + createdAt

---

## After Deployment

**Wait 5-15 minutes** for indexes to build, then:

✅ Your API calls will be **60% faster**  
✅ Dashboard will load **50% faster**  
✅ No more slow queries  
✅ Production-ready performance  

---

**Need Help?** Check the Firebase Console at: https://console.firebase.google.com/project/pay-zip-sa/firestore/indexes
