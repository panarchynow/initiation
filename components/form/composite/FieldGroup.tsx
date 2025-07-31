"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface FieldGroupProps {
  // Group configuration
  title: string;
  description?: string;
  
  // Content
  children: React.ReactNode;
  
  // Styling options
  variant?: "card" | "section" | "minimal";
  className?: string;
  
  // Optional elements
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  
  // Behavior
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function FieldGroup({
  title,
  description,
  children,
  variant = "section",
  className,
  icon,
  actions,
  collapsible = false,
  defaultExpanded = true,
}: FieldGroupProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  // Card variant - wrapped in a card
  if (variant === "card") {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {actions}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {children}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Section variant - with separator
  if (variant === "section") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <h3 className="text-lg font-semibold leading-none tracking-tight">
                  {title}
                </h3>
                {description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>
            {actions}
          </div>
          <Separator />
        </div>
        
        <div className="space-y-4">
          {children}
        </div>
      </div>
    );
  }

  // Minimal variant - just title and content
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h4 className="text-base font-medium leading-none">
              {title}
            </h4>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions}
      </div>
      
      <div className="space-y-4 ml-6">
        {children}
      </div>
    </div>
  );
}

export default FieldGroup;