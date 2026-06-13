import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Target,
  FileSpreadsheet,
  ClipboardList,
  BookOpen,
  FileText,
  Menu,
  Smartphone
} from 'lucide-react';

export default function BottomNav({ currentTab, onNavClick, onToggleSidebar, user, isSidebarOpen }) {
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = (e) => {
      const target = e.target;
      if (!target || (
        target.id !== 'main-scroll-container' && 
        !target.classList?.contains('main-content') &&
        !target.classList?.contains('mobile-screen')
      )) {
        return;
      }

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = target.scrollTop;
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

  const isGuard = ['Danru', 'Wadanru', 'Anggota'].includes(user?.jabatan);
  const isDanruWadanru = ['Danru', 'Wadanru'].includes(user?.jabatan);
  const isGuest = user?.jabatan === 'Guest Viewer';

  const getItems = () => {
    if (isGuest) {
      return [
        { id: 'target-compliance', label: 'Target', icon: Target },
        { id: null, label: 'Menu', icon: Menu, isMenu: true },
      ];
    }
    if (isGuard) {
      const items = [
        { id: 'guard-simulator', label: 'Patroli', icon: Smartphone },
      ];
      if (isDanruWadanru) {
        items.push(
          { id: 'absensi', label: 'Absensi', icon: ClipboardList },
          { id: 'mutasi', label: 'Mutasi', icon: BookOpen },
        );
      }
      items.push(
        { id: 'lapor', label: 'Lapor', icon: FileText },
        { id: null, label: 'Menu', icon: Menu, isMenu: true },
      );
      return items;
    }
    return [
      { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
      { id: 'absensi', label: 'Absensi', icon: ClipboardList },
      { id: 'target-compliance', label: 'Target', icon: Target },
      { id: 'reports', label: 'Laporan', icon: FileSpreadsheet },
      { id: null, label: 'Menu', icon: Menu, isMenu: true },
    ];
  };

  const items = getItems();
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
              <Menu size={22} />
              <span>{item.label}</span>
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
            <Icon size={22} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
