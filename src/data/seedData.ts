import {
  NotificationItem,
  PAGE_BREAK_MARKER,
  WorkItem,
  WriterProfile,
} from '../types';

function encodeSvgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// Bespoke 2:3 atmospheric literary cover art (400x600 viewBox)
const COVER_NOVEL_MOON = encodeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#140B2D"/>
      <stop offset="52%" stop-color="#2D195E"/>
      <stop offset="100%" stop-color="#0A0618"/>
    </linearGradient>
    <radialGradient id="moonGlow" cx="50%" cy="28%" r="36%">
      <stop offset="0%" stop-color="#F8E7C4" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="#D9A760" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#2D195E" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#23124A"/>
      <stop offset="100%" stop-color="#070411"/>
    </linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#sky)"/>
  <circle cx="200" cy="175" r="140" fill="url(#moonGlow)"/>
  <circle cx="200" cy="168" r="54" fill="#F6E6C2"/>
  <circle cx="216" cy="158" r="46" fill="#211245" opacity="0.16"/>
  <circle cx="62" cy="84" r="1.8" fill="#F3DCB3"/>
  <circle cx="118" cy="56" r="1.4" fill="#FFFFFF" opacity="0.8"/>
  <circle cx="310" cy="72" r="2" fill="#F3DCB3"/>
  <circle cx="348" cy="130" r="1.3" fill="#FFFFFF" opacity="0.7"/>
  <circle cx="88" cy="210" r="1.2" fill="#FFFFFF" opacity="0.6"/>
  <path d="M0 370 Q110 330 210 365 T400 350 L400 420 L0 420 Z" fill="#180D36"/>
  <path d="M135 370 L135 280 L152 260 L169 280 L169 370 Z" fill="#100825"/>
  <path d="M165 370 L165 245 L186 218 L207 245 L207 370 Z" fill="#0E0720"/>
  <path d="M204 370 L204 295 L220 278 L236 295 L236 370 Z" fill="#100825"/>
  <rect x="183" y="264" width="6" height="14" rx="3" fill="#F3DCB3" opacity="0.85"/>
  <rect x="0" y="405" width="400" height="195" fill="url(#water)"/>
  <ellipse cx="200" cy="445" rx="68" ry="6" fill="#F3DCB3" opacity="0.32"/>
  <ellipse cx="200" cy="468" rx="44" ry="4" fill="#F3DCB3" opacity="0.24"/>
  <ellipse cx="200" cy="492" rx="28" ry="3" fill="#F3DCB3" opacity="0.18"/>
  <rect x="20" y="20" width="360" height="560" rx="8" fill="none" stroke="#F3DCB3" stroke-opacity="0.32" stroke-width="1.2"/>
  <text x="200" y="530" text-anchor="middle" fill="#F3DCB3" font-family="Georgia, serif" font-size="13" letter-spacing="4" opacity="0.85">AYNORA NOVEL</text>
</svg>
`);

const COVER_STORY_RAIN = encodeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#191636"/>
      <stop offset="55%" stop-color="#352154"/>
      <stop offset="100%" stop-color="#120B24"/>
    </linearGradient>
    <radialGradient id="lamp" cx="62%" cy="38%" r="42%">
      <stop offset="0%" stop-color="#F6CE8B" stop-opacity="0.72"/>
      <stop offset="50%" stop-color="#D97E6B" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#191636" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="600" fill="url(#bg)"/>
  <circle cx="248" cy="228" r="170" fill="url(#lamp)"/>
  <rect x="242" y="218" width="6" height="235" fill="#120B22"/>
  <path d="M225 220 Q245 198 265 220 Z" fill="#120B22"/>
  <circle cx="245" cy="226" r="14" fill="#FCE5B6"/>
  <line x1="70" y1="40" x2="48" y2="140" stroke="#E2D9F3" stroke-opacity="0.24" stroke-width="1.4"/>
  <line x1="140" y1="80" x2="115" y2="210" stroke="#E2D9F3" stroke-opacity="0.2" stroke-width="1.2"/>
  <line x1="320" y1="60" x2="295" y2="180" stroke="#E2D9F3" stroke-opacity="0.24" stroke-width="1.4"/>
  <line x1="90" y1="260" x2="65" y2="380" stroke="#E2D9F3" stroke-opacity="0.18" stroke-width="1.2"/>
  <line x1="350" y1="240" x2="325" y2="360" stroke="#E2D9F3" stroke-opacity="0.2" stroke-width="1.2"/>
  <path d="M0 440 L400 420 L400 600 L0 600 Z" fill="#100A20"/>
  <g transform="translate(135, 345) rotate(-8)">
    <rect x="0" y="0" width="94" height="62" rx="4" fill="#F5E5C8"/>
    <path d="M0 0 L47 35 L94 0" fill="none" stroke="#C09362" stroke-width="2"/>
    <circle cx="47" cy="34" r="7" fill="#A93855"/>
  </g>
  <rect x="20" y="20" width="360" height="560" rx="8" fill="none" stroke="#F3DCB3" stroke-opacity="0.3" stroke-width="1.2"/>
  <text x="200" y="530" text-anchor="middle" fill="#F3DCB3" font-family="Georgia, serif" font-size="13" letter-spacing="4" opacity="0.85">AYNORA STORY</text>
</svg>
`);

const COVER_POETRY_STARS = encodeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
  <defs>
    <linearGradient id="cosmos" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0E0823"/>
      <stop offset="50%" stop-color="#291552"/>
      <stop offset="100%" stop-color="#13092A"/>
    </linearGradient>
    <radialGradient id="nebula" cx="50%" cy="42%" r="44%">
      <stop offset="0%" stop-color="#C882FF" stop-opacity="0.38"/>
      <stop offset="60%" stop-color="#6F3FB5" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#0E0823" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="400" height="600" fill="url(#cosmos)"/>
  <circle cx="200" cy="260" r="185" fill="url(#nebula)"/>
  <circle cx="200" cy="240" r="118" fill="none" stroke="#F3DCB3" stroke-opacity="0.35" stroke-width="1"/>
  <circle cx="200" cy="240" r="92" fill="none" stroke="#F3DCB3" stroke-opacity="0.2" stroke-dasharray="4 6" stroke-width="1"/>
  <path d="M196 315 C208 265 245 205 278 152 C240 165 215 198 192 252 C180 280 185 305 196 315 Z" fill="#F3DCB3"/>
  <path d="M196 315 L178 360" stroke="#F3DCB3" stroke-width="3" stroke-linecap="round"/>
  <circle cx="110" cy="120" r="2.2" fill="#F3DCB3"/>
  <circle cx="295" cy="112" r="1.8" fill="#FFFFFF"/>
  <circle cx="92" cy="310" r="1.6" fill="#F3DCB3"/>
  <circle cx="315" cy="340" r="2" fill="#F3DCB3"/>
  <circle cx="150" cy="405" r="1.4" fill="#FFFFFF" opacity="0.75"/>
  <circle cx="260" cy="415" r="1.5" fill="#F3DCB3" opacity="0.8"/>
  <path d="M120 430 Q200 400 280 430" fill="none" stroke="#F3DCB3" stroke-opacity="0.4" stroke-width="1.2"/>
  <rect x="20" y="20" width="360" height="560" rx="8" fill="none" stroke="#F3DCB3" stroke-opacity="0.32" stroke-width="1.2"/>
  <text x="200" y="530" text-anchor="middle" fill="#F3DCB3" font-family="Georgia, serif" font-size="13" letter-spacing="4" opacity="0.85">AYNORA POETRY</text>
</svg>
`);

export const DEFAULT_WRITER_AVATAR = encodeSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="avBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3E2575"/>
      <stop offset="100%" stop-color="#190E36"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="100" fill="url(#avBg)"/>
  <circle cx="100" cy="78" r="34" fill="#F3DCB3"/>
  <path d="M44 176 C48 134 74 120 100 120 C126 120 152 134 156 176 Z" fill="#E8C794"/>
  <circle cx="148" cy="48" r="6" fill="#F3DCB3" opacity="0.8"/>
</svg>
`);

export const DEFAULT_ADMIN_PIN = '1234';

export const DEFAULT_WRITER_PROFILE: WriterProfile = {
  name: 'அயனோரா (Aynora)',
  photoUrl: DEFAULT_WRITER_AVATAR,
  ownershipLabel: 'AYNORA UNIVERSE — Official Publication',
  bio: 'கனவுகளின் எல்லையையும் மனித உணர்வுகளின் ஆழத்தையும் எழுத்தால் செதுக்கும் தமிழ் நாவலாசிரியர் மற்றும் கவிஞர். Writer & Creator of AYNORA UNIVERSE.',
};

const novelEp1Pages = [
  'மேகங்கள் மெல்ல நகர்ந்த அந்த இரவில், நீலகிரி மலைக்கோட்டையின் உயர்ந்த சாளரத்தின் வழியே நிலவின் வெளிச்சம் பழைய ஓலைச்சுவடிகளின் மீது விழுந்தது.\n\nஆதிரை தன் கைகளில் இருந்த தங்கப் பேனாவை மெதுவாகத் திறந்தாள். பல ஆண்டுகளாகப் பூட்டப்பட்டிருந்த அந்த நூலகத்தில் காற்றின் ஓசை மட்டுமே துணையாக இருந்தது.',
  'திடீரென மரக்கதவு மெல்லத் திறக்கும் சத்தம் கேட்டது. திரும்பிப் பார்த்த ஆதிரையின் கண்களில், மழைத்துளிகள் நனைத்த கோட்டுடன் நின்ற கார்த்திக்கின் நிழல் தெரிந்தது.\n\n"இந்த மழை இரவில் நீங்கள் இங்கே வருவீர்கள் என்று எதிர்பார்க்கவில்லை," என்றாள் ஆதிரை, குரலில் சற்றே வியப்புடன்.',
  'கார்த்திக் கையில் இருந்த பழைய கடிதத்தை மேசையின் மீது வைத்தான். அதன் முத்திரையில் அதே கோட்டையின் சின்னம் பொறிக்கப்பட்டிருந்தது.\n\n"காலம் மறைத்த உண்மையைத் தேடியே வந்தேன் ஆதிரை. இந்தக் கதையின் முதல் அத்தியாயம் இன்றிரவு இங்கிருந்து தொடங்குகிறது."',
];

const novelEp2Pages = [
  'மறுநாள் அதிகாலை பனி மூடிய கோட்டைப் பாலத்தில் இருவரும் நடந்து சென்றனர். பள்ளத்தாக்கின் அமைதி அவர்களின் இதயத் துடிப்பைக் கூடத் தெளிவாகக் கேட்கச் செய்தது.\n\nகார்த்திக் அந்தப் பழைய நாட்குறிப்பின் பக்கங்களைப் புரட்டினான்.',
  '"நம் முன்னோர்கள் எழுதிய ஒவ்வொரு வரியிலும் ஒரு வாக்குறுதி ஒளிந்திருக்கிறது," என்று அவன் கூறியபோது, ஆதிரையின் முகத்தில் மெல்லிய புன்னகை மலர்ந்தது.\n\nகாற்றில் பறந்த ஊதா நிறப் பூக்கள் அவர்களின் பாதையில் விழுந்தன.',
  'வானத்தில் மறைந்துகொண்டிருந்த பிறை நிலவைப் பார்த்து ஆதிரை சொன்னாள்: "வார்த்தைகள் கரையலாம்; ஆனால் உண்மையான காதல் எழுத்துக்களில் என்றும் வாழும்."\n\nஅவர்களின் பயணம் இப்போதுதான் புதிய திருப்பத்தை எட்டியிருந்தது.',
];

const storyEp1Pages = [
  'சென்னையின் மாலை நேர மழையில் தெருவிளக்குகள் மஞ்சள் நிற ஒளியைச் சிதறவிட்டன. பழைய புத்தகக் கடையின் ஓரத்தில் நின்றிருந்த அருவி, ஒரு பழமையான கவிதைத் தொகுப்பைக் கையில் எடுத்தாள்.',
  'பக்கங்களைப் புரட்டியபோது, மடித்து வைக்கப்பட்டிருந்த நீல நிறக் கடிதம் ஒன்று தரையில் நழுவி விழுந்தது. அதில் மங்கிய மையில் "என்றும் நினைவில்" என்று எழுதப்பட்டிருந்தது.',
  'அந்தக் கையெழுத்தைப் பார்த்த நொடியே அவள் இதயம் ஒரு கணம் நின்றது. பத்து ஆண்டுகளுக்கு முன்பு ரயில் நிலையத்தில் தவறவிட்ட அதே கையெழுத்து அது.',
  'வெளியே மழை சற்று ஓய்ந்திருந்தது. கடையின் கண்ணாடிக் கதவைத் திறந்துகொண்டு உள்ளே நுழைந்த நபரைப் பார்த்ததும், காலம் அவர்களை மீண்டும் இணைத்ததை அவள் உணர்ந்தாள்.',
];

const poetryEp1Pages = [
  'இருளின் விரிப்பில்\nதங்கத் துகள்களாய்\nமின்னிக்கொண்டிருக்கும் நட்சத்திரங்கள்,\nயாரோ எழுத மறந்த\nவானத்து வரிகள்.',
  'சொல்ல நினைத்த வார்த்தைகள்\nதொண்டையில் உறைய,\nநிலவின் வெளிச்சத்தில்\nமௌனமே மிகப் பெரிய\nகவிதையாக மாறுகிறது.',
  'காலம் ஓடிக்கொண்டே இருக்கிறது\nஆனால் மனதின் வானில்\nஒரு பிறை மட்டும்\nஎன்றும் தேயாமல்\nஒளிர்ந்துகொண்டே இருக்கிறது.',
];

export const INITIAL_WORKS: WorkItem[] = [
  {
    id: 'work-novel-nilavin-nizhalil',
    type: 'novel',
    category: 'Romance',
    title: 'நிலவின் நிழலில்',
    description:
      'மலைக்கோட்டையின் பழமையான நூலகத்தில் சந்திக்கும் இரு இதயங்களின் மௌனமும் காதலும் நிறைந்த தொடர் நாவல்.',
    coverUrl: COVER_NOVEL_MOON,
    writerName: DEFAULT_WRITER_PROFILE.name,
    episodes: [
      {
        id: 'ep-nilavin-1',
        workId: 'work-novel-nilavin-nizhalil',
        episodeNumber: 1,
        title: 'பாகம் 1: மௌனக் கோட்டை',
        pages: novelEp1Pages,
        rawContent: novelEp1Pages.join(`\n\n${PAGE_BREAK_MARKER}\n\n`),
        likes: 198,
        ratingSum: 130,
        ratingCount: 27,
        publishedAt: '2026-11-18T18:30:00.000Z',
      },
      {
        id: 'ep-nilavin-2',
        workId: 'work-novel-nilavin-nizhalil',
        episodeNumber: 2,
        title: 'பாகம் 2: நட்சத்திர வாக்குறுதி',
        pages: novelEp2Pages,
        rawContent: novelEp2Pages.join(`\n\n${PAGE_BREAK_MARKER}\n\n`),
        likes: 144,
        ratingSum: 115,
        ratingCount: 24,
        publishedAt: '2026-11-20T14:15:00.000Z',
      },
    ],
    stats: {
      views: 1284,
      likes: 342,
      commentsCount: 2,
      shares: 89,
      ratingSum: 245,
      ratingCount: 51,
    },
    comments: [
      {
        id: 'cmt-1',
        workId: 'work-novel-nilavin-nizhalil',
        episodeNumber: 1,
        author: 'காவ்யா',
        text: 'வர்ணனை மிகவும் அருமையாக உள்ளது! அடுத்த பாகத்திற்கு ஆவலாகக் காத்திருக்கிறேன்.',
        createdAt: '2026-11-20T16:10:00.000Z',
      },
      {
        id: 'cmt-2',
        workId: 'work-novel-nilavin-nizhalil',
        episodeNumber: 2,
        author: 'அருண்',
        text: 'நிலவும் மலைக்கோட்டையும் கண்முன்னே தெரிவது போல் இருக்கிறது.',
        createdAt: '2026-11-21T06:20:00.000Z',
      },
    ],
    createdAt: '2026-11-18T18:30:00.000Z',
    updatedAt: '2026-11-20T14:15:00.000Z',
  },
  {
    id: 'work-story-mazhaikkala-kaditham',
    type: 'story',
    category: 'Love stories',
    title: 'மழைக்காலக் கடிதம்',
    description:
      'பத்து ஆண்டுகளுக்குப் பிறகு பழைய புத்தகத்திற்குள் கிடைத்த ஒரு நனைந்த கடிதம் மாற்றும் இரண்டு வாழ்க்கைகள்.',
    coverUrl: COVER_STORY_RAIN,
    writerName: DEFAULT_WRITER_PROFILE.name,
    episodes: [
      {
        id: 'ep-mazhai-1',
        workId: 'work-story-mazhaikkala-kaditham',
        episodeNumber: 1,
        title: 'மழைக்காலக் கடிதம்',
        pages: storyEp1Pages,
        rawContent: storyEp1Pages.join(`\n\n${PAGE_BREAK_MARKER}\n\n`),
        likes: 218,
        ratingSum: 174,
        ratingCount: 36,
        publishedAt: '2026-11-19T11:00:00.000Z',
      },
    ],
    stats: {
      views: 846,
      likes: 218,
      commentsCount: 1,
      shares: 54,
      ratingSum: 174,
      ratingCount: 36,
    },
    comments: [
      {
        id: 'cmt-3',
        workId: 'work-story-mazhaikkala-kaditham',
        episodeNumber: 1,
        author: 'மீனா',
        text: 'மிகவும் நெகிழ்ச்சியான சிறுகதை. முடிவு அழகாக இருந்தது.',
        createdAt: '2026-11-19T18:45:00.000Z',
      },
    ],
    createdAt: '2026-11-19T11:00:00.000Z',
    updatedAt: '2026-11-19T11:00:00.000Z',
  },
  {
    id: 'work-poetry-natchathira-mounam',
    type: 'poetry',
    category: 'Emotional Poems',
    title: 'நட்சத்திரங்களின் மௌனம்',
    description:
      'இரவு வானின் அமைதியையும் மனதின் சொல்லப்படாத உணர்வுகளையும் பாடும் கவிதைத் தொகுப்பு.',
    coverUrl: COVER_POETRY_STARS,
    writerName: DEFAULT_WRITER_PROFILE.name,
    episodes: [
      {
        id: 'ep-poetry-1',
        workId: 'work-poetry-natchathira-mounam',
        episodeNumber: 1,
        title: 'நட்சத்திரங்களின் மௌனம்',
        pages: poetryEp1Pages,
        rawContent: poetryEp1Pages.join(`\n\n${PAGE_BREAK_MARKER}\n\n`),
        likes: 194,
        ratingSum: 141,
        ratingCount: 29,
        publishedAt: '2026-11-21T04:00:00.000Z',
      },
    ],
    stats: {
      views: 615,
      likes: 194,
      commentsCount: 1,
      shares: 63,
      ratingSum: 141,
      ratingCount: 29,
    },
    comments: [
      {
        id: 'cmt-4',
        workId: 'work-poetry-natchathira-mounam',
        episodeNumber: 1,
        author: 'செந்தில்',
        text: 'ஒவ்வொரு வரியும் மனதைத் தொடுகிறது.',
        createdAt: '2026-11-21T07:15:00.000Z',
      },
    ],
    createdAt: '2026-11-21T04:00:00.000Z',
    updatedAt: '2026-11-21T04:00:00.000Z',
  },
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    workId: 'work-poetry-natchathira-mounam',
    title: 'New Poetry Published',
    message: '“நட்சத்திரங்களின் மௌனம்” is now live in Emotional Poems.',
    createdAt: '2026-11-21T04:00:00.000Z',
    read: false,
  },
  {
    id: 'notif-2',
    workId: 'work-novel-nilavin-nizhalil',
    title: 'New Episode Released',
    message: 'Episode 2 of “நிலவின் நிழலில்” has been published.',
    createdAt: '2026-11-20T14:15:00.000Z',
    read: false,
  },
];
