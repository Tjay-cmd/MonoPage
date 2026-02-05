# Tutor Template

## tutor-modern.html

A modern, professional tutoring website template designed specifically for tutors using the MonoPage platform.

### Features

- **Clean, Educational Design**: Professional layout with warm orange/amber color scheme perfect for educational services
- **Classes Orbit Section**: Pre-configured section for the Classes Orbit Animation component
- **Calendar Integration**: Section ready for the booking calendar component
- **Responsive Design**: Fully mobile-responsive with hamburger menu
- **Editable Elements**: All text content marked with `data-editable="true"` for easy customization in GrapesJS
- **Complete Sections**:
  - Hero section with call-to-action
  - Classes Orbit Animation section
  - About section with image placeholder
  - Services grid (6 service cards)
  - Calendar/Booking section
  - Testimonials section
  - Footer with contact information

### Usage

1. Upload this template via the Admin Portal
2. Users can select this template when creating their tutor website
3. The template includes placeholders for:
   - Classes Orbit component (will be automatically populated when tutor adds classes)
   - Booking Calendar component (will be automatically populated with tutor's calendar)
4. All text content can be edited through the GrapesJS editor

### Component Integration

The template includes two key component placeholders:

1. **Classes Orbit Animation**:
   ```html
   <div class="class-orbit-container" data-class-ids="" data-button-color="#f59e0b" data-animation-speed="normal"></div>
   ```
   - This will be automatically populated when the tutor adds classes to their website
   - The animation will display selected classes in an orbit animation

2. **Booking Calendar**:
   ```html
   <div class="booking-calendar-container" data-calendar-user-id="" ...>
   ```
   - This will be automatically populated with the tutor's calendar settings
   - Students can book lessons directly from the website

### Customization

All major text elements are marked with `data-editable="true"` for easy editing:
- Logo/Name
- Hero title and description
- Section titles and subtitles
- About text
- Service descriptions
- Testimonial content
- Footer contact information

### Color Scheme

- Primary: #f59e0b (Orange/Amber)
- Secondary: #d97706 (Darker Orange)
- Background: #f9fafb (Light Gray)
- Text: #1f2937 (Dark Gray)
- Accent: #fef3c7 (Light Amber)

### Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive breakpoint: 768px

