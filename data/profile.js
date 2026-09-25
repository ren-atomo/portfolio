// ============================================================
//  プロフィールデータ
//  ・管理ページ（admin.html）からも編集できます
//  ・活動歴は「時期（history）」ごとにまとまっていて、上から順に表示されます
//  ・新しい出来事は events の中に { ... }, をコピーして足してください
//  ・詳しい書き方は README.md を見てください
// ============================================================
//
//  name / nameEn : 名前
//  birthday      : 生年月日（YYYY-MM-DD）。年齢はここから自動で計算されます
//  affiliation   : 所属
//  social        : ページ下のSNSボタン
//  history       : 活動歴
//    year   : 左上の小さい年表記
//    label  : 時期の見出し（例: "大学1年"）
//    events : その時期の出来事
//      date        : 日付（なければ書かなくてよい）
//      title       : 出来事の名前
//      award       : 受賞名などのバッジ（なければ書かなくてよい）
//      description : 説明（改行するとそのまま改行されます）
//      links       : 関連リンク（なければ書かなくてよい）
//

window.PROFILE = {
    name: "堤 廉太郎",
    nameEn: "RENTARO TSUTSUMI",
    birthday: "2007-12-18",
    affiliation: "多摩美術大学 情報デザイン学科メディア芸術コース 1年生",
    social: [
        { label: "Instagram", url: "https://www.instagram.com/ren_atmo" }
    ],
    history: [
        {
            year: "2020-2023",
            label: "中学時代",
            events: [
                {
                    title: "芝浦工業大学附属中学校",
                    description: "電子技術研究部から美術部へ転部。技術と芸術の融合を模索し始める。"
                }
            ]
        },
        {
            year: "2023",
            label: "高校1年",
            events: [
                {
                    date: "2023.08.28",
                    title: "HADO公認チーム Step Up⤴︎⤴︎ 立ち上げ",
                    description: "リーダーとしてチームを創設",
                    links: [
                        { label: "hado-official.com", url: "https://hado-official.com/tournament/teamdetail/step-up/" }
                    ]
                },
                {
                    date: "2023.09.03",
                    title: "HADO ROOKIES CUP #50 優勝",
                    description: "Step Up⤴︎⤴︎として出場し、優勝を果たす",
                    links: [
                        { label: "youtube.com", url: "https://www.youtube.com/watch?v=O7Jp_qb6WPE" }
                    ]
                },
                {
                    date: "2024.02.18",
                    title: "探求Cafe 副代表として企画・主催",
                    description: "札幌・東京・福井・香川の4か所で同時開催。全国の中高生が興味・関心を共有できる学びの場を創出",
                    links: [
                        { label: "tanq-cafe.studio.site", url: "https://tanq-cafe.studio.site/" }
                    ]
                }
            ]
        },
        {
            year: "2024",
            label: "高校2年",
            events: [
                {
                    date: "2024.04.06",
                    title: "HADO 2024 SPRING CUP 予選大会#2 3位入賞",
                    description: "Step Up⤴︎⤴︎として出場"
                },
                {
                    date: "2024.04.13〜",
                    title: "The 0th Pitch 代表として企画・主催",
                    description: "「世界一ハードルが低いピッチ」として計6回開催。夢を語る場を全国規模で展開",
                    links: [
                        { label: "the-0th-pitch.studio.site", url: "https://the-0th-pitch.studio.site/" }
                    ]
                },
                {
                    date: "2024.04.21",
                    title: "HADO 2024 SPRING CUP 本戦出場",
                    description: "Step Up⤴︎⤴︎として出場"
                },
                {
                    date: "2024年度",
                    title: "任意団体HoPer 立ち上げ・代表就任",
                    description: "The 0th Pitchや各プロジェクトの運営",
                    links: [
                        { label: "hoper-grp.studio.site", url: "https://hoper-grp.studio.site/" }
                    ]
                },
                {
                    date: "2024.09.21-23",
                    title: "「蛹」展 作品展示",
                    description: "武蔵野美術大学・千葉工業大学・芝浦工業大学の学生をメインメンバーとした展示会に参加"
                },
                {
                    date: "2024年度",
                    title: "その他の活動",
                    description: `• 高校生みんなの夢AWARD全国大会 1次審査突破
• AITRIOS｜Meet Up（Sony Semiconductor Solutions Corporation主催）定期参加
• HADO公認チームStep Up⤴︎⤴︎ リーダー継続`
                }
            ]
        },
        {
            year: "2025",
            label: "高校3年",
            events: [
                {
                    date: "2025.04.27",
                    title: "TEDxUTokyo2025 \"でこぼこ\" 出展",
                    description: "\"hamon\"というブース名で出展",
                    links: [
                        { label: "events.tedxutokyo.com", url: "https://events.tedxutokyo.com/main2025/contents.html" }
                    ]
                },
                {
                    date: "2025.05.05",
                    title: "「音で遊ぶ会」主催",
                    description: "自身の作品hamonをベースとしたイベントを10人規模で開催"
                },
                {
                    date: "2025.05.28",
                    title: "放課後カフェ 主催",
                    description: "学生（主に高校生）のサードプレイスを生み出すことを目的として開催"
                },
                {
                    date: "2025.07.20",
                    title: "オトフェス2025 in Oos ワークショップ講師",
                    description: "\"つながり\"というタイトルでワークショップを実施",
                    links: [
                        { label: "myogadani-lab.com", url: "https://myogadani-lab.com/" }
                    ]
                },
                {
                    date: "2025.08.02-09",
                    title: "MIRAISENS,Inc.主催ハッカソン参加",
                    award: "無駄賞 受賞",
                    description: `デュアル振動アクチュエータ × 自由な発想 ハッカソン（痛快技術株式会社様からの紹介）
株式会社無駄の藤原麻里奈さんから無駄賞を受賞`,
                    links: [
                        { label: "tsu-x.connpass.com", url: "https://tsu-x.connpass.com/event/356692/" },
                        { label: "発表スライド（Canva）", url: "https://www.canva.com/design/DAGvcPAd1H0/CpzylDRrvpYrsOWRsfBI9A/view?utm_content=DAGvcPAd1H0&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h913777d33f" }
                    ]
                },
                {
                    date: "2025年度",
                    title: "継続的な活動",
                    description: `• AITRIOS｜Meet Up 定期参加継続
• HADO公認チームStep Up⤴︎⤴︎ リーダー継続`
                }
            ]
        }
    ]
};
