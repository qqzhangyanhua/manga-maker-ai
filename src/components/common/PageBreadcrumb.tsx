"use client";

import Link from "next/link";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface PageBreadcrumbProps {
  segments: BreadcrumbSegment[];
  className?: string;
}

export function PageBreadcrumb({ segments, className }: PageBreadcrumbProps) {
  if (segments.length === 0) return null;

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/workspace" className="text-zinc-500 hover:text-zinc-300">
              <Home className="w-4 h-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1;
          return (
            <span key={index} className="contents">
              <BreadcrumbSeparator className="text-zinc-600" />
              <BreadcrumbItem>
                {isLast || !segment.href ? (
                  <BreadcrumbPage className="text-zinc-300 max-w-[200px] truncate">
                    {segment.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={segment.href} className="text-zinc-500 hover:text-zinc-300 max-w-[200px] truncate">
                      {segment.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
