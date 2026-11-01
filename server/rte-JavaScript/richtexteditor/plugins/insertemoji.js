
RTE_DefaultConfig.plugin_insertemoji = RTE_Plugin_InsertEmoji;

function RTE_Plugin_InsertEmoji() {

	function CharToHTMLCode(ch) {
		if (ch.length > 2)
			return ch;

		if (ch.length == 1 || ch.charCodeAt(1) == 0xfe0f)
			return "&#" + ch.charCodeAt(0) + ";"

		if (ch.charCodeAt(1) == 0xfe0f) {
			return "&#" + ch.charCodeAt(0) + ";"
		}

		var offset = ch.charCodeAt(0) - 0xd83c;
		if (offset < 0 && offset > 3)//not support
			return ch;

		var second = ch.charCodeAt(1) - 0xdc04;
		var f = offset * 0x400 + second + 0x1f004;
		return "&#x" + f.toString(16) + ";"
	}


	var groupnames = ["smileys", "people", "animals", "food", "travel", "activities", "objects", "symbols"]
	// 2026-10-18 the category names read config.text_emoji_<name> (language packs), else the capitalised name.
	// tools/i18n/core-menus-language.mjs
	function emojiGroupLabel(name) {
		if (name === "recent") return (config && config.text_emoji_recent) || "Recently used";
		return (config && config["text_emoji_" + name]) || (name.charAt(0).toUpperCase() + name.substring(1));
	}
	// 2026-10-18 With a language pack the emoji are named in its language: lang/emoji/rte-emoji-<locale>.js, generated
	// from the Unicode CLDR annotations (tools/emoji/build-emoji-names.mjs), is loaded the first time the picker opens.
	// The English names stay search keywords; an English page loads nothing. tools/i18n/emoji-names-language.mjs
	var EMOJI_NAME_LOCALES = ["de", "es", "fr", "it", "ja", "ko", "nl", "pt", "pt-pt", "ru", "zh-Hans", "zh-Hant"];
	var emojiNameWaiters = null;
	function emojiNameLocale() {
		var l = config && config.text_uilocale;
		return l && EMOJI_NAME_LOCALES.indexOf(l) !== -1 ? l : "";
	}
	function emojiNames() {
		var l = emojiNameLocale();
		return l && window.RTE_EmojiNames ? window.RTE_EmojiNames[l] || null : null;
	}
	function ensureEmojiNames(done) {
		var l = emojiNameLocale();
		if (!l || emojiNames()) return;
		if (emojiNameWaiters) { emojiNameWaiters.push(done); return; }
		emojiNameWaiters = [done];
		var base = String((config && config.url_base) || "/richtexteditor").replace(/\/+$/, "");
		var s = document.createElement("script");
		s.src = window.RTE_TrustedTypes.scriptURL(base + "/lang/emoji/rte-emoji-" + l + ".js");
		s.charset = "utf-8";
		var finish = function () { var w = emojiNameWaiters || []; emojiNameWaiters = null; for (var i = 0; i < w.length; i++) { try { w[i](); } catch (e) { /* ignore */ } } };
		s.onload = finish;
		s.onerror = function () { emojiNameWaiters = null; };
		(document.head || document.documentElement).appendChild(s);
	}
	function emojiName(item) {
		var names = emojiNames();
		return (names && names[item.emoji]) || item.keyword || "";
	}
	function emojiMatches(item, q) {
		if (item.keyword && item.keyword.indexOf(q) !== -1) return true;
		var names = emojiNames(), n = names && names[item.emoji];
		return !!n && String(n).toLowerCase().indexOf(q) !== -1;
	}
	function emojiItemsText(n) {
		var tpl = (config && config.text_emoji_items) || "{0} items";
		return tpl.split("{0}").join(String(n));
	}
	var emojistrs = ["\ud83d\ude00#grinning face|\ud83d\ude03#grinning face with big eyes|\ud83d\ude04#grinning face with smiling eyes|\ud83d\ude01#beaming face with smiling eyes|\ud83d\ude06#grinning squinting face|\ud83d\ude05#grinning face with sweat|\ud83e\udd23#rolling on the floor laughing|\ud83d\ude02#face with tears of joy|\ud83d\ude42#slightly smiling face|\ud83d\ude43#upside-down face|\ud83d\ude09#winking face|\ud83d\ude0a#smiling face with smiling eyes|\ud83d\ude07#smiling face with halo|\ud83d\ude0d#smiling face with heart-eyes|\ud83e\udd29#star-struck|\ud83d\ude18#face blowing a kiss|\ud83d\ude17#kissing face|\ud83d\ude1a#kissing face with closed eyes|\ud83d\ude19#kissing face with smiling eyes|\ud83d\ude0b#face savoring food|\ud83d\ude1b#face with tongue|\ud83d\ude1c#winking face with tongue|\ud83e\udd2a#zany face|\ud83d\ude1d#squinting face with tongue|\ud83e\udd11#money-mouth face|\ud83e\udd17#hugging face|\ud83e\udd2d#face with hand over mouth|\ud83e\udd2b#shushing face|\ud83e\udd14#thinking face|\ud83e\udd10#zipper-mouth face|\ud83e\udd28#face with raised eyebrow|\ud83d\ude10#neutral face|\ud83d\ude11#expressionless face|\ud83d\ude36#face without mouth|\ud83d\ude0f#smirking face|\ud83d\ude12#unamused face|\ud83d\ude44#face with rolling eyes|\ud83d\ude2c#grimacing face|\ud83e\udd25#lying face|\ud83d\ude0c#relieved face|\ud83d\ude14#pensive face|\ud83d\ude2a#sleepy face|\ud83e\udd24#drooling face|\ud83d\ude34#sleeping face|\ud83d\ude37#face with medical mask|\ud83e\udd12#face with thermometer|\ud83e\udd15#face with head-bandage|\ud83e\udd22#nauseated face|\ud83e\udd2e#face vomiting|\ud83e\udd27#sneezing face|\ud83d\ude35#dizzy face|\ud83e\udd2f#exploding head|\ud83e\udd20#cowboy hat face|\ud83d\ude0e#smiling face with sunglasses|\ud83e\udd13#nerd face|\ud83e\uddd0#face with monocle|\ud83d\ude15#confused face|\ud83d\ude1f#worried face|\ud83d\ude41#slightly frowning face|\u2639\ufe0f#frowning face|\ud83d\ude2e#face with open mouth|\ud83d\ude2f#hushed face|\ud83d\ude32#astonished face|\ud83d\ude33#flushed face|\ud83d\ude26#frowning face with open mouth|\ud83d\ude27#anguished face|\ud83d\ude28#fearful face|\ud83d\ude30#anxious face with sweat|\ud83d\ude25#sad but relieved face|\ud83d\ude22#crying face|\ud83d\ude2d#loudly crying face|\ud83d\ude31#face screaming in fear|\ud83d\ude16#confounded face|\ud83d\ude23#persevering face|\ud83d\ude1e#disappointed face|\ud83d\ude13#downcast face with sweat|\ud83d\ude29#weary face|\ud83d\ude2b#tired face|\ud83d\ude24#face with steam from nose|\ud83d\ude21#pouting face|\ud83d\ude20#angry face|\ud83e\udd2c#face with symbols on mouth|\ud83d\ude08#smiling face with horns|\ud83d\udc7f#angry face with horns|\ud83d\udc80#skull|\u2620\ufe0f#skull and crossbones|\ud83d\udca9#pile of poo|\ud83e\udd21#clown face|\ud83d\udc79#ogre|\ud83d\udc7a#goblin|\ud83d\udc7b#ghost|\ud83d\udc7d#alien|\ud83d\udc7e#alien monster|\ud83e\udd16#robot|\ud83d\ude3a#grinning cat|\ud83d\ude38#grinning cat with smiling eyes|\ud83d\ude39#cat with tears of joy|\ud83d\ude3b#smiling cat with heart-eyes|\ud83d\ude3c#cat with wry smile|\ud83d\ude3d#kissing cat|\ud83d\ude40#weary cat|\ud83d\ude3f#crying cat|\ud83d\ude3e#pouting cat|\ud83d\ude48#see-no-evil monkey|\ud83d\ude49#hear-no-evil monkey|\ud83d\ude4a#speak-no-evil monkey|\ud83d\udc8b#kiss mark|\ud83d\udc8c#love letter|\ud83d\udc98#heart with arrow|\ud83d\udc9d#heart with ribbon|\ud83d\udc96#sparkling heart|\ud83d\udc97#growing heart|\ud83d\udc93#beating heart|\ud83d\udc9e#revolving hearts|\ud83d\udc95#two hearts|\ud83d\udc9f#heart decoration|\u2763\ufe0f#heart exclamation|\ud83d\udc94#broken heart|\u2764\ufe0f#red heart|\ud83e\udde1#orange heart|\ud83d\udc9b#yellow heart|\ud83d\udc9a#green heart|\ud83d\udc99#blue heart|\ud83d\udc9c#purple heart|\ud83d\udda4#black heart|\ud83d\udcaf#hundred points|\ud83d\udca2#anger symbol|\ud83d\udca5#collision|\ud83d\udcab#dizzy|\ud83d\udca6#sweat droplets|\ud83d\udca8#dashing away|\ud83d\udca3#bomb|\ud83d\udcac#speech balloon|\ud83d\udcad#thought balloon|\ud83d\udca4#zzz", "\ud83d\udc4b#waving hand|\ud83e\udd1a#raised back of hand|\u270b#raised hand|\ud83d\udd96#vulcan salute|\ud83d\udc4c#OK hand|\u270c\ufe0f#victory hand|\ud83e\udd1e#crossed fingers|\ud83e\udd1f#love-you gesture|\ud83e\udd18#sign of the horns|\ud83e\udd19#call me hand|\ud83d\udc48#backhand index pointing left|\ud83d\udc49#backhand index pointing right|\ud83d\udc46#backhand index pointing up|\ud83d\udd95#middle finger|\ud83d\udc47#backhand index pointing down|\u261d\ufe0f#index pointing up|\ud83d\udc4d#thumbs up|\ud83d\udc4e#thumbs down|\u270a#raised fist|\ud83d\udc4a#oncoming fist|\ud83e\udd1b#left-facing fist|\ud83e\udd1c#right-facing fist|\ud83d\udc4f#clapping hands|\ud83d\ude4c#raising hands|\ud83d\udc50#open hands|\ud83e\udd32#palms up together|\ud83e\udd1d#handshake|\ud83d\ude4f#folded hands|\u270d\ufe0f#writing hand|\ud83d\udc85#nail polish|\ud83e\udd33#selfie|\ud83d\udcaa#flexed biceps|\ud83d\udc42#ear|\ud83d\udc43#nose|\ud83e\udde0#brain|\ud83d\udc40#eyes|\ud83d\udc45#tongue|\ud83d\udc44#mouth|\ud83d\udc76#baby|\ud83e\uddd2#child|\ud83d\udc66#boy|\ud83d\udc67#girl|\ud83e\uddd1#person|\ud83d\udc71#person with blond hair|\ud83d\udc68#man|\ud83e\uddd4#man with beard|\ud83d\udc69#woman|\ud83e\uddd3#older person|\ud83d\udc74#old man|\ud83d\udc75#old woman|\ud83d\ude4d#person frowning|\ud83d\ude4e#person pouting|\ud83d\ude45#person gesturing NO|\ud83d\ude46#person gesturing OK|\ud83d\udc81#person tipping hand|\ud83d\ude4b#person raising hand|\ud83d\ude47#person bowing|\ud83e\udd26#person facepalming|\ud83e\udd37#person shrugging|\ud83d\udc6e#police officer|\ud83d\udc82#guard|\ud83d\udc77#construction worker|\ud83e\udd34#prince|\ud83d\udc78#princess|\ud83d\udc73#person wearing turban|\ud83d\udc72#person with skullcap|\ud83e\uddd5#woman with headscarf|\ud83e\udd35#person in tuxedo|\ud83d\udc70#person with veil|\ud83e\udd30#pregnant woman|\ud83e\udd31#breast-feeding|\ud83d\udc7c#baby angel|\ud83c\udf85#Santa Claus|\ud83e\udd36#Mrs. Claus|\ud83e\uddd9#mage|\ud83e\uddda#fairy|\ud83e\udddb#vampire|\ud83e\udddc#merperson|\ud83e\udddd#elf|\ud83e\uddde#genie|\ud83e\udddf#zombie|\ud83d\udc86#person getting massage|\ud83d\udc87#person getting haircut|\ud83d\udeb6#person walking|\ud83c\udfc3#person running|\ud83d\udc83#woman dancing|\ud83d\udd7a#man dancing|\ud83d\udc6f#people with bunny ears|\ud83e\uddd6#person in steamy room|\ud83e\uddd7#person climbing|\ud83e\udd3a#person fencing|\ud83c\udfc7#horse racing|\u26f7\ufe0f#skier|\ud83c\udfc2#snowboarder|\ud83c\udfc4#person surfing|\ud83d\udea3#person rowing boat|\ud83c\udfca#person swimming|\u26f9\ufe0f#person bouncing ball|\ud83d\udeb4#person biking|\ud83d\udeb5#person mountain biking|\ud83e\udd38#person cartwheeling|\ud83e\udd3c#people wrestling|\ud83e\udd3d#person playing water polo|\ud83e\udd3e#person playing handball|\ud83e\udd39#person juggling|\ud83e\uddd8#person in lotus position|\ud83d\udec0#person taking bath|\ud83d\udecc#person in bed|\ud83d\udc6d#women holding hands|\ud83d\udc6b#woman and man holding hands|\ud83d\udc6c#men holding hands|\ud83d\udc8f#kiss|\ud83d\udc91#couple with heart|\ud83d\udc6a#family|\ud83d\udc64#bust in silhouette|\ud83d\udc65#busts in silhouette|\ud83d\udc63#footprints", "\ud83d\udc35#monkey face|\ud83d\udc12#monkey|\ud83e\udd8d#gorilla|\ud83d\udc36#dog face|\ud83d\udc15#dog|\ud83d\udc29#poodle|\ud83d\udc3a#wolf|\ud83e\udd8a#fox|\ud83d\udc31#cat face|\ud83d\udc08#cat|\ud83e\udd81#lion|\ud83d\udc2f#tiger face|\ud83d\udc05#tiger|\ud83d\udc06#leopard|\ud83d\udc34#horse face|\ud83d\udc0e#horse|\ud83e\udd84#unicorn|\ud83e\udd93#zebra|\ud83e\udd8c#deer|\ud83d\udc2e#cow face|\ud83d\udc02#ox|\ud83d\udc03#water buffalo|\ud83d\udc04#cow|\ud83d\udc37#pig face|\ud83d\udc16#pig|\ud83d\udc17#boar|\ud83d\udc3d#pig nose|\ud83d\udc0f#ram|\ud83d\udc11#ewe|\ud83d\udc10#goat|\ud83d\udc2a#camel|\ud83d\udc2b#two-hump camel|\ud83e\udd92#giraffe|\ud83d\udc18#elephant|\ud83e\udd8f#rhinoceros|\ud83d\udc2d#mouse face|\ud83d\udc01#mouse|\ud83d\udc00#rat|\ud83d\udc39#hamster|\ud83d\udc30#rabbit face|\ud83d\udc07#rabbit|\ud83e\udd94#hedgehog|\ud83e\udd87#bat|\ud83d\udc3b#bear|\ud83d\udc28#koala|\ud83d\udc3c#panda|\ud83d\udc3e#paw prints|\ud83e\udd83#turkey|\ud83d\udc14#chicken|\ud83d\udc13#rooster|\ud83d\udc23#hatching chick|\ud83d\udc24#baby chick|\ud83d\udc25#front-facing baby chick|\ud83d\udc26#bird|\ud83d\udc27#penguin|\ud83e\udd85#eagle|\ud83e\udd86#duck|\ud83e\udd89#owl|\ud83d\udc38#frog|\ud83d\udc0a#crocodile|\ud83d\udc22#turtle|\ud83e\udd8e#lizard|\ud83d\udc0d#snake|\ud83d\udc32#dragon face|\ud83d\udc09#dragon|\ud83e\udd95#sauropod|\ud83e\udd96#T-Rex|\ud83d\udc33#spouting whale|\ud83d\udc0b#whale|\ud83d\udc2c#dolphin|\ud83d\udc1f#fish|\ud83d\udc20#tropical fish|\ud83d\udc21#blowfish|\ud83e\udd88#shark|\ud83d\udc19#octopus|\ud83d\udc1a#spiral shell|\ud83d\udc0c#snail|\ud83e\udd8b#butterfly|\ud83d\udc1b#bug|\ud83d\udc1c#ant|\ud83d\udc1d#honeybee|\ud83d\udc1e#lady beetle|\ud83e\udd97#cricket|\ud83e\udd82#scorpion|\ud83d\udc90#bouquet|\ud83c\udf38#cherry blossom|\ud83d\udcae#white flower|\ud83c\udf39#rose|\ud83e\udd40#wilted flower|\ud83c\udf3a#hibiscus|\ud83c\udf3b#sunflower|\ud83c\udf3c#blossom|\ud83c\udf37#tulip|\ud83c\udf31#seedling|\ud83c\udf32#evergreen tree|\ud83c\udf33#deciduous tree|\ud83c\udf34#palm tree|\ud83c\udf35#cactus|\ud83c\udf3e#sheaf of rice|\ud83c\udf3f#herb|\u2618\ufe0f#shamrock|\ud83c\udf40#four leaf clover|\ud83c\udf41#maple leaf|\ud83c\udf42#fallen leaf|\ud83c\udf43#leaf fluttering in wind", "\ud83c\udf47#grapes|\ud83c\udf48#melon|\ud83c\udf49#watermelon|\ud83c\udf4a#tangerine|\ud83c\udf4b#lemon|\ud83c\udf4c#banana|\ud83c\udf4d#pineapple|\ud83c\udf4e#red apple|\ud83c\udf4f#green apple|\ud83c\udf50#pear|\ud83c\udf51#peach|\ud83c\udf52#cherries|\ud83c\udf53#strawberry|\ud83e\udd5d#kiwi fruit|\ud83c\udf45#tomato|\ud83e\udd65#coconut|\ud83e\udd51#avocado|\ud83c\udf46#eggplant|\ud83e\udd54#potato|\ud83e\udd55#carrot|\ud83c\udf3d#ear of corn|\ud83e\udd52#cucumber|\ud83e\udd66#broccoli|\ud83c\udf44#mushroom|\ud83e\udd5c#peanuts|\ud83c\udf30#chestnut|\ud83c\udf5e#bread|\ud83e\udd50#croissant|\ud83e\udd56#baguette bread|\ud83e\udd68#pretzel|\ud83e\udd5e#pancakes|\ud83e\uddc0#cheese wedge|\ud83c\udf56#meat on bone|\ud83c\udf57#poultry leg|\ud83e\udd69#cut of meat|\ud83e\udd53#bacon|\ud83c\udf54#hamburger|\ud83c\udf5f#french fries|\ud83c\udf55#pizza|\ud83c\udf2d#hot dog|\ud83e\udd6a#sandwich|\ud83c\udf2e#taco|\ud83c\udf2f#burrito|\ud83e\udd59#stuffed flatbread|\ud83e\udd5a#egg|\ud83c\udf73#cooking|\ud83e\udd58#shallow pan of food|\ud83c\udf72#pot of food|\ud83e\udd63#bowl with spoon|\ud83e\udd57#green salad|\ud83c\udf7f#popcorn|\ud83e\udd6b#canned food|\ud83c\udf71#bento box|\ud83c\udf58#rice cracker|\ud83c\udf59#rice ball|\ud83c\udf5a#cooked rice|\ud83c\udf5b#curry rice|\ud83c\udf5c#steaming bowl|\ud83c\udf5d#spaghetti|\ud83c\udf60#roasted sweet potato|\ud83c\udf62#oden|\ud83c\udf63#sushi|\ud83c\udf64#fried shrimp|\ud83c\udf65#fish cake with swirl|\ud83c\udf61#dango|\ud83e\udd5f#dumpling|\ud83e\udd60#fortune cookie|\ud83e\udd61#takeout box|\ud83e\udd80#crab|\ud83e\udd90#shrimp|\ud83e\udd91#squid|\ud83c\udf66#soft ice cream|\ud83c\udf67#shaved ice|\ud83c\udf68#ice cream|\ud83c\udf69#doughnut|\ud83c\udf6a#cookie|\ud83c\udf82#birthday cake|\ud83c\udf70#shortcake|\ud83e\udd67#pie|\ud83c\udf6b#chocolate bar|\ud83c\udf6c#candy|\ud83c\udf6d#lollipop|\ud83c\udf6e#custard|\ud83c\udf6f#honey pot|\ud83c\udf7c#baby bottle|\ud83e\udd5b#glass of milk|\u2615#hot beverage|\ud83c\udf75#teacup without handle|\ud83c\udf76#sake|\ud83c\udf7e#bottle with popping cork|\ud83c\udf77#wine glass|\ud83c\udf78#cocktail glass|\ud83c\udf79#tropical drink|\ud83c\udf7a#beer mug|\ud83c\udf7b#clinking beer mugs|\ud83e\udd42#clinking glasses|\ud83e\udd43#tumbler glass|\ud83e\udd64#cup with straw|\ud83e\udd62#chopsticks|\ud83c\udf74#fork and knife|\ud83e\udd44#spoon|\ud83d\udd2a#kitchen knife|\ud83c\udffa#amphora", "\ud83c\udf0d#globe showing Europe-Africa|\ud83c\udf0e#globe showing Americas|\ud83c\udf0f#globe showing Asia-Australia|\ud83c\udf10#globe with meridians|\ud83d\uddfe#map of Japan|\u26f0\ufe0f#mountain|\ud83c\udf0b#volcano|\ud83d\uddfb#mount fuji|\ud83c\udfe0#house|\ud83c\udfe1#house with garden|\ud83c\udfe2#office building|\ud83c\udfe3#Japanese post office|\ud83c\udfe4#post office|\ud83c\udfe5#hospital|\ud83c\udfe6#bank|\ud83c\udfe8#hotel|\ud83c\udfe9#love hotel|\ud83c\udfea#convenience store|\ud83c\udfeb#school|\ud83c\udfec#department store|\ud83c\udfed#factory|\ud83c\udfef#Japanese castle|\ud83c\udff0#castle|\ud83d\udc92#wedding|\ud83d\uddfc#Tokyo tower|\ud83d\uddfd#Statue of Liberty|\u26ea#church|\ud83d\udd4c#mosque|\ud83d\udd4d#synagogue|\u26e9\ufe0f#shinto shrine|\ud83d\udd4b#kaaba|\u26f2#fountain|\u26fa#tent|\ud83c\udf01#foggy|\ud83c\udf03#night with stars|\ud83c\udf04#sunrise over mountains|\ud83c\udf05#sunrise|\ud83c\udf06#cityscape at dusk|\ud83c\udf07#sunset|\ud83c\udf09#bridge at night|\u2668\ufe0f#hot springs|\ud83c\udfa0#carousel horse|\ud83c\udfa1#ferris wheel|\ud83c\udfa2#roller coaster|\ud83d\udc88#barber pole|\ud83c\udfaa#circus tent|\ud83d\ude82#locomotive|\ud83d\ude83#railway car|\ud83d\ude84#high-speed train|\ud83d\ude85#bullet train|\ud83d\ude86#train|\ud83d\ude87#metro|\ud83d\ude88#light rail|\ud83d\ude89#station|\ud83d\ude8a#tram|\ud83d\ude9d#monorail|\ud83d\ude9e#mountain railway|\ud83d\ude8b#tram car|\ud83d\ude8c#bus|\ud83d\ude8d#oncoming bus|\ud83d\ude8e#trolleybus|\ud83d\ude90#minibus|\ud83d\ude91#ambulance|\ud83d\ude92#fire engine|\ud83d\ude93#police car|\ud83d\ude94#oncoming police car|\ud83d\ude95#taxi|\ud83d\ude96#oncoming taxi|\ud83d\ude97#automobile|\ud83d\ude98#oncoming automobile|\ud83d\ude99#sport utility vehicle|\ud83d\ude9a#delivery truck|\ud83d\ude9b#articulated lorry|\ud83d\ude9c#tractor|\ud83d\udef5#motor scooter|\ud83d\udeb2#bicycle|\ud83d\udef4#kick scooter|\ud83d\ude8f#bus stop|\u26fd#fuel pump|\ud83d\udea8#police car light|\ud83d\udea5#horizontal traffic light|\ud83d\udea6#vertical traffic light|\ud83d\uded1#stop sign|\ud83d\udea7#construction|\u2693#anchor|\u26f5#sailboat|\ud83d\udef6#canoe|\ud83d\udea4#speedboat|\u26f4\ufe0f#ferry|\ud83d\udea2#ship|\u2708\ufe0f#airplane|\ud83d\udeeb#airplane departure|\ud83d\udeec#airplane arrival|\ud83d\udcba#seat|\ud83d\ude81#helicopter|\ud83d\ude9f#suspension railway|\ud83d\udea0#mountain cableway|\ud83d\udea1#aerial tramway|\ud83d\ude80#rocket|\ud83d\udef8#flying saucer|\u231b#hourglass done|\u23f3#hourglass not done|\u231a#watch|\u23f0#alarm clock|\u23f1\ufe0f#stopwatch|\u23f2\ufe0f#timer clock|\ud83d\udd5b#twelve o\u2019clock|\ud83d\udd67#twelve-thirty|\ud83d\udd50#one o\u2019clock|\ud83d\udd5c#one-thirty|\ud83d\udd51#two o\u2019clock|\ud83d\udd5d#two-thirty|\ud83d\udd52#three o\u2019clock|\ud83d\udd5e#three-thirty|\ud83d\udd53#four o\u2019clock|\ud83d\udd5f#four-thirty|\ud83d\udd54#five o\u2019clock|\ud83d\udd60#five-thirty|\ud83d\udd55#six o\u2019clock|\ud83d\udd61#six-thirty|\ud83d\udd56#seven o\u2019clock|\ud83d\udd62#seven-thirty|\ud83d\udd57#eight o\u2019clock|\ud83d\udd63#eight-thirty|\ud83d\udd58#nine o\u2019clock|\ud83d\udd64#nine-thirty|\ud83d\udd59#ten o\u2019clock|\ud83d\udd65#ten-thirty|\ud83d\udd5a#eleven o\u2019clock|\ud83d\udd66#eleven-thirty|\ud83c\udf11#new moon|\ud83c\udf12#waxing crescent moon|\ud83c\udf13#first quarter moon|\ud83c\udf14#waxing gibbous moon|\ud83c\udf15#full moon|\ud83c\udf16#waning gibbous moon|\ud83c\udf17#last quarter moon|\ud83c\udf18#waning crescent moon|\ud83c\udf19#crescent moon|\ud83c\udf1a#new moon face|\ud83c\udf1b#first quarter moon face|\ud83c\udf1c#last quarter moon face|\u2600\ufe0f#sun|\ud83c\udf1d#full moon face|\ud83c\udf1e#sun with face|\u2b50#star|\ud83c\udf1f#glowing star|\ud83c\udf20#shooting star|\ud83c\udf0c#milky way|\u2601\ufe0f#cloud|\u26c5#sun behind cloud|\u26c8\ufe0f#cloud with lightning and rain|\ud83c\udf00#cyclone|\ud83c\udf08#rainbow|\ud83c\udf02#closed umbrella|\u2602\ufe0f#umbrella|\u2614#umbrella with rain drops|\u26f1\ufe0f#umbrella on ground|\u26a1#high voltage|\u2744\ufe0f#snowflake|\u2603\ufe0f#snowman|\u26c4#snowman without snow|\u2604\ufe0f#comet|\ud83d\udd25#fire|\ud83d\udca7#droplet|\ud83c\udf0a#water wave", "\ud83c\udf83#jack-o-lantern|\ud83c\udf84#Christmas tree|\ud83c\udf86#fireworks|\ud83c\udf87#sparkler|\u2728#sparkles|\ud83c\udf88#balloon|\ud83c\udf89#party popper|\ud83c\udf8a#confetti ball|\ud83c\udf8b#tanabata tree|\ud83c\udf8d#pine decoration|\ud83c\udf8e#Japanese dolls|\ud83c\udf8f#carp streamer|\ud83c\udf90#wind chime|\ud83c\udf91#moon viewing ceremony|\ud83c\udf80#ribbon|\ud83c\udf81#wrapped gift|\ud83c\udfab#ticket|\ud83c\udfc6#trophy|\ud83c\udfc5#sports medal|\ud83e\udd47#1st place medal|\ud83e\udd48#2nd place medal|\ud83e\udd49#3rd place medal|\u26bd#soccer ball|\u26be#baseball|\ud83c\udfc0#basketball|\ud83c\udfd0#volleyball|\ud83c\udfc8#american football|\ud83c\udfc9#rugby football|\ud83c\udfbe#tennis|\ud83c\udfb3#bowling|\ud83c\udfcf#cricket game|\ud83c\udfd1#field hockey|\ud83c\udfd2#ice hockey|\ud83c\udfd3#ping pong|\ud83c\udff8#badminton|\ud83e\udd4a#boxing glove|\ud83e\udd4b#martial arts uniform|\ud83e\udd45#goal net|\u26f3#flag in hole|\u26f8\ufe0f#ice skate|\ud83c\udfa3#fishing pole|\ud83c\udfbd#running shirt|\ud83c\udfbf#skis|\ud83d\udef7#sled|\ud83e\udd4c#curling stone|\ud83c\udfaf#direct hit|\ud83c\udfb1#pool 8 ball|\ud83d\udd2e#crystal ball|\ud83c\udfae#video game|\ud83c\udfb0#slot machine|\ud83c\udfb2#game die|\u2660\ufe0f#spade suit|\u2665\ufe0f#heart suit|\u2666\ufe0f#diamond suit|\u2663\ufe0f#club suit|\ud83c\udccf#joker|\ud83c\udc04#mahjong red dragon|\ud83c\udfb4#flower playing cards|\ud83c\udfad#performing arts|\ud83c\udfa8#artist palette", "\ud83d\udc53#glasses|\ud83d\udc54#necktie|\ud83d\udc55#t-shirt|\ud83d\udc56#jeans|\ud83e\udde3#scarf|\ud83e\udde4#gloves|\ud83e\udde5#coat|\ud83e\udde6#socks|\ud83d\udc57#dress|\ud83d\udc58#kimono|\ud83d\udc59#bikini|\ud83d\udc5a#woman\u2019s clothes|\ud83d\udc5b#purse|\ud83d\udc5c#handbag|\ud83d\udc5d#clutch bag|\ud83c\udf92#backpack|\ud83d\udc5e#man\u2019s shoe|\ud83d\udc5f#running shoe|\ud83d\udc60#high-heeled shoe|\ud83d\udc61#woman\u2019s sandal|\ud83d\udc62#woman\u2019s boot|\ud83d\udc51#crown|\ud83d\udc52#woman\u2019s hat|\ud83c\udfa9#top hat|\ud83c\udf93#graduation cap|\ud83e\udde2#billed cap|\u26d1\ufe0f#rescue worker\u2019s helmet|\ud83d\udcff#prayer beads|\ud83d\udc84#lipstick|\ud83d\udc8d#ring|\ud83d\udc8e#gem stone|\ud83d\udd07#muted speaker|\ud83d\udd08#speaker low volume|\ud83d\udd09#speaker medium volume|\ud83d\udd0a#speaker high volume|\ud83d\udce2#loudspeaker|\ud83d\udce3#megaphone|\ud83d\udcef#postal horn|\ud83d\udd14#bell|\ud83d\udd15#bell with slash|\ud83c\udfbc#musical score|\ud83c\udfb5#musical note|\ud83c\udfb6#musical notes|\ud83c\udfa4#microphone|\ud83c\udfa7#headphone|\ud83d\udcfb#radio|\ud83c\udfb7#saxophone|\ud83c\udfb8#guitar|\ud83c\udfb9#musical keyboard|\ud83c\udfba#trumpet|\ud83c\udfbb#violin|\ud83e\udd41#drum|\ud83d\udcf1#mobile phone|\ud83d\udcf2#mobile phone with arrow|\u260e\ufe0f#telephone|\ud83d\udcde#telephone receiver|\ud83d\udcdf#pager|\ud83d\udce0#fax machine|\ud83d\udd0b#battery|\ud83d\udd0c#electric plug|\ud83d\udcbb#laptop|\u2328\ufe0f#keyboard|\ud83d\udcbd#computer disk|\ud83d\udcbe#floppy disk|\ud83d\udcbf#optical disk|\ud83d\udcc0#dvd|\ud83c\udfa5#movie camera|\ud83c\udfac#clapper board|\ud83d\udcfa#television|\ud83d\udcf7#camera|\ud83d\udcf8#camera with flash|\ud83d\udcf9#video camera|\ud83d\udcfc#videocassette|\ud83d\udd0d#magnifying glass tilted left|\ud83d\udd0e#magnifying glass tilted right|\ud83d\udca1#light bulb|\ud83d\udd26#flashlight|\ud83c\udfee#red paper lantern|\ud83d\udcd4#notebook with decorative cover|\ud83d\udcd5#closed book|\ud83d\udcd6#open book|\ud83d\udcd7#green book|\ud83d\udcd8#blue book|\ud83d\udcd9#orange book|\ud83d\udcda#books|\ud83d\udcd3#notebook|\ud83d\udcd2#ledger|\ud83d\udcc3#page with curl|\ud83d\udcdc#scroll|\ud83d\udcc4#page facing up|\ud83d\udcf0#newspaper|\ud83d\udcd1#bookmark tabs|\ud83d\udd16#bookmark|\ud83d\udcb0#money bag|\ud83d\udcb4#yen banknote|\ud83d\udcb5#dollar banknote|\ud83d\udcb6#euro banknote|\ud83d\udcb7#pound banknote|\ud83d\udcb8#money with wings|\ud83d\udcb3#credit card|\ud83d\udcb9#chart increasing with yen|\u2709\ufe0f#envelope|\ud83d\udce7#e-mail|\ud83d\udce8#incoming envelope|\ud83d\udce9#envelope with arrow|\ud83d\udce4#outbox tray|\ud83d\udce5#inbox tray|\ud83d\udce6#package|\ud83d\udceb#closed mailbox with raised flag|\ud83d\udcea#closed mailbox with lowered flag|\ud83d\udcec#open mailbox with raised flag|\ud83d\udced#open mailbox with lowered flag|\ud83d\udcee#postbox|\u270f\ufe0f#pencil|\u2712\ufe0f#black nib|\ud83d\udcdd#memo|\ud83d\udcbc#briefcase|\ud83d\udcc1#file folder|\ud83d\udcc2#open file folder|\ud83d\udcc5#calendar|\ud83d\udcc6#tear-off calendar|\ud83d\udcc7#card index|\ud83d\udcc8#chart increasing|\ud83d\udcc9#chart decreasing|\ud83d\udcca#bar chart|\ud83d\udccb#clipboard|\ud83d\udccc#pushpin|\ud83d\udccd#round pushpin|\ud83d\udcce#paperclip|\ud83d\udccf#straight ruler|\ud83d\udcd0#triangular ruler|\u2702\ufe0f#scissors|\ud83d\udd12#locked|\ud83d\udd13#unlocked|\ud83d\udd0f#locked with pen|\ud83d\udd10#locked with key|\ud83d\udd11#key|\ud83d\udd28#hammer|\u26cf\ufe0f#pick|\u2692\ufe0f#hammer and pick|\u2694\ufe0f#crossed swords|\ud83d\udd2b#pistol|\ud83c\udff9#bow and arrow|\ud83d\udd27#wrench|\ud83d\udd29#nut and bolt|\u2699\ufe0f#gear|\u2696\ufe0f#balance scale|\ud83d\udd17#link|\u26d3\ufe0f#chains|\u2697\ufe0f#alembic|\ud83d\udd2c#microscope|\ud83d\udd2d#telescope|\ud83d\udce1#satellite antenna|\ud83d\udc89#syringe|\ud83d\udc8a#pill|\ud83d\udeaa#door|\ud83d\udebd#toilet|\ud83d\udebf#shower|\ud83d\udec1#bathtub|\ud83d\uded2#shopping cart|\ud83d\udeac#cigarette|\u26b0\ufe0f#coffin|\u26b1\ufe0f#funeral urn|\ud83d\uddff#moai", "\ud83c\udfe7#ATM sign|\ud83d\udeae#litter in bin sign|\ud83d\udeb0#potable water|\u267f#wheelchair symbol|\ud83d\udeb9#men\u2019s room|\ud83d\udeba#women\u2019s room|\ud83d\udebb#restroom|\ud83d\udebc#baby symbol|\ud83d\udebe#water closet|\ud83d\udec2#passport control|\ud83d\udec3#customs|\ud83d\udec4#baggage claim|\ud83d\udec5#left luggage|\u26a0\ufe0f#warning|\ud83d\udeb8#children crossing|\u26d4#no entry|\ud83d\udeab#prohibited|\ud83d\udeb3#no bicycles|\ud83d\udead#no smoking|\ud83d\udeaf#no littering|\ud83d\udeb1#non-potable water|\ud83d\udeb7#no pedestrians|\ud83d\udcf5#no mobile phones|\ud83d\udd1e#no one under eighteen|\u2622\ufe0f#radioactive|\u2623\ufe0f#biohazard|\u2b06\ufe0f#up arrow|\u2197\ufe0f#up-right arrow|\u27a1\ufe0f#right arrow|\u2198\ufe0f#down-right arrow|\u2b07\ufe0f#down arrow|\u2199\ufe0f#down-left arrow|\u2b05\ufe0f#left arrow|\u2196\ufe0f#up-left arrow|\u2195\ufe0f#up-down arrow|\u2194\ufe0f#left-right arrow|\u21a9\ufe0f#right arrow curving left|\u21aa\ufe0f#left arrow curving right|\u2934\ufe0f#right arrow curving up|\u2935\ufe0f#right arrow curving down|\ud83d\udd03#clockwise vertical arrows|\ud83d\udd04#counterclockwise arrows button|\ud83d\udd19#BACK arrow|\ud83d\udd1a#END arrow|\ud83d\udd1b#ON! arrow|\ud83d\udd1c#SOON arrow|\ud83d\udd1d#TOP arrow|\ud83d\uded0#place of worship|\u269b\ufe0f#atom symbol|\u2721\ufe0f#star of David|\u2638\ufe0f#wheel of dharma|\u262f\ufe0f#yin yang|\u271d\ufe0f#latin cross|\u2626\ufe0f#orthodox cross|\u262a\ufe0f#star and crescent|\u262e\ufe0f#peace symbol|\ud83d\udd4e#menorah|\ud83d\udd2f#dotted six-pointed star|\u2648#Aries|\u2649#Taurus|\u264a#Gemini|\u264b#Cancer|\u264c#Leo|\u264d#Virgo|\u264e#Libra|\u264f#Scorpio|\u2650#Sagittarius|\u2651#Capricorn|\u2652#Aquarius|\u2653#Pisces|\u26ce#Ophiuchus|\ud83d\udd00#shuffle tracks button|\ud83d\udd01#repeat button|\ud83d\udd02#repeat single button|\u25b6\ufe0f#play button|\u23e9#fast-forward button|\u23ed\ufe0f#next track button|\u23ef\ufe0f#play or pause button|\u25c0\ufe0f#reverse button|\u23ea#fast reverse button|\u23ee\ufe0f#last track button|\ud83d\udd3c#upwards button|\u23eb#fast up button|\ud83d\udd3d#downwards button|\u23ec#fast down button|\u23f8\ufe0f#pause button|\u23f9\ufe0f#stop button|\u23fa\ufe0f#record button|\u23cf\ufe0f#eject button|\ud83c\udfa6#cinema|\ud83d\udd05#dim button|\ud83d\udd06#bright button|\ud83d\udcf6#antenna bars|\ud83d\udcf3#vibration mode|\ud83d\udcf4#mobile phone off|\u2640\ufe0f#female sign|\u2642\ufe0f#male sign|\u2716\ufe0f#multiply|\u2795#plus|\u2796#minus|\u2797#divide|\u203c\ufe0f#double exclamation mark|\u2049\ufe0f#exclamation question mark|\u2753#question mark|\u2754#white question mark|\u2755#white exclamation mark|\u2757#exclamation mark|\u3030\ufe0f#wavy dash|\ud83d\udcb1#currency exchange|\ud83d\udcb2#heavy dollar sign|\u2695\ufe0f#medical symbol|\u267b\ufe0f#recycling symbol|\u269c\ufe0f#fleur-de-lis|\ud83d\udd31#trident emblem|\ud83d\udcdb#name badge|\ud83d\udd30#Japanese symbol for beginner|\u2b55#hollow red circle|\u2705#check mark button|\u2611\ufe0f#check box with check|\u2714\ufe0f#check mark|\u274c#cross mark|\u274e#cross mark button|\u27b0#curly loop|\u27bf#double curly loop|\u303d\ufe0f#part alternation mark|\u2733\ufe0f#eight-spoked asterisk|\u2734\ufe0f#eight-pointed star|\u2747\ufe0f#sparkle|\xa9\ufe0f#copyright|\xae\ufe0f#registered|\u2122\ufe0f#trade mark|\ud83d\udd1f#keycap: 10|\ud83d\udd20#input latin uppercase|\ud83d\udd21#input latin lowercase|\ud83d\udd22#input numbers|\ud83d\udd23#input symbols|\ud83d\udd24#input latin letters|\ud83c\udd8e#AB button (blood type)|\ud83c\udd91#CL button|\ud83c\udd92#COOL button|\ud83c\udd93#FREE button|\u2139\ufe0f#information|\ud83c\udd94#ID button|\u24c2\ufe0f#circled M|\ud83c\udd95#NEW button|\ud83c\udd96#NG button|\ud83c\udd97#OK button|\ud83c\udd98#SOS button|\ud83c\udd99#UP! button|\ud83c\udd9a#VS button|\ud83c\ude01#Japanese \u201chere\u201d button|\ud83c\ude36#Japanese \u201cnot free of charge\u201d button|\ud83c\ude2f#Japanese \u201creserved\u201d button|\ud83c\ude50#Japanese \u201cbargain\u201d button|\ud83c\ude39#Japanese \u201cdiscount\u201d button|\ud83c\ude1a#Japanese \u201cfree of charge\u201d button|\ud83c\ude32#Japanese \u201cprohibited\u201d button|\ud83c\ude51#Japanese \u201cacceptable\u201d button|\ud83c\ude38#Japanese \u201capplication\u201d button|\ud83c\ude34#Japanese \u201cpassing grade\u201d button|\ud83c\ude33#Japanese \u201cvacancy\u201d button|\u3297\ufe0f#Japanese \u201ccongratulations\u201d button|\u3299\ufe0f#Japanese \u201csecret\u201d button|\ud83c\ude3a#Japanese \u201copen for business\u201d button|\ud83c\ude35#Japanese \u201cno vacancy\u201d button|\ud83d\udd34#red circle|\ud83d\udd35#blue circle|\u26ab#black circle|\u26aa#white circle|\u2b1b#black large square|\u2b1c#white large square|\u25fc\ufe0f#black medium square|\u25fb\ufe0f#white medium square|\u25fe#black medium-small square|\u25fd#white medium-small square|\u25aa\ufe0f#black small square|\u25ab\ufe0f#white small square|\ud83d\udd36#large orange diamond|\ud83d\udd37#large blue diamond|\ud83d\udd38#small orange diamond|\ud83d\udd39#small blue diamond|\ud83d\udd3a#red triangle pointed up|\ud83d\udd3b#red triangle pointed down|\ud83d\udca0#diamond with a dot|\ud83d\udd18#radio button|\ud83d\udd33#white square button|\ud83d\udd32#black square button"]
	var emojidata = null;

	function MakeEmojiData() {
		if (emojidata)
			return;
		emojidata = [];
		for (var groupindex = 0; groupindex < groupnames.length; groupindex++) {
			var emojiitems = [];
			var emojigroup = { index: groupindex, name: groupnames[groupindex], items: emojiitems };
			var emojiarr = emojistrs[groupindex].split('|');
			for (var ei = 0; ei < emojiarr.length; ei++) {
				var emojistr = emojiarr[ei];
				var pair = emojistr.split('#')
				emojiitems.push({ emoji: pair[0], keyword: pair[1] });
			}
			emojidata.push(emojigroup);
		}
		//console.log(emojidata);
	}

	// 2026-10-17 Recently used emoji (Google Docs, Slack, Notion, CKEditor's picker): the ones inserted from the picker,
	// newest first, 16 at most, kept in this browser. The picker opens on them once there are any.
	// tools/emoji/emoji-recent.mjs
	var RECENT_KEY = "rte-emoji-recent", RECENT_MAX = 16, recentMemory = [];
	function GetRecent() {
		try {
			var raw = window.localStorage && window.localStorage.getItem(RECENT_KEY);
			if (raw) { var arr = JSON.parse(raw); if (Array.isArray(arr)) return arr.slice(0, RECENT_MAX); }
		} catch (e) { /* storage blocked: this page only */ }
		return recentMemory.slice(0, RECENT_MAX);
	}
	function AddRecent(emoji) {
		if (!emoji) return;
		var list = GetRecent().filter(function (x) { return x !== emoji; });
		list.unshift(emoji);
		list = list.slice(0, RECENT_MAX);
		recentMemory = list;
		try { if (window.localStorage) window.localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) { /* storage blocked */ }
	}
	function RecentGroup() {
		var list = GetRecent();
		if (!list.length) return null;
		var names = {};
		for (var gi = 0; gi < emojidata.length; gi++)
			for (var ii = 0; ii < emojidata[gi].items.length; ii++) names[emojidata[gi].items[ii].emoji] = emojidata[gi].items[ii].keyword;
		var items = [];
		for (var i = 0; i < list.length; i++) items.push({ emoji: list[i], keyword: names[list[i]] || "" });
		return { index: -1, name: "recent", items: items };
	}

	var obj = this;

	var config, editor;

	obj.PluginName = "InsertEmoji";

	obj.InitConfig = function (argconfig) {
		config = argconfig;
	}
	obj.InitEditor = function (argeditor) {
		editor = argeditor;

		editor.toolbarFactoryMap["insertemoji"] = function (cmd) {
			return editor.createToolbarItemDropDownPanel(cmd, function (panel) {

				MakeEmojiData()

				panel.style.width = "360px";
				panel.style.height = "420px";
				panel.style.display = "flex";
				panel.style.flexDirection = "column";

				panel.onclick = function (e) {
					if (e.target.nodeName == "GSPAN") {
						var picked = e.target.getAttribute("title") || "";
						AddRecent(picked.split(" ")[0]);
						editor.closeCurrentPopup();
						// opened as a dialog (execCommand, the slash menu) the picker stayed open after a pick
						var dlgInner = panel.closest && panel.closest("rte-dialog-inner");
						if (dlgInner && typeof dlgInner.close === "function") { try { dlgInner.close(); } catch (er) { /* closed */ } }
						var htmlcode = e.target.getAttribute("htmlcode");
						editor.insertHTML(htmlcode);
						editor.collapse(false);
						editor.focus();
					}
				}

				// Keyboard access for the emoji grid.
				//
				// The grid is <gspan> cells, which no browser makes focusable and
				// which the editor's own keyboard layer does not recognise (it
				// finds menu items by tag name, and these are not on that list).
				// Until the cells were given a role and a tab stop, the only
				// keyboard-reachable thing in this whole panel was the search box:
				// the picker announced itself as a menu and then could not be
				// operated without a mouse.
				function cells() {
					var visible = resultpanel.style.display !== "none" ? resultpanel : grouppanel;
					return [].slice.call(visible.querySelectorAll("gspan"));
				}

				// The grid wraps, so "up" and "down" mean the nearest cell on the
				// adjacent visual row — computed from geometry rather than assuming
				// a fixed column count, which changes with the panel width.
				function step(list, from, dir) {
					var here = from.getBoundingClientRect();
					var candidates = list.filter(function (c) {
						var r = c.getBoundingClientRect();
						return dir < 0 ? r.bottom <= here.top + 1 : r.top >= here.bottom - 1;
					});
					if (!candidates.length) return null;
					var rowEdge = null;
					candidates.forEach(function (c) {
						var r = c.getBoundingClientRect();
						if (rowEdge === null) rowEdge = r.top;
						else if (dir < 0 ? r.top > rowEdge : r.top < rowEdge) rowEdge = r.top;
					});
					var row = candidates.filter(function (c) {
						return Math.abs(c.getBoundingClientRect().top - rowEdge) < 2;
					});
					var best = row[0], bestDx = Infinity;
					row.forEach(function (c) {
						var dx = Math.abs(c.getBoundingClientRect().left - here.left);
						if (dx < bestDx) { bestDx = dx; best = c; }
					});
					return best;
				}

				panel.addEventListener("keydown", function (e) {
					var target = e.target;
					if (!target || target.nodeName !== "GSPAN") return;
					var list = cells();
					var at = list.indexOf(target);
					var next = null;

					if (e.key === "ArrowRight") next = list[at + 1];
					else if (e.key === "ArrowLeft") next = list[at - 1];
					else if (e.key === "ArrowDown") next = step(list, target, 1);
					else if (e.key === "ArrowUp") next = step(list, target, -1);
					else if (e.key === "Home") next = list[0];
					else if (e.key === "End") next = list[list.length - 1];
					else if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
						e.preventDefault();
						e.stopPropagation();
						target.click();
						return;
					}
					else if (e.key === "Escape") {
						e.preventDefault();
						e.stopPropagation();
						editor.closeCurrentPopup();
						return;
					}
					else return;

					e.preventDefault();
					e.stopPropagation();
					if (next) next.focus();
				}, true);

				var selecteditem = null;
				var toselectitem = null;
				function clear_selecteditem() {
					if (selecteditem != null) {
						selecteditem.style.backgroundColor = "";
						selecteditem = null;
					}
				}
				function set_selecteditem() {
					clear_selecteditem();
					selecteditem = toselectitem; selecteditem.style.backgroundColor = "#e6e6e6";
					toselectitem = null;
				}
				var tid_sel = 0;

				panel.onmouseover = function (e) {
					for (var node = e.target; node != panel; node = node.parentNode) {
						if (node.nodeName == "GITEM") {
							if (node == toselectitem)
								return;
							toselectitem = node;
							clearTimeout(tid_sel);
							tid_sel = setTimeout(set_selecteditem, 10);
							return;
						}
					}
				}
				panel.onmouseout = function () {
					clearTimeout(tid_sel);
					tid_sel = setTimeout(clear_selecteditem, 10)
				}

				// 2026-10-15 headings were inline darkblue, 1.04:1 on the dark panel; light blue under rte-dark.
				// tools/a11y/dark-mode-contrast.mjs
				var headColor = panel.closest && panel.closest(".rte-dark") ? "#93c5fd" : "darkblue";
				var searchbar = __Append(panel, "label", "margin:5px;position:relative;");
				searchbar.setAttribute("id", "emojis_searchbar");
				var searchbox = __Append(searchbar, "input", "width:100%;padding:5px 20px;border:solid 1px #ccc;border-radius:5px;");
				searchbox.setAttribute("placeholder", editor.getLangText("searchemojis"));
				searchbox.setAttribute("aria-label", (config && config.text_searchemojis) || "Search emojis");

				var tid_key = 0;
				searchbox.onchange = searchbox.onkeyup = searchbox.onkeypress = searchbox.onpaste = function () {
					clearTimeout(tid_key);
					tid_key = setTimeout(show_result, 100);
				}
				// 2026-05-11 quick-load rewrite: bulk-build via innerHTML and
				// only render the active category. Previous version eagerly
				// built ~4000 DOM nodes for 1,037 emojis on every panel open,
				// noticeably slow on low-end machines. New flow:
				//   - panel opens → render first category only (~125 nodes)
				//   - tab click → swap to that category's HTML
				//   - search → bulk innerHTML build of filtered results
				function buildCategoryHTML(group) {
					var parts = [];
					parts.push('<div style="padding:3px;margin-top:5px;color:' + headColor + ';">' + emojiGroupLabel(group.name) + '</div>');
					parts.push('<div style="display:flex;flex-direction:row;flex-wrap:wrap;">');
					for (var i = 0; i < group.items.length; i++) {
						var item = group.items[i];
						var htmlcode = CharToHTMLCode(item.emoji);
						parts.push('<gitem class="rte-flex-column-center" style="width:32px;height:32px;margin:2px"><gspan role="menuitem" tabindex="0" aria-label="' + (emojiName(item) || item.emoji).replace(/"/g, '') + '" htmlcode="' + htmlcode + '" title="' + item.emoji + ' ' + emojiName(item).replace(/"/g, '') + '">' + htmlcode + '</gspan></gitem>');
					}
					parts.push('</div>');
					return parts.join('');
				}

				function show_result() {
					var keyword = searchbox.value.trim().toLowerCase();
					if (!keyword) {
						tabpanel.style.display =
							grouppanel.style.display = "";
						resultpanel.style.display = "none";
						return;
					}

					tabpanel.style.display =
						grouppanel.style.display = "none";
					resultpanel.style.display = "flex";

					var hitsHtml = [];
					var itemindex = 0;
					for (var gi = 0; gi < emojidata.length; gi++) {
						var group = emojidata[gi];
						for (var ii = 0; ii < group.items.length; ii++) {
							var item = group.items[ii];
							if (!emojiMatches(item, keyword))
								continue;
							itemindex++;
							var htmlcode = CharToHTMLCode(item.emoji);
							hitsHtml.push('<gitem class="rte-flex-column-center" style="width:32px;height:32px;margin:2px"><gspan role="menuitem" tabindex="0" aria-label="' + (emojiName(item) || item.emoji).replace(/"/g, '') + '" htmlcode="' + htmlcode + '" title="' + item.emoji + ' ' + emojiName(item).replace(/"/g, '') + '">' + htmlcode + '</gspan></gitem>');
						}
					}
					resultpanel.innerHTML = __RTE_TT('<div style="width:100%;padding:3px;margin-top:5px;color:' + headColor + ';text-align:center;">' + emojiItemsText(itemindex) + '</div>' + hitsHtml.join(''));
				}

				panel.setAttribute("id", "emoji-picker");

				var tabpanel = __Append(panel, "div");

				var resultpanel = __Append(panel, "div", "display:none;flex-direction:row;flex-wrap:wrap;overflow-y:scroll;padding-bottom:55px");

				var grouppanel = __Append(panel, "div", "overflow-y:scroll;padding-bottom:55px;flex:999");
				// 2026-10-15 the cells are menu items; each grid is their menu now that the picker (it has a search box) is
				// announced as a dialog, not a menu (axe aria-required-parent). tools/a11y/popup-menu-roles.mjs
				resultpanel.setAttribute("role", "menu");
				resultpanel.setAttribute("aria-label", (config && config.text_emoji_results) || "Search results");
				grouppanel.setAttribute("role", "menu");
				grouppanel.setAttribute("aria-label", (config && config.text_emoji_grid) || "Emoji");

				// Lazy-render: only build the active category. Each tab click swaps the html.
				var activeGroupIndex = 0;
				var recentGroup = RecentGroup();
				// gi -1 is Recently used, the first tab when there is one
				function renderCategory(gi) {
					activeGroupIndex = gi;
					grouppanel.innerHTML = __RTE_TT(buildCategoryHTML(gi === -1 ? recentGroup : emojidata[gi]));
					grouppanel.scrollTop = 0;
					for (var bi = 0; bi < tabuibtns.length; bi++) {
						tabuibtns[bi].className = tabuibtns[bi].__rteGroup === gi ? "rte-ui-active" : "";
					}
				}

				// (the tab strip repeated the panel's id="emoji-picker"; one element may carry it)
				var tabui = __Append(tabpanel, "rte-tabui");
				var tabuitoolbar = __Append(tabui, "rte-tabui-toolbar");
				var tabuibtns = [];
				var tabgroups = recentGroup ? [{ index: -1, name: "recent", items: [{ emoji: "\ud83d\udd58" }] }].concat(emojidata) : emojidata;
				for (var gi = 0; gi < tabgroups.length; gi++) {
					(function (group) {
						var btn = __Append(tabuitoolbar, "rte-tabui-toolbar-button", "width:32px;text-align:center;margin:4px");
						btn.setAttribute("title", emojiGroupLabel(group.name));
						btn.innerHTML = __RTE_TT(group.items[0].emoji);
						btn.__rteGroup = group.index;
						btn.onclick = function () { renderCategory(group.index); };
						tabuibtns.push(btn);
					})(tabgroups[gi]);
				}

				// Initial render: Recently used when there is any, else the first category (~125 emojis instead of all 1037).
				renderCategory(recentGroup ? -1 : 0);
				// the names arrive after the first paint on a non-English page: repaint what is shown
				ensureEmojiNames(function () { if (grouppanel.isConnected) { if (resultpanel.style.display !== "none") show_result(); else renderCategory(activeGroupIndex); } });

				searchbox.focus();


			})
		};

	}

	function __Append(parent, tagname, csstext, cssclass) {
		var tag = parent.ownerDocument.createElement(tagname);
		if (csstext) tag.style.cssText = csstext;
		if (cssclass) tag.className = cssclass;
		parent.appendChild(tag);
		return tag;
	}


}




