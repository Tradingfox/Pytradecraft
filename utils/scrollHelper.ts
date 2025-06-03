/**
 * ScrollHelper utility for managing auto-scrolling behavior in feed containers
 * 
 * This utility helps preserve user scroll position in containers with live updating content.
 * It maintains the scroll position unless the user was already at the bottom of the container.
 * It also prevents page jumping when data is updated.
 */

import { useRef, UIEvent, useState, useLayoutEffect, useEffect } from 'react';

// Type definition for the scroll element references
interface ScrollTracking {
  refs: {[key: string]: HTMLDivElement | null};
  isAtBottom: {[key: string]: boolean};
  userHasScrolled: {[key: string]: boolean};
}

/**
 * Hook to manage scroll position on auto-updating content
 * @param dependencies Array of dependencies that, when changed, should trigger scroll position management
 */
export const useScrollControl = (dependencies: any[]) => {
  const scrollTracking = useRef<ScrollTracking>({
    refs: {},
    isAtBottom: {},
    userHasScrolled: {}
  });
  
  // Store page scroll position to prevent jumping
  const [pageScrollPosition, setPageScrollPosition] = useState<number | null>(null);
  
  // Mark components as having updated data
  const [updateFlag, setUpdateFlag] = useState<number>(0);
  
  // Save the current window scroll position before updates
  useLayoutEffect(() => {
    // Only trigger when dependencies actually change (have new data)
    const anyChanges = dependencies.some((dep, i) => 
      i < dependencies.length - 1 && 
      dep !== dependencies[i + 1] && 
      (dep?.length || 0) !== (dependencies[i + 1]?.length || 0)
    );
    
    if (anyChanges) {
      // Save current scroll position before the update
      setPageScrollPosition(window.scrollY);
      // Trigger update flag
      setUpdateFlag(prev => prev + 1);
    }
  }, [...dependencies.map(dep => dep?.length || 0)]);
  
  // Restore the window scroll position after component updates
  useLayoutEffect(() => {
    if (pageScrollPosition !== null) {
      // Use requestAnimationFrame to ensure the browser has finished layout
      requestAnimationFrame(() => {
        // Restore scroll position after the update
        window.scrollTo({
          top: pageScrollPosition,
          behavior: 'auto' // Use 'auto' to avoid smooth scrolling which could be visible
        });
      });
    }
  }, [updateFlag]);

  // Update scroll position for containers when dependencies change
  useLayoutEffect(() => {
    Object.entries(scrollTracking.current.refs).forEach(([key, ref]) => {
      if (ref && scrollTracking.current.isAtBottom[key] && !scrollTracking.current.userHasScrolled[key]) {
        ref.scrollTop = ref.scrollHeight;
      }
    });
  }, [...dependencies]);
  // Create ref callback for scroll containers
  const registerScrollContainer = (key: string) => (element: HTMLDivElement | null) => {
    scrollTracking.current.refs[key] = element;
    
    // Initially assume container is at bottom if newly created
    if (element && scrollTracking.current.isAtBottom[key] === undefined) {
      scrollTracking.current.isAtBottom[key] = true;
      scrollTracking.current.userHasScrolled[key] = false;
    }
  };

  // Track scroll position
  const handleScroll = (key: string) => (e: UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    // Consider "at bottom" if within 5px of the bottom (accounts for rounding issues)
    const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 5;
    scrollTracking.current.isAtBottom[key] = isAtBottom;
    
    // Mark that user has manually scrolled this container
    scrollTracking.current.userHasScrolled[key] = true;
    
    // If user scrolls to the bottom, allow auto-scrolling to resume
    if (isAtBottom) {
      scrollTracking.current.userHasScrolled[key] = false;
    }
  };
  return {
    registerScrollContainer,
    handleScroll
  };
};

/**
 * Hook to prevent page scroll jumping when opening or working with Market Hub
 * Use this in parent components to prevent entire page jumping
 */
export const usePreventScrollJump = () => {
  const savedPagePosition = useRef<number | null>(null);
  
  // Save current position when component mounts
  useEffect(() => {
    const savePosition = () => {
      savedPagePosition.current = window.scrollY;
    };
    
    // Listen for scroll events to track user's position
    window.addEventListener('scroll', savePosition, { passive: true });
    
    // Initial position save
    savePosition();
    
    return () => {
      window.removeEventListener('scroll', savePosition);
    };
  }, []);
  
  // Restore position after renders
  useLayoutEffect(() => {
    if (savedPagePosition.current !== null) {
      window.scrollTo({ top: savedPagePosition.current, behavior: 'auto' });
    }
  });
  
  // Provide a function to explicitly restore position when needed
  const restorePosition = () => {
    if (savedPagePosition.current !== null) {
      window.scrollTo({ top: savedPagePosition.current, behavior: 'auto' });
    }
  };
  
  return { restorePosition };
};
