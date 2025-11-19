import { useState, useMemo } from "react";
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
import type { UnitWithDetails } from "@/stubs/schema";

interface SearchableUnitSelectProps {
  units: UnitWithDetails[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function SearchableUnitSelect({
  units,
  value,
  onValueChange,
  placeholder = "Search and select a unit...",
  disabled = false,
  className,
  "data-testid": testId,
}: SearchableUnitSelectProps) {
  const [open, setOpen] = useState(false);
  
  const selectedUnit = units.find((unit) => unit.id === value);
  
  const formatUnitDisplay = (unit: UnitWithDetails) => {
    return `${unit.unitNumber} - ${unit.property?.name} (KSh ${Number(unit.monthlyRent).toLocaleString()})`;
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  };

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
            {selectedUnit ? (
              <div className="flex items-center gap-2 truncate">
                <span className="font-medium">{selectedUnit.unitNumber}</span>
                <span className="text-muted-foreground">•</span>
                <span className="truncate">{selectedUnit.property?.name}</span>
                <Badge variant="secondary" className="shrink-0">
                  {formatCurrency(selectedUnit.monthlyRent)}
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
              placeholder="Search units by number, property name, or rent..."
              className="flex-1 border-0 p-0 focus:ring-0"
            />
          </div>
          <CommandEmpty className="py-6 text-center text-sm">
            <div className="flex flex-col items-center gap-2">
              <Building className="w-8 h-8 text-muted-foreground" />
              <p>No units found.</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your search terms.
              </p>
            </div>
          </CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {units.map((unit) => (
              <CommandItem
                key={unit.id}
                value={`${unit.unitNumber} ${unit.property?.name} ${unit.monthlyRent}`}
                onSelect={() => {
                  onValueChange(unit.id);
                  setOpen(false);
                }}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Unit {unit.unitNumber}</span>
                      <Badge 
                        variant={unit.status === "vacant" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {unit.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{unit.property?.name}</span>
                      <span>•</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(unit.monthlyRent)}/month
                      </span>
                    </div>
                    {unit.bedrooms && (
                      <div className="text-xs text-muted-foreground">
                        {unit.bedrooms} bed • {unit.bathrooms} bath
                        {unit.squareFeet && ` • ${unit.squareFeet} sq ft`}
                      </div>
                    )}
                  </div>
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    value === unit.id ? "opacity-100" : "opacity-0"
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