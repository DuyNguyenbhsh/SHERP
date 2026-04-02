import { Phone, Mail, MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ContactITModalProps {
  open: boolean
  onClose: () => void
}

const IT_CONFIG = {
  hotline: '0327878579',
  email: 'it@sh-group.vn',
  zaloLink: 'https://zalo.me/0327878579',
  adminName: 'Phòng IT - SH GROUP',
  workingHours: 'Thứ 2 - Thứ 6, 8:00 - 17:30',
}

export function ContactITModal({ open, onClose }: ContactITModalProps): React.JSX.Element | null {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Liên hệ hỗ trợ IT</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {IT_CONFIG.adminName}
          <br />
          <span className="text-xs">{IT_CONFIG.workingHours}</span>
        </p>

        {/* Contact Options */}
        <div className="space-y-3">
          {/* Hotline — tel: protocol cho mobile */}
          <a
            href={`tel:${IT_CONFIG.hotline}`}
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
          >
            <Phone className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium">Hotline</p>
              <p className="text-sm text-muted-foreground">{IT_CONFIG.hotline}</p>
            </div>
          </a>

          {/* Email */}
          <a
            href={`mailto:${IT_CONFIG.email}?subject=[SH-ERP] Yêu cầu hỗ trợ`}
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
          >
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{IT_CONFIG.email}</p>
            </div>
          </a>

          {/* Zalo */}
          <a
            href={IT_CONFIG.zaloLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
          >
            <MessageCircle className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Zalo hỗ trợ</p>
              <p className="text-sm text-muted-foreground">Chat trực tiếp</p>
            </div>
          </a>
        </div>

        <Button variant="outline" onClick={onClose} className="mt-4 w-full">
          Đóng
        </Button>
      </div>
    </div>
  )
}
