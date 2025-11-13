# 🤖 AI Template Creation Guide for GrapesJS Editor

## 🎯 **Purpose**

This guide is **specifically designed for AI assistants** to create production-ready, fully-editable website templates that work perfectly with our GrapesJS-based visual editor. Follow this guide exactly to ensure all elements are editable and the template loads correctly.

---

## ⚡ **CRITICAL RULES - FOLLOW THESE FIRST**

### 🔴 **RULE #1: Navigation MUST Use `<a>` Tags**
```html
❌ NEVER: <button class="cta-button">Book Now</button>
✅ ALWAYS: <a href="#contact" class="cta-button">Book Now</a>
```
**Why:** GrapesJS recognizes `<a>` tags as links with editable `href` attributes. Buttons cannot navigate to URLs or sections.

### 🔴 **RULE #2: ALL Sections MUST Have Unique IDs**
```html
❌ NEVER: <section class="hero">...</section>
✅ ALWAYS: <section class="hero" id="home">...</section>
```
**Why:** Users need IDs for anchor navigation. The editor recognizes `id` attributes for section linking.

### 🔴 **RULE #3: Images MUST Use Relative Paths**
```html
❌ NEVER: <img src="https://example.com/logo.png" />
❌ NEVER: <img src="/logo.png" />
✅ ALWAYS: <img src="images/logo.png" alt="Logo" />
```
**Why:** The editor extracts images from ZIP files and converts them to base64 during template load. Relative paths like `images/filename.jpg` are automatically processed.

### 🔴 **RULE #4: Style Links as Buttons**
```css
/* Button classes MUST work for <a> tags */
.cta-button, .btn-primary {
    display: inline-block;    /* REQUIRED: Makes <a> look like button */
    text-decoration: none;     /* REQUIRED: Removes underline */
    cursor: pointer;           /* Makes it clear it's clickable */
    /* ... rest of styles ... */
}
```

---

## 📋 **Template File Structure**

### **Required Structure:**
```
template-name.zip
├── index.html          # REQUIRED: Complete HTML with inline <style> and <script>
└── images/             # REQUIRED: All images in this folder
    ├── logo.png        # Logo (transparent PNG, 200x50px recommended)
    ├── hero-bg.jpg     # Hero background (1920x1080px recommended)
    ├── about.jpg       # About section image (800x600px recommended)
    └── [other-images].jpg/png
```

### **File Format Rules:**
- ✅ **HTML**: Single `index.html` file with all CSS in `<style>` tag and JS in `<script>` tag
- ✅ **Images**: All in `images/` folder, referenced as `images/filename.jpg`
- ✅ **No external dependencies**: No CDN links, no external fonts (use system fonts)
- ✅ **No frameworks**: No React, Vue, jQuery, Bootstrap, etc.

---

## 🎨 **How GrapesJS Recognizes Components**

### **Automatic Component Recognition:**

GrapesJS automatically recognizes these HTML elements as editable components:

| HTML Element | How It's Recognized | Editable Properties |
|-------------|---------------------|---------------------|
| `<a>` | Link component | `href`, `target`, text content via Traits panel |
| `<button>` | Button component | `text`, `href` (custom), link-type (custom trait) |
| `<img>` | Image component | `src`, `alt` - users can double-click to replace |
| `<h1>`-`<h6>` | Text/Heading component | Text content, all typography styles |
| `<p>`, `<span>`, `<div>` | Text/Generic component | Text content, all styles |
| `<section>`, `<header>`, `<footer>` | Container components | All styles, layout properties |
| `<form>`, `<input>`, `<textarea>` | Form components | Form properties, styles |

### **Making Elements More Editable:**

While GrapesJS recognizes elements automatically, you can enhance editability with semantic HTML and clear class names:

```html
<!-- ✅ GOOD: Clear structure, easily editable -->
<section class="hero-section" id="home">
    <div class="container">
        <h1 class="hero-title">Welcome to Our Business</h1>
        <p class="hero-description">Professional services you can trust</p>
        <a href="#contact" class="cta-button">Get Started</a>
    </div>
</section>

<!-- ❌ BAD: Unclear structure, harder to edit -->
<div class="section-1">
    <div>
        <h1>Welcome</h1>
        <button onclick="goToContact()">Start</button>
    </div>
</div>
```

---

## 🎨 **Style Manager Sectors Available in Editor**

Our GrapesJS editor has these Style Manager sectors enabled. Structure your CSS to maximize editability:

### **1. General (Position & Display)**
Editable properties: `float`, `display`, `position`, `top`, `right`, `left`, `bottom`
```css
/* Users can edit these in Style Manager → General */
.element {
    position: relative;
    display: flex;
    top: 0;
    left: 0;
}
```

### **2. Dimension (Size & Spacing)**
Editable properties: `width`, `height`, `max-width`, `min-height`, `margin`, `padding`
```css
/* Users can edit these in Style Manager → Dimension */
.card {
    width: 100%;
    max-width: 400px;
    padding: 2rem;
    margin: 1rem auto;
}
```

### **3. Typography**
Editable properties: `font-family`, `font-size`, `font-weight`, `letter-spacing`, `color`, `line-height`, `text-align`, `text-decoration`, `text-shadow`
```css
/* Users can edit these in Style Manager → Typography */
.heading {
    font-family: Arial, sans-serif;
    font-size: 2.5rem;
    font-weight: 700;
    color: #1f2937;
    text-align: center;
}
```

### **4. Decorations (Basic Styling)**
Editable properties: `background-color`, `border-radius`, `border`, `box-shadow`, `background`
```css
/* Users can edit these in Style Manager → Decorations */
.button {
    background-color: #2563eb;
    border-radius: 8px;
    border: none;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
```

### **5. Background Pro (Advanced Backgrounds)**
Editable properties: `background`, `background-image`, `background-size`, `background-repeat`, `background-position`, `background-attachment`, `mix-blend-mode`, `opacity`
```css
/* Users can edit these in Style Manager → Background Pro */
.hero {
    background: linear-gradient(135deg, #2563eb, #1e40af);
    background-image: url('images/hero-bg.jpg');
    background-size: cover;
    background-position: center;
    opacity: 1;
}
```

### **6. Filters**
Editable properties: `filter`, `backdrop-filter`
```css
/* Users can edit these in Style Manager → Filters */
.header {
    backdrop-filter: blur(10px);
    filter: brightness(1);
}
```

### **7. Transform**
Editable properties: `transform`, `transform-origin`
```css
/* Users can edit these in Style Manager → Transform */
.card:hover {
    transform: translateY(-10px) scale(1.05);
    transform-origin: center;
}
```

### **8. Transitions**
Editable properties: `transition`, `transition-property`, `transition-duration`, `transition-timing-function`, `transition-delay`
```css
/* Users can edit these in Style Manager → Transitions */
.button {
    transition: all 0.3s ease;
    transition-property: background-color, transform;
    transition-duration: 0.3s;
}
```

---

## 🖼️ **Image Handling Best Practices**

### **Image Path Format:**
```html
<!-- ✅ CORRECT: Relative path from images folder -->
<img src="images/logo.png" alt="Company Logo" />
<img src="images/hero-bg.jpg" alt="Hero Background" />

<!-- ❌ WRONG: Absolute paths, CDN, or wrong folder -->
<img src="/logo.png" />
<img src="https://example.com/logo.png" />
<img src="assets/logo.png" />
```

### **CSS Background Images:**
```css
/* ✅ CORRECT: Relative path from images folder */
.hero {
    background-image: url('images/hero-bg.jpg');
}

/* ❌ WRONG: Absolute paths */
.hero {
    background-image: url('/images/hero-bg.jpg');
    background-image: url('https://example.com/bg.jpg');
}
```

### **Image Optimization:**
- **Logo**: PNG with transparency, 200x50px to 400x100px
- **Hero backgrounds**: JPG, 1920x1080px (optimized for web)
- **Section images**: JPG, 800x600px to 1200x900px
- **Icons**: Use emoji or simple SVG inline (avoid external SVG files)
- **File sizes**: Keep images under 500KB each

---

## 🎨 **CSS Structure for Maximum Editability**

### **Use CSS Custom Properties (Variables):**
```css
:root {
    /* Color Palette - Users can edit individual colors */
    --primary-color: #2563eb;
    --primary-dark: #1e40af;
    --primary-light: #3b82f6;
    --secondary-color: #f59e0b;
    --text-dark: #1f2937;
    --text-light: #6b7280;
    --bg-light: #f9fafb;
    --white: #ffffff;
    
    /* Spacing - Users can adjust spacing consistently */
    --section-padding: 5rem 2rem;
    --container-width: 1200px;
    
    /* Shadows - Consistent shadow styles */
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    
    /* Transitions - Smooth animations */
    --transition-fast: 0.2s ease;
    --transition-normal: 0.3s ease;
}
```

**Note:** While CSS variables are useful for consistency, users can still edit individual properties in the Style Manager. Variables make templates easier to maintain but don't limit editability.

### **Hover States for Interactive Elements:**
```css
/* Make hover effects editable in Style Manager → States → :hover */
.button {
    background-color: var(--primary-color);
    transition: all 0.3s ease;
}

.button:hover {
    background-color: var(--primary-dark);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
}

.card {
    box-shadow: var(--shadow-md);
    transition: all 0.3s ease;
}

.card:hover {
    transform: translateY(-10px);
    box-shadow: var(--shadow-xl);
}
```

**Users can edit hover states:** Select element → Style Manager → States dropdown → Select `:hover` → Edit properties

### **Avoid `!important` in Template CSS:**
```css
/* ❌ BAD: !important prevents user overrides */
.button {
    background-color: #2563eb !important;
}

/* ✅ GOOD: No !important, users can override */
.button {
    background-color: #2563eb;
}
```

**Why:** GrapesJS applies user styles, but `!important` makes overrides difficult. Template CSS should be baseline styles that users can modify.

---

## 🔗 **Link & Button Components**

### **Navigation Links (Use `<a>` Tags):**
```html
<!-- Section Navigation -->
<a href="#home" class="nav-link">Home</a>
<a href="#about" class="nav-link">About</a>
<a href="#services" class="nav-link">Services</a>
<a href="#contact" class="nav-link">Contact</a>

<!-- CTA Buttons (styled as buttons but use <a>) -->
<a href="#contact" class="cta-button">Book Appointment</a>
<a href="#services" class="btn-primary">View Services</a>

<!-- External Links -->
<a href="https://example.com" class="btn-secondary" target="_blank">Visit Website</a>

<!-- WhatsApp Links -->
<a href="https://wa.me/27123456789?text=Hi,%20I%20want%20to%20book" class="btn-whatsapp">
    📱 WhatsApp Us
</a>
```

### **Button Styling for Links:**
```css
/* Make <a> tags look like buttons */
.cta-button,
.btn-primary,
.btn-secondary {
    display: inline-block;      /* REQUIRED: Makes <a> behave like button */
    text-decoration: none;       /* REQUIRED: Removes underline */
    padding: 1rem 2.5rem;
    background: var(--primary-color);
    color: var(--white);
    border-radius: 50px;
    font-weight: 600;
    font-size: 1.1rem;
    cursor: pointer;
    transition: var(--transition-normal);
    text-align: center;
}

.cta-button:hover,
.btn-primary:hover {
    background: var(--primary-dark);
    transform: translateY(-3px);
    box-shadow: var(--shadow-lg);
}
```

### **Form Submit Buttons (Use `<button>`):**
```html
<!-- ✅ CORRECT: <button> for form submissions -->
<form class="contact-form">
    <input type="text" placeholder="Name" />
    <input type="email" placeholder="Email" />
    <textarea placeholder="Message"></textarea>
    <button type="submit" class="submit-btn">Send Message</button>
</form>
```

---

## 📝 **Complete Template Boilerplate**

Here's a complete, production-ready template structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Professional business website template">
    <title>Business Name - Professional Services</title>
    
    <style>
        /* =====================================================
           PROFESSIONAL CSS - FULLY EDITABLE IN GRAPESJS
           ===================================================== */
        
        /* CSS Reset & Base Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            /* Color Palette - Edit in Style Manager → Individual Colors */
            --primary-color: #2563eb;
            --primary-dark: #1e40af;
            --primary-light: #3b82f6;
            --secondary-color: #f59e0b;
            --text-dark: #1f2937;
            --text-light: #6b7280;
            --bg-light: #f9fafb;
            --white: #ffffff;
            
            /* Spacing Variables */
            --section-padding: 5rem 2rem;
            --container-width: 1200px;
            
            /* Shadow Variables */
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
            
            /* Transition Variables */
            --transition-fast: 0.2s ease;
            --transition-normal: 0.3s ease;
            --transition-slow: 0.5s ease;
        }
        
        html {
            scroll-behavior: smooth;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: var(--text-dark);
            background: var(--white);
            overflow-x: hidden;
        }
        
        /* Container - Editable in Style Manager → Dimension */
        .container {
            max-width: var(--container-width);
            margin: 0 auto;
            padding: 0 2rem;
        }
        
        /* Header - Editable in Style Manager */
        header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            box-shadow: var(--shadow-md);
            z-index: 1000;
            transition: var(--transition-normal);
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem 2rem;
            max-width: var(--container-width);
            margin: 0 auto;
        }
        
        .logo {
            height: 50px;
            transition: var(--transition-normal);
        }
        
        .logo:hover {
            transform: scale(1.05);
        }
        
        nav {
            display: flex;
            gap: 2.5rem;
            align-items: center;
        }
        
        nav a {
            color: var(--text-dark);
            text-decoration: none;
            font-weight: 500;
            font-size: 0.95rem;
            position: relative;
            transition: var(--transition-fast);
        }
        
        nav a::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 0;
            width: 0;
            height: 2px;
            background: var(--primary-color);
            transition: var(--transition-normal);
        }
        
        nav a:hover {
            color: var(--primary-color);
        }
        
        nav a:hover::after {
            width: 100%;
        }
        
        /* Hero Section - Editable background, colors, spacing */
        .hero {
            position: relative;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
            color: var(--white);
            padding: 12rem 2rem 8rem;
            margin-top: 70px;
            overflow: hidden;
            min-height: 600px;
            display: flex;
            align-items: center;
        }
        
        .hero::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('images/hero-bg.jpg') center/cover;
            opacity: 0.2;
            z-index: 0;
        }
        
        .hero-content {
            position: relative;
            z-index: 1;
            max-width: 800px;
            animation: fadeInUp 1s ease;
        }
        
        .hero h1 {
            font-size: 3.5rem;
            font-weight: 800;
            line-height: 1.2;
            margin-bottom: 1.5rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .hero p {
            font-size: 1.4rem;
            margin-bottom: 2.5rem;
            opacity: 0.95;
            font-weight: 300;
        }
        
        /* CTA Button - Styled as button but uses <a> tag */
        .cta-button {
            display: inline-block;
            padding: 1rem 2.5rem;
            background: var(--white);
            color: var(--primary-color);
            text-decoration: none;
            font-weight: 600;
            font-size: 1.1rem;
            border-radius: 50px;
            box-shadow: var(--shadow-lg);
            transition: var(--transition-normal);
            cursor: pointer;
            text-align: center;
        }
        
        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-xl);
            color: var(--primary-color);
        }
        
        /* Sections - All editable */
        section {
            padding: var(--section-padding);
        }
        
        .section-title {
            font-size: 2.5rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 1rem;
            color: var(--text-dark);
        }
        
        .section-subtitle {
            text-align: center;
            font-size: 1.2rem;
            color: var(--text-light);
            margin-bottom: 4rem;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }
        
        /* Service Cards - Hover effects editable */
        .services-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2.5rem;
            margin-top: 3rem;
        }
        
        .service-card {
            background: var(--white);
            padding: 2.5rem;
            border-radius: 16px;
            box-shadow: var(--shadow-md);
            transition: var(--transition-normal);
            position: relative;
            overflow: hidden;
        }
        
        .service-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
            transform: scaleX(0);
            transition: var(--transition-normal);
        }
        
        .service-card:hover {
            transform: translateY(-10px);
            box-shadow: var(--shadow-xl);
        }
        
        .service-card:hover::before {
            transform: scaleX(1);
        }
        
        /* Responsive Design */
        @media (max-width: 968px) {
            :root {
                --section-padding: 3rem 1.5rem;
            }
            
            .hero h1 {
                font-size: 2.2rem;
            }
            
            .services-grid {
                grid-template-columns: 1fr;
            }
        }
        
        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body>
    <!-- HEADER -->
    <header id="header">
        <div class="header-content">
            <img src="images/logo.png" alt="Business Logo" class="logo">
            <nav>
                <a href="#home">Home</a>
                <a href="#about">About</a>
                <a href="#services">Services</a>
                <a href="#contact">Contact</a>
            </nav>
        </div>
    </header>

    <!-- HERO SECTION - MUST have id for anchor navigation -->
    <section class="hero" id="home">
        <div class="container">
            <div class="hero-content">
                <h1>Transform Your Business</h1>
                <p>Professional solutions that drive results</p>
                <!-- ✅ Use <a> tag for navigation, NOT <button> -->
                <a href="#contact" class="cta-button">Get Started Today</a>
            </div>
        </div>
    </section>

    <!-- ABOUT SECTION - MUST have id -->
    <section class="about" id="about">
        <div class="container">
            <h2 class="section-title">About Us</h2>
            <p class="section-subtitle">We deliver excellence through innovation</p>
            <!-- Content here -->
        </div>
    </section>

    <!-- SERVICES SECTION - MUST have id -->
    <section class="services" id="services">
        <div class="container">
            <h2 class="section-title">Our Services</h2>
            <div class="services-grid">
                <div class="service-card">
                    <h3>Service 1</h3>
                    <p>Description of service</p>
                </div>
                <!-- More service cards -->
            </div>
        </div>
    </section>

    <!-- CONTACT SECTION - MUST have id -->
    <section class="contact" id="contact">
        <div class="container">
            <h2 class="section-title">Get In Touch</h2>
            <form class="contact-form">
                <input type="text" placeholder="Name" required>
                <input type="email" placeholder="Email" required>
                <textarea placeholder="Message" required></textarea>
                <!-- ✅ Use <button> for form submission -->
                <button type="submit" class="submit-btn">Send Message</button>
            </form>
        </div>
    </section>

    <script>
        /* =====================================================
           JAVASCRIPT - Interactive Features
           ===================================================== */
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const headerHeight = 70;
                    const targetPosition = target.offsetTop - headerHeight;
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // Header scroll effect
        window.addEventListener('scroll', () => {
            const header = document.getElementById('header');
            if (window.pageYOffset > 100) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    </script>
</body>
</html>
```

---

## ✅ **AI Template Creation Checklist**

Before finalizing a template, verify:

### **HTML Structure:**
- [ ] All major sections have unique `id` attributes (`id="home"`, `id="about"`, etc.)
- [ ] All navigation links use `<a>` tags, not `<button>` tags
- [ ] All CTA buttons use `<a>` tags with `href` attributes
- [ ] Form submit buttons use `<button type="submit">` (only for forms)
- [ ] All images use relative paths: `images/filename.jpg`
- [ ] Semantic HTML5 elements (`<header>`, `<nav>`, `<section>`, `<footer>`)

### **CSS Structure:**
- [ ] All CSS is in a `<style>` tag in the `<head>`
- [ ] CSS uses relative paths for images: `url('images/filename.jpg')`
- [ ] No `!important` rules that would prevent user overrides
- [ ] Hover states defined for interactive elements
- [ ] CSS variables defined in `:root` for consistency
- [ ] Responsive design with media queries
- [ ] All properties use values editable in Style Manager sectors

### **Images:**
- [ ] All images in `images/` folder
- [ ] All image references use `images/filename.jpg` format
- [ ] Images optimized for web (under 500KB each)
- [ ] Alt text provided for all images

### **JavaScript:**
- [ ] All JavaScript in `<script>` tag at end of `<body>`
- [ ] No external dependencies or CDN links
- [ ] Smooth scrolling implemented for anchor links
- [ ] Mobile menu functionality (if applicable)
- [ ] No console errors

### **Testing:**
- [ ] Template loads without errors
- [ ] All navigation links work correctly
- [ ] Images display correctly
- [ ] Responsive on mobile (test at 768px and 480px)
- [ ] All sections accessible via anchor links
- [ ] Hover effects work smoothly
- [ ] Form validation works (if forms included)

---

## 🎨 **Design Best Practices for AI**

### **Color Schemes:**
Choose one cohesive color scheme per template:

**Professional Blue:**
```css
--primary-color: #2563eb;
--primary-dark: #1e40af;
--primary-light: #3b82f6;
--secondary-color: #f59e0b;
```

**Creative Purple:**
```css
--primary-color: #7c3aed;
--primary-dark: #5b21b6;
--primary-light: #8b5cf6;
--secondary-color: #ec4899;
```

**Luxury Dark:**
```css
--primary-color: #111827;
--primary-dark: #000000;
--primary-light: #374151;
--secondary-color: #f59e0b;
```

### **Typography:**
- Use system fonts: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Heading hierarchy: `h1` (largest) → `h2` → `h3` → `h4` → `h5` → `h6` (smallest)
- Line height: 1.5-1.8 for body text, 1.2-1.3 for headings
- Font sizes: Use `rem` units for scalability (e.g., `1rem` = 16px base)

### **Spacing:**
- Consistent spacing using CSS variables or rem units
- Section padding: 4-6rem on desktop, 2-3rem on mobile
- Card padding: 1.5-2.5rem
- Element gaps: 1-3rem depending on context

### **Shadows & Depth:**
```css
/* Use shadow variables for consistent depth */
.card {
    box-shadow: var(--shadow-md);  /* Subtle depth */
}

.card-elevated {
    box-shadow: var(--shadow-lg);  /* More depth */
}

.card-hover {
    box-shadow: var(--shadow-xl);  /* Maximum depth on hover */
}
```

### **Animations:**
- Keep transitions smooth: 0.2s-0.5s duration
- Use `ease` or `ease-in-out` timing functions
- Add hover transforms: `translateY(-5px)` for lift effect
- Fade-in animations on scroll for sections

---

## 📦 **Final Template Package**

### **ZIP File Contents:**
```
template-name.zip
├── index.html          # Complete HTML with CSS and JS
└── images/
    ├── logo.png        # Required: Logo
    ├── hero-bg.jpg     # Recommended: Hero background
    ├── about.jpg       # Optional: About section image
    └── [other].jpg     # Optional: Additional images
```

### **Upload Process:**
1. Create template folder
2. Add `index.html` with all CSS and JS inline
3. Create `images/` folder
4. Add all images to `images/` folder
5. Zip the folder (not the files individually)
6. Upload ZIP file to admin panel

---

## 🚀 **Success Criteria**

A perfect GrapesJS template:
1. ✅ Loads without errors
2. ✅ All elements are editable (text, images, colors, spacing)
3. ✅ All navigation uses `<a>` tags
4. ✅ All sections have unique IDs
5. ✅ Images use relative paths (`images/filename.jpg`)
6. ✅ Mobile responsive (tested at 768px and 480px)
7. ✅ Smooth animations and transitions
8. ✅ Professional, modern design
9. ✅ No external dependencies
10. ✅ Hover effects on interactive elements
11. ✅ Form validation (if forms included)
12. ✅ Smooth scrolling for anchor links

---

## 💡 **Important Notes for AI**

1. **Always use `<a>` tags for navigation** - GrapesJS recognizes these as editable links
2. **Always add `id` attributes to sections** - Required for anchor navigation
3. **Always use relative image paths** - `images/filename.jpg` format is processed automatically
4. **Never use `!important` in template CSS** - Allows users to override styles easily
5. **Structure CSS for Style Manager** - Use properties available in the 8 Style Manager sectors
6. **Make hover states editable** - Users can edit `:hover` states in Style Manager → States
7. **Use semantic HTML** - Better component recognition in GrapesJS
8. **Keep JavaScript simple** - No frameworks, pure vanilla JS
9. **Test responsiveness** - Ensure mobile breakpoints work (768px, 480px)
10. **Optimize images** - Keep file sizes reasonable for fast loading

---

**This guide is all you need to create perfect, fully-editable GrapesJS templates! Follow it exactly, and your templates will work flawlessly in our visual editor.** 🎨✨
