# 🎯 Service Editing System - User Guide

## Overview

The Service Editing System automatically detects service cards in your templates and provides a comprehensive management system to edit, sync with PayFast, and customize service offerings.

---

## 🚀 How It Works

### 1. **Automatic Detection**

When you load a template, the system automatically:
- Scans for repeating service card patterns
- Detects service sections (looks for classes like `service-card`, `service-item`, `pricing`, etc.)
- If 2+ similar cards are found, asks if you want to sync with PayFast

### 2. **Three Ways to Edit Services**

#### **Option A: Normal Click (Text/Price Editing)**
- Simply **click** on service titles, descriptions, or prices
- Edit text inline like any other element
- Quick edits without opening modal

#### **Option B: Shift+Click (Full Service Editor)**
- Hold **Shift** and **click** on any service card
- Opens comprehensive service editor modal with:
  - Service name
  - Description (multi-line)
  - Price
  - PayFast linking
  - Delete option

#### **Option C: Sidebar Service Manager**
- If services detected, a **Services** section appears in sidebar
- Shows all synced services from PayFast
- Buttons for:
  - **+ Add Service** - Duplicates a service card
  - **Sync with PayFast** - Fetches and populates your PayFast services

---

## 📋 Service Manager Features

### **Sync with PayFast**

When you click "Sync with PayFast":
1. Fetches all services from your PayFast account
2. Replaces template services with your actual services
3. Auto-links payment buttons to PayFast URLs
4. Displays services in sidebar with sync badge (✓ Synced)

**Benefits:**
- ✅ Automatic price synchronization
- ✅ Payment links auto-configured
- ✅ Real service data instead of placeholder text
- ✅ Easy to manage multiple services

### **Add New Service Card**

Click **"+ Add Service"** to:
1. Duplicate the last service card in template
2. Reset content to defaults (New Service, $0)
3. Opens for immediate editing
4. Can be manually linked to PayFast or left as custom

### **Service Editor Modal** (Shift+Click)

Features:
- **Service Name**: Edit the title
- **Description**: Multi-line textarea for details
- **Price**: Number input with decimal support
- **Link to PayFast**: Dropdown to connect to existing PayFast service
- **Delete**: Remove the service card entirely

**Synced Services:**
- Shows green badge indicating PayFast sync
- Price edits are display-only (actual payment uses PayFast price)
- Ensures consistency with payment system

---

## 🎨 UI Indicators

### **Sidebar Service List**
```
┌─────────────────────────────────┐
│  📋 Services            ✓ Synced │
├─────────────────────────────────┤
│  Premium Haircut         $35    │
│  Beard Trim              $25    │
│  Hot Towel Shave         $40    │
│                                 │
│  [+ Add Service]                │
│  [🔄 Refresh Services]          │
└─────────────────────────────────┘
```

### **Service Editor Modal**
```
┌───────────────────────────────────┐
│  📋 Edit Service              [X] │
├───────────────────────────────────┤
│  ✓ Synced with PayFast            │
│                                   │
│  Service Name:                    │
│  [Premium Haircut           ]     │
│                                   │
│  Description:                     │
│  [Expert haircuts...        ]     │
│                                   │
│  Price: $35 (synced)              │
│  [35.00                     ]     │
│                                   │
│  Link to PayFast Service:         │
│  [Haircut Service - $35     ▼]    │
│                                   │
│  [🗑️ Delete Service Card]        │
│                                   │
│  [Close]                          │
└───────────────────────────────────┘
```

---

## 🔧 Technical Details

### **Service Detection Logic**

The system looks for:
- Elements with classes: `service-card`, `service-item`, `service`, `pricing`, `package`
- Attribute patterns: `[class*="service-"]`, `[class*="pricing"]`
- Requires minimum 2 similar cards to confirm service section

### **Service Card Structure Detection**

For each detected service card, the system finds:
- **Title**: `h3`, `.service-title`, `[class*="title"]`
- **Description**: `p`, `.service-description`, `[class*="description"]`
- **Price**: `.price`, `[class*="price"]`, `.cost`
- **Button**: `button`, `a.btn`, `.button`

### **Data Attributes**

Service cards are marked with:
- `data-service-id`: Links to PayFast service ID or custom ID
- `data-synced`: "true" if synced with PayFast, "false" if custom
- `data-payment-url`: The PayFast payment URL for the button

---

## 💡 Best Practices

### **For Template Creators:**
1. Use consistent class names (e.g., `service-card` for all cards)
2. Structure: Title (h3) → Description (p) → Price (.price) → Button
3. Keep cards in same parent container
4. Use semantic HTML for better detection

### **For Template Users:**
1. **First time**: Click "Sync with PayFast" to auto-populate
2. **Quick edits**: Normal click for text changes
3. **Full control**: Shift+click for service editor
4. **Add more**: Use "+ Add Service" button
5. **Keep synced**: Click "Refresh Services" if PayFast services change

### **Payment Integration:**
- Synced services automatically link to PayFast
- Custom services need manual PayFast linking
- Price changes in PayFast won't affect display until refresh

---

## 🎯 Workflow Examples

### **Scenario 1: Using Template with PayFast Services**

```
1. Upload barber template
2. System detects 4 service cards
3. Prompt: "Sync with PayFast?" → Click YES
4. System fetches your services:
   - Haircut ($35)
   - Beard Trim ($25)
   - Shave ($40)
5. Template now shows YOUR services
6. Buttons automatically link to payments
7. Edit descriptions as needed
```

### **Scenario 2: Adding New Service**

```
1. Template has 3 services
2. Click "+ Add Service" in sidebar
3. New card appears (copied from last service)
4. Shows: "New Service - $0"
5. Shift+Click the new card
6. Fill in:
   - Name: "Full Grooming Package"
   - Description: "Complete treatment"
   - Price: $75
   - Link: Select "Full Package" from PayFast
7. Click Close
8. New service is ready!
```

### **Scenario 3: Custom Service (No PayFast)**

```
1. Add new service card
2. Edit manually
3. Don't link to PayFast
4. Add custom button action or external link
5. Useful for:
   - Consultation services
   - External booking systems
   - Display-only information
```

---

## 🐛 Troubleshooting

### **Services Not Detected**
- Check if template has 2+ similar service cards
- Ensure cards have consistent structure
- Add class names like `service-card` to cards

### **Sync Not Working**
- Verify you have services created in PayFast
- Check Firebase connection
- Look for console errors

### **Button Not Linking**
- Ensure service is synced (check green badge)
- Click "Refresh Services" to update links
- Check that button element exists in card

### **Edits Not Saving**
- Normal clicks are instant (edit text directly)
- Service editor changes apply on Close
- Use "Generate Website" to save all changes

---

## 🚀 Future Enhancements

Potential features to add:
- [ ] Drag-to-reorder services
- [ ] Service templates (different card styles)
- [ ] Bulk edit multiple services
- [ ] Image upload for services
- [ ] Advanced pricing (from/to prices)
- [ ] Service categories
- [ ] Featured service highlighting
- [ ] Duplicate service card styling

---

## 📝 Summary

The Service Editing System makes it easy to:
- ✅ Automatically detect and manage services
- ✅ Sync with PayFast for payments
- ✅ Add/remove service cards dynamically
- ✅ Edit services inline or via full editor
- ✅ Maintain consistency with payment system
- ✅ Customize service display

**Remember the 3 editing modes:**
1. **Click** - Quick text edits
2. **Ctrl+Click** - Background styling
3. **Shift+Click** - Full service editor

Happy editing! 🎉

