import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { buttonClass } from "./button";

export function Checkbox({
  checked,
  onCheckedChange,
  id,
  disabled,
  size = "md",
  className,
  ...aria
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      disabled={disabled}
      onCheckedChange={v => onCheckedChange(v === true)}
      className={cn(
        "grid shrink-0 place-items-center rounded-inner border-[1.5px] border-border bg-card text-primary-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-50",
        size === "sm" ? "size-[18px]" : "size-[22px]",
        className,
      )}
      {...aria}
    >
      <CheckboxPrimitive.Indicator>
        <Check className={size === "sm" ? "size-3.5" : "size-4"} strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export function RadioList<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T | undefined;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <RadioGroupPrimitive.Root
      value={value ?? ""}
      onValueChange={v => onChange(v as T)}
      aria-label={label}
      className="flex flex-col gap-2.5"
    >
      {options.map(o => (
        <label key={o.value} className="flex cursor-pointer items-center gap-2 py-1 font-medium">
          <RadioGroupPrimitive.Item
            value={o.value}
            className="grid size-[22px] shrink-0 place-items-center rounded-full border-[1.5px] border-border bg-card data-[state=checked]:border-primary"
          >
            <RadioGroupPrimitive.Indicator className="size-3 rounded-full bg-primary" />
          </RadioGroupPrimitive.Item>
          {o.label}
        </label>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

/** "Field: All" style filter button that opens a single-choice menu. Applies instantly. */
export function FilterMenu<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const current = options.find(o => o.value === value)?.label ?? "";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={buttonClass("secondary", "sm", "max-w-full")}>
        <span className="truncate">
          {label}: {current}
        </span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] min-w-[220px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-element border border-border bg-popover p-1.5 shadow-popover"
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={v => onChange(v as T)}>
            {options.map(o => (
              <DropdownMenu.RadioItem
                key={o.value}
                value={o.value}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-inner px-3 py-2 outline-none data-[highlighted]:bg-neutral"
              >
                {o.label}
                <DropdownMenu.ItemIndicator>
                  <Check className="size-4" aria-hidden />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function InfoPopover({ label = "What is this?", children }: { label?: string; children: ReactNode }) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        aria-label={label}
        className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-neutral hover:text-foreground"
      >
        <InfoIcon />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={8}
          align="start"
          collisionPadding={16}
          className="z-50 flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-2 rounded-card border border-border bg-popover p-5 shadow-popover"
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="6.3" />
      <path d="M8 7.2v3.6M8 5.2v.1" strokeLinecap="round" />
    </svg>
  );
}

export function Tip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          sideOffset={6}
          className="z-50 max-w-[240px] rounded-lg bg-inverted px-3 py-2 text-sm text-on-inverted"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export const TooltipProvider = TooltipPrimitive.Provider;
