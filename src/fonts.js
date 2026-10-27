export const fonts = [
  {
    family: 'Noto Sans JP', label: 'Noto Sans JP', category: 'ゴシック体', language: '日本語',
    weights: 7, license: 'SIL Open Font License', author: 'Google', featured: true,
    sample: '言葉に、静かな輪郭を。', tags: ['読みやすい', 'UI向け'],
  },
  {
    family: 'Zen Kaku Gothic New', label: 'Zen角ゴシック New', category: 'ゴシック体', language: '日本語',
    weights: 5, license: 'SIL Open Font License', author: 'Yoshimichi Ohira', featured: true,
    sample: '余白から生まれる、心地よいリズム。', tags: ['モダン', '本文'],
  },
  {
    family: 'Shippori Mincho', label: 'しっぽり明朝', category: '明朝体', language: '日本語',
    weights: 5, license: 'SIL Open Font License', author: 'Fontdasu', featured: true,
    sample: '美しい文字は、時間をゆるやかにする。', tags: ['上品', 'エディトリアル'],
  },
  {
    family: 'M PLUS Rounded 1c', label: 'M PLUS Rounded 1c', category: '丸ゴシック', language: '日本語',
    weights: 7, license: 'SIL Open Font License', author: 'M+ Fonts Project',
    sample: 'やわらかな声で、伝えてみよう。', tags: ['親しみやすい', 'ポップ'],
  },
  {
    family: 'Kaisei Decol', label: '解星デコール', category: 'デザイン', language: '日本語',
    weights: 3, license: 'SIL Open Font License', author: 'Font-Kai',
    sample: 'ひらめきは、いつも少し大胆だ。', tags: ['個性的', '見出し'],
  },
  {
    family: 'BIZ UDPGothic', label: 'BIZ UDPゴシック', category: 'ゴシック体', language: '日本語',
    weights: 2, license: 'SIL Open Font License', author: 'Morisawa',
    sample: '読む人に届く、やさしいデザイン。', tags: ['UD', '資料向け'],
  },
  {
    family: 'Inter', label: 'Inter', category: 'サンセリフ', language: '欧文',
    weights: 9, license: 'SIL Open Font License', author: 'Rasmus Andersson', featured: true,
    sample: 'Make space for better ideas.', tags: ['UI向け', 'Variable'],
  },
  {
    family: 'DM Sans', label: 'DM Sans', category: 'サンセリフ', language: '欧文',
    weights: 6, license: 'SIL Open Font License', author: 'Colophon Foundry',
    sample: 'Good design feels inevitable.', tags: ['クリーン', 'ブランド'],
  },
  {
    family: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'セリフ', language: '欧文',
    weights: 5, license: 'SIL Open Font License', author: 'Christian Thalmann',
    sample: 'Stories live between the lines.', tags: ['クラシック', '見出し'],
  },
  {
    family: 'Space Grotesk', label: 'Space Grotesk', category: 'サンセリフ', language: '欧文',
    weights: 5, license: 'SIL Open Font License', author: 'Florian Karsten',
    sample: 'A typeface for new frontiers.', tags: ['テック', 'モダン'],
  },
  {
    family: 'Playfair Display', label: 'Playfair Display', category: 'セリフ', language: '欧文',
    weights: 6, license: 'SIL Open Font License', author: 'Claus Eggers Sørensen',
    sample: 'Elegance is a quiet confidence.', tags: ['エレガント', '雑誌'],
  },
  {
    family: 'JetBrains Mono', label: 'JetBrains Mono', category: '等幅', language: '欧文',
    weights: 8, license: 'SIL Open Font License', author: 'JetBrains',
    sample: 'const ideas = build(freely);', tags: ['コード', 'Variable'],
  },
]

export function googleCssUrl(family) {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}&display=swap`
}
