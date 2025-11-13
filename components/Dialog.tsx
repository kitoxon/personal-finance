import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
export function ConfirmDelete({
  title = "Are you sure?",
  description = "This action cannot be undone.",
  onConfirm,
  triggerLabel = "Delete",
  disabled,
  size = "18"
}: {
  title?: string
  description?: string
  onConfirm: () => void
  triggerLabel?: string
  disabled: boolean
  size: string
}) {
  return (
    <AlertDialog>
        <div className="dark">
        <AlertDialogContent className="bg-neutral-900 text-gray-100 border-neutral-800">
        <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
            {description} 
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-800 text-gray-300 hover:bg-neutral-300">
                Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} className="bg-red-600 text-white hover:bg-red-700">
                Confirm
            </AlertDialogAction>
        </AlertDialogFooter>
        </AlertDialogContent>
    </div>
    <AlertDialogTrigger asChild>
        <button
            type="button"
            className="rounded-lg p-1 text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-100 disabled:opacity-60"
            disabled={disabled}
            aria-label={triggerLabel}
            title={triggerLabel}
        >
            <Trash2 size={size} />
        </button>
    </AlertDialogTrigger>

    {/* force dark theme here */}
    
    </AlertDialog>

  )
}
