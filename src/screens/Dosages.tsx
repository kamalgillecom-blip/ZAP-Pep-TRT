import React, { useState } from 'react'

const C = '#C4EF95'

type Protocol = {
  name: string
  blend: string
  imageUrl: string
  link: string
}

// Sample data extracted from peptidedosages.com structure
const blends: Protocol[] = [
  { name: 'AOD-9604 + CJC-1295 + Ipamorelin', blend: '12 mg Blend', imageUrl: 'https://images.pexels.com/photos/8442376/pexels-photo-8442376.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', link: '#' },
  { name: 'BPC-157 + TB-500', blend: '10 mg Blend', imageUrl: 'https://images.pexels.com/photos/8442376/pexels-photo-8442376.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', link: '#' },
  { name: 'BPC-157 + TB-500', blend: '20 mg Blend', imageUrl: 'https://images.pexels.com/photos/8442376/pexels-photo-8442376.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', link: '#' },
  { name: 'Cagrilintide + Semaglutide', blend: '10 mg Blend', imageUrl: 'https://images.pexels.com/photos/8442376/pexels-photo-8442376.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', link: '#' },
  { name: 'CJC-1295 + GHRP-2', blend: '10 mg Blend', imageUrl: 'https://images.pexels.com/photos/8442376/pexels-photo-8442376.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', link: '#' },
  { name: 'CJC-1295 NO DAC + Ipamorelin', blend: '10 mg Blend', imageUrl: 'https://images.pexels.com/photos/8442376/pexels-photo-8442376.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', link: '#' },
  { name: 'GLOW', blend: '70 mg Blend', imageUrl: 'https://images.pexels.com/photos/8442376/pexels-photo-8442376.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', link: '#' },
  { name: 'Tri-Heal', blend: '45 mg Blend', imageUrl: 'https://images.pexels.com/photos/8442376/pexels-photo-8442376.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', link: '#' },
]

const stacks: Protocol[] = [
  { name: 'CJC-1295 DAC (2 mg) + Ipamorelin (5 mg)', blend: 'Stack', imageUrl: 'https://images.pexels.com/photos/8442376/pexels-photo-8442376.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', link: '#' },
  { name: 'PT-141 (10 mg) + Melanotan II (10 mg)', blend: 'Stack', imageUrl: 'https://images.pexels.com/photos/8442376/pexels-photo-8442376.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', link: '#' },
  { name: 'TB-500 (5 mg) + BPC-157 (5 mg)', blend: 'Stack', imageUrl: 'https://images.pexels.com/photos/8442376/pexels-photo-8442376.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', link: '#' },
]

export default function Dosages() {
  const [activeTab, setActiveTab] = useState<'blends'|'stacks'>('blends')

  const displayedData = activeTab === 'blends' ? blends : stacks

  return (
    <div className="screen-enter space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1">Peptide Dosages</h1>
        <p className="text-sm text-text-tertiary">
          Dosage protocols and reconstitution guides for multi-peptide formulations.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('blends')}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
            activeTab === 'blends' ? 'bg-cyan-primary/20 text-cyan-primary border border-cyan-primary/30' : 'bg-dark-card text-text-secondary border border-white/5'
          }`}
        >
          Blends
        </button>
        <button
          onClick={() => setActiveTab('stacks')}
          className={`flex-1 py-2 text-sm font-medium rounded-xl transition-colors ${
            activeTab === 'stacks' ? 'bg-cyan-primary/20 text-cyan-primary border border-cyan-primary/30' : 'bg-dark-card text-text-secondary border border-white/5'
          }`}
        >
          Stacks
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedData.map((item, idx) => (
          <div key={idx} className="glossy-card flex flex-col p-4">
            <div className="h-40 w-full mb-4 rounded-xl overflow-hidden bg-black/40 border border-white/5">
              <img 
                src={item.imageUrl} 
                alt={item.name} 
                className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-text-primary font-bold text-lg leading-tight mb-1">{item.name}</h3>
              <p className="text-cyan-primary text-sm font-semibold mb-3">{item.blend}</p>
              <p className="text-text-tertiary text-xs mb-4">
                Complete dosage protocol and reconstitution guide for {item.name} ({item.blend}).
              </p>
            </div>
            <button className="w-full py-2.5 rounded-xl border border-cyan-primary/50 text-cyan-primary font-medium text-sm flex items-center justify-center gap-2 hover:bg-cyan-primary/10 transition-colors">
              <span>View Protocol</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-dark-card border border-white/5 mt-8">
        <h4 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFD740" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Important Disclaimer
        </h4>
        <p className="text-xs text-text-tertiary leading-relaxed">
          All information provided is for research and educational purposes only. Not intended to diagnose, treat, cure, or prevent any disease. Always consult with a qualified healthcare professional before starting any new research protocol.
        </p>
      </div>
    </div>
  )
}
