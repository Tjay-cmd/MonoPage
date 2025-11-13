# Public Assets Folder

This folder contains static assets that are served directly by Next.js.

## 📁 Folder Structure

```
public/
├── images/          # Images (logos, icons, backgrounds, etc.)
└── README.md        # This file
```

## 📖 Usage

### Adding Images

1. **Place images in `public/images/` folder**
   ```
   public/images/logo.png
   public/images/hero-background.jpg
   ```

2. **Reference them in your code**
   ```tsx
   // In React components
   <img src="/images/logo.png" alt="Logo" />
   
   // In Next.js Image component (recommended)
   import Image from 'next/image';
   <Image src="/images/logo.png" alt="Logo" width={200} height={50} />
   
   // In CSS/globals.css
   background-image: url('/images/hero-background.jpg');
   ```

### Important Notes

- ✅ Files in `public/` are served from the root path `/`
- ✅ Use `/images/filename.png` not `/public/images/filename.png`
- ✅ Next.js will automatically serve these files
- ✅ All paths start with `/` (root of your domain)

### Recommended Image Sizes

- **Logos:** 200-400px width (PNG with transparency)
- **Icons:** 64x64px to 256x256px (PNG/SVG)
- **Hero Images:** 1920x1080px (JPG/WebP, optimized)
- **Card Images:** 800x600px (JPG/WebP)
- **Thumbnails:** 400x300px (JPG/WebP)

### Image Optimization Tips

1. **Use WebP format** for better compression
2. **Compress images** before uploading (use tools like TinyPNG)
3. **Keep file sizes** under 500KB per image
4. **Use Next.js Image component** for automatic optimization

### Example Usage in Dashboard

```tsx
// Category card icons
<img src="/images/barber-icon.png" alt="Barber" />

// Background images
<div style={{ backgroundImage: 'url(/images/category-bg.jpg)' }} />

// Logo
<img src="/images/logo.png" alt="BusinessBuilder" />
```

## 🚀 Next Steps

1. Add your images to `public/images/`
2. Reference them using `/images/filename.ext`
3. Images will be automatically available in your app!

