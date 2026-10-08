'use client';

import React, { useState } from 'react';
import { X, Sliders, Plus, Trash2, BookOpen } from 'lucide-react';
import { PronunciationRule } from '@/lib/voiceover/types';
import { AnimatedButton } from '@/components/ui/AnimatedButton';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#030714] border border-white/[0.1] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
            Acoustic Engineering
          </span>
          <span className="text-xs text-slate-400">Lexicon Engine</span>
        </div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <span>Pronunciation Lexicon & Cadence</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1 mb-6 leading-relaxed">
          Overrides ensure local Nigerian names, places, and historical terminology are pronounced accurately by speech synthesizers.
        </p>

        {/* Pause Cadence Controls */}
        <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.08] mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">Paragraph Boundary Pause</span>
            <span className="text-xs font-mono text-amber-300 font-bold">{paragraphPauseMs} ms</span>
          </div>
          <input
            type="range"
            min="300"
            max="1500"
            step="50"
            value={paragraphPauseMs}
            onChange={(e) => onUpdatePause(parseInt(e.target.value, 10))}
            className="w-full accent-amber-400 h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Fast (300ms)</span>
            <span>Broadcast Standard (600ms)</span>
            <span>Dramatic (1500ms)</span>
          </div>
        </div>

        {/* Add New Word Form */}
        <form onSubmit={handleAdd} className="mb-6 space-y-3">
          <label className="text-xs font-bold text-slate-200 block">Add New Phoneme Override</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Original word (e.g. Nnamdi)"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              className="text-xs p-2.5 rounded-xl border border-white/[0.08] bg-black/50 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              placeholder="Spoken phoneme (e.g. Nahm-dee)"
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              className="text-xs p-2.5 rounded-xl border border-white/[0.08] bg-black/50 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <AnimatedButton
              type="submit"
              variant="cyber"
              icon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs py-2 font-bold"
            >
              Add Override
            </AnimatedButton>
          </div>
        </form>

        {/* Active Lexicon List */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
            <span>Active Dictionary ({rules.length} Rules)</span>
            <span className="text-[10px] font-mono text-emerald-400">● Auto-applied on synthesis</span>
          </div>

          <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-2xl max-h-60 overflow-y-auto bg-black/40">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 flex items-center justify-between text-xs hover:bg-white/[0.03] transition-colors"
              >
                <div>
                  <strong className="text-white mr-2">{rule.word}</strong>
                  <span className="font-mono text-amber-300 mr-2">→ {rule.replacement}</span>
                  <span className="text-[11px] text-slate-400 italic hidden sm:inline">
                    ({rule.phoneticDescription})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteRule(rule.id)}
                  className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                  title="Remove override"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
