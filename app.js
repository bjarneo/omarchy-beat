// Lobby, pause, results and VR screens around the claw engine.
import { html, render, Component } from './vendor/preact-htm.js';

const WORLDS = [
  { id: 'tokyo-night', name: 'Tokyo Night', deep: '#13141c', bg: '#1a1b26', surface: '#1f2230', s2: '#24283b', bsub: '#24283b', bstr: '#414868', text: '#c0caf5', text2: '#a9b1d6', muted: '#8b93b8', brand: '#9ece6a', ink: '#0c0e10', f: ['#0e0e14', '#39482e', '#678549', '#9ece6a', '#bbdd97', '#daecc6'], accent: '#7aa2f7', left: '#f7768e', right: '#7aa2f7' },
  { id: 'catppuccin', name: 'Catppuccin', deep: '#161622', bg: '#1e1e2e', surface: '#282839', s2: '#313244', bsub: '#313244', bstr: '#585b70', text: '#cdd6f4', text2: '#cdd6f4', muted: '#9399b2', brand: '#89b4fa', ink: '#0c0e10', f: ['#101019', '#34415c', '#5b76a4', '#89b4fa', '#accafc', '#d2e2fd'], accent: '#89b4fa', left: '#f38ba8', right: '#89b4fa' },
  { id: 'catppuccin-latte', name: 'Catppuccin Latte', light: true, deep: '#e3e4e8', bg: '#eff1f5', surface: '#f8f9fb', s2: '#e3e4e8', bsub: '#d7d8dc', bstr: '#acb0be', text: '#4c4f69', text2: '#53556f', muted: '#5c5f77', brand: '#1e66f5', ink: '#ffffff', f: ['#d7d8dc', '#a0b6e4', '#6491ec', '#1e66f5', '#1750bf', '#103887'], accent: '#1e66f5', left: '#d20f39', right: '#1e66f5' },
  { id: 'ethereal', name: 'Ethereal', deep: '#040816', bg: '#060b1e', surface: '#0c122c', s2: '#131a3a', bsub: '#131a3a', bstr: '#6d7db6', text: '#ffcead', text2: '#ffcead', muted: '#b6a6b2', brand: '#7d82d9', ink: '#0c0e10', f: ['#030610', '#282b4c', '#4f538d', '#7d82d9', '#a4a8e4', '#ced0f1'], accent: '#7d82d9', left: '#ed5b5a', right: '#7d82d9' },
  { id: 'everforest', name: 'Everforest', deep: '#21272c', bg: '#2d353b', surface: '#303a40', s2: '#343f44', bsub: '#343f44', bstr: '#475258', text: '#d3c6aa', text2: '#d3c6aa', muted: '#918f84', brand: '#7fbbb3', ink: '#0c0e10', f: ['#181d20', '#374c4c', '#587f7b', '#7fbbb3', '#a5cfca', '#cee5e2'], accent: '#7fbbb3', left: '#e67e80', right: '#7fbbb3' },
  { id: 'flexoki-light', name: 'Flexoki Light', light: true, deep: '#f2efe4', bg: '#fffcf0', surface: '#f9f6ea', s2: '#f2efe4', bsub: '#e5e2d8', bstr: '#b7b5ac', text: '#100f0f', text2: '#454340', muted: '#555450', brand: '#205ea6', ink: '#ffffff', f: ['#e5e2d8', '#aabac9', '#6b90b9', '#205ea6', '#194981', '#12345b'], accent: '#205ea6', left: '#d14d41', right: '#205ea6' },
  { id: 'gruvbox', name: 'Gruvbox', deep: '#1e1e1e', bg: '#282828', surface: '#32302f', s2: '#3c3836', bsub: '#3c3836', bstr: '#665c54', text: '#d4be98', text2: '#d4be98', muted: '#a89984', brand: '#7daea3', ink: '#0c0e10', f: ['#161616', '#354440', '#56746d', '#7daea3', '#a4c6bf', '#cee0dc'], accent: '#7daea3', left: '#ea6962', right: '#7daea3' },
  { id: 'hackerman', name: 'Hackerman', deep: '#080910', bg: '#0b0c16', surface: '#10121f', s2: '#151828', bsub: '#151828', bstr: '#2d3450', text: '#ddf7ff', text2: '#ddf7ff', muted: '#a4b2ca', brand: '#82fb9c', ink: '#0c0e10', f: ['#06060c', '#2b5037', '#539e65', '#82fb9c', '#a8fcba', '#d0fdd9'], accent: '#82fb9c', left: '#82fb9c', right: '#829dd4' },
  { id: 'kanagawa', name: 'Kanagawa', deep: '#17171e', bg: '#1f1f28', surface: '#202838', s2: '#223249', bsub: '#223249', bstr: '#54546d', text: '#dcd7ba', text2: '#dcd7ba', muted: '#a7a492', brand: '#dcd7ba', ink: '#0c0e10', f: ['#111116', '#4e4c47', '#8f8c7c', '#dcd7ba', '#e6e3cf', '#f2f0e5'], accent: '#7e9cd8', left: '#e82424', right: '#7e9cd8' },
  { id: 'last-horizon', name: 'Last Horizon', deep: '#090809', bg: '#0c0b0c', surface: '#141213', s2: '#1c191a', bsub: '#1c191a', bstr: '#584e51', text: '#fafcfb', text2: '#e2dddc', muted: '#a9a5a6', brand: '#b59790', ink: '#0c0e10', f: ['#060606', '#3a322f', '#72605c', '#b59790', '#cbb6b1', '#e3d7d5'], accent: '#b59790', left: '#c38b7b', right: '#87a9b0' },
  { id: 'lumon', name: 'Lumon', deep: '#101b21', bg: '#16242d', surface: '#182836', s2: '#1b2d40', bsub: '#1b2d40', bstr: '#304860', text: '#f2fcff', text2: '#d6e2ee', muted: '#a0c1d8', brand: '#8bc9eb', ink: '#0c0e10', f: ['#0b1216', '#314956', '#5a839a', '#8bc9eb', '#aed9f1', '#d3eaf7'], accent: '#8bc9eb', left: '#f2fcff', right: '#6fb8e3' },
  { id: 'lupine', name: 'Lupine', light: true, deep: '#ececec', bg: '#fafafa', surface: '#ffffff', s2: '#ececec', bsub: '#dedede', bstr: '#9e9e9e', text: '#000000', text2: '#212121', muted: '#484848', brand: '#3264eb', ink: '#ffffff', f: ['#dedede', '#aab9e2', '#7392e6', '#3264eb', '#274eb7', '#1c3781'], accent: '#3264eb', left: '#c900c4', right: '#3264eb' },
  { id: 'matte-black', name: 'Matte Black', deep: '#0d0d0d', bg: '#121212', surface: '#181818', s2: '#1e1e1e', bsub: '#1e1e1e', bstr: '#333333', text: '#eaeaea', text2: '#bebebe', muted: '#8a8a8a', brand: '#e68e0d', ink: '#0c0e10', f: ['#090909', '#4b310a', '#925b0b', '#e68e0d', '#eeb056', '#f6d4a3'], accent: '#e68e0d', left: '#d35f5f', right: '#ffc107' },
  { id: 'miasma', name: 'Miasma', deep: '#191919', bg: '#222222', surface: '#272727', s2: '#2c2c2c', bsub: '#2c2c2c', bstr: '#666666', text: '#c2c2b0', text2: '#c2c2b0', muted: '#8c8c82', brand: '#78824b', ink: '#0c0e10', f: ['#121212', '#313423', '#515735', '#78824b', '#a0a881', '#ccd0bb'], accent: '#78824b', left: '#bb7744', right: '#5f875f' },
  { id: 'nord', name: 'Nord', deep: '#222730', bg: '#2e3440', surface: '#343b49', s2: '#3b4252', bsub: '#3b4252', bstr: '#4c566a', text: '#d8dee9', text2: '#d8dee9', muted: '#9fa7b4', brand: '#81a1c1', ink: '#0c0e10', f: ['#191c23', '#384452', '#596e85', '#81a1c1', '#a7bdd4', '#cfdbe7'], accent: '#88c0d0', left: '#bf616a', right: '#88c0d0' },
  { id: 'osaka-jade', name: 'Osaka Jade', deep: '#0c1512', bg: '#111c18', surface: '#1a2a22', s2: '#23372b', bsub: '#23372b', bstr: '#53685b', text: '#f7e8b2', text2: '#c1c497', muted: '#969978', brand: '#509475', ink: '#0c0e10', f: ['#090f0d', '#1e372c', '#35614d', '#509475', '#84b49e', '#bcd6cb'], accent: '#509475', left: '#d2689c', right: '#2dd5b7' },
  { id: 'retro-82', name: 'Retro 82', deep: '#031222', bg: '#05182e', surface: '#081e37', s2: '#0a2540', bsub: '#0a2540', bstr: '#2a6b78', text: '#f6dcac', text2: '#f6dcac', muted: '#9ab69b', brand: '#faa968', ink: '#0c0e10', f: ['#020c17', '#4c3b2f', '#9c6d49', '#faa968', '#fcc395', '#fddec6'], accent: '#faa968', left: '#f85525', right: '#8cbfb8' },
  { id: 'ristretto', name: 'Ristretto', deep: '#211b1b', bg: '#2c2525', surface: '#342a28', s2: '#3d2f2a', bsub: '#3d2f2a', bstr: '#72696a', text: '#e6d9db', text2: '#e6d9db', muted: '#aca1a2', brand: '#f38d70', ink: '#0c0e10', f: ['#181414', '#5a3830', '#a05f4d', '#f38d70', '#f7af9b', '#fad4c9'], accent: '#f38d70', left: '#fd6883', right: '#85dacc' },
  { id: 'rose-pine', name: 'Rosé Pine', light: true, deep: '#ede7e1', bg: '#faf4ed', surface: '#fffaf3', s2: '#ede7e1', bsub: '#e1dbd5', bstr: '#cecacd', text: '#575279', text2: '#5e587d', muted: '#676284', brand: '#56949f', ink: '#ffffff', f: ['#e1dbd5', '#b7c6c5', '#8bafb4', '#56949f', '#43737c', '#2f5157'], accent: '#56949f', left: '#b4637a', right: '#286983' },
  { id: 'solitude', name: 'Solitude', deep: '#0c0e10', bg: '#101315', surface: '#161a1d', s2: '#1d2225', bsub: '#1d2225', bstr: '#4b4e55', text: '#cacccc', text2: '#a5aeb4', muted: '#8a8d90', brand: '#798186', ink: '#0c0e10', f: ['#080a0b', '#2a2e30', '#4e5457', '#798186', '#a1a7aa', '#cccfd1'], accent: '#798186', left: '#de6145', right: '#d9dbdc' },
  { id: 'starship', name: 'Starship', deep: '#161618', bg: '#1c1c1e', surface: '#242426', s2: '#2c2c2e', bsub: '#2c2c2e', bstr: '#3a3a3c', text: '#f5f5f7', text2: '#fbfbfd', muted: '#98989d', brand: '#ff9f0a', ink: '#0c0e10', f: ['#0e0e10', '#4d3510', '#a2690d', '#ff9f0a', '#ffbf5c', '#ffdfad'], accent: '#ff9f0a', left: '#ff5f4a', right: '#a6dcef' },
  { id: 'vantablack', name: 'Vantablack', deep: '#090909', bg: '#000000', surface: '#0d0d0d', s2: '#1a1a1a', bsub: '#1a1a1a', bstr: '#7a7a7a', text: '#ffffff', text2: '#ffffff', muted: '#a8a8a8', brand: '#8d8d8d', ink: '#0c0e10', f: ['#070707', '#2f2f2f', '#5a5a5a', '#8d8d8d', '#afafaf', '#d4d4d4'], accent: '#8d8d8d', left: '#ffffff', right: '#7a7a7a' },
  { id: 'white', name: 'White', light: true, deep: '#f5f5f5', bg: '#ffffff', surface: '#ffffff', s2: '#f5f5f5', bsub: '#e8e8e8', bstr: '#c0c0c0', text: '#000000', text2: '#383838', muted: '#4a4a4a', brand: '#6e6e6e', ink: '#ffffff', f: ['#e8e8e8', '#c3c3c3', '#9c9c9c', '#6e6e6e', '#565656', '#3c3c3c'], accent: '#6e6e6e', left: '#000000', right: '#808080' },
];

const TRACKS = [
  { title: 'Omarchy Oligarchy (Synthwave Mix)', artist: 'YZL81', file: 'yzl81-omarchy-oligarchy-synthwave-mix.mp3' },
  { title: 'Still Licensed', artist: 'Michel Krapf', file: 'michel-krapf-still-licensed.mp3' },
  { title: 'public code, private yacht', artist: 'Kevin Koontz', file: 'kevin-koontz-public-code-private-yacht.mp3' },
  { title: 'We Can Fix Everything (The Ultimate Machine)', artist: 'Kevin Koontz', file: 'kevin-koontz-we-can-fix-everything-the-ultimate-machine.mp3' },
  { title: 'Beware the Omarchy Oligarchy', artist: 'Rich Kilmer', file: 'rich-kilmer-beware-the-omarchy-oligarchy.mp3' },
  { title: "It's fucking fork o clock", artist: 'Boyd', file: 'boyd-its-fucking-fork-o-clock.mp3', explicit: true },
  { title: 'Take Control of Me', artist: 'Jon Håvard Gundersen', file: 'jon-havard-gundersen-take-control-of-me.mp3' },
  { title: 'Play the Machine', artist: 'Dan T.', file: 'dan-t-play-the-machine.mp3' },
  { title: 'Get hyped up - shipping on a Sunday!', artist: 'Jimi Plouffe', file: 'jimi-plouffe-get-hyped-up-shipping-on-a-sunday.mp3' },
  { title: 'Downstream from Motivation', artist: 'Ryan R. Hughes', file: 'ryan-r-hughes-downstream-from-motivation.mp3' },
  { title: 'Dotfiles to Distro', artist: 'Ryan R. Hughes', file: 'ryan-r-hughes-dotfiles-to-distro.mp3' },
  { title: 'I Wanted Arch, Not a Second Job', artist: 'Nick Hamze', file: 'nick-hamze-i-wanted-arch-not-a-second-job.mp3' },
  { title: "Quattro (Let's Go, Nerds)", artist: 'Patrick Castiglia', file: 'patrick-castiglia-quattro-lets-go-nerds.mp3' },
  { title: 'Quattro!', artist: 'rav3ndust', file: 'rav3ndust-quattro.mp3' },
  { title: 'Omarchy, Oligarchy', artist: 'Rich Kilmer', file: 'rich-kilmer-omarchy-oligarchy.mp3' },
  { title: 'Omakase Machine', artist: 'Ryan R. Hughes', file: 'ryan-r-hughes-omakase-machine.mp3' },
  { title: 'We Can Fix Everything', artist: 'Ryan R. Hughes', file: 'ryan-r-hughes-we-can-fix-everything.mp3' },
  { title: "Omarchee, c'est la vie", artist: 'Aurélien', file: 'aurelien-omarchee-cest-la-vie.mp3' },
  { title: 'Hyprland After Dark', artist: 'Ryan R. Hughes', file: 'ryan-r-hughes-hyprland-after-dark.mp3' },
  { title: 'Boot Up Your New Digital World', artist: 'Suvikyi', file: 'suvikyi-boot-up-your-new-digital-world.mp3' },
  { title: 'Oh-Mah-Chee', artist: 'tommyent', file: 'tommyent-oh-mah-chee.mp3' },
  { title: 'Omarchy!', artist: 'Cam', file: 'cam-omarchy.mp3' },
  { title: "It's Not Omarchy, It's Me", artist: 'Nick Hamze', file: 'nick-hamze-its-not-omarchy-its-me.mp3' },
  { title: 'Kind of Slaps', artist: 'xxsteven69xx', file: 'xxsteven69xx-kind-of-slaps.mp3' },
  { title: 'Super Space', artist: 'Nick Hamze', file: 'nick-hamze-super-space.mp3' },
  { title: 'No Title Bar', artist: 'Obstinatus', file: 'obstinatus-no-title-bar.mp3' },
  { title: 'David Picked It', artist: 'Patrick Johnson', file: 'patrick-johnson-david-picked-it.mp3' },
  { title: 'Write the Missing Plugin', artist: 'Ryan R. Hughes', file: 'ryan-r-hughes-write-the-missing-plugin.mp3' },
  { title: 'Quattro Saves Mankind', artist: 'Carlos Lisboa', file: 'carlos-lisboa-quattro-saves-mankind.mp3' },
  { title: 'prOdiMARCHY', artist: 'Corey', file: 'corey-prodimarchy.mp3' },
  { title: 'Omarchy Quattro', artist: 'Ryan R. Hughes', file: 'ryan-r-hughes-omarchy-quattro.mp3' },
  { title: 'Omarchy Party', artist: 'Thomas AKB', file: 'thomas-akb-omarchy-party.mp3' },
  { title: 'Take Me, Lead Me, Show Me the Way', artist: 'TriciaAmazingyear', file: 'triciaamazingyear-take-me-lead-me-show-me-the-way.mp3' },
];

const PHRASES = ['beat.', 'block in your way.', 'track on the radio.', 'theme in Omarchy.'];
const DIFFS = [
  { id: 'easy', label: 'Easy', note: 'Strong beats only, slow blocks, lots of any-direction dots.' },
  { id: 'normal', label: 'Normal', note: 'A block on most beats, the odd double and a few mines.' },
  { id: 'hard', label: 'Hard', note: 'Half-beats on loud sections, fast blocks, more mines.' },
];
const OPTIONS = { clawLength: 0.62, blades: 3 };
const ROW = 34;

const fmt = (d) => `${Math.floor(d / 60)}:${String(Math.floor(d % 60)).padStart(2, '0')}`;
const cls = (...names) => names.filter(Boolean).join(' ');

class App extends Component {
  state = { wi: 0, ti: 0, diff: 'normal', noFail: true, radio: false, phase: 'boot', xr: null, inVR: false, paused: false, load: null, results: null, auto: 0, typed: '', typing: false, err: '', fxFailed: false, q: '' };
  listRef = { current: null };
  resRef = { current: null };

  componentDidMount() {
    this.applyVars(this.state.wi);
    this.startTyping();
    this.onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey || this.state.phase !== 'lobby' || this.state.inVR) return;
      const typing = e.target && e.target.tagName === 'INPUT';
      if ((e.key === 't' || e.key === 'T') && !typing) { this.stepWorld(e.shiftKey ? -1 : 1); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); this.moveSel(e.key === 'ArrowDown' ? 1 : -1); return; }
      if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey && this.state.xr) this.enterVR(); else this.play(); }
    };
    window.addEventListener('keydown', this.onKey);
    this.boot();
  }
  componentWillUnmount() {
    clearTimeout(this.typeTimer);
    clearInterval(this.autoTimer);
    window.removeEventListener('keydown', this.onKey);
    this.fx?.stop();
    this.game?.destroy();
  }
  componentDidUpdate() {
    const key = this.state.phase + '|' + this.state.inVR;
    if (key === this.phaseKey) return;
    const was = this.phaseKey || '';
    this.phaseKey = key;
    if (this.state.phase === 'results' && !this.state.inVR) this.playResultsFX();
    else if (was.startsWith('results')) { this.fx?.stop(); this.fx = null; }
  }

  applyVars(i) {
    const w = WORLDS[i], el = document.documentElement;
    const v = {
      '--t-bg-deep': w.deep, '--t-bg': w.bg, '--t-surface': w.surface, '--t-surface-2': w.s2, '--t-border-subtle': w.bsub, '--t-border-strong': w.bstr,
      '--t-text': w.text, '--t-text-secondary': w.text2, '--t-text-muted': w.muted, '--t-brand': w.brand, '--t-brand-ink': w.ink, '--t-field-bg': w.f[0],
      '--t-elev': w.light ? '0 0 0 1px oklch(0 0 0 / 0.06), 0 1px 3px oklch(0 0 0 / 0.05), 0 4px 10px -4px oklch(0 0 0 / 0.05)' : '0 0 0 1px oklch(1 0 0 / 0.07)',
      '--left': w.left, '--right': w.right,
    };
    for (const k in v) el.style.setProperty(k, v[k]);
    el.style.colorScheme = w.light ? 'light' : 'dark';
  }
  async boot() {
    try {
      const [eng, fx] = await Promise.all([import('./claw-engine.js'), import('./omarchy-fx.js')]);
      this.fxMod = fx;
      this.game = new eng.Game(document.getElementById('stage'), {
        onLoad: (file, info) => { if (TRACKS[this.state.ti].file === file) this.setState({ load: info }); },
        onPhase: (p) => {
          this.setState({ phase: p });
          if (p === 'playing' && this.state.radio) this.game.load(TRACKS[(this.state.ti + 1) % TRACKS.length]).catch(() => {});
        },
        onEnd: (r) => { this.setState({ results: r }); if (this.state.radio) this.startAuto(); },
        onPause: (b) => this.setState({ paused: b }),
        onXR: (b) => { this.setState({ inVR: b }); if (!b) { this.stopAuto(); this.setState({ phase: 'lobby', results: null }); } },
        onMenu: (a) => { if (a === 'retry') this.retry(); else if (a === 'next') this.next(); else this.game.exitVR(); },
        onError: () => this.setState({ err: 'That track did not load. Check the connection or pick another one.' }),
      });
      this.game.setOptions(OPTIONS);
      this.game.setWorld(WORLDS[this.state.wi]);
      this.setState({ phase: 'lobby' });
      this.game.load(TRACKS[this.state.ti]).catch(() => {});
      this.setState({ xr: await this.game.xrSupported() });
    } catch (e) {
      console.error(e);
      this.setState({ err: 'The game engine failed to start in this browser. WebGL and ES modules are required.', phase: 'error' });
    }
  }

  startTyping() {
    let index = 0, length = 0, deleting = false;
    const shared = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
    const step = () => {
      const phrase = PHRASES[index], after = (index + 1) % PHRASES.length;
      let next = deleting ? 27 : 58 + Math.random() * 60 + (phrase[length - 1] === ' ' ? 95 : 0) + (length >= phrase.length - 2 ? 70 : 0) + (Math.random() < 0.07 ? 140 : 0);
      if (!deleting && length === phrase.length) { deleting = true; next = 2100; }
      else if (deleting && length === shared(phrase, PHRASES[after])) { deleting = false; index = after; next = 420; }
      else length += deleting ? -1 : 1;
      this.setState({ typed: PHRASES[index].slice(0, length), typing: next < 2000 && next !== 420 });
      this.typeTimer = setTimeout(step, next);
    };
    step();
  }

  pickWorld(i) {
    if (i === this.state.wi) return;
    const apply = () => {
      this.applyVars(i);
      this.game?.setWorld(WORLDS[i]);
      this.game?.renderNow();
    };
    if (document.startViewTransition && this.state.phase === 'lobby' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.startViewTransition(() => new Promise((res) => { apply(); this.setState({ wi: i }, res); }));
    } else { apply(); this.setState({ wi: i }); }
  }
  stepWorld(d) { const n = WORLDS.length; this.pickWorld((this.state.wi + d + n) % n); }
  filtered() {
    const q = this.state.q.trim().toLowerCase();
    return TRACKS.map((t, i) => ({ t, i })).filter(({ t }) => !q || (t.title + ' ' + t.artist).toLowerCase().includes(q));
  }
  moveSel(d) {
    const f = this.filtered();
    if (!f.length) return;
    let k = f.findIndex((x) => x.i === this.state.ti);
    k = k < 0 ? 0 : (k + d + f.length) % f.length;
    this.pickTrack(f[k].i);
    const el = this.listRef.current;
    if (el) { const top = k * ROW, pad = 4; if (top < el.scrollTop) el.scrollTop = top; else if (top + ROW + pad * 2 > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW + pad * 2 - el.clientHeight; }
  }
  pickTrack(i) {
    const t = TRACKS[i];
    this.setState({ ti: i, load: this.game?.status(t.file) || null, err: '' });
    this.game?.load(t).catch(() => {});
  }
  startArgs(ti = this.state.ti) { return { track: TRACKS[ti], difficulty: this.state.diff, noFail: this.state.noFail }; }
  play() {
    if (!this.game) return;
    this.stopAuto();
    this.game.unlock();
    this.setState({ results: null, err: '' });
    this.game.start(this.startArgs());
  }
  enterVR() {
    if (!this.game) return;
    this.game.unlock();
    this.game.enterVR().then((ok) => { if (ok) this.game.start(this.startArgs()); }).catch((e) => {
      console.warn(e);
      this.setState({ err: 'The headset did not start a VR session.' });
    });
  }
  retry() { this.stopAuto(); this.setState({ results: null }); this.game.start(this.startArgs()); }
  next() {
    this.stopAuto();
    const ti = (this.state.ti + 1) % TRACKS.length;
    const wi = this.state.radio ? (this.state.wi + 1) % WORLDS.length : this.state.wi;
    if (wi !== this.state.wi) { this.applyVars(wi); this.game.setWorld(WORLDS[wi]); }
    this.setState({ ti, wi, results: null, load: this.game.status(TRACKS[ti].file) });
    this.game.start(this.startArgs(ti));
  }
  lobby() { this.stopAuto(); this.game.quit(); this.setState({ phase: 'lobby', results: null, paused: false }); }
  startAuto() {
    clearInterval(this.autoTimer);
    this.setState({ auto: 8 });
    this.autoTimer = setInterval(() => {
      const a = this.state.auto - 1;
      if (a <= 0) this.next(); else this.setState({ auto: a });
    }, 1000);
  }
  stopAuto() { clearInterval(this.autoTimer); this.autoTimer = null; if (this.state.auto) this.setState({ auto: 0 }); }
  playResultsFX() {
    const r = this.state.results, c = this.resRef.current, F = this.fxMod;
    if (!r || !c || !F) return;
    const w = WORLDS[this.state.wi];
    this.setState({ fxFailed: false });
    F.loadFX().then((names) => {
      if (this.state.phase !== 'results' || this.resRef.current !== c) return;
      const list = (r.failed ? F.FAIL_FX : r.fc || r.rank === 'S' ? F.BIG_FX : F.WIN_FX).filter((n) => names.includes(n));
      this.fx?.stop();
      this.fx = F.runFX(c, { text: F.resultsText(r), effects: list, loop: true, bg: w.f[0], ramp: w.f.slice(1), maxCell: 12, fit: 0.84, fitH: 0.7 });
    }).catch(() => this.setState({ fxFailed: true }));
  }

  lobbyView(s) {
    const w = WORLDS[s.wi], L = s.load, list = this.filtered(), xrOk = s.xr === true;
    const pct = !L ? 0 : L.stage === 'fetch' ? L.p * 80 : L.stage === 'decode' ? 85 : L.stage === 'map' ? 94 : L.stage === 'ready' ? 100 : 0;
    const status = !L ? 'Not loaded yet' : L.stage === 'fetch' ? `Downloading · ${Math.round(L.p * 100)}%` : L.stage === 'decode' ? 'Decoding audio' : L.stage === 'map' ? 'Mapping the beat' : L.stage === 'ready' ? `${L.bpm} BPM · ${fmt(L.duration)}` : 'Could not load';
    const toggles = [
      { label: 'no fail', note: 'The battery can run flat without ending the track.', on: s.noFail, toggle: () => this.setState({ noFail: !s.noFail }) },
      { label: 'radio mode', note: 'Keep playing down the playlist, with the next world for every track.', on: s.radio, toggle: () => this.setState({ radio: !s.radio }) },
    ];
    return html`
      <div class="lobby" data-screen-label="Lobby">
        <header class="bar">
          <div class="bar-group">
            <span class="slash" aria-hidden="true">/</span>
            ${DIFFS.map((d, k) => html`
              <button key=${d.id} class=${cls('diff', d.id === s.diff && 'on')} title=${d.label} aria-pressed=${d.id === s.diff} onClick=${() => this.setState({ diff: d.id })}>${k + 1}</button>
            `)}
            <span class="diff-label" title=${DIFFS.find((d) => d.id === s.diff).note}>${s.diff}</span>
          </div>
          <div class="bar-group world">
            <button class="step" aria-label="Previous world" onClick=${() => this.stepWorld(-1)}>‹</button>
            <span class="world-name">${w.name}</span>
            <button class="step" aria-label="Next world" onClick=${() => this.stepWorld(1)}>›</button>
            <span class="kbd">T</span>
          </div>
          <div class="bar-group toggles">
            ${toggles.map((o) => html`
              <button key=${o.label} class=${cls('toggle', o.on && 'on')} title=${o.note} aria-pressed=${o.on} onClick=${o.toggle}>${o.on ? '[x]' : '[ ]'} ${o.label}</button>
            `)}
            <span class=${cls('vr-status', s.xr && 'on')}>${s.xr === null ? 'vr …' : s.xr ? 'vr ready' : 'no headset'}</span>
          </div>
        </header>

        <section class="launcher">
          <div class="launcher-head">
            <h1 class="tagline">Slash every <span class="typed">${s.typed}</span><span class=${cls('caret', !s.typing && 'blink')} aria-hidden="true"></span></h1>
            <a class="radio-link" href="https://radio.omarchy.org" target="_blank" rel="noreferrer">Omarchy Radio · ${TRACKS.length}</a>
          </div>
          <label class="search">
            <span class="prompt" aria-hidden="true">›</span>
            <input value=${s.q} onInput=${(e) => this.setState({ q: e.target.value })} placeholder="Search the radio…" spellcheck="false" autocomplete="off" aria-label="Search the radio" />
            <span class="count">${list.length}</span>
          </label>
          <div class="tracks" ref=${this.listRef}>
            ${list.map(({ t, i }) => html`
              <button key=${t.file} class=${cls('track', i === s.ti && 'on')} aria-current=${i === s.ti} onClick=${() => this.pickTrack(i)} onDblClick=${() => { this.pickTrack(i); this.play(); }}>
                <span class="mark">${i === s.ti ? '›' : ''}</span>
                <span class="title">${t.title}</span>
                <span class="artist">${t.explicit && html`<span class="explicit" title="Explicit">E</span>`}<span>${t.artist}</span></span>
              </button>
            `)}
            ${!list.length && html`<div class="empty">No track matches the search.</div>`}
          </div>
          <div class="progress"><div style=${`width:${pct}%`}></div></div>
          <div class="launcher-foot">
            <div class="status">
              <span>${status}</span>
              <span class="keys">↑↓ choose · ↵ play · ⇧↵ VR</span>
            </div>
            <div class="actions">
              ${xrOk && html`<button class="btn primary" onClick=${() => this.enterVR()}>Enter VR</button>`}
              <button class=${cls('btn', xrOk ? 'secondary' : 'primary')} onClick=${() => this.play()}>${xrOk ? 'Play in browser' : 'Play'}</button>
            </div>
          </div>
          ${s.err && html`<div class="err">${s.err}</div>`}
        </section>
      </div>`;
  }

  pauseView(s) {
    const t = TRACKS[s.ti];
    return html`
      <div class="overlay blur" data-screen-label="Paused">
        <div class="card">
          <div>
            <h2>Paused</h2>
            <p class="sub">${t.title} — ${t.artist}</p>
          </div>
          <div class="row">
            <button class="btn primary grow" onClick=${() => this.game?.resume()}>Resume</button>
            <button class="btn secondary grow" onClick=${() => this.lobby()}>Quit to lobby</button>
          </div>
        </div>
      </div>`;
  }

  resultsView(s) {
    const r = s.results;
    return html`
      <div class="results" data-screen-label="Results">
        <canvas ref=${this.resRef}></canvas>
        ${s.fxFailed && r && html`
          <div class="res-fallback">
            <div class="res-head">${r.failed ? 'Battery depleted' : `${r.fc ? 'Full combo' : 'Track cleared'} · rank ${r.rank}`}</div>
            <div class="res-score">${r.score.toLocaleString('en-US')}</div>
            <div class="res-line">${r.title} — ${r.artist} · max combo ${r.maxCombo} · cut ${r.hits}/${r.total}</div>
          </div>
        `}
        <div class="res-actions">
          ${s.auto > 0 && html`
            <div class="auto">
              <span>Radio mode · next track in ${s.auto}s</span>
              <button class="link" onClick=${() => this.stopAuto()}>stay here</button>
            </div>
          `}
          <div class="row center">
            <button class="btn primary wide" onClick=${() => this.next()}>Next track</button>
            <button class="btn secondary wide" onClick=${() => this.retry()}>Retry</button>
            <button class="btn secondary wide" onClick=${() => this.lobby()}>Back to lobby</button>
          </div>
        </div>
      </div>`;
  }

  vrView() {
    return html`
      <div class="overlay dim" data-screen-label="In VR">
        <div class="card wide">
          <h2>You're in VR</h2>
          <p class="body">Put the headset on. After each track, slash RETRY, NEXT or EXIT to keep going.</p>
          <button class="btn secondary" onClick=${() => this.game?.exitVR()}>Exit VR</button>
        </div>
      </div>`;
  }

  render(_, s) {
    const lobbyish = s.phase === 'boot' || s.phase === 'lobby';
    const inPlay = s.phase === 'loading' || s.phase === 'countdown' || s.phase === 'playing';
    return html`
      ${lobbyish && !s.inVR && this.lobbyView(s)}
      ${inPlay && !s.inVR && !s.paused && html`
        <div class="hint"><span class="kbd">Esc</span><span>pause</span></div>
      `}
      ${s.paused && !s.inVR && this.pauseView(s)}
      ${s.phase === 'results' && !s.inVR && this.resultsView(s)}
      ${s.inVR && this.vrView()}
      ${s.phase === 'error' && html`<div class="boot-err">${s.err}</div>`}
    `;
  }
}

render(html`<${App} />`, document.getElementById('ui'));
