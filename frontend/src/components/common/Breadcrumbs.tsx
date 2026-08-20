'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight, Home, ArrowUpLeft, CornerDownRight } from 'lucide-react';
import { useBreadcrumbs, getAutoBreadcrumbs, BreadcrumbItem } from '@/lib/breadcrumbs-context';

export function Breadcrumbs({ className = '' }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { customCrumbs } = useBreadcrumbs();

  const crumbs: BreadcrumbItem[] = customCrumbs || getAutoBreadcrumbs(pathname);

  // If on root dashboard with only 1 breadcrumb, optionally render standard root or full banner
  const hasParent = crumbs.length > 1;
  const parentCrumb = hasParent ? crumbs[crumbs.length - 2] : null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`bg-gray-950/80 border-b border-border/80 px-6 py-2.5 flex items-center justify-between gap-4 text-xs select-none backdrop-blur-md sticky top-0 z-20 ${className}`}
    >
      {/* Breadcrumbs List */}
      <ol className="flex items-center flex-wrap gap-1.5 min-w-0">
        {crumbs.map((crumb, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === crumbs.length - 1 || crumb.isCurrent;
          const Icon = crumb.icon || (isFirst ? Home : null);

          return (
            <li key={idx} className="flex items-center gap-1.5 min-w-0">
              {/* Separator Chevron */}
              {!isFirst && (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              )}

              {/* Breadcrumb Item Link / Text */}
              {isLast ? (
                <span className="flex items-center gap-1.5 font-bold text-white bg-blue-950/60 text-blue-300 px-2 py-0.5 rounded border border-blue-800/60 truncate shadow-sm">
                  {Icon && <Icon className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  <span className="truncate">{crumb.label}</span>
                </span>
              ) : crumb.onClick ? (
                <button
                  type="button"
                  onClick={crumb.onClick}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400 font-medium transition-colors hover:underline truncate"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{crumb.label}</span>
                </button>
              ) : crumb.href ? (
                <Link
                  href={crumb.href}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-blue-400 font-medium transition-colors hover:underline truncate"
                >
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{crumb.label}</span>
                </Link>
              ) : (
                <span className="flex items-center gap-1.5 text-gray-400 font-medium truncate">
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                  <span className="truncate">{crumb.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {/* Quick Jump to Parent Record Button */}
      {hasParent && parentCrumb && (
        <div className="shrink-0 hidden sm:flex items-center gap-2">
          {parentCrumb.href ? (
            <Link
              href={parentCrumb.href}
              className="px-2.5 py-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white font-medium text-[11px] flex items-center gap-1.5 transition-colors shadow-sm"
              title={`Quick Navigate to parent: ${parentCrumb.label}`}
            >
              <ArrowUpLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>
                Parent: <strong className="text-gray-200">{parentCrumb.label}</strong>
              </span>
            </Link>
          ) : parentCrumb.onClick ? (
            <button
              type="button"
              onClick={parentCrumb.onClick}
              className="px-2.5 py-1 rounded bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white font-medium text-[11px] flex items-center gap-1.5 transition-colors shadow-sm"
              title={`Quick Navigate to parent: ${parentCrumb.label}`}
            >
              <ArrowUpLeft className="w-3.5 h-3.5 text-blue-400" />
              <span>
                Parent: <strong className="text-gray-200">{parentCrumb.label}</strong>
              </span>
            </button>
          ) : null}
        </div>
      )}
    </nav>
  );
}
