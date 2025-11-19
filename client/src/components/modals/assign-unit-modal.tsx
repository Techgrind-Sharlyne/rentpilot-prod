import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Home, Building, MapPin } from "lucide-react";
import type { UnitWithDetails, PropertyWithDetails } from "@/stubs/schema";

interface AssignUnitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  units: UnitWithDetails[];
  properties: PropertyWithDetails[];
  tenantName: string;
  onAssignUnit: (unitId: string) => void;
  isLoading?: boolean;
}

export function AssignUnitModal({
  open,
  onOpenChange,
  units,
  properties,
  tenantName,
  onAssignUnit,
  isLoading = false,
}: AssignUnitModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter available units (vacant only)
  const availableUnits = units.filter(unit => unit.status === 'vacant');

  // Filter units based on search query (property name, unit number)
  const filteredUnits = availableUnits.filter(unit => {
    const property = properties.find(p => p.id === unit.propertyId);
    const propertyName = property?.name.toLowerCase() || '';
    const unitNumber = unit.unitNumber.toLowerCase();
    const query = searchQuery.toLowerCase();
    
    return propertyName.includes(query) || unitNumber.includes(query);
  });

  const getPropertyName = (propertyId: string) => {
    return properties.find(p => p.id === propertyId)?.name || 'Unknown Property';
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Home className="w-5 h-5 text-blue-600" />
            <span>Assign Unit to {tenantName}</span>
          </DialogTitle>
          <DialogDescription>
            Select an available unit to assign to this tenant. This will create a lease agreement and allow the tenant to make rent payments.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by property name or unit number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-units"
            />
          </div>

          {/* Available Units Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredUnits.length} available units {searchQuery && `(filtered from ${availableUnits.length})`}
            </p>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {availableUnits.length} total vacant
            </Badge>
          </div>

          {/* Units Grid */}
          <div className="flex-1 overflow-y-auto">
            {filteredUnits.length === 0 ? (
              <div className="text-center py-12">
                <Home className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  {availableUnits.length === 0 ? 'No Available Units' : 'No Units Found'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {availableUnits.length === 0 
                    ? 'All units are currently occupied'
                    : 'Try adjusting your search terms'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUnits.map((unit) => (
                  <Card 
                    key={unit.id} 
                    className="group hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer border-l-4 border-l-green-500"
                    onClick={() => onAssignUnit(unit.id)}
                    data-testid={`unit-option-${unit.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg leading-tight group-hover:text-green-600 transition-colors">
                              Unit {unit.unitNumber}
                            </h4>
                            <div className="flex items-center space-x-1 mt-1">
                              <Building className="w-3 h-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground">
                                {getPropertyName(unit.propertyId)}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {unit.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                            <div className="text-blue-600 dark:text-blue-400 font-medium">Type</div>
                            <div className="font-bold text-blue-700 dark:text-blue-300 capitalize">
                              {unit.type?.replace('_', ' ') || 'Unknown'}
                            </div>
                          </div>
                          <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
                            <div className="text-purple-600 dark:text-purple-400 font-medium">Rent</div>
                            <div className="font-bold text-purple-700 dark:text-purple-300">
                              {formatCurrency(Number(unit.rent || 0))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{unit.bedrooms || 0} bed • {unit.bathrooms || 0} bath</span>
                          </div>
                          <Button 
                            size="sm" 
                            className="h-6 px-2 text-xs bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                            disabled={isLoading}
                          >
                            <Home className="w-3 h-3 mr-1" />
                            Assign
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              data-testid="button-cancel-assign"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}