import { useState } from "react";
import { Check, ChevronDown, Search, Building, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { PropertyWithDetails } from "@/stubs/schema";

interface SearchablePropertySelectProps {
  properties: PropertyWithDetails[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function SearchablePropertySelect({
  properties,
  value,
  onValueChange,
  placeholder = "Search and select a property...",
  disabled = false,
  className,
  "data-testid": testId,
}: SearchablePropertySelectProps) {
  const [open, setOpen] = useState(false);
  
  const selectedProperty = properties.find((property) => property.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          data-testid={testId}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Building className="w-4 h-4 shrink-0" />
            {selectedProperty ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-medium">{selectedProperty.name}</span>
                <span className="text-muted-foreground">•</span>
                <span className="truncate">{selectedProperty.city}</span>
                <Badge variant="outline" className="shrink-0">
                  {selectedProperty.totalUnits} units
                </Badge>
              </div>
            ) : (
              <span className="truncate">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="w-4 h-4 text-muted-foreground" />
            <CommandInput
              placeholder="Search properties by name, location, or type..."
              className="flex-1 border-0 p-0 focus:ring-0"
            />
          </div>
          <CommandEmpty className="py-6 text-center text-sm">
            <div className="flex flex-col items-center gap-2">
              <Building className="w-8 h-8 text-muted-foreground" />
              <p>No properties found.</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search terms.
              </p>
            </div>
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {properties.map((property) => (
              <CommandItem
                key={property.id}
                value={`${property.name} ${property.city} ${property.type}`}
                onSelect={() => {
                  onValueChange(property.id);
                  setOpen(false);
                }}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{property.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {property.type?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{property.address}, {property.city}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {property.totalUnits} units • Status: {property.status}
                    </div>
                  </div>
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    value === property.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}