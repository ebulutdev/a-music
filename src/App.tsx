import { useEffect, useState } from 'react';
import {
  addToLibrary,
  createCover,
  createLogger,
  createSong,
  generateInstrumentalBeat,
  listLibrary,
  listSavedVocals,
  listSavedBeats,
  recordPlay,
  saveVocalClip,
  seedBeats,
  seedLibrary,
  seedStyles,
  seedVoiceProfiles,
  shuffleIds,
  toggleSavedBeat,
} from '@agents';
import type { LibraryRow, SavedBeat, SavedVocal } from '@agents';

import { FIREBASE_SEED_IDS } from '@db/firebase-collections';
import { BottomNav } from './ui/BottomNav';
import { CreateScreen } from './screens/CreateScreen';
import { CoverScreen } from './screens/CoverScreen';
import { InspireScreen } from './screens/InspireScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { MashupScreen } from './screens/MashupScreen';
import { SampleScreen } from './screens/SampleScreen';
import { ToolsScreen } from './screens/ToolsScreen';
import { BeatScreen } from './screens/BeatScreen';
import { VocalScreen, type VocalPhase } from './screens/VocalScreen';
import { useRecorder } from './hooks/useRecorder';
import { I18nProvider, useI18n } from './i18n/I18nProvider';
import type { View } from './lib/nav';

const log = createLogger('app');
const USER = FIREBASE_SEED_IDS.users.localDev;

export function App() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}

function AppShell() {
  const { t, te } = useI18n();
  const [view, setView] = useState<View>('create');
  const [vocalPhase, setVocalPhase] = useState<VocalPhase>('idle');
  const [takes, setTakes] = useState<SavedVocal[]>([]);
  const [beats, setBeats] = useState<SavedBeat[]>([]);
  const [library, setLibrary] = useState<LibraryRow[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const vocalRecorder = useRecorder('vocal');
  const beatRecorder = useRecorder('beat');

  const refresh = () => {
    setTakes(listSavedVocals());
    setBeats(listSavedBeats());
    setLibrary(listLibrary(USER));
  };

  useEffect(() => {
    seedVoiceProfiles();
    seedBeats();
    seedStyles();
    seedLibrary();
    refresh();
    log.info('app.boot', { userId: USER, view: 'create' });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const hideNav = (view === 'vocal' && vocalPhase !== 'compose') || view === 'beat';

  const done = (message: string) => {
    setToast(message);
    refresh();
    setView('library');
  };

  return (
    <div className="app-root">
      <div className="app-frame">
        {view === 'create' && (
          <CreateScreen
            onMic={() => {
              setVocalPhase('idle');
              setView('vocal');
            }}
            onBeat={() => {
              setView('beat');
            }}
            onOpen={(next) => setView(next)}
          />
        )}
        {view === 'vocal' && (
          <VocalScreen
            live={vocalRecorder.live}
            peaks={vocalRecorder.peaks}
            elapsedMs={vocalRecorder.elapsedMs}
            onPhase={setVocalPhase}
            onStart={() => {
              if (vocalRecorder.live) return;
              void vocalRecorder.start();
            }}
            onStop={() => vocalRecorder.stop()}
            onRestart={() => {
              void vocalRecorder.stop();
              vocalRecorder.reset();
            }}
            onSave={(take) => {
              try {
                const clip = saveVocalClip({
                  userId: USER,
                  durationMs: take.durationMs,
                  mimeType: take.mimeType,
                  storagePath: take.storagePath,
                  peaks: take.peaks,
                });
                refresh();
                return clip;
              } catch (error) {
                setToast(te(error));
                throw error;
              }
            }}
            onCreate={async ({ prompt: nextPrompt, lyrics: nextLyrics, styleId: nextStyle, clip, mode: genMode }) => {
              try {
                if (genMode === 'instrumental_beat') {
                  const res = await generateInstrumentalBeat({
                    userId: USER,
                    sourceClipId: clip.id,
                    uploadUrl: clip.publicUrl || clip.storagePath,
                    title: nextPrompt.slice(0, 40) || t('create.defaultTitle'),
                    tags: nextPrompt || (nextStyle ? `style:${nextStyle}` : 'trap beat, punchy 808, hi-hats, studio mix'),
                    model: 'V6_WILD',
                  });
                  log.info('app.vocal-instrumental', { generationId: res.generationId, clipId: clip.id });
                  done(res.task.status === 'ready' ? t('toast.songReady') : t('toast.songQueued'));
                } else if (genMode === 'cover_remix') {
                  const res = await createCover({
                    userId: USER,
                    uploadUrl: clip.publicUrl || clip.storagePath,
                    sourceClipId: clip.id,
                    customMode: false,
                    instrumental: false,
                    prompt: nextPrompt || t('create.defaultPrompt'),
                    style: nextStyle || undefined,
                    title: nextPrompt.slice(0, 40) || t('create.defaultTitle'),
                  });
                  log.info('app.vocal-cover', { coverId: res.coverId, clipId: clip.id });
                  done(res.task.status === 'ready' ? t('toast.songReady') : t('toast.songQueued'));
                } else {
                  const gen = await createSong({
                    userId: USER,
                    prompt: nextPrompt || t('create.defaultPrompt'),
                    customMode: Boolean(nextLyrics),
                    instrumental: false,
                    styleId: nextStyle || undefined,
                    lyrics: nextLyrics || undefined,
                    title: nextPrompt.slice(0, 40) || t('create.defaultTitle'),
                    kind: 'vocal',
                    sourceClipIds: [clip.id],
                    voiceProfileIds: clip.voiceProfileId ? [clip.voiceProfileId] : [],
                  });
                  log.info('app.vocal-create', { generationId: gen.id, clipId: clip.id });
                  done(gen.status === 'ready' ? t('toast.songReady') : t('toast.songQueued'));
                }
              } catch (error) {
                setToast(te(error));
              }
            }}

            onBack={() => {
              void vocalRecorder.stop();
              vocalRecorder.reset();
              setView('create');
            }}
          />
        )}
        {view === 'beat' && (
          <BeatScreen
            takes={beats}
            live={beatRecorder.live}
            peaks={beatRecorder.peaks}
            step={beatRecorder.step}
            onToggle={(id) => {
              toggleSavedBeat(id);
              refresh();
            }}
            onBack={() => {
              void beatRecorder.stop();
              setView('create');
            }}
            onDiscard={() => {
              void beatRecorder.stop();
            }}
            onRecord={() => {
              if (beatRecorder.live) return;
              void beatRecorder.start();
            }}
          />
        )}
        {view === 'library' && (
          <LibraryScreen
            rows={library}
            playingId={playingId}
            onPlay={(id) => {
              setPlayingId((curr) => (curr === id ? null : id));
              recordPlay(USER, id, 1200);
            }}
            onAdd={(id) => {
              addToLibrary(USER, id);
              setToast(t('toast.added'));
            }}
            onShuffle={() => {
              const ids = shuffleIds(library.map((r) => r.songId));
              setLibrary((curr) =>
                ids
                  .map((id) => curr.find((r) => r.songId === id))
                  .filter((row): row is LibraryRow => Boolean(row)),
              );
              setToast(t('toast.shuffled'));
            }}
            onShare={setToast}
          />
        )}
        {view === 'inspire' && (
          <InspireScreen
            library={library}
            vocalCount={takes.length}
            beatCount={beats.length}
          />
        )}
        {view === 'tools' && <ToolsScreen userId={USER} onNavigate={setView} />}
        {view === 'mashup' && <MashupScreen userId={USER} onDone={done} />}
        {view === 'cover' && <CoverScreen userId={USER} onDone={done} />}
        {view === 'sample' && <SampleScreen userId={USER} onDone={done} />}
        {toast && <div className="toast">{toast}</div>}
        {!hideNav && <BottomNav view={view} onChange={setView} />}
      </div>
    </div>
  );
}
