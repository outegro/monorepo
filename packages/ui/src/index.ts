/**
 * @outegro/ui — the platform's shadcn/ui installation.
 *
 * Components are stock shadcn (new-york style, neutral base). Add more with the CLI from
 * this package root — `components.json` points at `src/components` and `src/styles.css`:
 *
 *   pnpm --filter @outegro/ui dlx shadcn@latest add tabs
 *
 * then re-export the new file below. Apps must not keep local copies of primitives: five
 * slightly different Buttons is exactly how this got out of hand the first time.
 */

export { Badge, badgeVariants } from "./components/badge.js";
export { Button, buttonVariants } from "./components/button.js";
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/card.js";
export { Checkbox } from "./components/checkbox.js";
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./components/dropdown-menu.js";
export { Input } from "./components/input.js";
export { Label } from "./components/label.js";
export { LanguageSwitcher, type LanguageSwitcherProps } from "./components/language-switcher.js";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/select.js";
export { Separator } from "./components/separator.js";
export { Skeleton } from "./components/skeleton.js";
export { Toaster } from "./components/sonner.js";
export { Textarea } from "./components/textarea.js";
export {
  DEFAULT_LOCALE,
  detectInitialLocale,
  isLocale,
  LOCALE_COOKIE,
  LOCALES,
  type Locale,
  readLocaleCookie,
  writeLocaleCookie,
} from "./lib/locale.js";
export { cn } from "./lib/utils.js";
