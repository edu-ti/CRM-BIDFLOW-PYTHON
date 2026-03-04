import React from 'react';
import { useLocation } from 'react-router-dom';

const InventoryPlaceholder: React.FC = () => {
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const pageTitle = pathParts[pathParts.length - 1]
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{pageTitle}</h1>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <p className="text-gray-500 dark:text-gray-400">
          Esta página está em construção: {location.pathname}
        </p>
      </div>
    </div>
  );
};

export default InventoryPlaceholder;
