export type View =
  | 'create'
  | 'inspire'
  | 'tools'
  | 'library'
  | 'vocal'
  | 'beat'
  | 'mashup'
  | 'cover'
  | 'sample';

export const VIEW_LABEL: Record<View, string> = {
  create: 'Create',
  inspire: 'Inspire',
  tools: 'Tools',
  library: 'Assets',
  vocal: 'Vocal',
  beat: 'Beat',
  mashup: 'Mashup',
  cover: 'Cover',
  sample: 'Sample',
};
