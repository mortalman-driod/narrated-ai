'use client';

import React, { useState } from 'react';
import { PronunciationRule } from '@/lib/voiceover/types';

interface PronunciationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: PronunciationRule[];
  onAddRule: (rule: PronunciationRule) => void;
  onDeleteRule: (id: string) => void;
  paragraphPauseMs: number;
  onUpdatePause: (ms: number) => void;
}

export const PronunciationModal: React.FC<PronunciationModalProps> = ({
  isOpen,
  onClose,
  rules,
  onAddRule,
  onDeleteRule,
  paragraphPauseMs,
  onUpdatePause
}) => {
  const [newWord, setNewWord] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [newDescription, setNewDescription] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newReplacement.trim()) return;

    onAddRule({
      id: Date.now().toString(),
      word: newWord.trim(),
      replacement: newReplacement.trim(),
      phoneticDescription: newDescription.trim() || 'Custom override',
      category: 'custom'
    });

    setNewWord('');
    setNewReplacement('');
    setNewDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-[#E8E2D9] rounded-[8px] p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-sm text-[#6B6259] hover:text-[#1C1917] p-1 font-mono"
        >
          ✕ Close
        </button>

        <span className="text-[11px] font-mono uppercase tracking-widest text-[#B4532A] font-semibold">
          Acoustic Engineering
        </span>
        <h3 className="text-xl font-serif font-bold text-[#1C1917] mt-0.5">
          Pronunciation Lexicon & Cadence
        </h3>
        <p className="text-xs text-[#6B6259] mt-1 mb-6">
          Overrides ensure local Nigerian names, places, and historical terminology are pronounced accurately by local speech synthesizers.
        </p>

        {/* Pause Cadence Controls */}
        <div className="p-4 rounded-[6px] bg-[#FAF7F2] border border-[#E8E2D9] mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1C1917]">Paragraph Boundary Pause</span>
            <span className="text-xs font-mono text-[#B4532A] font-bold">{paragraphPauseMs} ms</span>
          </div>
          <input
            type="range"
            min="300"
            max="1500"
            step="50"
            value={paragraphPauseMs}
            onChange={(e) => onUpdatePause(parseInt(e.target.value, 10))}
            className="w-full accent-[#B4532A]"
          />
          <div className="flex justify-between text-[10px] text-[#6B6259]">
            <span>Fast (300ms)</span>
            <span>Broadcast Standard (600ms)</span>
            <span>Dramatic (1500ms)</span>
          </div>
        </div>

        {/* Add New Word Form */}
        <form onSubmit={handleAdd} className="mb-6 space-y-3">
          <label className="text-xs font-bold text-[#1C1917]">Add New Phoneme Override</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Original word (e.g. Nnamdi)"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="text-xs p-2 rounded-[6px] border border-[#E8E2D9] bg-white text-[#1C1917]"
            />
            <input
              type="text"
              placeholder="Spoken phoneme (e.g. Nahm-dee)"
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              className="text-xs p-2 rounded-[6px] border border-[#E8E2D9] bg-white text-[#1C1917]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#B4532A] hover:bg-[#9A4524] text-white text-xs font-semibold rounded-[6px] transition-colors"
            >
              Add Override
            </button>
          </div>
        </form>

        {/* Active Lexicon List */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-[#1C1917] flex items-center justify-between">
            <span>Active Dictionary ({rules.length} Rules)</span>
            <span className="text-[10px] font-mono text-[#6B6259]">Auto-applied on synthesis</span>
          </div>

          <div className="divide-y divide-[#E8E2D9] border border-[#E8E2D9] rounded-[6px] max-h-60 overflow-y-auto">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-2.5 flex items-center justify-between text-xs hover:bg-[#FAF7F2] transition-colors"
              >
                <div>
                  <strong className="text-[#1C1917] mr-2">{rule.word}</strong>
                  <span className="font-mono text-[#B4532A] mr-2">→ {rule.replacement}</span>
                  <span className="text-[11px] text-[#6B6259] italic hidden sm:inline">
                    ({rule.phoneticDescription})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteRule(rule.id)}
                  className="text-[11px] text-[#6B6259] hover:text-rose-600 px-2 py-0.5 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
