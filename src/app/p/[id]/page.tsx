import { Metadata } from 'next';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const publicId = resolvedParams.id;

    // Extract userId and websiteId from the publicId
    const [userId, websiteId] = publicId.split('---', 2);

    if (!userId || !websiteId) {
      return {
        title: 'Website Not Found',
      };
    }

    // Get the website document
    const websiteDoc = await adminDb.collection('user_websites').doc(websiteId).get();

    if (!websiteDoc.exists) {
      return {
        title: 'Website Not Found',
      };
    }

    const websiteData = websiteDoc.data() || {};

    // Check if the website is published and the userId matches
    if (websiteData.status !== 'published' || websiteData.userId !== userId) {
      return {
        title: 'Website Not Found',
      };
    }

    return {
      title: websiteData.websiteName || 'Published Website',
      description: `View ${websiteData.websiteName} - created with our website builder`,
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Website Not Found',
    };
  }
}

export default async function PublishedWebsitePage({ params }: Props) {
  try {
    const resolvedParams = await params;
    const publicId = resolvedParams.id;

    console.log('🔍 Loading published website with publicId:', publicId);

    // Extract userId and websiteId from the publicId
    const [userId, websiteId] = publicId.split('---', 2);

    console.log('🔍 Extracted userId:', userId, 'websiteId:', websiteId);

    if (!userId || !websiteId) {
      console.log('❌ Invalid publicId format');
      notFound();
    }

    // Get the website document
    const websiteDoc = await adminDb.collection('user_websites').doc(websiteId).get();

    if (!websiteDoc.exists) {
      console.log('❌ Website document not found:', websiteId);
      notFound();
    }

    const websiteData = websiteDoc.data() || {};
    console.log('📄 Website data:', {
      id: websiteDoc.id,
      userId: websiteData.userId,
      status: websiteData.status,
      websiteName: websiteData.websiteName
    });

    // Check if the website is published and the userId matches
    if (websiteData.status !== 'published') {
      console.log('❌ Website is not published. Status:', websiteData.status);
      notFound();
    }

    if (websiteData.userId !== userId) {
      console.log('❌ UserId mismatch. Expected:', userId, 'Actual:', websiteData.userId);
      notFound();
    }

    console.log('✅ Website is valid and published');

    // Get the published URL for redirect after payment
    const publishedUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/p/${publicId}`;
    
    // Build the full HTML document
    const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${websiteData.websiteName || 'Published Website'}</title>
  <meta name="description" content="Created with our website builder">
  <style>${websiteData.savedCss || ''}</style>
</head>
<body>
  ${websiteData.savedHtml || ''}
  <script>${websiteData.savedJs || ''}</script>
  <script>
    // Initialize booking calendars on published website
    (function() {
      const calendarContainers = document.querySelectorAll('[data-calendar-user-id]');
      calendarContainers.forEach(container => {
        const userId = container.getAttribute('data-calendar-user-id');
        if (userId) {
          const calendarDiv = container.querySelector('[id^="booking-calendar-"]');
          if (calendarDiv && !calendarDiv.querySelector('iframe')) {
            const iframe = document.createElement('iframe');
            iframe.src = '/api/calendar/embed?userId=' + userId;
            iframe.style.width = '100%';
            iframe.style.height = '800px';
            iframe.style.minHeight = '600px';
            iframe.style.border = 'none';
            iframe.style.display = 'block';
            iframe.setAttribute('scrolling', 'no');
            iframe.title = 'Booking Calendar';
            
            // Auto-resize iframe based on content
            function handleResize(event) {
              if (event.data && event.data.type === 'calendar-resize') {
                iframe.style.height = event.data.height + 'px';
              }
            }
            window.addEventListener('message', handleResize);
            
            iframe.onload = function() {
              // Request height multiple times to ensure it's received
              setTimeout(function() {
                if (iframe.contentWindow) {
                  iframe.contentWindow.postMessage({ type: 'get-height' }, '*');
                }
              }, 100);
              
              setTimeout(function() {
                if (iframe.contentWindow) {
                  iframe.contentWindow.postMessage({ type: 'get-height' }, '*');
                }
              }, 500);
              
              setTimeout(function() {
                if (iframe.contentWindow) {
                  iframe.contentWindow.postMessage({ type: 'get-height' }, '*');
                }
              }, 1000);
            };
            calendarDiv.innerHTML = '';
            calendarDiv.appendChild(iframe);
          }
        }
      });
    })();
  </script>
  <script>
    // Store published website referrer for payment redirects
    // Customers visiting published site should redirect back to published site (not editor!)
    (function() {
      var publishedPageUrl = '${publishedUrl}';
      var websiteId = '${websiteId}';
      
      // Store published URL in localStorage when payment links are clicked
      function storePublishedReferrer() {
        try {
          // For published sites, store the published URL (not editor URL)
          localStorage.setItem('payment_referrer', publishedPageUrl);
          sessionStorage.setItem('payment_referrer', publishedPageUrl);
          console.log('✅ Stored published website referrer for payment redirect:', publishedPageUrl);
        } catch(e) {
          console.warn('Could not store published referrer:', e);
        }
      }
      
      // Store on page load
      storePublishedReferrer();
      
      // Handle payment link clicks to store referrer and modify URL
      document.addEventListener('click', function(e) {
        var target = e.target.closest('a[href*="payfast"], button[data-href*="payfast"], a.payment-link, button.payment-button');
        if (target) {
          var href = target.getAttribute('href') || target.getAttribute('data-href');
          if (href && (href.includes('payfast.co.za') || target.classList.contains('payment-link') || target.classList.contains('payment-button'))) {
            // Store published URL before navigation
            storePublishedReferrer();
            
            // Also try to add referrer to URL as query param
            try {
              var url = new URL(href);
              if (!url.searchParams.has('custom_str4')) {
                // Store published URL in custom_str4 (not base64, just the URL)
                url.searchParams.set('custom_str4', publishedPageUrl);
                if (target.tagName === 'A') {
                  target.setAttribute('href', url.toString());
                } else {
                  target.setAttribute('data-href', url.toString());
                }
                console.log('✅ Added published referrer to PayFast URL');
              }
            } catch(e) {
              console.warn('Could not modify PayFast URL:', e);
            }
          }
        }
      }, true); // Use capture phase to catch before navigation
    })();
  </script>
  <script type="text/javascript">
    // Simple Classes Display with Overlay
    (function() {
      var containers = document.querySelectorAll('.class-orbit-container[data-class-ids]');
      
      containers.forEach(function(container) {
        var classIds = container.getAttribute('data-class-ids');
        var buttonColor = container.getAttribute('data-button-color') || '#f59e0b';
        var tutorId = '${userId}';
        
        if (!classIds || !tutorId) return;
        
        fetch('/api/tutor/classes/public?userId=' + tutorId)
          .then(function(response) { return response.json(); })
          .then(function(data) {
            var allClasses = data.classes || [];
            var selectedClassIds = classIds.split(',').filter(function(id) { return id.trim(); });
            var selectedClasses = allClasses.filter(function(c) {
              return selectedClassIds.includes(c.id);
            });
            
            if (selectedClasses.length === 0) {
              container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6b7280;">No classes available</div>';
              return;
            }
            
            // Create simple grid layout
            var html = '<div style="position: relative; width: 100%; min-height: 500px; padding: 3rem 2rem; background: #f9fafb;">';
            html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; max-width: 1200px; margin: 0 auto;">';
            
            selectedClasses.forEach(function(classItem) {
              html += '<div style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); background: white; transition: transform 0.3s ease;">';
              
              if (classItem.coverImageUrl) {
                html += '<div style="position: relative; width: 100%; height: 200px; overflow: hidden;">';
                html += '<img src="' + classItem.coverImageUrl + '" alt="' + (classItem.name || 'Class') + '" style="width: 100%; height: 100%; object-fit: cover;" />';
                html += '<div style="position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.75), transparent);"></div>';
                html += '<div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 1rem; color: white;">';
                html += '<h3 style="font-size: 1.125rem; font-weight: 700; margin: 0 0 0.25rem 0; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">' + (classItem.name || 'Class') + '</h3>';
                if (classItem.description) {
                  html += '<p style="font-size: 0.875rem; margin: 0; opacity: 0.95; text-shadow: 0 1px 2px rgba(0,0,0,0.5); line-height: 1.4;">' + classItem.description + '</p>';
                }
                html += '</div></div>';
              } else {
                html += '<div style="width: 100%; height: 200px; background: ' + (classItem.color || '#f59e0b') + '; padding: 2rem 1.5rem; display: flex; flex-direction: column; justify-content: center; align-items: center; color: white;">';
                html += '<h3 style="font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem 0; text-align: center;">' + (classItem.name || 'Class') + '</h3>';
                if (classItem.description) {
                  html += '<p style="font-size: 0.875rem; margin: 0; opacity: 0.9; text-align: center; line-height: 1.4;">' + classItem.description + '</p>';
                }
                html += '</div>';
              }
              
              html += '<div style="padding: 1rem; background: #f9fafb; border-top: 1px solid #e5e7eb;">';
              html += '<p style="font-size: 0.875rem; color: #6b7280; margin: 0; text-align: center; font-weight: 500;">Select this class to enroll</p>';
              html += '</div>';
              html += '</div>';
            });
            
            html += '</div>';
            
            // Add overlay with Get Access button
            html += '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center; z-index: 10;">';
            html += '<div style="text-align: center; padding: 2rem; max-width: 500px;">';
            html += '<svg style="width: 80px; height: 80px; color: white; margin: 0 auto 1.5rem auto; display: block; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>';
            html += '<h3 style="color: white; font-size: 2rem; font-weight: 700; margin: 0 0 0.75rem 0; letter-spacing: -0.025em;">Enroll in Classes</h3>';
            html += '<p style="color: rgba(255,255,255,0.9); margin: 0 0 2rem 0; font-size: 1.0625rem; line-height: 1.6;">Get access to premium tutoring and exclusive resources</p>';
            html += '<button onclick="window.location.href=\'/enroll?tutorId=' + tutorId + '\'" style="padding: 1rem 3rem; background: linear-gradient(135deg, ' + buttonColor + ', ' + buttonColor + 'dd); color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 1.125rem; box-shadow: 0 4px 16px rgba(245,158,11,0.4); transition: all 0.3s; text-transform: uppercase; letter-spacing: 0.05em;" onmouseover="this.style.transform=\'translateY(-2px)\'; this.style.boxShadow=\'0 6px 20px rgba(245,158,11,0.5)\';" onmouseout="this.style.transform=\'translateY(0)\'; this.style.boxShadow=\'0 4px 16px rgba(245,158,11,0.4)\';">Get Access</button>';
            html += '</div></div>';
            html += '</div>';
            
            container.innerHTML = html;
          })
          .catch(function(error) {
            container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #ef4444;">Error loading classes</div>';
          });
      });
    })();
  </script>
</body>
</html>
    `;

    // Return the HTML directly
    return (
      <div dangerouslySetInnerHTML={{ __html: fullHtml }} />
    );

  } catch (error) {
    console.error('Error loading published website:', error);
    notFound();
  }
}
