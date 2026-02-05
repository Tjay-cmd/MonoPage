# How to Test Class Enrollment & Payment Links

## 🚨 Important: Editor Preview vs. Published Website

### In the Editor (Preview Mode) ❌
**The orbit animation is NOT interactive!**
- You see a **static placeholder** showing selected classes
- The lock icon and "Get Access" button **do not appear**
- No JavaScript runs in the editor preview
- This is just a visual preview to show which classes are selected

### On Published Website ✅
**The orbit animation becomes fully interactive!**
- The lock overlay with icon and button appears
- Users can click "Get Access" to start enrollment
- Payment links work correctly
- All functionality is active

---

## 📋 Complete Testing Flow

### Step 1: Create a Class with Payment Link
1. Go to **Dashboard → Classes & Groups**
2. Click **"Create Class"**
3. Fill in:
   - Class name (e.g., "Math 101")
   - Description (optional)
   - **Upload a cover image** (optional)
   - **Payment Link** (e.g., `https://payfast.co.za/pay/...`)
   - Choose a color
4. Click **"Create Class"**
5. ✅ Class is saved with payment link!

### Step 2: Add to Website Editor
1. Go to **Dashboard → Templates → [Your Template]**
2. Drag the **"Classes Orbit Animation"** block onto the page
3. Select the class you just created
4. **SAVE** the website (click Save button)
5. ✅ Configuration is saved!

### Step 3: Publish the Website
1. After saving, click **"Publish"** button
2. Wait for success message
3. Copy the **published URL** (format: `/p/[userId]---[websiteId]`)
4. ✅ Website is now live!

### Step 4: Test on Published Website
1. Open the **published URL** in a new browser tab/window
2. You should see:
   - ✅ Orbit animation with your classes
   - ✅ Lock overlay with centered icon and "Get Access" button
   - ✅ Cover images (if you uploaded them)
3. Click **"Get Access"**
4. ✅ You're redirected to enrollment form at `/enroll?tutorId=...`

### Step 5: Complete Enrollment
1. Fill out the enrollment form:
   - Name
   - Email
   - Phone
2. Click **"Continue"**
3. ✅ Redirected to class selection page

### Step 6: Select Class & See Payment Link
1. You see all available classes with cover images
2. Click on a class to select it
3. **On the right side**, you should see:
   - ✅ Selected class cover image
   - ✅ "Get Access" button (this is the **payment link**)
   - ✅ "or" divider
   - ✅ "Enroll Without Payment" button (for free access)
4. Click the **"Get Access"** button
5. ✅ You're redirected to your PayFast payment link!

---

## 🔍 Troubleshooting

### "Payment link doesn't work in the editor"
**Expected behavior!** Payment links only work on **published websites**, not in the editor preview.

### "Lock and button are not aligned"
**Fixed!** The alignment has been corrected. Make sure to:
1. **Save** your website in the editor
2. **Publish** it again
3. View the **published URL** (not the editor)

### "I don't see the payment link button"
Check these:
1. Did you add a payment link in the class dashboard?
2. Did you **save** the website after adding the orbit block?
3. Did you **publish** the website?
4. Are you viewing the **published URL** (`/p/[id]`), not the editor?
5. Did you complete the enrollment form first?

### "The form pops up but nothing happens"
Make sure you're testing the **complete flow**:
1. Click "Get Access" on published website
2. Fill out enrollment form → Click "Continue"
3. **Then** select a class
4. **Then** click "Get Access" (payment link) or "Enroll Without Payment"

---

## ✅ What Works Where

| Feature | Editor Preview | Published Website |
|---------|---------------|-------------------|
| See selected classes | ✅ Yes | ✅ Yes |
| Cover images | ✅ Yes | ✅ Yes |
| Orbit animation | ❌ No | ✅ Yes |
| Lock overlay | ❌ No | ✅ Yes |
| "Get Access" button | ❌ No | ✅ Yes |
| Enrollment flow | ❌ No | ✅ Yes |
| Payment links | ❌ No | ✅ Yes |

---

## 💡 Quick Test Checklist

- [ ] Created a class with payment link in dashboard
- [ ] Added cover image to class (optional but recommended)
- [ ] Added orbit animation block to website in editor
- [ ] Selected the class in the block settings
- [ ] **SAVED** the website
- [ ] **PUBLISHED** the website
- [ ] Opened the **published URL** in new tab
- [ ] Saw orbit animation with lock overlay
- [ ] Lock and button are properly aligned
- [ ] Clicked "Get Access"
- [ ] Filled out enrollment form
- [ ] Clicked "Continue"
- [ ] Selected the class
- [ ] Saw payment link "Get Access" button on the right
- [ ] Clicked payment link button
- [ ] Redirected to PayFast (or your payment provider)

---

## 🎯 Expected Behavior Summary

### Editor = Static Preview Only
Just shows what classes are selected. No interactivity.

### Published Website = Full Functionality
Complete enrollment flow with payment links working!

---

If you've followed all these steps and the payment link still doesn't work on the **published website**, please let me know what specific error you're seeing!

