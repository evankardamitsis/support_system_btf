'use client'

import { Download, Laptop } from 'lucide-react'
import { getMacosDesktopVersion } from '@/lib/desktop/release'

export function DesktopDownloadPanel({
  downloadAvailable,
}: {
  downloadAvailable: boolean
}) {
  const version = getMacosDesktopVersion()

  return (
    <div className="desktop-download-panel">
      <div className="desktop-download-panel-head">
        <span className="desktop-download-panel-icon" aria-hidden>
          <Laptop />
        </span>
        <div>
          <h2 className="desktop-download-panel-title">BTF Support for macOS</h2>
          <p className="desktop-download-panel-sub">
            Staff desktop app with COMMS, huddles, and native notifications.
          </p>
        </div>
      </div>

      <ul className="desktop-download-panel-list">
        <li>Opens the admin dashboard in a dedicated app window</li>
        <li>Native macOS notifications for huddles and mentions</li>
        <li>Keyboard shortcuts: ⌘1 Tickets, ⌘2 Ops, ⌘3 COMMS</li>
        <li>Shell updates install automatically — use Check for Updates in the app menu</li>
        <li>Requires Apple Silicon Mac (M1/M2/M3/M4)</li>
      </ul>

      {downloadAvailable ? (
        <a href="/api/desktop/macos" className="desktop-download-panel-btn">
          <Download aria-hidden />
          Download for macOS (v{version})
        </a>
      ) : (
        <p className="desktop-download-panel-unavailable">
          The macOS installer has not been published yet. Ask an admin to run{' '}
          <code>npm run desktop:dist</code> then <code>npm run desktop:upload</code>.
        </p>
      )}

      <div className="desktop-download-panel-install">
        <p className="desktop-download-panel-install-title">Install steps</p>
        <ol className="desktop-download-panel-install-list">
          <li>Open the DMG and drag <strong>BTF Support</strong> to Applications.</li>
          <li>
            If macOS says the app is <strong>damaged</strong> or from an unidentified developer,
            open Terminal and run:
            <code className="desktop-download-panel-install-cmd">
              xattr -cr &quot;/Applications/BTF Support.app&quot;
            </code>
          </li>
          <li>
            Or right-click the app in Applications → <strong>Open</strong> → <strong>Open</strong>{' '}
            once.
          </li>
        </ol>
      </div>
    </div>
  )
}
