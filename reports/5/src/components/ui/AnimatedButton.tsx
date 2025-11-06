import * as React from "react";
import { motion } from "framer-motion";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AnimatedButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <motion.div
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        className="w-fit h-fit"
      >
        <Button
          ref={ref}
          className={cn(
            "bg-gradient-to-r from-blue-600 to-cyan-500 text-primary-foreground hover:from-blue-700 hover:to-cyan-600 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton };
