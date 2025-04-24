"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Predefined tags that can be selected
const AVAILABLE_TAGS = [
  { id: "finance", label: "Finance" },
  { id: "technology", label: "Technology" },
  { id: "healthcare", label: "Healthcare" },
  { id: "education", label: "Education" },
  { id: "retail", label: "Retail" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "services", label: "Services" },
  { id: "media", label: "Media" },
  { id: "energy", label: "Energy" },
  { id: "transportation", label: "Transportation" },
  { id: "real-estate", label: "Real Estate" },
  { id: "blockchain", label: "Blockchain" },
];

interface TagSelectorProps {
  value: string[] | undefined;
  onChange: (value: string[]) => void;
}

export default function TagSelector({ value = [], onChange }: TagSelectorProps) {
  // Toggle tag selection
  const toggleTag = (tagId: string) => {
    const currentValue = value || [];
    if (currentValue.includes(tagId)) {
      onChange(currentValue.filter((id) => id !== tagId));
    } else {
      onChange([...currentValue, tagId]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {AVAILABLE_TAGS.map((tag) => {
        const isSelected = value?.includes(tag.id) || false;
        
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={cn(
              "inline-flex items-center px-3 py-1.5 rounded-full text-sm transition-all",
              "border border-border hover:bg-accent/80",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              isSelected 
                ? "bg-primary text-primary-foreground" 
                : "bg-background text-foreground"
            )}
          >
            {isSelected && <Check className="w-3.5 h-3.5 mr-1.5" />}
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}