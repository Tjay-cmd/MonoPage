export function LoadingSkeleton({ type = 'card' }: { type?: 'card' | 'list' | 'text' | 'sidebar' }) {
  if (type === 'card') {
    return (
      <div className="animate-pulse bg-white rounded-xl p-6 border border-gray-200">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  if (type === 'sidebar') {
    return (
      <div className="animate-pulse p-6 space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
        <div className="h-8 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar skeleton */}
        <div className="w-64 bg-gray-100 h-screen">
          <LoadingSkeleton type="sidebar" />
        </div>
        
        {/* Main content skeleton */}
        <div className="flex-1 p-8">
          {/* Header skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
          </div>
          
          {/* Template cards skeleton */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <LoadingSkeleton type="card" />
            <LoadingSkeleton type="card" />
            <LoadingSkeleton type="card" />
          </div>
          
          {/* Services section skeleton */}
          <div className="mb-8 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <LoadingSkeleton type="card" />
            <LoadingSkeleton type="card" />
            <LoadingSkeleton type="card" />
          </div>
        </div>
      </div>
    </div>
  );
}
