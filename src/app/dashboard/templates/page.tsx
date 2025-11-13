'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSubscription } from '@/hooks/useSubscription';
import { 
  ArrowLeft,
  Eye,
  Palette,
  Monitor,
  Smartphone,
  Filter,
  Search
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  previewImage: string;
  previewImageUrl?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  editableElements: EditableElement[];
}

interface EditableElement {
  id: string;
  type: 'text' | 'color' | 'image' | 'font';
  label: string;
  selector: string;
  defaultValue?: string;
}

function TemplatesPageContent() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<'barber' | 'tutor' | 'photographer' | null>(null);
  const [focusedCategory, setFocusedCategory] = useState<'barber' | 'tutor' | 'photographer' | null>(null);
  const searchParams = useSearchParams();
  const { subscription, loading: subscriptionLoading, hasTierAccess } = useSubscription();
  const canUseTemplates = hasTierAccess('pro');
  const subscriptionTier = subscription?.tier ?? 'free';
  const showUpgradeBanner = !subscriptionLoading && !canUseTemplates;

  const ALLOWED_CATEGORIES = ['barber', 'tutor', 'photographer'] as const;
  const categories = [
    { id: 'all', name: 'All Templates', icon: Monitor },
    { id: 'barber', name: 'Barber', icon: Palette, tagline: 'Clean cuts and booking-friendly layouts' },
    { id: 'tutor', name: 'Tutor', icon: Monitor, tagline: 'Lesson-focused pages with clear CTAs' },
    { id: 'photographer', name: 'Photographer', icon: Eye, tagline: 'Portfolio-first designs with bold imagery' },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchTemplates();
      } else {
        router.push('/auth/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Auto-expand category when arriving with ?open=barber|tutor|photographer
  useEffect(() => {
    const open = (searchParams?.get('open') || '').toLowerCase();
    const only = (searchParams?.get('only') || '').toLowerCase();
    const isValid = (v: string) => v === 'barber' || v === 'tutor' || v === 'photographer';
    if (isValid(open)) setExpandedCategory(open as any);
    if (isValid(only)) {
      setExpandedCategory(only as any);
      setFocusedCategory(only as any);
    }
  }, [searchParams]);

  useEffect(() => {
    filterTemplates();
  }, [templates, selectedCategory, searchQuery]);

  const fetchTemplates = async () => {
    try {
      let authHeaders: Record<string, string> | undefined;
      const currentUser = auth.currentUser;

      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        authHeaders = { Authorization: `Bearer ${idToken}` };
      }

      const response = await fetch('/api/templates/list', {
        headers: {
          ...(authHeaders ?? {}),
        },
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(
          errorPayload?.details ||
            `Failed to retrieve templates (status ${response.status})`,
        );
      }

      const payload = await response.json();
      const templatesData = ((payload.templates ?? []) as Template[]).filter(
        (template) =>
          ALLOWED_CATEGORIES.includes(
            (template.category || '').toLowerCase() as (typeof ALLOWED_CATEGORIES)[number],
          ),
      );
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates([]);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'starter') {
        // Show starter templates (name contains 'Starter' or category is 'general')
        filtered = filtered.filter(template =>
          template.name.toLowerCase().includes('starter') ||
          template.category === 'general'
        );
      } else {
        filtered = filtered.filter(template => template.category === selectedCategory);
      }
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleUseTemplate = (templateId: string) => {
    if (!canUseTemplates) {
      alert('Upgrade to the Pro plan to customize premium templates.');
      return;
    }

    router.push(`/dashboard/templates/${templateId}/editor`);
  };

  // Group templates by category for block view
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Template[]> = { barber: [], tutor: [], photographer: [] };
    templates.forEach(t => {
      const key = (t.category || '').toLowerCase();
      if (groups[key]) groups[key].push(t);
    });
    return groups;
  }, [templates]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Centered and Prominent */}
      <div className="bg-white border-b border-gray-200 relative">
        {/* Back to Dashboard Button - Top Left Corner */}
        <div className="absolute top-4 left-4">
              <button
                onClick={() => router.push('/dashboard')}
            className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
              </button>
            </div>
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Choose Your Template</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Select a professional template to get started with your website
            </p>
          </div>
        </div>
      </div>

      {showUpgradeBanner && (
        <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 mt-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-6 py-4 rounded-xl shadow-sm">
            <p className="font-medium">
              Templates can be customized on the <span className="capitalize">{subscriptionTier}</span> plan.
              Upgrade to the <strong>Pro</strong> plan to start editing templates and enable PayFast services.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-[1800px] mx-auto px-6 sm:px-8 lg:px-12 py-10">
        {/* Search */}
        <div className="mb-10 flex justify-center">
          <div className="relative max-w-2xl w-full">
            <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
            />
          </div>
        </div>

        {/* If searching, show flat results; otherwise show category blocks */}
        {searchQuery ? (
          filteredTemplates.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredTemplates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  canUseTemplates={canUseTemplates}
                  onUseTemplate={handleUseTemplate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Filter className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No templates found</h3>
              <p className="text-lg text-gray-600">Try a different search term.</p>
            </div>
          )
        ) : (
          <div className="space-y-8">
            {(focusedCategory ? [focusedCategory] : (['barber','tutor','photographer'] as const)).map(cat => {
              const catMeta = categories.find(c => c.id === cat)!;
              const Icon = catMeta.icon as any;
              const items = groupedByCategory[cat] || [];
              const isOpen = expandedCategory === cat;
              return (
                 <div key={cat} className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-5">
                       <div className="w-14 h-14 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                         <Icon className="h-7 w-7" />
                      </div>
                      <div>
                         <div className="flex items-center gap-3">
                           <h3 className="text-2xl font-bold text-gray-900">{catMeta.name}</h3>
                           <span className="text-sm bg-gray-100 text-gray-700 px-4 py-1.5 rounded-full font-medium">{items.length} templates</span>
                        </div>
                        {catMeta.tagline && (
                           <p className="text-base text-gray-600 mt-2">{catMeta.tagline}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedCategory(isOpen ? null : cat)}
                       className={`px-6 py-3.5 rounded-xl text-base font-semibold transition-colors ${
                         isOpen 
                           ? 'bg-gray-100 text-gray-900' 
                           : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300'
                       }`}
                    >
                      {isOpen ? 'Hide templates' : 'View templates'}
                    </button>
                  </div>
                  {isOpen && (
                     <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                      {items.length > 0 ? (
                        items.map(t => (
                          <TemplateCard
                            key={t.id}
                            template={t}
                            canUseTemplates={canUseTemplates}
                            onUseTemplate={handleUseTemplate}
                          />
                        ))
                      ) : (
                        <div className="col-span-full text-center text-gray-500 py-8">No templates yet for this category.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal, reusable card component to keep JSX tidy
function TemplateCard({
  template,
  canUseTemplates,
  onUseTemplate,
}: {
  template: Template;
  canUseTemplates: boolean;
  onUseTemplate: (templateId: string) => void;
}) {
  const router = useRouter();
  const handleUseClick = () => onUseTemplate(template.id);
  return (
    <div
      className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 flex flex-col"
    >
      <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden relative">
        {(template.previewImageUrl || template.previewImage) ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={(template.previewImageUrl || template.previewImage)?.startsWith('http') 
                ? `/api/image-proxy?url=${encodeURIComponent(template.previewImageUrl || template.previewImage)}` 
                : (template.previewImageUrl || template.previewImage)
              } 
              alt={template.name} 
              className="w-full h-full object-cover"
              style={{ zIndex: 2 }}
              onError={(e) => {
                console.error('❌ Failed to load template preview image:', template.previewImageUrl || template.previewImage);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = target.parentElement?.querySelector('.preview-placeholder') as HTMLElement;
                if (placeholder) {
                  placeholder.style.display = 'flex';
                }
              }}
              onLoad={(e) => {
                console.log('✅ Template preview image loaded successfully for:', template.name);
                const placeholder = (e.target as HTMLImageElement).parentElement?.querySelector('.preview-placeholder') as HTMLElement;
                if (placeholder) {
                  placeholder.style.display = 'none';
                }
              }}
            />
            <div 
              className="preview-placeholder text-center text-gray-400 flex flex-col items-center justify-center h-full w-full absolute inset-0"
              style={{ zIndex: 1, display: 'none' }}
            >
              <Monitor className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">Loading preview...</p>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 flex flex-col items-center justify-center h-full w-full">
            <Monitor className="h-12 w-12 mx-auto mb-2" />
            <p className="text-sm">Preview</p>
            <p className="text-xs text-gray-400 mt-1">No preview available</p>
          </div>
        )}
      </div>

      <div className="p-7 flex flex-col flex-1">
        <div className="mb-5 flex-1">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-2xl font-bold text-gray-900 pr-3">{template.name}</h3>
            <span className="inline-block bg-orange-100 text-orange-800 text-sm px-4 py-2 rounded-full font-medium flex-shrink-0">
            {template.category}
          </span>
        </div>
          <p className="text-base text-gray-600 leading-relaxed">{template.description || 'No description available'}</p>
      </div>

        <div className="space-y-3 pt-5 border-t border-gray-200">
        <button
          onClick={handleUseClick}
          disabled={!canUseTemplates}
            className={`w-full py-3.5 px-5 rounded-xl font-semibold transition-colors flex items-center justify-center text-base ${
              canUseTemplates
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
        >
            <Palette className="h-5 w-5 mr-2" />
          {canUseTemplates ? 'Use Template' : 'Upgrade to Use'}
        </button>
        <button
            onClick={() => {
              // Open preview in a new tab
              const previewUrl = `/dashboard/templates/${template.id}/preview`;
              window.open(previewUrl, '_blank');
            }}
            className="w-full bg-white text-gray-700 border-2 border-gray-200 hover:border-gray-300 py-3 px-4 rounded-xl font-medium transition-colors text-base flex items-center justify-center"
        >
            <Eye className="h-5 w-5 mr-2" />
            Preview
        </button>
        </div>
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    }>
      <TemplatesPageContent />
    </Suspense>
  );
}