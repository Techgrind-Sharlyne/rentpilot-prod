import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
  subtitle: string;
  onQuickAdd?: () => void;
}

export function Header({ title, subtitle, onQuickAdd }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">{title}</h1>
          <p className="text-muted-foreground" data-testid="page-subtitle">{subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            data-testid="notifications-button"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
          
          {onQuickAdd && (
            <Button onClick={onQuickAdd} data-testid="quick-add-button">
              <Plus className="h-4 w-4 mr-2" />
              Quick Add
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
