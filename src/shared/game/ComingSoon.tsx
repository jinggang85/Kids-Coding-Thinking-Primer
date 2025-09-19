/**
 * @file ComingSoon.tsx
 * @description Friendly placeholder panel for modules that are not yet implemented.
 */

import React from 'react'

/**
 * @description Props for ComingSoon.
 */
export interface ComingSoonProps {
  /** Module name to display */
  name?: string
}

/**
 * @description Simple placeholder with an illustration and text.
 */
export const ComingSoon: React.FC<ComingSoonProps> = ({ name = '模块' }) => {
  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200">
        <div className="relative h-44 w-full">
          {/* Smart placeholder image */}
          <img src="https://pub-cdn.sider.ai/u/U0E5HGEZ0W/web-coder/68a3d55e7b28bae498079916/resource/1e371f53-d4d4-45a9-97c7-f64dc7ae9af3.jpg" className="object-cover absolute inset-0 w-full h-full" />
        </div>
        <div className="space-y-2 p-5">
          <h4 className="text-lg font-extrabold text-slate-900">{name} · 即将上线</h4>
          <p className="text-sm text-slate-600">
            我们正在为 {name} 打磨更有趣的互动体验，敬请期待～ 你可以先试玩「加减法练习」。
          </p>
        </div>
      </div>
    </div>
  )
}
