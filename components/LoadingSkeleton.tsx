import React from 'react';

const LoadingSkeleton: React.FC = () => (
    <div className="min-h-screen bg-[#f8fafc] flex">
        {/* Sidebar skeleton */}
        <div className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 h-screen p-6 gap-6">
            <div className="flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-lg"></div>
                <div className="skeleton w-28 h-5"></div>
            </div>
            <div className="space-y-2 mt-6">
                <div className="skeleton w-full h-10 rounded-lg"></div>
                <div className="skeleton w-full h-10 rounded-lg opacity-70"></div>
                <div className="skeleton w-full h-10 rounded-lg opacity-50"></div>
            </div>
        </div>
        {/* Content skeleton */}
        <div className="flex-1 p-8">
            <div className="skeleton w-48 h-6 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="skeleton h-28 rounded-xl" style={{ animationDelay: `${i * 100}ms` }}></div>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="skeleton h-64 rounded-xl"></div>
                <div className="skeleton h-64 rounded-xl" style={{ animationDelay: '200ms' }}></div>
            </div>
        </div>
    </div>
);

export default LoadingSkeleton;
