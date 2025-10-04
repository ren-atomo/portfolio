// 作品データの一元管理
const worksData = [
    {
        id: 'there-are-me',
        title: 'There are me.',
        category: 'Picture',
        year: '',
        image: 'https://ren-atomo.github.io/about/There_are_me.jpg',
        video: null,
        description: '分人主義が一般となった現代社会の上で生きる私たちにとって、真の自分とはなんなのだろうか',
        philosophy: 'パターン化された認識への問い',
        philosophyDetail: '現代社会において、私たちは「日本人」や「学生」といったラベルで人を分類し、パターン化することで世界を理解しようとしている。しかし、このような認知の枠組みは、効率性を重視するあまり、人々の多層性や複雑な関係性が見えづらくなることがある。この作品は、「真の自分」というものが単一のラベルでは捉えきれない、多層的な存在であることを問いかける。',
        themes: ['分人主義', 'パターン化された認識', '自己とは']
    },
    {
        id: 'shibuya',
        title: 'Shibuya_No.01',
        category: 'Picture',
        year: '',
        image: 'https://ren-atomo.github.io/about/image2.jpg',
        video: null,
        description: '僕らは、ちゃんと街を見ることができているだろうか',
        philosophy: 'パターン化された認識への問い',
        philosophyDetail: '私たちは日常的に見慣れた風景を、本当に「見て」いるだろうか。渋谷という都市空間は、無数の情報とパターンで構成されている。しかし、私たちはそれらを無意識に処理し、見過ごしている。この作品は、見慣れた街を改めて「見つめ直す」ことで、今まで気づかなかった世界の側面に気づくきっかけを提供する。',
        themes: ['見ることの再認識', '都市', '視点']
    },
    {
        id: 'hamon',
        title: 'hamon.exe',
        category: 'CG / Interactive Installation',
        year: '',
        image: 'https://ren-atomo.github.io/about/IMG_9995.jpg',
        video: null, // 後でYouTube URLを追加
        videoPlaceholder: true,
        tech: 'Processing → TouchDesigner',
        description: 'CGを活用した、非言語的対話空間の提案',
        philosophy: '言語の扱い方 / 非言語的対話',
        philosophyDetail: '言語は概念を固定化し、拡散性と保存性を持つ有用なツールである一方で、思考を固定化し、パターン化を促進してしまう危険性もはらんでいる。この作品では、言語を介さずに、視覚や音を通じた非言語的な対話空間を提供する。重要なのは、参加者が「考えさせられた感」ではなく「考えてしまった感」を得ることである。体験の純粋性を保ちながら、人々が主体的に気づきを得られる環境を創造している。',
        themes: ['非言語的対話', '疑う余地を残す', '言語を超えたコミュニケーション']
    },
    {
        id: 'collaboration',
        title: 'hamon.exe × 勝川東さん',
        category: 'Event / Collaboration',
        year: '',
        image: 'https://ren-atomo.github.io/about/image1.jpg',
        video: null,
        description: '勝川東さん（折紙作家）とのコラボインスタレーション',
        philosophy: '異なる視点の交差',
        philosophyDetail: '異なる背景や専門性を持つアーティスト同士の協働は、それぞれが持つパターン化された認識を揺さぶり、新しい視点を生み出す。折紙という伝統的な技法と、デジタルメディアという現代的な表現が交差することで、参加者は「あ、こんな見方もあるんだ」という発見を得ることができる。これは、固定化された認識を問い直し、多様な可能性を提示する試みである。',
        themes: ['異なる視点の交差', '協働', '新しい気づき']
    },
    {
        id: 'tedx',
        title: 'TEDxUTokyo "でこぼこ" Booth出展',
        category: 'Event / Social Practice',
        year: '2025',
        image: 'https://ren-atomo.github.io/about/tedxutokyo2025.jpeg',
        video: null,
        description: '「そんな複雑化する世界を僕らはどう認識し、どう向き合えばよいのだろうか？」人間が認識できる情報量には限界がある。そのため僕らは、「日本人」や「学生」といったラベルで人を分類し、パターン化することで世界を理解しようとする。こうした認知の枠組みは必要なものだが、同時に私たちの視野を狭めるものでもある。目の前の人が持つ多層性や、社会の持つ重層的な構造——「でこぼこ」——を見えづらくしている。',
        philosophy: 'パターン化された認識への問い / 社会の羅針盤としてのアート',
        philosophyDetail: 'この作品は、パターン化された認識と個別の体験、どちらもリアルであるという前提に立つ。しかし現代社会では、効率性を重視するあまり、パターン化された関わり方が優位になっている。このブースでの体験を通じて、参加者一人ひとりが社会の「でこぼこ」（多層性・複雑さ）に気づき、集合的に「私たちは今、どこに向かっているか？」という問いを確認する場を提供している。これは、社会全体が無自覚に進んでいる方向性を可視化し、集合的に確認・検証する装置として機能している。',
        themes: ['パターン化vs個別の体験', '社会の多層性', 'でこぼこ']
    },
    {
        id: 'sound',
        title: '音で遊ぶ会',
        category: 'VJ / Workshop',
        year: '',
        image: 'https://ren-atomo.github.io/about/play_sound.jpeg',
        video: null,
        description: '近年、SNSが普及したことによって、声を通してのコミュニケーションが減少し、テキストベースでのコミュニケーションが一般となってきた。音から言語を切り離して純粋な音・音楽で他者と関わりあうきっかけを与えることで、今まで軽視されやすかった非言語的感覚に対して、人々がより目を向けやすくなるのではないか。',
        philosophy: '言語の扱い方 / 非言語的対話',
        philosophyDetail: '言語は物事の概要を伝えるのに非常に有効的だが、お互いの共通認識の上にない意識感などを伝えにくいという欠点もある。音から言語を切り離して純粋な音・音楽で他者と関わりあうことで、今まで軽視されやすかった非言語的感覚に目を向けるきっかけを与える。これは、縄文時代の竪穴式住居で食がコミュニティの起点となっていたように、人類史に根ざした共同性を現代に蘇らせる試みでもある。',
        themes: ['非言語的コミュニケーション', '共同性の現代的再解釈', '音による対話']
    }
];

// 作品IDから作品データを取得
function getWorkById(id) {
    return worksData.find(work => work.id === id);
}

// 全作品データを取得
function getAllWorks() {
    return worksData;
}
