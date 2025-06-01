import React, { useState } from 'react';
import { NAVIGATION_ITEMS } from '../constants';
import { ICON_MAP, MenuIcon, XMarkIcon } from './icons/IconComponents';
import { RupIqLogo } from './RupIqLogo'; // Import the new SVG logo

interface LayoutProps {
  activePage: string;
  setActivePage: (page: string) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ activePage, setActivePage, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const appDisplayName = NAVIGATION_ITEMS.find(item => item.path === activePage)?.name || "RupIQ";

  return (
    <div className="flex h-screen bg-base-100 text-content"> {/* Ensure text color is from theme */}
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-base-200 shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:block`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-base-300"> {/* Use theme border */}
          <RupIqLogo className="h-9 w-auto" /> {/* Use the SVG logo component */}
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-neutral hover:text-content">
            <XMarkIcon />
          </button>
        </div>
        <nav className="py-4">
          <ul>
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = ICON_MAP[item.icon];
              return (
                <li key={item.path} className="px-3">
                  <a
                    href={`#/${item.path}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActivePage(item.path);
                      setSidebarOpen(false);
                    }}
                    className={`flex items-center px-3 py-3 my-1 rounded-lg transition-colors duration-200
                      ${activePage === item.path
                        ? 'bg-primary text-white shadow-md' // Primary is already light text friendly
                        : 'text-content-secondary hover:bg-base-300 hover:text-content' // Use theme colors
                      }`}
                  >
                    {Icon && <Icon className="w-5 h-5 mr-3" />}
                    {item.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar for mobile */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-base-200 border-b border-base-300"> {/* Use theme colors */}
          <button onClick={() => setSidebarOpen(true)} className="text-neutral hover:text-content">
            <MenuIcon />
          </button>
          {/* Display RupIQ logo instead of text on mobile for consistency if space allows, or keep text */}
          {/* <RupIqLogo className="h-8 w-auto" />  */}
           <span className="text-xl font-bold text-primary">{appDisplayName}</span>
          <div className="w-6"></div> {/* Spacer */}
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-base-100"> {/* Ensure page bg is from theme */}
          {children}
        </main>
      </div>
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black opacity-50 md:hidden" onClick={() => setSidebarOpen(false)}></div>}
    </div>
  );
};

export default Layout;