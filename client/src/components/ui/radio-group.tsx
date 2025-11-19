import * as React from "react";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Simple Radio Group implementation with NO external dependencies.
 * API is compatible with the usage in rent-income.tsx:
 * <RadioGroup value=... onValueChange=...>
 *   <RadioGroupItem value="bulk" />
 * </RadioGroup>
 */

type RadioGroupContextValue = {
  value?: string;
  onChange?: (value: string) => void;
  name: string;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(
  null
);

type RadioGroupProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, defaultValue, onValueChange, children, ...props }, ref) => {
    const generatedName = React.useId();

    const [internalValue, setInternalValue] = React.useState<string | undefined>(
      defaultValue
    );

    // If parent controls `value`, prefer that; otherwise fall back to internal state
    const currentValue = value !== undefined ? value : internalValue;

    const handleChange = (next: string) => {
      if (value === undefined) {
        setInternalValue(next);
      }
      onValueChange?.(next);
    };

    return (
      <RadioGroupContext.Provider
        value={{ value: currentValue, onChange: handleChange, name: generatedName }}
      >
        <div
          ref={ref}
          role="radiogroup"
          className={cn("grid gap-2", className)}
          {...props}
        >
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);

RadioGroup.displayName = "RadioGroup";

type RadioGroupItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, onClick, ...props }, ref) => {
    const ctx = React.useContext(RadioGroupContext);
    if (!ctx) {
      throw new Error("RadioGroupItem must be used within a RadioGroup");
    }

    const checked = ctx.value === value;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      ctx.onChange?.(value);
      onClick?.(event);
    };

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={checked}
        data-state={checked ? "checked" : "unchecked"}
        onClick={handleClick}
        className={cn(
          "flex items-center justify-center aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked && "bg-primary/10",
          className
        )}
        {...props}
      >
        {checked && <Circle className="h-2.5 w-2.5 fill-current text-current" />}
      </button>
    );
  }
);

RadioGroupItem.displayName = "RadioGroupItem";

export { RadioGroup, RadioGroupItem };
