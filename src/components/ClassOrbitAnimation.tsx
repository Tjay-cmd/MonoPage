'use client';

import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';

interface Class {
  id: string;
  name: string;
  description?: string;
  color?: string;
  coverImageUrl?: string | null;
  paymentLink?: string | null;
}

interface ClassOrbitAnimationProps {
  classes: Class[];
  buttonColor?: string;
  animationSpeed?: 'slow' | 'normal' | 'fast';
  onGetAccess?: () => void;
  selectedClassId?: string | null;
  onClassSelect?: (classId: string) => void;
  isLocked?: boolean;
}

export default function ClassOrbitAnimation({
  classes,
  buttonColor = '#f59e0b',
  animationSpeed = 'normal',
  onGetAccess,
  selectedClassId,
  onClassSelect,
  isLocked = true,
}: ClassOrbitAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isSpeedUp, setIsSpeedUp] = useState(false);
  const [stoppedClassId, setStoppedClassId] = useState<string | null>(selectedClassId || null);

  // Speed multipliers
  const speedMultipliers = {
    slow: 0.5,
    normal: 1,
    fast: 2,
  };

  const baseSpeed = speedMultipliers[animationSpeed];
  const currentSpeed = isSpeedUp ? baseSpeed * 3 : baseSpeed;

  // Clone classes for seamless loop (need at least 6 for smooth animation)
  const displayClasses = classes.length > 0 ? [...classes, ...classes, ...classes] : [];
  const classWidth = 320; // Width of each class card
  const gap = 24; // Gap between cards
  const totalWidth = displayClasses.length * (classWidth + gap);

  useEffect(() => {
    // Start animation after page load
    const startTimer = setTimeout(() => {
      setIsAnimating(true);
    }, 500);

    return () => {
      clearTimeout(startTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAnimating || stoppedClassId) return;

    let lastTime = performance.now();
    let position = currentPosition;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      // Update position
      position += (deltaTime * 0.1 * currentSpeed); // 0.1px per ms * speed multiplier

      // Reset position when we've moved one full set of classes
      if (position >= classes.length * (classWidth + gap)) {
        position = 0;
      }

      setCurrentPosition(position);

      if (containerRef.current) {
        containerRef.current.style.transform = `translateX(-${position}px)`;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, currentSpeed, classes.length, classWidth, gap, stoppedClassId]);

  // Handle speed up and stop on selected class
  useEffect(() => {
    if (selectedClassId && !stoppedClassId) {
      setIsSpeedUp(true);
      
      // Find the position of the selected class
      const classIndex = classes.findIndex(c => c.id === selectedClassId);
      if (classIndex !== -1) {
        // Calculate target position
        const targetPosition = classIndex * (classWidth + gap);
        
        // Animate to target position
        const animateToTarget = () => {
          if (containerRef.current) {
            const currentPos = currentPosition;
            const distance = targetPosition - (currentPos % (classes.length * (classWidth + gap)));
            
            if (Math.abs(distance) > 1) {
              const newPos = currentPos + (distance * 0.1);
              setCurrentPosition(newPos);
              containerRef.current.style.transform = `translateX(-${newPos}px)`;
              requestAnimationFrame(animateToTarget);
            } else {
              // Stop animation
              setStoppedClassId(selectedClassId);
              setIsSpeedUp(false);
              setIsAnimating(false);
            }
          }
        };
        
        setTimeout(() => {
          animateToTarget();
        }, 100);
      }
    }
  }, [selectedClassId, stoppedClassId, classes, classWidth, gap, currentPosition]);

  if (classes.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg">
        <p className="text-gray-500">No classes available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden" style={{ height: '400px' }}>
      {/* Animation Container */}
      <div
        ref={containerRef}
        className="flex transition-transform duration-300 ease-out"
        style={{
          width: `${totalWidth}px`,
          gap: `${gap}px`,
        }}
      >
        {displayClasses.map((classItem, index) => {
          const isSelected = stoppedClassId === classItem.id;
          const isLockedItem = isLocked && stoppedClassId && !isSelected;

          return (
            <div
              key={`${classItem.id}-${index}`}
              className="flex-shrink-0 rounded-xl shadow-xl overflow-hidden cursor-pointer transition-all duration-300 bg-white"
              style={{
                width: `${classWidth}px`,
                height: '360px',
                opacity: isLockedItem ? 0.3 : 1,
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                zIndex: isSelected ? 10 : 1,
              }}
              onClick={() => {
                if (!isLocked && onClassSelect) {
                  onClassSelect(classItem.id);
                }
              }}
            >
              {/* Cover Image or Color Background */}
              {classItem.coverImageUrl ? (
                <>
                  <div className="relative h-64 w-full overflow-hidden">
                    <img
                      src={classItem.coverImageUrl}
                      alt={classItem.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <h3 className="text-xl font-bold mb-1 drop-shadow-lg">{classItem.name}</h3>
                      {classItem.description && (
                        <p className="text-sm opacity-95 line-clamp-2 drop-shadow-md">{classItem.description}</p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-3 right-3 bg-orange-500 rounded-full p-1.5 shadow-lg">
                        <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="h-24 p-4 flex items-center justify-center bg-gray-50">
                    <p className="text-xs text-gray-600 font-medium">Click to enroll</p>
                  </div>
                </>
              ) : (
                <div
                  className="h-full flex flex-col"
                  style={{ backgroundColor: classItem.color || '#f59e0b' }}
                >
                  <div className="flex-1 p-6 flex flex-col justify-center text-white">
                    <h3 className="text-2xl font-bold mb-2 text-center">{classItem.name}</h3>
                    {classItem.description && (
                      <p className="text-sm opacity-90 mb-4 text-center">{classItem.description}</p>
                    )}
                  </div>
                  <div className="h-24 p-4 flex items-center justify-center bg-white/10">
                    <p className="text-xs text-white/90 font-medium">Click to enroll</p>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow-lg">
                      <svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lock Overlay */}
      {isLocked && !stoppedClassId && (
        <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center z-20">
          <div className="text-center">
            <Lock className="h-16 w-16 text-white mx-auto mb-4" />
            <button
              onClick={onGetAccess}
              className="px-8 py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: buttonColor }}
            >
              Get Access
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



