#!/usr/bin/env python3
"""Evergreen + seasonal SEO pages (6 languages): "light a candle online" and "Advent 2026".

Run from the repo root AFTER tools/build_pages.py (it rewrites sitemap.xml):
    python3 tools/build_seo.py
Writes /<slug>.html (en) and /<lang>/<slug>.html, then appends their URLs to sitemap.xml.
All prayers on these pages are original texts written for Sanctuary.
"""
import json, os, re, datetime, html

SITE = "https://cloudsanctuary.app"
LANGS = ["en", "fr", "de", "it", "es", "zh"]
HTML_LANG = {"en": "en", "fr": "fr", "de": "de", "it": "it", "es": "es", "zh": "zh-CN"}
LOCALE = {"en": "en_US", "fr": "fr_FR", "de": "de_DE", "it": "it_IT", "es": "es_ES", "zh": "zh_CN"}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today().isoformat()
OPS = ("<script src=\"/ops-track.js?v=2\"></script>\n<script>try{OpsTrack.init({product:'sanct',"
       "supabaseUrl:'https://smwqqiebkdaheikihbrg.supabase.co',anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
       "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtd3FxaWVia2RhaGVpa2loYnJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5NzU2NzksImV4cCI6MjEwNzU1MTY3OX0."
       "ouoYJ_OTLp4aazXn7H9xcwGJQOQ-pF1fttwR7U5WaG4'});}catch(e){}</script>")

def home(l):
    return "/" if l == "en" else f"/{l}/"

def app(l, go, camp):
    return f"{home(l)}?go={go}&utm_source=seo&utm_medium=organic&utm_campaign={camp}"

E = html.escape

# ---------------------------------------------------------------- page copy
SLUG = {
    "candle": {"en": "light-a-candle", "fr": "allumer-un-cierge", "de": "kerze-anzuenden", "it": "accendere-una-candela",
               "es": "encender-una-vela", "zh": "dian-la-zhu"},
    "advent": {"en": "advent-2026", "fr": "avent-2026", "de": "advent-2026", "it": "avvento-2026",
               "es": "adviento-2026", "zh": "jiang-lin-qi-2026"},
}

C = {
 "en": dict(
  brand="Sanctuary", nav="Enter the church",
  c_title="Light a Candle Online for Someone · Sanctuary",
  c_desc="Light a virtual prayer candle for someone who is sick, grieving, or has passed away — or as a thanksgiving. Enter a quiet online church, day or night.",
  c_h1="Light a candle online for someone",
  c_lead="When you cannot be beside someone, you can still pray for them. In Sanctuary, a quiet online church, you walk to the candle chapel, light a candle and entrust that person to God.",
  c_for="Who people light candles for", c_list=["A friend or relative who is sick or waiting for surgery", "Someone who has died, on an anniversary or All Souls’ Day", "A child facing exams, a new job, a hard decision", "A thanksgiving: a birth, a healing, an answered prayer", "Peace in a place at war, or for people you will never meet"],
  c_how="How it works", c_steps=["Enter the church — no download, it opens in your browser.", "Walk to the candle chapel and choose “Light a candle”.", "Write a name or intention. It helps you focus and is never shown publicly.", "Stay a moment in the candle’s light and say one sentence to God for them."],
  c_prayer_h="A short prayer while your candle burns", c_prayer="Lord, I place this light before you for the one I carry in my heart. Where I cannot reach, may your hand reach. Give rest, healing and peace, and let this small flame keep praying when I fall silent. Amen.",
  c_price="Entering the church, praying and the prayer wall are free. A candle costs €1; when a friend joins through your invitation link, you both receive a free candle.",
  c_cta="Light a candle now", c_cta2="Pray together with others",
  a_title="Advent 2026: Dates, Sundays and Daily Prayers · Sanctuary",
  a_desc="Advent 2026 begins on Sunday 29 November and ends on Christmas Eve. The four Sundays of Advent, their themes, a short prayer for each week, and an online church to pray in.",
  a_h1="Advent 2026: dates and a prayer for each week",
  a_lead="Advent 2026 begins on Sunday 29 November and ends on Thursday 24 December, Christmas Eve. Four Sundays, four candles on the wreath — one more each week as Christmas comes closer.",
  a_dates="The Sundays of Advent 2026",
  a_weeks=[("29 November 2026", "First Sunday of Advent · Hope", "God of promise, as the year grows dark, light the first candle of hope in me. Teach me to wait without fear, for you are already on your way to us. Amen."),
           ("6 December 2026", "Second Sunday of Advent · Peace", "Prince of Peace, quiet the noise in my heart and in our world. Make me gentle with those near me, and bring your peace where people suffer. Amen."),
           ("13 December 2026", "Third Sunday of Advent · Joy", "Lord, you come close to us. Let a quiet joy grow in me that does not depend on circumstances, and let it overflow to someone who needs it this week. Amen."),
           ("20 December 2026", "Fourth Sunday of Advent · Love", "God who became small for love of us, make room in me as Mary made room for you. Let my love be practical: a visit, a call, a word of forgiveness. Amen.")],
  a_eve="Christmas Eve: Thursday 24 December 2026 · Christmas Day: Friday 25 December 2026.",
  a_how="Keep Advent with Sanctuary", a_list=["Light one candle each Sunday in the candle chapel and pray the prayer of the week.", "Join a prayer gathering — there is one every half hour, or start your own.", "Post an anonymous request on the prayer wall and pray for others’ requests."],
  a_cta="Light this week’s Advent candle", a_cta2="Join a prayer gathering",
  q_when="When does Advent 2026 start?", a_when="Advent 2026 starts on Sunday 29 November 2026 and ends on Christmas Eve, 24 December 2026.",
  foot="Sanctuary is an online space for personal prayer. It does not replace your parish, the sacraments or pastoral care.", other="Other languages"),
 "fr": dict(
  brand="Sanctuary", nav="Entrer dans l’église",
  c_title="Allumer un cierge en ligne pour quelqu’un · Sanctuary",
  c_desc="Allumez un cierge virtuel pour une personne malade, en deuil ou décédée, ou en action de grâce. Entrez dans une église en ligne paisible, jour et nuit.",
  c_h1="Allumer un cierge en ligne pour quelqu’un",
  c_lead="Quand on ne peut pas être auprès de quelqu’un, on peut encore prier pour lui. Dans Sanctuary, une église en ligne paisible, vous allez jusqu’à la chapelle des cierges, vous allumez un cierge et vous confiez cette personne à Dieu.",
  c_for="Pour qui allume-t-on un cierge", c_list=["Un proche malade ou qui attend une opération", "Un défunt, pour un anniversaire ou la Toussaint", "Un enfant avant un examen, un nouveau travail, une décision difficile", "Une action de grâce : une naissance, une guérison, une prière exaucée", "La paix dans un pays en guerre, ou des personnes que vous ne rencontrerez jamais"],
  c_how="Comment ça marche", c_steps=["Entrez dans l’église — rien à télécharger, tout s’ouvre dans le navigateur.", "Allez à la chapelle des cierges et choisissez « Allumer un cierge ».", "Écrivez un prénom ou une intention. Cela vous aide à vous recueillir ; ce n’est jamais affiché publiquement.", "Restez un instant dans la lumière du cierge et dites à Dieu une phrase pour cette personne."],
  c_prayer_h="Une courte prière pendant que le cierge brûle", c_prayer="Seigneur, je dépose devant toi cette lumière pour celui ou celle que je porte dans mon cœur. Là où je ne peux pas aller, que ta main l’atteigne. Donne repos, guérison et paix, et que cette petite flamme continue de prier quand je me tais. Amen.",
  c_price="Entrer, prier et le mur de prière sont gratuits. Un cierge coûte 1 € ; quand un ami s’inscrit avec votre lien d’invitation, vous recevez chacun un cierge offert.",
  c_cta="Allumer un cierge maintenant", c_cta2="Prier avec d’autres",
  a_title="Avent 2026 : dates, dimanches et prières · Sanctuary",
  a_desc="L’Avent 2026 commence le dimanche 29 novembre et se termine la veille de Noël. Les quatre dimanches de l’Avent, leur thème, une courte prière pour chaque semaine.",
  a_h1="Avent 2026 : les dates et une prière pour chaque semaine",
  a_lead="L’Avent 2026 commence le dimanche 29 novembre et se termine le jeudi 24 décembre, veille de Noël. Quatre dimanches, quatre bougies sur la couronne — une de plus chaque semaine.",
  a_dates="Les dimanches de l’Avent 2026",
  a_weeks=[("29 novembre 2026", "1er dimanche de l’Avent · Espérance", "Dieu de la promesse, quand les jours raccourcissent, allume en moi la première bougie de l’espérance. Apprends-moi à attendre sans peur, car tu es déjà en chemin vers nous. Amen."),
           ("6 décembre 2026", "2e dimanche de l’Avent · Paix", "Prince de la paix, apaise le bruit de mon cœur et de notre monde. Rends-moi doux avec mes proches et porte ta paix là où l’on souffre. Amen."),
           ("13 décembre 2026", "3e dimanche de l’Avent · Joie", "Seigneur, tu te fais proche. Fais grandir en moi une joie tranquille qui ne dépend pas des circonstances, et qu’elle déborde cette semaine vers quelqu’un qui en a besoin. Amen."),
           ("20 décembre 2026", "4e dimanche de l’Avent · Amour", "Dieu qui t’es fait petit par amour, fais de la place en moi comme Marie t’a fait de la place. Que mon amour soit concret : une visite, un appel, un pardon. Amen.")],
  a_eve="Veille de Noël : jeudi 24 décembre 2026 · Noël : vendredi 25 décembre 2026.",
  a_how="Vivre l’Avent avec Sanctuary", a_list=["Chaque dimanche, allumez un cierge à la chapelle et dites la prière de la semaine.", "Rejoignez un temps de prière commun — toutes les demi-heures, ou lancez le vôtre.", "Déposez une intention anonyme sur le mur de prière et priez pour celles des autres."],
  a_cta="Allumer le cierge de l’Avent", a_cta2="Rejoindre une prière commune",
  q_when="Quand commence l’Avent 2026 ?", a_when="L’Avent 2026 commence le dimanche 29 novembre 2026 et se termine la veille de Noël, le 24 décembre 2026.",
  foot="Sanctuary est un espace en ligne pour la prière personnelle. Il ne remplace ni la paroisse, ni les sacrements, ni l’accompagnement pastoral.", other="Autres langues"),
 "de": dict(
  brand="Sanctuary", nav="Kirche betreten",
  c_title="Online eine Kerze anzünden für jemanden · Sanctuary",
  c_desc="Zünden Sie online eine Gebetskerze an – für einen kranken Menschen, für Verstorbene, in Trauer oder als Dank. Eine stille Online-Kirche, Tag und Nacht geöffnet.",
  c_h1="Online eine Kerze für jemanden anzünden",
  c_lead="Wenn Sie nicht bei jemandem sein können, können Sie trotzdem für ihn beten. In Sanctuary, einer stillen Online-Kirche, gehen Sie zur Kerzenkapelle, zünden eine Kerze an und vertrauen diesen Menschen Gott an.",
  c_for="Für wen Menschen eine Kerze anzünden", c_list=["Für einen kranken Angehörigen oder vor einer Operation", "Für Verstorbene, am Jahrestag oder an Allerseelen", "Für ein Kind vor einer Prüfung, einem neuen Job, einer schweren Entscheidung", "Als Dank: für eine Geburt, eine Genesung, ein erhörtes Gebet", "Für Frieden in Kriegsgebieten oder für Menschen, die Sie nie treffen werden"],
  c_how="So funktioniert es", c_steps=["Kirche betreten – kein Download, alles läuft im Browser.", "Zur Kerzenkapelle gehen und „Kerze anzünden“ wählen.", "Einen Namen oder ein Anliegen eingeben. Das hilft beim Sammeln und wird nie öffentlich angezeigt.", "Einen Moment im Licht der Kerze bleiben und Gott einen Satz für diesen Menschen sagen."],
  c_prayer_h="Ein kurzes Gebet, während die Kerze brennt", c_prayer="Herr, ich stelle dieses Licht vor dich für den Menschen, den ich im Herzen trage. Wo ich nicht hinreiche, da reiche du hin. Schenke Ruhe, Heilung und Frieden, und lass diese kleine Flamme weiterbeten, wenn ich schweige. Amen.",
  c_price="Eintritt, Gebet und Gebetswand sind kostenlos. Eine Kerze kostet 1 €; wenn sich ein Freund über Ihren Einladungslink anmeldet, erhalten Sie beide eine Kerze geschenkt.",
  c_cta="Jetzt eine Kerze anzünden", c_cta2="Gemeinsam mit anderen beten",
  a_title="Advent 2026: Termine, Adventssonntage und Gebete · Sanctuary",
  a_desc="Der Advent 2026 beginnt am Sonntag, 29. November, und endet an Heiligabend. Die vier Adventssonntage, ihre Themen und ein kurzes Gebet für jede Woche.",
  a_h1="Advent 2026: Termine und ein Gebet für jede Woche",
  a_lead="Der Advent 2026 beginnt am Sonntag, 29. November, und endet am Donnerstag, 24. Dezember, an Heiligabend. Vier Sonntage, vier Kerzen am Adventskranz – jede Woche eine mehr.",
  a_dates="Die Adventssonntage 2026",
  a_weeks=[("29. November 2026", "1. Advent · Hoffnung", "Gott der Verheißung, wenn die Tage dunkel werden, zünde in mir die erste Kerze der Hoffnung an. Lehre mich warten ohne Angst, denn du bist schon unterwegs zu uns. Amen."),
           ("6. Dezember 2026", "2. Advent · Frieden", "Friedensfürst, beruhige den Lärm in meinem Herzen und in unserer Welt. Mach mich sanft zu den Menschen um mich und bring deinen Frieden dorthin, wo Menschen leiden. Amen."),
           ("13. Dezember 2026", "3. Advent · Freude", "Herr, du kommst uns nahe. Lass in mir eine stille Freude wachsen, die nicht von den Umständen abhängt, und lass sie diese Woche zu jemandem überfließen, der sie braucht. Amen."),
           ("20. Dezember 2026", "4. Advent · Liebe", "Gott, der aus Liebe klein wurde, mach Raum in mir, wie Maria dir Raum gab. Lass meine Liebe konkret werden: ein Besuch, ein Anruf, ein Wort der Vergebung. Amen.")],
  a_eve="Heiligabend: Donnerstag, 24. Dezember 2026 · Weihnachten: Freitag, 25. Dezember 2026.",
  a_how="Advent mit Sanctuary", a_list=["Zünden Sie jeden Sonntag in der Kerzenkapelle eine Kerze an und beten Sie das Wochengebet.", "Nehmen Sie an einem gemeinsamen Gebet teil – jede halbe Stunde, oder starten Sie Ihr eigenes.", "Schreiben Sie ein anonymes Anliegen an die Gebetswand und beten Sie für die Anliegen anderer."],
  a_cta="Adventskerze anzünden", a_cta2="Am gemeinsamen Gebet teilnehmen",
  q_when="Wann beginnt der Advent 2026?", a_when="Der Advent 2026 beginnt am Sonntag, 29. November 2026, und endet an Heiligabend, 24. Dezember 2026.",
  foot="Sanctuary ist ein Online-Raum für das persönliche Gebet. Es ersetzt weder die Gemeinde noch die Sakramente oder die Seelsorge.", other="Andere Sprachen"),
 "it": dict(
  brand="Sanctuary", nav="Entra in chiesa",
  c_title="Accendere una candela online per qualcuno · Sanctuary",
  c_desc="Accendi una candela virtuale per una persona malata, in lutto o defunta, oppure come ringraziamento. Entra in una chiesa online silenziosa, giorno e notte.",
  c_h1="Accendere una candela online per qualcuno",
  c_lead="Quando non puoi essere accanto a qualcuno, puoi comunque pregare per lui. In Sanctuary, una chiesa online silenziosa, vai alla cappella delle candele, accendi una candela e affidi quella persona a Dio.",
  c_for="Per chi si accende una candela", c_list=["Un familiare malato o in attesa di un intervento", "Un defunto, in un anniversario o nel giorno dei Morti", "Un figlio prima di un esame, un nuovo lavoro, una scelta difficile", "Un ringraziamento: una nascita, una guarigione, una preghiera esaudita", "La pace in un paese in guerra, o persone che non incontrerai mai"],
  c_how="Come funziona", c_steps=["Entra in chiesa — niente da scaricare, si apre nel browser.", "Vai alla cappella delle candele e scegli «Accendi una candela».", "Scrivi un nome o un’intenzione. Ti aiuta a raccoglierti e non viene mai mostrato pubblicamente.", "Resta un momento nella luce della candela e di’ a Dio una frase per quella persona."],
  c_prayer_h="Una breve preghiera mentre la candela arde", c_prayer="Signore, pongo davanti a te questa luce per chi porto nel cuore. Dove io non arrivo, arrivi la tua mano. Dona riposo, guarigione e pace, e questa piccola fiamma continui a pregare quando io taccio. Amen.",
  c_price="Entrare, pregare e il muro delle preghiere sono gratuiti. Una candela costa 1 €; quando un amico si iscrive con il tuo link di invito, ricevete entrambi una candela in regalo.",
  c_cta="Accendi una candela ora", c_cta2="Prega insieme ad altri",
  a_title="Avvento 2026: date, domeniche e preghiere · Sanctuary",
  a_desc="L’Avvento 2026 inizia domenica 29 novembre e termina la Vigilia di Natale. Le quattro domeniche di Avvento, i loro temi e una breve preghiera per ogni settimana.",
  a_h1="Avvento 2026: le date e una preghiera per ogni settimana",
  a_lead="L’Avvento 2026 inizia domenica 29 novembre e termina giovedì 24 dicembre, Vigilia di Natale. Quattro domeniche, quattro candele sulla corona — una in più ogni settimana.",
  a_dates="Le domeniche di Avvento 2026",
  a_weeks=[("29 novembre 2026", "I domenica di Avvento · Speranza", "Dio della promessa, mentre i giorni si fanno bui, accendi in me la prima candela della speranza. Insegnami ad attendere senza paura, perché sei già in cammino verso di noi. Amen."),
           ("6 dicembre 2026", "II domenica di Avvento · Pace", "Principe della pace, calma il rumore del mio cuore e del nostro mondo. Rendimi mite con chi mi sta vicino e porta la tua pace dove si soffre. Amen."),
           ("13 dicembre 2026", "III domenica di Avvento · Gioia", "Signore, ti fai vicino. Fa’ crescere in me una gioia quieta che non dipende dalle circostanze, e che questa settimana trabocchi verso qualcuno che ne ha bisogno. Amen."),
           ("20 dicembre 2026", "IV domenica di Avvento · Amore", "Dio che ti sei fatto piccolo per amore, fa’ spazio in me come Maria ha fatto spazio a te. Che il mio amore sia concreto: una visita, una telefonata, un perdono. Amen.")],
  a_eve="Vigilia di Natale: giovedì 24 dicembre 2026 · Natale: venerdì 25 dicembre 2026.",
  a_how="Vivere l’Avvento con Sanctuary", a_list=["Ogni domenica accendi una candela nella cappella e recita la preghiera della settimana.", "Partecipa a una preghiera comune — ogni mezz’ora, oppure avviane una tua.", "Lascia un’intenzione anonima sul muro delle preghiere e prega per quelle degli altri."],
  a_cta="Accendi la candela d’Avvento", a_cta2="Partecipa a una preghiera comune",
  q_when="Quando inizia l’Avvento 2026?", a_when="L’Avvento 2026 inizia domenica 29 novembre 2026 e termina la Vigilia di Natale, il 24 dicembre 2026.",
  foot="Sanctuary è uno spazio online per la preghiera personale. Non sostituisce la parrocchia, i sacramenti o l’accompagnamento pastorale.", other="Altre lingue"),
 "es": dict(
  brand="Sanctuary", nav="Entrar en la iglesia",
  c_title="Encender una vela en línea por alguien · Sanctuary",
  c_desc="Enciende una vela virtual por una persona enferma, en duelo o fallecida, o como acción de gracias. Entra en una iglesia en línea tranquila, de día y de noche.",
  c_h1="Encender una vela en línea por alguien",
  c_lead="Cuando no puedes estar al lado de alguien, todavía puedes orar por él. En Sanctuary, una iglesia en línea tranquila, caminas hasta la capilla de las velas, enciendes una vela y confías esa persona a Dios.",
  c_for="Por quién se enciende una vela", c_list=["Un familiar enfermo o a la espera de una operación", "Un difunto, en un aniversario o el Día de los Fieles Difuntos", "Un hijo antes de un examen, un trabajo nuevo, una decisión difícil", "Una acción de gracias: un nacimiento, una curación, una oración escuchada", "La paz en un país en guerra, o personas que nunca conocerás"],
  c_how="Cómo funciona", c_steps=["Entra en la iglesia — no hay que descargar nada, se abre en el navegador.", "Ve a la capilla de las velas y elige «Encender una vela».", "Escribe un nombre o una intención. Te ayuda a recogerte y nunca se muestra públicamente.", "Quédate un momento en la luz de la vela y dile a Dios una frase por esa persona."],
  c_prayer_h="Una breve oración mientras arde la vela", c_prayer="Señor, pongo ante ti esta luz por quien llevo en el corazón. Donde yo no llego, que llegue tu mano. Da descanso, sanación y paz, y que esta pequeña llama siga orando cuando yo calle. Amén.",
  c_price="Entrar, orar y el muro de oración son gratis. Una vela cuesta 1 €; cuando un amigo se registra con tu enlace de invitación, ambos recibís una vela de regalo.",
  c_cta="Encender una vela ahora", c_cta2="Orar junto a otros",
  a_title="Adviento 2026: fechas, domingos y oraciones · Sanctuary",
  a_desc="El Adviento 2026 empieza el domingo 29 de noviembre y termina en Nochebuena. Los cuatro domingos de Adviento, sus temas y una breve oración para cada semana.",
  a_h1="Adviento 2026: las fechas y una oración para cada semana",
  a_lead="El Adviento 2026 empieza el domingo 29 de noviembre y termina el jueves 24 de diciembre, Nochebuena. Cuatro domingos, cuatro velas en la corona — una más cada semana.",
  a_dates="Los domingos de Adviento 2026",
  a_weeks=[("29 de noviembre de 2026", "I domingo de Adviento · Esperanza", "Dios de la promesa, cuando los días se oscurecen, enciende en mí la primera vela de la esperanza. Enséñame a esperar sin miedo, porque ya vienes en camino hacia nosotros. Amén."),
           ("6 de diciembre de 2026", "II domingo de Adviento · Paz", "Príncipe de la paz, calma el ruido de mi corazón y de nuestro mundo. Hazme amable con quienes me rodean y lleva tu paz donde se sufre. Amén."),
           ("13 de diciembre de 2026", "III domingo de Adviento · Alegría", "Señor, te haces cercano. Haz crecer en mí una alegría serena que no dependa de las circunstancias, y que esta semana llegue a alguien que la necesita. Amén."),
           ("20 de diciembre de 2026", "IV domingo de Adviento · Amor", "Dios que te hiciste pequeño por amor, haz sitio en mí como María te hizo sitio. Que mi amor sea concreto: una visita, una llamada, un perdón. Amén.")],
  a_eve="Nochebuena: jueves 24 de diciembre de 2026 · Navidad: viernes 25 de diciembre de 2026.",
  a_how="Vivir el Adviento con Sanctuary", a_list=["Cada domingo enciende una vela en la capilla y reza la oración de la semana.", "Únete a una oración en común — cada media hora, o inicia la tuya.", "Deja una petición anónima en el muro de oración y ora por las de los demás."],
  a_cta="Encender la vela de Adviento", a_cta2="Unirse a una oración en común",
  q_when="¿Cuándo empieza el Adviento 2026?", a_when="El Adviento 2026 empieza el domingo 29 de noviembre de 2026 y termina en Nochebuena, el 24 de diciembre de 2026.",
  foot="Sanctuary es un espacio en línea para la oración personal. No sustituye a la parroquia, los sacramentos ni el acompañamiento pastoral.", other="Otros idiomas"),
 "zh": dict(
  brand="云上圣所", nav="进入教堂",
  c_title="在线为人点一支蜡烛 · 云上圣所",
  c_desc="为生病的人、离世的亲人、正在难处中的人，或为一件感恩的事，在线点一支祷告蜡烛。一座日夜开放的安静线上教堂。",
  c_h1="在线为人点一支蜡烛",
  c_lead="不能陪在一个人身边的时候，你仍然可以为他祷告。在云上圣所这座安静的线上教堂里，你走到蜡烛小堂，点一支蜡烛，把这个人交托给神。",
  c_for="大家为谁点蜡烛", c_list=["生病或等待手术的家人朋友", "离世的亲人，在忌日或追思的日子", "面临考试、新工作或艰难决定的孩子", "感恩的事：新生命、病得医治、祷告蒙应允", "战乱中的地方，或素不相识的人"],
  c_how="怎么用", c_steps=["进入教堂——不用下载，浏览器里直接打开。", "走到蜡烛小堂，选「点一支蜡烛」。", "写下一个名字或心愿。它只帮助你专注，永远不会公开显示。", "在烛光里停一会儿，为他向神说一句话。"],
  c_prayer_h="蜡烛燃着时的简短祷告", c_prayer="主啊，我把这点光放在你面前，为我心里记挂的那个人。我够不到的地方，愿你的手临到。赐他安息、医治与平安；当我安静下来，愿这小小的火苗继续替我祷告。阿们。",
  c_price="进入教堂、祷告和祷告墙都免费。一支蜡烛 1 欧元；朋友通过你的邀请链接注册后，你们各得一支免费蜡烛。",
  c_cta="现在点一支蜡烛", c_cta2="和大家一起祷告",
  a_title="2026 将临期：日期、四个主日与每周祷告 · 云上圣所",
  a_desc="2026 年将临期从 11 月 29 日（主日）开始，到 12 月 24 日平安夜结束。四个将临期主日的主题，以及每周一段简短祷告。",
  a_h1="2026 将临期：日期与每周一段祷告",
  a_lead="2026 年将临期从 11 月 29 日主日开始，到 12 月 24 日（周四）平安夜结束。四个主日，花环上四支蜡烛，每周多点一支，等候圣诞。",
  a_dates="2026 年将临期四个主日",
  a_weeks=[("2026 年 11 月 29 日", "将临期第一主日 · 盼望", "应许的神，在日子变短变暗的时候，在我心里点亮盼望的第一支蜡烛。教我不惧怕地等候，因为你已经在来的路上。阿们。"),
           ("2026 年 12 月 6 日", "将临期第二主日 · 平安", "和平的君王，平息我心里和这世界的喧嚣。使我对身边的人温柔，把你的平安带到受苦的地方。阿们。"),
           ("2026 年 12 月 13 日", "将临期第三主日 · 喜乐", "主啊，你亲近我们。让一种不随环境起伏的安静喜乐在我里面生长，这一周流到一个需要它的人那里。阿们。"),
           ("2026 年 12 月 20 日", "将临期第四主日 · 爱", "为爱我们而成为卑微的神，求你在我里面腾出地方，像马利亚为你腾出地方。让我的爱具体起来：一次探望、一个电话、一句饶恕。阿们。")],
  a_eve="平安夜：2026 年 12 月 24 日（周四）· 圣诞节：12 月 25 日（周五）。",
  a_how="在云上圣所过将临期", a_list=["每个主日在蜡烛小堂点一支蜡烛，念本周的祷告。", "参加一起祷告——每半小时一场，也可以自己发起。", "在祷告墙匿名写下代祷事项，也为别人的代祷祷告。"],
  a_cta="点亮本周的将临期蜡烛", a_cta2="参加一起祷告",
  q_when="2026 年将临期什么时候开始？", a_when="2026 年将临期从 11 月 29 日主日开始，到 12 月 24 日平安夜结束。",
  foot="云上圣所是个人祷告的线上空间，不能代替你的教会、圣礼和牧养。", other="其他语言"),
}

CSS = """*{box-sizing:border-box}body{margin:0;background:#0c0907;color:#f4ead8;font:17px/1.75 Georgia,"Noto Serif SC","Songti SC",serif}
a{color:#f0d49a}header{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid rgba(217,178,106,.28)}
header a{text-decoration:none;font-weight:600}main{max-width:720px;margin:0 auto;padding:22px 18px}h1,h2{color:#f0d49a;line-height:1.35;font-weight:600}
h1{font-size:30px}.lead{font-size:19px;color:#e9dcc4}.cta{display:inline-block;background:#d9b26a;color:#1a120b;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700;margin:8px 8px 8px 0}
.cta.alt{background:transparent;color:#f0d49a;border:1px solid #d9b26a}.card{background:rgba(22,16,11,.86);border:1px solid rgba(217,178,106,.28);border-radius:14px;padding:14px 18px;margin:16px 0}
.pr{font-style:italic;color:#efe3cc}.muted{color:#bfae93;font-size:14px}li{margin:6px 0}footer{max-width:720px;margin:0 auto;padding:18px;color:#bfae93;font-size:14px}
.wk h3{margin:0;color:#f0d49a;font-size:18px}.wk .d{color:#bfae93;font-size:14px}"""

def page(l, kind, title, desc, body, ld):
    slug = SLUG[kind]
    url = f"{SITE}/{slug['en']}.html" if l == "en" else f"{SITE}/{l}/{slug[l]}.html"
    alts = "\n".join(f'<link rel="alternate" hreflang="{HTML_LANG[x]}" href="{href(x, kind)}">' for x in LANGS)
    alts += f'\n<link rel="alternate" hreflang="x-default" href="{href("en", kind)}">'
    others = " · ".join(f'<a href="{href(x, kind)}" hreflang="{HTML_LANG[x]}">{NAME[x]}</a>' for x in LANGS if x != l)
    t = C[l]
    return f"""<!DOCTYPE html>
<html lang="{HTML_LANG[l]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{url}">
{alts}
<meta name="theme-color" content="#0c0907">
<link rel="icon" href="/icon-192.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="{E(t['brand'])}">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:image" content="{SITE}/og/og-{l}.png">
<meta property="og:locale" content="{LOCALE[l]}">
<meta name="twitter:card" content="summary_large_image">
<style>{CSS}</style>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body>
<header><a href="{home(l)}">🕯 {E(t['brand'])}</a><a href="{app(l, 'pray', kind)}">{E(t['nav'])} →</a></header>
<main>
{body}
<p class="muted">{E(t['other'])}: {others}</p>
</main>
<footer>{E(t['foot'])}<br><a href="/privacy.html">Privacy</a> · © Fidova Technology</footer>
{OPS}
</body>
</html>
"""

NAME = {"en": "English", "fr": "Français", "de": "Deutsch", "it": "Italiano", "es": "Español", "zh": "中文"}

def href(l, kind):
    s = SLUG[kind]
    return f"{SITE}/{s['en']}.html" if l == "en" else f"{SITE}/{l}/{s[l]}.html"

def path_of(l, kind):
    s = SLUG[kind]
    return f"{s['en']}.html" if l == "en" else f"{l}/{s[l]}.html"

def candle(l):
    t = C[l]
    body = f"""<h1>{E(t['c_h1'])}</h1>
<p class="lead">{E(t['c_lead'])}</p>
<a class="cta" href="{app(l, 'candle', 'candle')}">🕯 {E(t['c_cta'])}</a>
<h2>{E(t['c_for'])}</h2><ul>{''.join(f'<li>{E(x)}</li>' for x in t['c_list'])}</ul>
<h2>{E(t['c_how'])}</h2><ol>{''.join(f'<li>{E(x)}</li>' for x in t['c_steps'])}</ol>
<div class="card"><h2>{E(t['c_prayer_h'])}</h2><p class="pr">{E(t['c_prayer'])}</p></div>
<p class="muted">{E(t['c_price'])}</p>
<a class="cta" href="{app(l, 'candle', 'candle')}">🕯 {E(t['c_cta'])}</a><a class="cta alt" href="{app(l, 'group', 'candle')}">{E(t['c_cta2'])}</a>
<p><a href="{href(l, 'advent')}">{E(C[l]['a_h1'])} →</a></p>"""
    ld = {"@context": "https://schema.org", "@type": "HowTo", "name": t["c_h1"], "description": t["c_desc"], "inLanguage": HTML_LANG[l],
          "step": [{"@type": "HowToStep", "position": i + 1, "text": s} for i, s in enumerate(t["c_steps"])]}
    return page(l, "candle", t["c_title"], t["c_desc"], body, ld)

def advent(l):
    t = C[l]
    weeks = "".join(f'<div class="card wk"><div class="d">{E(d)}</div><h3>{E(h)}</h3><p class="pr">{E(p)}</p></div>' for d, h, p in t["a_weeks"])
    body = f"""<h1>{E(t['a_h1'])}</h1>
<p class="lead">{E(t['a_lead'])}</p>
<a class="cta" href="{app(l, 'candle', 'advent2026')}">🕯 {E(t['a_cta'])}</a>
<h2>{E(t['a_dates'])}</h2>{weeks}
<p>{E(t['a_eve'])}</p>
<h2>{E(t['a_how'])}</h2><ul>{''.join(f'<li>{E(x)}</li>' for x in t['a_list'])}</ul>
<a class="cta" href="{app(l, 'candle', 'advent2026')}">🕯 {E(t['a_cta'])}</a><a class="cta alt" href="{app(l, 'group', 'advent2026')}">{E(t['a_cta2'])}</a>
<p><a href="{href(l, 'candle')}">{E(C[l]['c_h1'])} →</a></p>"""
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": HTML_LANG[l],
          "mainEntity": [{"@type": "Question", "name": t["q_when"], "acceptedAnswer": {"@type": "Answer", "text": t["a_when"]}}]}
    return page(l, "advent", t["a_title"], t["a_desc"], body, ld)

def main():
    built = []
    for l in LANGS:
        for kind, fn in (("candle", candle), ("advent", advent)):
            p = os.path.join(ROOT, path_of(l, kind))
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, "w", encoding="utf-8").write(fn(l))
            built.append((l, kind))
    # sitemap: drop previous SEO entries, append fresh ones
    sm_path = os.path.join(ROOT, "sitemap.xml")
    sm = open(sm_path, encoding="utf-8").read()
    sm = re.sub(r"<!--seo-->.*?<!--/seo-->\n?", "", sm, flags=re.S)
    rows = []
    for l, kind in built:
        alts = "".join(f'<xhtml:link rel="alternate" hreflang="{HTML_LANG[x]}" href="{href(x, kind)}"/>' for x in LANGS)
        alts += f'<xhtml:link rel="alternate" hreflang="x-default" href="{href("en", kind)}"/>'
        rows.append(f"<url><loc>{href(l, kind)}</loc><lastmod>{TODAY}</lastmod>{alts}</url>")
    sm = sm.replace("</urlset>", "<!--seo-->\n" + "\n".join(rows) + "\n<!--/seo-->\n</urlset>")
    open(sm_path, "w", encoding="utf-8").write(sm)
    print("built", len(built), "pages")

if __name__ == "__main__":
    main()
