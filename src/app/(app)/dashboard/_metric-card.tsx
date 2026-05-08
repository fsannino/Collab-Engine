'use client'

import Link from 'next/link'

type Props = {
  href: string
  accent: string
  badgeBg: string
  badgeColor: string
  badge: string
  metric: string | number
  label: string
  description: string
}

export function MetricCard({ href, accent, badgeBg, badgeColor, badge, metric, label, description }: Props) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        className="metric-card"
        style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #e9ecf0',
          borderTop: `3px solid ${accent}`,
          padding: '22px 22px 20px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'box-shadow 0.2s, transform 0.2s',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.10)'
          el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLDivElement
          el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
          el.style.transform = 'translateY(0)'
        }}
      >
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          background: badgeBg,
          color: badgeColor,
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'monospace',
          marginBottom: '14px',
        }}>
          {badge}
        </div>

        <div style={{
          fontSize: '40px',
          fontFamily: 'var(--font-display), Georgia, serif',
          fontWeight: 400,
          color: '#0B1F3A',
          lineHeight: 1,
          marginBottom: '8px',
        }}>
          {metric}
        </div>

        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0B1F3A', marginBottom: '4px' }}>
          {label}
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
          {description}
        </div>
      </div>
    </Link>
  )
}
