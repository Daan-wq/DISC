"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const AccordionContext = React.createContext<{
  openValue?: string;
  setOpenValue: (value?: string) => void;
}>({ setOpenValue: () => {} });

const ItemContext = React.createContext<{ value?: string }>({});

const Accordion = ({ children, className, type = "single", collapsible = true, defaultValue, ...props }: any) => {
  const [openValue, setOpenValue] = React.useState<string | undefined>(defaultValue);

  return (
    <AccordionContext.Provider value={{ openValue, setOpenValue }}>
      <div className={cn("space-y-4", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const { openValue } = React.useContext(AccordionContext);
  const isOpen = openValue === value;
  
  return (
    <ItemContext.Provider value={{ value }}>
      <div
        ref={ref}
        data-state={isOpen ? "open" : "closed"}
        className={cn("border-b", className)}
        {...props}
      >
        {children}
      </div>
    </ItemContext.Provider>
  );
});
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { openValue, setOpenValue } = React.useContext(AccordionContext);
  const { value } = React.useContext(ItemContext);
  const isOpen = openValue === value;
  
  return (
    <div className="flex">
      <button
        ref={ref}
        type="button"
        onClick={() => setOpenValue(isOpen ? undefined : value)}
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown 
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>
    </div>
  )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { openValue } = React.useContext(AccordionContext);
  const { value } = React.useContext(ItemContext);
  const isOpen = openValue === value;
  
  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden text-sm transition-all",
        className
      )}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  )
})
AccordionContent.displayName = "AccordionContent"

export { 
  Accordion, 
  AccordionItem, 
  AccordionTrigger, 
  AccordionContent 
}
