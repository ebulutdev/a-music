import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { StoryMusicSticker } from './StoryMusicSticker';

describe('ui responsive shells', () => {
  it('renders create hero and code card on a phone width', () => {
    window.innerWidth = 390;
    render(<App />);
    expect(screen.getByLabelText(/Kod ile müzik üret|Make music with code/)).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Dil|Language/ })).toBeInTheDocument();
    expect(screen.getByText('Beat')).toBeInTheDocument();
    expect(screen.getByText(/Hızlı başla|Quick Start/)).toBeInTheDocument();
    expect(screen.getByText(/Daha fazla müzik türünü keşfet|Discover more music genres/)).toBeInTheDocument();
    expect(screen.getByText('#energizing')).toBeInTheDocument();
  });

  it('opens vocal recorder from Create and walks record → next', async () => {
    render(<App />);
    within(screen.getByRole('navigation')).getByRole('button', { name: /Oluştur|Create/ }).click();
    expect(await screen.findByText('00:00')).toBeInTheDocument();
    expect(screen.getByText(/30 dk\. limit|30 min\. limit/)).toBeInTheDocument();
    screen.getByLabelText(/Kaydı başlat|Start recording/).click();
    expect(await screen.findByLabelText(/Kaydı durdur|Stop recording/)).toBeInTheDocument();
    screen.getByLabelText(/Kaydı durdur|Stop recording/).click();
    expect(await screen.findByText(/Yeniden|Restart/)).toBeInTheDocument();
    screen.getByText(/İleri|Next/).click();
    expect(await screen.findByLabelText(/Vocal ile şarkı oluştur|Create a song from this vocal/)).toBeInTheDocument();
  });

  it('opens beat screen from quick start', async () => {
    render(<App />);
    screen.getByText('Beat').click();
    expect(await screen.findByText(/sesin beat|voice will become the beat/i)).toBeInTheDocument();
    expect(screen.queryByText('@Kick')).not.toBeInTheDocument();
    screen.getByLabelText(/Kayıtlı beatler|Saved beats/).click();
    expect(await screen.findByText('@Kick')).toBeInTheDocument();
    expect(screen.getByText('@Snare')).toBeInTheDocument();
    expect(screen.getByText(/Mikrofonla beat kaydına başla|Press the mic to record a beat/)).toBeInTheDocument();
    screen.getByLabelText(/Kaydı başlat|Start recording/).click();
    expect(await screen.findByText(/Beat kaydı alınıyor|Recording beat/)).toBeInTheDocument();
    screen.getByLabelText(/Kaydı sil|Delete take/).click();
    expect(await screen.findByText(/Mikrofonla beat kaydına başla|Press the mic to record a beat/)).toBeInTheDocument();
    screen.getByLabelText(/Geri|Back/).click();
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
  });

  it('switches TR and EN in one tap', async () => {
    render(<App />);
    screen.getAllByRole('button', { name: 'EN' })[0]?.click();
    expect(await screen.findByText('Create songs by chatting with AI.')).toBeInTheDocument();
    screen.getAllByRole('button', { name: 'TR' })[0]?.click();
    expect(await screen.findByText('Yapay zeka ile sohbet ederek şarkı üret.')).toBeInTheDocument();
  });

  it('shows the tools studio without navigating on press', async () => {
    render(<App />);
    screen.getByRole('button', { name: /Araçlar|Tools/ }).click();
    expect(await screen.findByText(/hepsi bir masada|one desk/)).toBeInTheDocument();
    expect(screen.getAllByText(/Yakında|Soon/).length).toBeGreaterThan(2);
    screen.getByText('Mashup').click();
    expect(screen.queryByText(/Mashup oluştur|Create mashup/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Araçlar|Tools/ })).toBeInTheDocument();
  });

  it('opens a song detail and swipes to the next track', async () => {
    render(<App />);
    screen.getByRole('button', { name: /Kitaplık|Assets/ }).click();
    expect(await screen.findByText('Night Drive')).toBeInTheDocument();
    screen.getByText('Night Drive').click();
    expect(await screen.findByLabelText(/Şarkı detayı|Song detail/)).toBeInTheDocument();
    screen.getByLabelText(/Sonraki şarkı|Next song/).click();
    expect((await screen.findAllByText('Harbor Lights')).length).toBeGreaterThan(0);
  });

  it('opens inspire stories and swipes to the next card', async () => {
    render(<App />);
    screen.getByRole('button', { name: /İlham|Inspire/ }).click();
    expect(await screen.findByText(/2026/)).toBeInTheDocument();
    expect(screen.queryByText(/Sesindeki yılın|Your year in sound/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/irishrap ile üretildi|Made with irishrap/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Müzik seç|Select music/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Hikâyene ekle|Add to story/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bu sezon|You made/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Kaşif|The Adventurer/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Stüdyon$|^Your studio$/)).not.toBeInTheDocument();
    screen.getByLabelText(/Sonraki kart|Next card/).click();
    expect(screen.getAllByText(/irishrap/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Night Drive')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Şarkı sözü|Lyrics/).length).toBeGreaterThan(1);
    expect(screen.queryByText(/Tam ekran/i)).not.toBeInTheDocument();
  });

  it('renders the music overlay without sticker chrome', () => {
    render(
      <StoryMusicSticker
        title="Incendeia"
        artist="MC Kevin o Chris"
        levels={[0.2, 0.45, 0.8, 0.3]}
        playing
        currentSec={8}
        durationSec={30}
        stopLabel="Durdur"
        onStop={() => undefined}
      />,
    );
    expect(screen.queryByText(/Yeni şarkı|New song/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Bitti$|^Done$/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Incendeia').length).toBeGreaterThan(0);
    expect(screen.getByText('MC Kevin o Chris')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.queryByText(/Tam ekran/i)).not.toBeInTheDocument();
  });
});
