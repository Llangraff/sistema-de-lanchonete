import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch: (value: string) => void;
}

export function SearchInput({ className, onSearch, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
      <input
        type="text"
        className="w-full pl-12 pr-4 py-2 bg-gray-100 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Pesquisar..."
        {...props}
      />
    </div>
  );
}
