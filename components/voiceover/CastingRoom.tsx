'use client';

import React, { useState } from 'react';
import { Volume2, Check, Sparkles, Mic, Play, Square } from 'lucide-react';
import { VoiceProfile } from '@/lib/voiceover/types';
import { LAUNCH_VOICES } from '@/lib/voiceover/voices';
import { Card3D } from '@/components/ui/Card3D';
import { AnimatedButton } from '@/components/ui/AnimatedButton';
import { SoundWaveVisualizer } from '@/components/ui/SoundWaveVisualizer';

interface CastingRoomProps {
  selectedVoice: VoiceProfile;
  onSelectVoice: (voice: VoiceProfile) => void;
  onPlaySample: (text: string, voice: VoiceProfile) => void;
  isPlaying: boolean;
  activePlayingVoiceId: string | null;
}

export const CastingRoom: React.FC<CastingRoomProps> = ({
  selectedVoice,
  onSelectVoice,
  onPlaySample,
  isPlaying,
  activePlayingVoiceId
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [customTestPhrase, setCustomTestPhrase] = useState<string>('');
  const [sampleType, setSampleType] = useState<'benchmark' | 'standard' | 'nigerian'>('benchmark');

  const UNIFIED_BENCHMARK_PASSAGE =
    "Every story deserves a voice that carries it home. This one begins in Lagos, moves through Abuja and Enugu, and ends somewhere warm. Chioma Okafor met Emeka Nwosu on a Tuesday in Surulere, and nothing was ever the same again.";

  const filteredVoices = LAUNCH_VOICES.filter((v) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'nigerian') return v.category.startsWith('nigerian');
    if (activeFilter === 'male') return v.voiceGender === 'male';
    if (activeFilter === 'female') return v.voiceGender === 'female';
    if (activeFilter === 'foreign') return v.category.startsWith('foreign');
    return true;
  });

  const handleTestOwnWords = () => {
    if (!customTestPhrase.trim()) return;
    onPlaySample(customTestPhrase.trim(), selectedVoice);
  };

  return (
    <div className="space-y-6">
      {/* Casting Room Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
              The Casting Room
            </span>
            <span className="text-xs text-slate-400">12 Broadcast-Grade Talents</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1 flex items-center gap-2">
            <span>Choose Your Broadcast Narrator</span>
            <Sparkles className="w-5 h-5 text-amber-400" />
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Authentic Nigerian-accented English and global narrators. Audition live audio with interactive 3D cards before casting into your production pipeline.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/40 border border-white/[0.08] rounded-2xl backdrop-blur-md">
          {[
            { id: 'all', label: 'All Voices' },
            { id: 'nigerian', label: 'Nigerian' },
            { id: 'foreign', label: 'Global' },
            { id: 'male', label: 'Male' },
            { id: 'female', label: 'Female' }
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id)}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                activeFilter === f.id
                  ? 'bg-gradient-to-r from-[#B4532A] to-amber-600 text-white shadow-glow-amber/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Test My Own Words Box */}
      <Card3D maxTilt={3} glare={false}>
        <div className="bg-[#030714]/80 border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 backdrop-blur-xl shadow-xl">
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-amber-400" />
                <span>Test your script lines with <strong className="text-amber-300">{selectedVoice.name}</strong></span>
              </label>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Passage benchmark:</span>
                <button
                  type="button"
                  onClick={() => setSampleType('benchmark')}
                  className={`transition-colors ${sampleType === 'benchmark' ? 'text-amber-300 font-bold underline' : 'hover:text-slate-200'}`}
                  title="Unified Lagos/Enugu benchmark passage to compare all voices equally"
                >
                  Lagos/Enugu
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSampleType('standard')}
                  className={`transition-colors ${sampleType === 'standard' ? 'text-amber-300 font-bold underline' : 'hover:text-slate-200'}`}
                >
                  Prose
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setSampleType('nigerian')}
                  className={`transition-colors ${sampleType === 'nigerian' ? 'text-amber-300 font-bold underline' : 'hover:text-slate-200'}`}
                >
                  Local Names
                </button>
              </div>
            </div>
            <input
              type="text"
              value={customTestPhrase}
              onChange={(e) => setCustomTestPhrase(e.target.value)}
              placeholder={`Type any line to test (e.g. "In the ancient kingdom of Benin, great artisans cast bronze into legend...")`}
              className="w-full text-xs p-3 rounded-xl border border-white/[0.08] bg-black/50 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/80 shadow-inner font-sans"
            />
          </div>

          <AnimatedButton
            type="button"
            variant="cyber"
            onClick={handleTestOwnWords}
            icon={<Volume2 className="w-3.5 h-3.5 text-amber-300" />}
            className="self-end sm:self-center shrink-0 px-4 py-2.5 font-bold"
          >
            Hear it Now
          </AnimatedButton>
        </div>
      </Card3D>

      {/* 3D Animated Voices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVoices.map((voice) => {
          const isSelected = selectedVoice.id === voice.id;
          const isThisPlaying = isPlaying && activePlayingVoiceId === voice.id;
          const sampleToPlay =
            sampleType === 'benchmark'
              ? UNIFIED_BENCHMARK_PASSAGE
              : sampleType === 'nigerian' && voice.nigerianSampleText
              ? voice.nigerianSampleText
              : voice.sampleAudioText;

          return (
            <Card3D key={voice.id} maxTilt={6} className="h-full">
              <div
                className={`h-full p-5 rounded-2xl transition-all flex flex-col justify-between space-y-4 backdrop-blur-xl relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#050C1F]/90 border-2 border-amber-500 shadow-glow-amber/30 ring-1 ring-amber-400/50'
                    : 'bg-[#030714]/80 border border-white/[0.08] hover:border-white/20 hover:bg-[#060D1E]/80 shadow-xl'
                }`}
              >
                {/* Active Indicator Bar */}
                {isSelected && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-cyan-500" />
                )}

                <div>
                  {/* Header: Name & Category Tag */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span>{voice.name}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        )}
                      </h3>
                      <p className="text-xs text-slate-400">{voice.accent}</p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/40 text-slate-300 border border-white/[0.08] uppercase tracking-wide">
                      {voice.categoryLabel}
                    </span>
                  </div>

                  {/* Tone Descriptors & Age Color */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-3">
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 rounded-md font-semibold">
                      {voice.tone}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-md">
                      {voice.ageColor} Timber
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-md">
                      {voice.voiceGender === 'male' ? 'Male' : 'Female'}
                    </span>
                  </div>

                  {/* Sample Text Preview & Live Soundwave */}
                  <div className="text-xs text-slate-300 bg-black/40 p-3 rounded-xl border border-white/[0.06] italic line-clamp-3 leading-relaxed relative">
                    "{sampleToPlay}"
                    {isThisPlaying && (
                      <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-center justify-between">
                        <span className="text-[10px] font-mono text-amber-300 not-italic">
                          Auditioning live...
                        </span>
                        <SoundWaveVisualizer isPlaying={true} barCount={6} color="from-amber-400 to-rose-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons: Listen & Select Voice */}
                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-2">
                  <AnimatedButton
                    type="button"
                    variant={isThisPlaying ? 'danger' : 'secondary'}
                    onClick={() => onPlaySample(sampleToPlay, voice)}
                    icon={isThisPlaying ? <Square className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 text-amber-300" />}
                    className="text-xs px-3 py-1.5"
                  >
                    {isThisPlaying ? 'Stop' : 'Listen'}
                  </AnimatedButton>

                  <AnimatedButton
                    type="button"
                    variant={isSelected ? 'success' : 'cyber'}
                    onClick={() => onSelectVoice(voice)}
                    icon={isSelected ? <Check className="w-3 h-3 text-emerald-200" /> : undefined}
                    className="text-xs px-3.5 py-1.5 font-bold"
                  >
                    {isSelected ? 'Active Voice' : 'Select Voice'}
                  </AnimatedButton>
                </div>
              </div>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
};
