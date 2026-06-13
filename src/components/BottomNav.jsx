import { useState, useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';

export default function BottomNav({ currentTab, onNavClick, onToggleSidebar, isSidebarOpen, items = [] }) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = (e) => {
      const target = e.target;
      if (!target) return;

      const isPageScroll = target === document || target === document.documentElement || target === document.body;
      const isMainContainer = target.id === 'main-scroll-container' || 
                              target.classList?.contains('main-content') || 
                              target.classList?.contains('mobile-screen');

      if (!isPageScroll && !isMainContainer) {
        return;
      }

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = isPageScroll 
            ? (window.scrollY || document.documentElement.scrollTop) 
            : target.scrollTop;
          const delta = currentScrollY - lastScrollY.current;

          if (currentScrollY <= 10) {
            setVisible(true);
            lastScrollY.current = currentScrollY;
          } else if (Math.abs(delta) > 10) {
            if (delta > 0 && currentScrollY > 60) {
              setVisible(false);
            } else if (delta < 0) {
              setVisible(true);
            }
            lastScrollY.current = currentScrollY;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  const isNavVisible = visible && !isSidebarOpen;

  return (
    <nav className={`bottom-nav ${isNavVisible ? '' : 'bottom-nav-hidden'}`}>
      {items.map((item) => {
        if (item.isMenu) {
          return (
            <button
              key="menu"
              className="bottom-nav-btn bottom-nav-menu"
              onClick={onToggleSidebar}
              aria-label="Buka Menu"
            >
              <Menu size={20} />
              <span className={item.label.length > 8 ? 'text-long' : ''}>{item.label}</span>
            </button>
          );
        }
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={`bottom-nav-btn ${currentTab === item.id ? 'active' : ''}`}
            onClick={() => onNavClick(item.id)}
          >
            <Icon size={20} />
            <span className={item.label.length > 8 ? 'text-long' : ''}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
