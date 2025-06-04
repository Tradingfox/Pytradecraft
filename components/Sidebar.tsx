
import React from 'react';
import { NavLink } from 'react-router-dom';
import { NavItem } from '../types';

interface SidebarProps {
  navItems: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ navItems }) => {
  return (
    <aside className="w-64 bg-gray-900 text-gray-300 flex-shrink-0 border-r border-gray-700">
      <div className="p-6">
        <h1 className="text-2xl font-semibold text-white">PyTradeCraft</h1>
      </div>
      <nav className="mt-6">
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 hover:bg-gray-700 hover:text-white transition-colors duration-200 ease-in-out ${
                isActive ? 'bg-sky-600 text-white' : ''
              }`
            }
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="absolute bottom-0 w-64 p-6 text-xs text-gray-500">
        <p>&copy; {new Date().getFullYear()} PyTradeCraft</p>
        <p>Alpha Version</p>
      </div>
    </aside>
  );
};

// Apply React.memo to Sidebar.
// The Sidebar component receives `navItems` as a prop.
// Assuming `navItems` is a constant or changes very infrequently (e.g., only if user roles change navigation),
// React.memo with a default shallow comparison of props will prevent unnecessary re-renders
// if the parent component (e.g., App) re-renders due to other state or context changes.
// This is a good practice for relatively static components like a navigation sidebar.
const MemoizedSidebar = React.memo(Sidebar);

export default MemoizedSidebar;
