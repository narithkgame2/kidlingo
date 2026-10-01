/* ---------- data ---------- */
const THEMES = [
  {id:'animals', name:'どうぶつ', icon:'🐘', hue:'--leaf', words:[['いぬ','🐶'],['ねこ','🐱'],['とり','🐦'],['さかな','🐟'],['うさぎ','🐰'],['ぞう','🐘'],['さる','🐵'],['うま','🐴']]},
  {id:'food', name:'たべもの', icon:'🍙', hue:'--sun', words:[['りんご','🍎'],['みかん','🍊'],['いちご','🍓'],['ぶどう','🍇'],['もも','🍑'],['すいか','🍉'],['たまご','🥚'],['おにぎり','🍙']]},
  {id:'colors', name:'いろ', icon:'🎨', hue:'--plum', words:[['あか',{c:'#E23B2E'}],['あお',{c:'#2F6FD6'}],['きいろ',{c:'#F5C518'}],['みどり',{c:'#2FA35A'}],['しろ',{c:'#FFFFFF'}],['くろ',{c:'#1B1B1B'}],['ちゃいろ',{c:'#8B5A2B'}],['むらさき',{c:'#8A4FC7'}]]},
  {id:'numbers', name:'かず', icon:'🎲', hue:'--shu', words:[['いち',{n:1}],['に',{n:2}],['さん',{n:3}],['よん',{n:4}],['ご',{n:5}],['ろく',{n:6}],['なな',{n:7}],['はち',{n:8}],['きゅう',{n:9}],['じゅう',{n:10}]]},
  {id:'body', name:'からだ', icon:'🖐️', hue:'--sky', words:[['め','👁️'],['みみ','👂'],['はな','👃'],['くち','👄'],['て','✋'],['あし','🦶']]},
  {id:'vehicles', name:'のりもの', icon:'🚃', hue:'--sky', words:[['くるま','🚗'],['でんしゃ','🚃'],['ひこうき','✈️'],['ふね','🚢'],['じてんしゃ','🚲'],['しょうぼうしゃ','🚒']]},
  {id:'oyatsu', kata:true, name:'おやつ', icon:'🍰', hue:'--sun', words:[['パン','🍞'],['バナナ','🍌'],['ケーキ','🍰'],['アイス','🍦'],['ジュース','🧃'],['クッキー','🍪'],['チョコ','🍫'],['ピザ','🍕']]},
  {id:'zoo', kata:true, name:'どうぶつえん', icon:'🦁', hue:'--leaf', words:[['ライオン','🦁'],['パンダ','🐼'],['ペンギン','🐧'],['コアラ','🐨'],['キリン','🦒'],['ゴリラ','🦍'],['カンガルー','🦘'],['ワニ','🐊']]},
  {id:'mono', kata:true, name:'おうちの もの', icon:'📺', hue:'--sky', words:[['テレビ','📺'],['ボール','⚽'],['ゲーム','🎮'],['カメラ','📷'],['ロボット','🤖'],['スプーン','🥄'],['バス','🚌'],['タクシー','🚕']]}
];
const PHRASES = [
  {id:'aisatsu', kind:'phrase', name:'あいさつ', icon:'👋', hue:'--sun', words:[['おはよう ございます','🌅🙂','Good morning'],['こんにちは','☀️👋','Hello'],['こんばんは','🌆👋','Good evening'],['おやすみなさい','🌙😴','Good night'],['さようなら','👋🎒','Goodbye'],['はじめまして','🙂🤝🙂','Nice to meet you'],['おげんきですか？','🙂❓','How are you?'],['げんきです！','😄💪','I’m fine!']]},
  {id:'ie', kind:'phrase', name:'いえで', icon:'🏠', hue:'--leaf', words:[['いただきます','🙏🍚','(said before eating)'],['ごちそうさまでした','🍽️✨','(said after eating)'],['おいしいです！','😋🍙','Delicious!'],['いってきます','🎒🚪','I’m heading out',{s:['🏠👩','➡️','🧒🎒'],sp:2,t:'🌅'}],['いってらっしゃい','👋🏠','Have a good day (to someone leaving)',{s:['🏠👩','➡️','🧒🎒'],sp:0,t:'🌅'}],['ただいま','🏠🎒','I’m home',{s:['🏠👩','⬅️','🧒🎒'],sp:2,t:'🌇'}],['おかえりなさい','🤗🏠','Welcome home',{s:['🏠👩','⬅️','🧒🎒'],sp:0,t:'🌇'}]]},
  {id:'arigatou', kind:'phrase', name:'ありがとう', icon:'🙏', hue:'--plum', words:[['ありがとう ございます','🎁😊','Thank you',{s:['🧒','⬅️🍪','👧'],sp:0}],['どういたしまして','😊👌','You’re welcome',{s:['🧒🍪','👧'],sp:1,sub:{i:0,e:'🙏'}}],['ごめんなさい','😢🙇','I’m sorry',{s:['🧒','🥛💦','👩'],sp:0}],['いいですよ','👌🙂','That’s okay',{s:['🧒','🥛💦','👩'],sp:2,sub:{i:0,e:'🙇'}}],['どうぞ','🤲🍪','Here you go',{s:['🧒','⬅️🍪','👧'],sp:2}],['すみません','✋🙂','Excuse me']]},
  {id:'kimochi', kind:'phrase', name:'きもち', icon:'😄', hue:'--shu', words:[['うれしいです','😄','I’m happy'],['たのしいです！','🥳','This is fun!'],['かなしいです','😢','I’m sad'],['おこっています','😠','I’m angry'],['こわいです','😨','I’m scared'],['つかれました','😩','I’m tired'],['ねむいです','😪','I’m sleepy']]},
  {id:'hoshii', kind:'phrase', name:'おねがい', icon:'🙋', hue:'--sky', words:[['おなかが すきました','🍽️😋','I’m hungry'],['のどが かわきました','🥤😮‍💨','I’m thirsty'],['おみず ください','💧🙏','Water, please'],['トイレに いきたいです','🚽🏃','I need the toilet'],['いたいです！','🤕','Ouch! / It hurts'],['たすけて ください！','🆘','Help!'],['もう いっかい おねがいします','🔁☝️','One more time, please']]},
  {id:'asobu', kind:'phrase', name:'あそぼう', icon:'🧸', hue:'--leaf', words:[['いっしょに あそびましょう','🧸🙂🙂','Let’s play together'],['かして ください','🤲🧸','Can I borrow it, please?'],['まって ください！','✋⏳','Please wait!'],['みて ください！','👀👆','Please look!'],['できました！','🎉🙌','I did it!'],['すごいです！','⭐😲','Amazing!'],['がんばって ください！','💪🔥','You can do it!']]},
  {id:'shitsumon', kind:'phrase', name:'しつもん', icon:'❓', hue:'--plum', words:[['これは なんですか？','👉📦❓','What is this?'],['どこですか？','🔍❓','Where?'],['だれですか？','👤❓','Who?'],['どうしてですか？','🤔❓','Why?'],['いくつですか？','🔢❓','How many?'],['いま なんじですか？','⏰❓','What time is it?'],['みぎ','➡️','Right'],['ひだり','⬅️','Left']]},
  {id:'suki', kind:'phrase', kata:true, name:'すきな もの', icon:'🧃', hue:'--sun', words:[['ジュース ください','🧃🙏','Juice, please'],['アイスが たべたいです！','🍦😋','I’d like ice cream!'],['ケーキ、おいしいです！','🍰😋','The cake is delicious!'],['テレビを みても いいですか？','📺❓','May I watch TV?'],['ゲームを しましょう！','🎮🙂','Let’s play a game!'],['ボールで あそびましょう','⚽🙂🙂','Let’s play with the ball'],['バスに のりましょう','🚌👆','Let’s get on the bus'],['ママ、だいすきです','👩❤️','Mama, I love you'],['パパ、みて ください！','👨👀','Papa, please look!']]}
];
const EN = {
  animals:['dog','cat','bird','fish','rabbit','elephant','monkey','horse'],
  food:['apple','mandarin orange','strawberry','grapes','peach','watermelon','egg','rice ball'],
  colors:['red','blue','yellow','green','white','black','brown','purple'],
  numbers:['one','two','three','four','five','six','seven','eight','nine','ten'],
  body:['eye','ear','nose','mouth','hand','foot / leg'],
  vehicles:['car','train','airplane','ship','bicycle','fire engine'],
  oyatsu:['bread','banana','cake','ice cream','juice','cookie','chocolate','pizza'],
  zoo:['lion','panda','penguin','koala','giraffe','gorilla','kangaroo','crocodile'],
  mono:['TV','ball','game','camera','robot','spoon','bus','taxi']
};
THEMES.forEach(t => { t.kind = 'word'; t.words = t.words.map(([k,p],i) => ({k, p, en:EN[t.id][i], t:t.id})); });

/* kana -> romaji (Hepburn, for grown-ups only) */
const RO = {あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',を:'o',ん:'n',
  が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',ぁ:'a',ぃ:'i',ぅ:'u',ぇ:'e',ぉ:'o'};
const YO = {ゃ:'a',ゅ:'u',ょ:'o'};
function romaji(str){
  const h = str.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  return h.split(/\s+/).map(tok => {
    let out = '', dbl = false;
    for(let i=0;i<tok.length;i++){
      const c = tok[i], n = tok[i+1];
      if(c === 'っ'){ dbl = true; continue; }
      if(c === 'ー'){ const v = out.match(/[aeiou](?=[^aeiou]*$)/); out += v ? v[0] : ''; continue; }
      let r = RO[c];
      if(r === undefined){ out += c; continue; }
      if(c === 'は' && i === tok.length-1 && tok.length > 1) r = 'wa';
      if(n && YO[n]){ r = r.replace(/i$/,''); if(!/^(sh|ch|j)$/.test(r)) r += 'y'; r += YO[n]; i++; }
      else if(n && (n === 'ぁ'||n === 'ぃ'||n === 'ぇ'||n === 'ぉ')){ r = r.replace(/[aiueo]$/,'') + RO[n]; i++; }
      if(c === 'ん' && n && /^[aiueoy]/.test(RO[n]||'')) r = "n'";
      if(dbl){ r = (r.startsWith('ch') ? 't' : r[0]) + r; dbl = false; }
      out += r;
    }
    return out;
  }).join(' ').replace(/、/g, ', ').replace(/！/g,'!').replace(/？/g,'?');
}
PHRASES.forEach(t => t.words = t.words.map(([k,p,en,sc]) => ({k, p, en, sc, t:t.id, phrase:true})));
/* Sound lessons: long sounds (ー, ああ/いい/うう…) and small っ. Each is a full beat (拍): Japanese teachers have children
   clap them. Each word: [kana, picture, English, wrong spellings a child might hear instead]. Steps: learn (beats shown),
   "ただしい ほうは どれですか？" (pick the spelling), "いくつ たたきますか？" (count the beats). */
const SOUNDS = [
  {id:'nobasu', kind:'sound', name:'のばす おと', icon:'〰️', hue:'--plum', words:[
    ['ケーキ','🍰','cake',['ケキ','ケーキー']],['ボール','⚽','ball',['ボル','ボールー']],['スプーン','🥄','spoon',['スプン','スープン']],
    ['ゲーム','🎮','game',['ゲム','ゲームー']],['チーズ','🧀','cheese',['チズ','チーズー']],['ラーメン','🍜','ramen',['ラメン','ラーメーン']],
    ['おかあさん','👩','mother',['おかさん']],['おばあさん','👵','grandmother',['おばさん']],['おじいさん','👴','grandfather',['おじさん']],
    ['おとうさん','👨','father',['おとさん']],['ひこうき','✈️','airplane',['ひこき']],['ふうせん','🎈','balloon',['ふせん']]]},
  {id:'chiisaitsu', kind:'sound', name:'ちいさい っ', icon:'🥁', hue:'--sun', words:[
    ['らっぱ','🎺','trumpet',['らぱ']],['ばった','🦗','grasshopper',['ばた']],['はっぱ','🍃','leaf',['はぱ']],
    ['せっけん','🧼','soap',['せけん']],['れっしゃ','🚂','train',['れしゃ']],['コップ','🥛','cup',['コプ']],
    ['ロケット','🚀','rocket',['ロケト','ロッケト']],['ロボット','🤖','robot',['ロボト','ロッボト']],['ヨット','⛵','sailboat',['ヨト']],
    ['ベッド','🛏️','bed',['ベド']],['サッカー','⚽','soccer',['サカー','サッカ']],['クッキー','🍪','cookie',['クキー','クッキ']]]}
];
SOUNDS.forEach(t => t.words = t.words.map(([k,p,en,alt]) => ({k, p, en, alt, t:t.id})));
/* beats (拍) in a word: every kana counts, including ー, っ and ん; small ゃゅょ etc. join the kana before them */
const beats = w => [...w.replace(/[\s、。！？]/g, '')].reduce((a, c) => { if(/[ぁぃぅぇぉゃゅょゎァィゥェォャュョヮ]/.test(c) && a.length) a[a.length-1] += c; else a.push(c); return a; }, []);
const ALL = [...THEMES, ...PHRASES, ...SOUNDS];
const ALLW = THEMES.flatMap(t => t.words);
const ALLP = PHRASES.flatMap(t => t.words);

const TALK = {
  animals:[['これは なんですか？','What is this?'],['いぬは なんと なきますか？','What does a dog say? (ワンワン)'],['どの どうぶつが すきですか？','Which animal do you like?']],
  food:[['なにが たべたいですか？','What do you want to eat?'],['りんごは なにいろですか？','What color is an apple?'],['おいしいですか？','Is it tasty?']],
  colors:[['これは なにいろですか？','What color is this?'],['あかい ものを さがしましょう','Let’s find something red.'],['なにいろが すきですか？','What’s your favorite color?']],
  numbers:[['いくつ ありますか？','How many are there?'],['いっしょに かぞえましょう','Let’s count together.'],['なんさいですか？','How old are you?']],
  body:[['はなは どこですか？','Where is your nose?'],['あたまを さわって ください','Touch your head.'],['てを あらいましょう','Let’s wash our hands.']],
  oyatsu:[['おやつは なにに しますか？','What snack do you want?'],['パンと ケーキ、どちらに しますか？','Bread or cake, which one?'],['ジュースを のみますか？','Do you want some juice?']],
  zoo:[['ライオンは なんと なきますか？','What does a lion say? (ガオー)'],['パンダは なにいろですか？','What color is a panda?'],['どうぶつえんに いきましょう','Let’s go to the zoo.']],
  mono:[['テレビを けして ください','Turn off the TV, please.'],['ボールを とって ください','Get the ball, please.'],['スプーンは どこですか？','Where is the spoon?']],
  vehicles:[['なにに のりたいですか？','What do you want to ride?'],['あれは なんですか？','What’s that? (point at one outside)'],['でんしゃを みましたね','We saw a train, didn’t we?']]
};

const KANA_ROWS = ['あいうえお','かきくけこ','さしすせそ','たちつてと','なにぬねの','はひふへほ','まみむめも','や・ゆ・よ','らりるれろ','わ・・・を','ん・・・・'];
const KANA = KANA_ROWS.join('').replace(/・/g,'').split('');
const KATA_ROWS = ['アイウエオ','カキクケコ','サシスセソ','タチツテト','ナニヌネノ','ハヒフヘホ','マミムメモ','ヤ・ユ・ヨ','ラリルレロ','ワ・・・ヲ','ン・・・・'];
const KATA = KATA_ROWS.join('').replace(/・/g,'').split('');
const PAIR = Object.fromEntries(KATA.map((c,i) => [c, KANA[i]]));
const STROKES = {あ:3,い:2,う:2,え:2,お:3,か:3,き:4,く:1,け:3,こ:2,さ:3,し:1,す:2,せ:3,そ:1,た:4,ち:2,つ:1,て:1,と:2,な:4,に:3,ぬ:2,ね:2,の:1,は:3,ひ:1,ふ:4,へ:1,ほ:4,ま:3,み:2,む:3,め:2,も:3,や:3,ゆ:2,よ:2,ら:2,り:2,る:1,れ:2,ろ:1,わ:2,を:3,ん:1};
Object.assign(STROKES, {ア:2,イ:2,ウ:3,エ:3,オ:3,カ:2,キ:3,ク:2,ケ:3,コ:2,サ:3,シ:3,ス:2,セ:2,ソ:2,タ:3,チ:3,ツ:3,テ:3,ト:2,ナ:2,ニ:2,ヌ:2,ネ:4,ノ:1,ハ:2,ヒ:2,フ:1,ヘ:1,ホ:4,マ:2,ミ:3,ム:2,メ:2,モ:3,ヤ:2,ユ:2,ヨ:3,ラ:2,リ:2,ル:2,レ:1,ロ:3,ワ:2,ヲ:3,ン:2});

/* Fixed sentences the app speaks (instructions/feedback). Every string passed to say() must be
   a word/phrase above, a kana, a TALK line, or listed here, or it falls back to device speech. */
const SPOKEN_EXTRA = ['おなじ ものを みつけましょう','こんにちは','こんにちは！ いっしょに にほんごを べんきょう しましょう。','どれに しますか？','なぞって かきましょう','なんと いいますか？','どれですか？','よく できました','よく できました！','よんで えらんで ください','シール','ママや パパと いって みましょう','さわって きいて ください','どれを かきますか？','カタカナ','ひらがな','もう すこしです！','せんの うえを なぞって ください','まねして いって みましょう'];

/* The journey (home screen): an e-sugoroku train ride across Japan, Hokkaido to Okinawa. Each stop is one lesson:
   a topic id from THEMES/PHRASES, or a kana row to trace ('h0'..'h9' hiragana, 'k0'..'k9' katakana; row 9 = わをん). */
const JOURNEY = [
  {name:'ほっかいどう', icon:'🐻', bg:'#DCEBFA', deco:['❄️','🌲','⛄','🦊'], stops:['aisatsu','animals','h0','food']},
  {name:'とうきょう',   icon:'🗼', bg:'#F4E1EA', deco:['🌸','🏙️','🐦','🌸'], stops:['ie','h1','colors','h2','arigatou']},
  {name:'ふじさん',     icon:'🗻', bg:'#DDEFE6', deco:['☁️','🌲','🍵','☁️'], stops:['numbers','h3','kimochi','h4','body']},
  {name:'きょうと',     icon:'⛩️', bg:'#FBE3DA', deco:['🎋','🍡','🦌','🏮'], stops:['h5','hoshii','vehicles','h6','asobu']},
  {name:'おおさか',     icon:'🏯', bg:'#FBF0D2', deco:['🐙','🎡','🍢'], stops:['h7','shitsumon','h8','h9']},
  {name:'ひろしま',     icon:'🍁', bg:'#FADFD8', deco:['🍁','⛵','🍁','🦌'], stops:['k0','oyatsu','nobasu','k1','k2','zoo']},
  {name:'ふくおか',     icon:'🍜', bg:'#ECE3F6', deco:['🏮','🍓','🌊','🐟'], stops:['k3','k4','chiisaitsu','mono','k5','k6']},
  {name:'おきなわ',     icon:'🏝️', bg:'#D6F1F2', deco:['🐠','🌺','🐢','🐬'], stops:['k7','suki','k8','k9']}
];
const rowChars = id => { const rows = id[0] === 'h' ? KANA_ROWS : KATA_ROWS, r = +id.slice(1);
  return [...(r < 9 ? rows[r] : rows[9] + rows[10])].filter(c => c !== '・'); };
JOURNEY.forEach(g => SPOKEN_EXTRA.push(g.name + 'に つきました！'));
SPOKEN_EXTRA.push('ゴール！ おめでとう ございます！', 'しゅっぱつ！');
SPOKEN_EXTRA.push('ただしい ほうは どれですか？', 'いくつ たたきますか？', 'てを たたいて かぞえましょう', 'かきじゅんを みましょう', 'じゅんばんが ちがいます', 'むきが ちがいます', 'もう いちど かきましょう', 'いいですね！');

/* Example words under each kana on the tracing screen (2-3, the kana highlighted, tap to hear). を is used in
   sentences, so its examples are short ones; ヲ is so rare it has none. */
const KANA_WORDS = {"あ": [["あり", "🐜"], ["あめ", "☔"], ["あし", "🦶"]], "い": [["いぬ", "🐶"], ["いちご", "🍓"], ["いす", "🪑"]], "う": [["うさぎ", "🐰"], ["うし", "🐮"], ["うみ", "🌊"]], "え": [["えんぴつ", "✏️"], ["えき", "🚉"], ["えび", "🦐"]], "お": [["おにぎり", "🍙"], ["おばけ", "👻"], ["おかし", "🍬"]], "か": [["かさ", "☂️"], ["かに", "🦀"], ["かめ", "🐢"]], "き": [["きりん", "🦒"], ["きのこ", "🍄"], ["きつね", "🦊"]], "く": [["くま", "🐻"], ["くるま", "🚗"], ["くつ", "👟"]], "け": [["けむし", "🐛"], ["けいさつ", "👮"]], "こ": [["こども", "🧒"], ["こおり", "🧊"]], "さ": [["さかな", "🐟"], ["さる", "🐵"], ["さくら", "🌸"]], "し": [["しか", "🦌"], ["しお", "🧂"], ["しんごう", "🚦"]], "す": [["すいか", "🍉"], ["すし", "🍣"], ["すず", "🔔"]], "せ": [["せんせい", "🧑‍🏫"], ["せっけん", "🧼"]], "そ": [["そら", "🌤️"], ["そり", "🛷"]], "た": [["たこ", "🐙"], ["たまご", "🥚"], ["たいこ", "🥁"]], "ち": [["ちず", "🗺️"], ["ちょうちょ", "🦋"]], "つ": [["つき", "🌙"], ["つみき", "🧱"]], "て": [["て", "✋"], ["てがみ", "✉️"], ["てぶくろ", "🧤"]], "と": [["とけい", "⏰"], ["とり", "🐦"], ["とら", "🐯"]], "な": [["なす", "🍆"], ["なし", "🍐"], ["なみ", "🌊"]], "に": [["にんじん", "🥕"], ["にじ", "🌈"], ["にわとり", "🐔"]], "ぬ": [["いぬ", "🐶"], ["ぬいぐるみ", "🧸"]], "ね": [["ねこ", "🐱"], ["ねずみ", "🐭"]], "の": [["のりまき", "🍣"], ["のこぎり", "🪚"]], "は": [["はな", "🌸"], ["はさみ", "✂️"], ["はと", "🕊️"]], "ひ": [["ひこうき", "✈️"], ["ひよこ", "🐤"], ["ひまわり", "🌻"]], "ふ": [["ふね", "🚢"], ["ふうせん", "🎈"], ["ふく", "👕"]], "へ": [["へび", "🐍"], ["へや", "🛏️"]], "ほ": [["ほし", "⭐"], ["ほん", "📚"], ["ほね", "🦴"]], "ま": [["まど", "🪟"], ["まめ", "🫘"]], "み": [["みみ", "👂"], ["みかん", "🍊"], ["みず", "💧"]], "む": [["むし", "🐛"], ["むぎ", "🌾"]], "め": [["め", "👁️"], ["めがね", "👓"]], "も": [["もも", "🍑"], ["もり", "🌳"]], "や": [["やま", "⛰️"], ["やさい", "🥬"], ["やぎ", "🐐"]], "ゆ": [["ゆき", "❄️"], ["ゆび", "☝️"]], "よ": [["よる", "🌃"], ["ようちえん", "🏫"]], "ら": [["らっぱ", "🎺"], ["らくだ", "🐫"]], "り": [["りんご", "🍎"], ["りす", "🐿️"]], "る": [["くるま", "🚗"], ["かえる", "🐸"], ["さる", "🐵"]], "れ": [["れっしゃ", "🚂"], ["れんが", "🧱"]], "ろ": [["ろうそく", "🕯️"], ["ろば", "🫏"]], "わ": [["わに", "🐊"], ["にわとり", "🐔"]], "を": [["ほんを よみます", "📖"], ["みずを のみます", "🥛"]], "ん": [["みかん", "🍊"], ["ほん", "📚"], ["えんぴつ", "✏️"]], "ア": [["アイス", "🍦"], ["アヒル", "🦆"]], "イ": [["イルカ", "🐬"], ["イカ", "🦑"]], "ウ": [["ウサギ", "🐰"], ["ウインナー", "🌭"]], "エ": [["エビ", "🦐"], ["エレベーター", "🛗"]], "オ": [["オレンジ", "🍊"], ["オムライス", "🍳"]], "カ": [["カメラ", "📷"], ["カレー", "🍛"]], "キ": [["キリン", "🦒"], ["キウイ", "🥝"]], "ク": [["クッキー", "🍪"], ["クレヨン", "🖍️"]], "ケ": [["ケーキ", "🍰"], ["ケチャップ", "🍅"]], "コ": [["コアラ", "🐨"], ["コップ", "🥛"]], "サ": [["サッカー", "⚽"], ["サンドイッチ", "🥪"]], "シ": [["シャツ", "👕"], ["シマウマ", "🦓"]], "ス": [["スプーン", "🥄"], ["スカート", "👗"]], "セ": [["セーター", "🧥"], ["セロリ", "🥬"]], "ソ": [["ソファ", "🛋️"], ["ソフトクリーム", "🍦"]], "タ": [["タクシー", "🚕"], ["タコ", "🐙"]], "チ": [["チーズ", "🧀"], ["チョコ", "🍫"]], "ツ": [["ツリー", "🎄"], ["スーツ", "👔"]], "テ": [["テレビ", "📺"], ["テント", "⛺"]], "ト": [["トマト", "🍅"], ["トラ", "🐯"]], "ナ": [["ナス", "🍆"], ["バナナ", "🍌"]], "ニ": [["ニンジン", "🥕"], ["テニス", "🎾"]], "ヌ": [["ヌードル", "🍜"], ["カヌー", "🛶"]], "ネ": [["ネクタイ", "👔"], ["ネックレス", "📿"]], "ノ": [["ノート", "📓"], ["ピアノ", "🎹"]], "ハ": [["ハンバーガー", "🍔"], ["ハート", "❤️"]], "ヒ": [["ヒヨコ", "🐤"], ["コーヒー", "☕"]], "フ": [["フォーク", "🍴"], ["フライパン", "🍳"]], "ヘ": [["ヘリコプター", "🚁"], ["ヘルメット", "⛑️"]], "ホ": [["ホットケーキ", "🥞"], ["ホテル", "🏨"]], "マ": [["マスク", "😷"], ["トマト", "🍅"]], "ミ": [["ミルク", "🥛"], ["ハミガキ", "🪥"]], "ム": [["ハム", "🍖"], ["ゲーム", "🎮"]], "メ": [["メロン", "🍈"], ["メガネ", "👓"]], "モ": [["レモン", "🍋"], ["モノレール", "🚝"]], "ヤ": [["ヤギ", "🐐"], ["タイヤ", "🛞"]], "ユ": [["ユニコーン", "🦄"]], "ヨ": [["ヨット", "⛵"], ["ヨーヨー", "🪀"]], "ラ": [["ライオン", "🦁"], ["ラーメン", "🍜"]], "リ": [["リボン", "🎀"], ["リス", "🐿️"]], "ル": [["ルビー", "💎"], ["ボール", "⚽"]], "レ": [["レモン", "🍋"], ["レストラン", "🍽️"]], "ロ": [["ロボット", "🤖"], ["ロケット", "🚀"]], "ワ": [["ワニ", "🐊"], ["ワゴン", "🚐"]], "ヲ": [], "ン": [["パン", "🍞"], ["ペンギン", "🐧"]]};
