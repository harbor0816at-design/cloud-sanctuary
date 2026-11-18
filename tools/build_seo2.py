#!/usr/bin/env python3
"""More SEO pages for Europe and North America (6 languages):
  - "christmas": Christmas Eve 2026 — light a candle and pray online (seasonal, peaks in December)
  - "pray":      Ask for prayer online — anonymous prayer requests (evergreen)

Run from the repo root AFTER tools/build_pages.py and tools/build_seo.py:
    python3 tools/build_pages.py && python3 tools/build_seo.py && python3 tools/build_seo2.py
Reuses the page frame of build_seo.py; adds its own <!--seo2--> block to sitemap.xml.
All prayers are original texts written for Sanctuary.
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_seo as B  # noqa: E402

E, LANGS, HTML_LANG, ROOT, TODAY, app = B.E, B.LANGS, B.HTML_LANG, B.ROOT, B.TODAY, B.app

B.SLUG["christmas"] = {"en": "christmas-eve-prayer", "fr": "priere-veille-de-noel", "de": "heiligabend-gebet",
                       "it": "preghiera-vigilia-di-natale", "es": "oracion-nochebuena", "zh": "ping-an-ye-qi-dao"}
B.SLUG["pray"] = {"en": "prayer-request", "fr": "demande-de-priere", "de": "gebetsanliegen",
                  "it": "richiesta-di-preghiera", "es": "peticion-de-oracion", "zh": "dai-dao"}

X = {
 "en": dict(
  x_title="Christmas Eve 2026: Light a Candle and Pray Online · Sanctuary",
  x_desc="Christmas Eve 2026 falls on Thursday 24 December. Light a candle online for someone you love, pray a short Christmas Eve prayer, or pray together with others — even if you are far from home.",
  x_h1="Christmas Eve 2026: light a candle and pray, wherever you are",
  x_lead="Christmas Eve 2026 falls on Thursday 24 December, and Christmas Day on Friday 25 December. If you are travelling, working, unwell or far from family, you can still step into a quiet church tonight: Sanctuary is open all night.",
  x_for="This page is for you if", x_list=["You are spending Christmas away from home or on your own", "This is your first Christmas without someone you love", "You want to light a candle for family far away", "You miss the candlelight service and want a quiet moment of prayer"],
  x_how="A quiet Christmas Eve in Sanctuary", x_steps=["Enter the church in your browser — nothing to install.", "Light a candle in the candle chapel for someone you are thinking of.", "Pray the Christmas Eve prayer below, or sit in silence with the breathing timer.", "At the hour or half hour, join the silent group prayer with people from many countries."],
  x_prayer_h="A Christmas Eve prayer", x_prayer="Lord Jesus, you came to us in the quiet of the night, small and poor. Come into this night too. Be near those who are alone, those who grieve an empty chair, those who work while others celebrate. Light in our homes the peace the angels sang of. Amen.",
  x_note="Sanctuary is a place for personal prayer, not a livestreamed service. Many parishes stream their Christmas Eve services; Sanctuary is a quiet place to pray before or after.",
  x_cta="Light a Christmas candle", x_cta2="Pray together tonight",
  xq="Is there a way to pray on Christmas Eve if I cannot go to church?", xa="Yes. Sanctuary is an online church that is open all night. You can light a candle for someone, pray a Christmas Eve prayer and join a silent group prayer that starts every half hour.",
  p_title="Ask for Prayer Online — Anonymous Prayer Request · Sanctuary",
  p_desc="Share a prayer request anonymously on the Sanctuary prayer wall. After a short review it appears for others to pray for, and you can see how many people prayed.",
  p_h1="Ask for prayer online, anonymously",
  p_lead="Some burdens are too heavy to carry alone, and too personal to tell someone face to face. On the Sanctuary prayer wall you can ask for prayer without giving your name. Others pray for you, and you see how many have prayed.",
  p_how="How the prayer wall works", p_steps=["Open the prayer wall in Sanctuary.", "Write your request in a sentence or two — no names, phone numbers or addresses.", "After a short human review it appears on the wall.", "People tap “Pray for this”; the count shows how many have prayed with you."],
  p_ex="What people ask prayer for", p_list=["Healing for a parent, a child, a friend", "Strength during unemployment or money worries", "Peace in a marriage or a family conflict", "Guidance before an important decision", "Thanksgiving for a prayer answered"],
  p_safe="Kept safe and respectful", p_safe_t="Requests are anonymous and reviewed before they appear. Posts with contact details, advertising or anything hurtful are not published, and requests reported by several people are hidden automatically.",
  p_prayer_h="A prayer for someone who asked", p_prayer="Lord, you know the person behind this request better than I do. Hold them in what they could not put into words. Give them what they need today, and let them know they are not alone. Amen.",
  p_cta="Post a prayer request", p_cta2="Pray for others’ requests",
  pq="Can I ask for prayer without giving my name?", pa="Yes. Prayer requests on the Sanctuary prayer wall are anonymous. They are reviewed before they appear, and you never need to share your name or contact details."),
 "fr": dict(
  x_title="Veille de Noël 2026 : allumer un cierge et prier en ligne · Sanctuary",
  x_desc="La veille de Noël 2026 tombe le jeudi 24 décembre. Allumez un cierge en ligne pour quelqu’un que vous aimez, priez une courte prière de Noël ou priez avec d’autres, même loin de chez vous.",
  x_h1="Veille de Noël 2026 : allumer un cierge et prier, où que vous soyez",
  x_lead="La veille de Noël 2026 tombe le jeudi 24 décembre, et Noël le vendredi 25 décembre. Si vous êtes en voyage, au travail, malade ou loin des vôtres, vous pouvez quand même entrer ce soir dans une église paisible : Sanctuary est ouverte toute la nuit.",
  x_for="Cette page est pour vous si", x_list=["Vous passez Noël loin de chez vous ou seul", "C’est votre premier Noël sans un être cher", "Vous voulez allumer un cierge pour votre famille au loin", "La messe de minuit vous manque et vous cherchez un moment de prière"],
  x_how="Une veille de Noël paisible dans Sanctuary", x_steps=["Entrez dans l’église depuis votre navigateur, rien à installer.", "Allumez un cierge à la chapelle pour quelqu’un à qui vous pensez.", "Priez la prière ci-dessous, ou restez en silence avec le minuteur de respiration.", "À l’heure ou à la demie, rejoignez la prière silencieuse commune avec des personnes de nombreux pays."],
  x_prayer_h="Une prière pour la veille de Noël", x_prayer="Seigneur Jésus, tu es venu à nous dans le silence de la nuit, petit et pauvre. Viens aussi dans cette nuit. Sois proche de ceux qui sont seuls, de ceux qui pleurent une chaise vide, de ceux qui travaillent pendant que d’autres font la fête. Allume dans nos maisons la paix que chantaient les anges. Amen.",
  x_note="Sanctuary est un lieu de prière personnelle, pas une messe retransmise. Beaucoup de paroisses diffusent la messe de la nuit de Noël ; Sanctuary est un endroit calme pour prier avant ou après.",
  x_cta="Allumer un cierge de Noël", x_cta2="Prier ensemble ce soir",
  xq="Comment prier la veille de Noël si je ne peux pas aller à l’église ?", xa="Sanctuary est une église en ligne ouverte toute la nuit. Vous pouvez y allumer un cierge pour quelqu’un, prier une prière de Noël et rejoindre une prière silencieuse commune qui commence toutes les demi-heures.",
  p_title="Demander une prière en ligne, de façon anonyme · Sanctuary",
  p_desc="Confiez une intention de prière de façon anonyme sur le mur de prière de Sanctuary. Après une courte vérification, d’autres prient pour vous et vous voyez combien ont prié.",
  p_h1="Demander une prière en ligne, de façon anonyme",
  p_lead="Certains fardeaux sont trop lourds pour être portés seul, et trop personnels pour être confiés de vive voix. Sur le mur de prière de Sanctuary, vous pouvez demander une prière sans donner votre nom. D’autres prient pour vous, et vous voyez combien l’ont fait.",
  p_how="Comment fonctionne le mur de prière", p_steps=["Ouvrez le mur de prière dans Sanctuary.", "Écrivez votre intention en une ou deux phrases, sans nom, téléphone ni adresse.", "Après une courte vérification humaine, elle apparaît sur le mur.", "Les visiteurs touchent « Prier pour cela » ; le compteur montre combien ont prié avec vous."],
  p_ex="Pour quoi demande-t-on une prière", p_list=["La guérison d’un parent, d’un enfant, d’un ami", "La force pendant le chômage ou des soucis d’argent", "La paix dans un couple ou un conflit familial", "La lumière avant une décision importante", "L’action de grâce pour une prière exaucée"],
  p_safe="Un espace sûr et respectueux", p_safe_t="Les intentions sont anonymes et vérifiées avant publication. Les messages contenant des coordonnées, de la publicité ou des propos blessants ne sont pas publiés ; ceux signalés par plusieurs personnes sont masqués automatiquement.",
  p_prayer_h="Une prière pour celui qui a demandé", p_prayer="Seigneur, tu connais la personne derrière cette intention mieux que moi. Porte ce qu’elle n’a pas su dire. Donne-lui ce dont elle a besoin aujourd’hui, et fais-lui sentir qu’elle n’est pas seule. Amen.",
  p_cta="Confier une intention", p_cta2="Prier pour les autres",
  pq="Puis-je demander une prière sans donner mon nom ?", pa="Oui. Les intentions du mur de prière de Sanctuary sont anonymes. Elles sont vérifiées avant d’apparaître, et vous n’avez jamais à donner votre nom ni vos coordonnées."),
 "de": dict(
  x_title="Heiligabend 2026: online eine Kerze anzünden und beten · Sanctuary",
  x_desc="Heiligabend 2026 ist am Donnerstag, 24. Dezember. Zünden Sie online eine Kerze für einen geliebten Menschen an, beten Sie ein kurzes Weihnachtsgebet oder beten Sie gemeinsam mit anderen – auch fern von zu Hause.",
  x_h1="Heiligabend 2026: eine Kerze anzünden und beten, wo immer Sie sind",
  x_lead="Heiligabend 2026 ist am Donnerstag, 24. Dezember, der erste Weihnachtstag am Freitag, 25. Dezember. Wenn Sie unterwegs sind, arbeiten, krank oder fern der Familie sind, können Sie heute Abend trotzdem eine stille Kirche betreten: Sanctuary ist die ganze Nacht offen.",
  x_for="Diese Seite ist für Sie, wenn", x_list=["Sie Weihnachten fern von zu Hause oder allein verbringen", "es Ihr erstes Weihnachten ohne einen geliebten Menschen ist", "Sie eine Kerze für Ihre Familie in der Ferne anzünden möchten", "Ihnen die Christmette fehlt und Sie einen stillen Moment suchen"],
  x_how="Ein stiller Heiligabend in Sanctuary", x_steps=["Betreten Sie die Kirche im Browser – nichts zu installieren.", "Zünden Sie in der Kerzenkapelle eine Kerze für jemanden an, an den Sie denken.", "Beten Sie das Gebet unten oder bleiben Sie mit dem Atemtimer in der Stille.", "Zur vollen und halben Stunde beten Sie still mit Menschen aus vielen Ländern."],
  x_prayer_h="Ein Gebet für Heiligabend", x_prayer="Herr Jesus, du bist in der Stille der Nacht zu uns gekommen, klein und arm. Komm auch in diese Nacht. Sei bei denen, die allein sind, die um einen leeren Stuhl trauern, die arbeiten, während andere feiern. Zünde in unseren Häusern den Frieden an, von dem die Engel sangen. Amen.",
  x_note="Sanctuary ist ein Ort für das persönliche Gebet, kein übertragener Gottesdienst. Viele Gemeinden streamen ihre Christmette; Sanctuary ist ein stiller Ort, um davor oder danach zu beten.",
  x_cta="Eine Weihnachtskerze anzünden", x_cta2="Heute Abend gemeinsam beten",
  xq="Wie kann ich an Heiligabend beten, wenn ich nicht in die Kirche gehen kann?", xa="Sanctuary ist eine Online-Kirche, die die ganze Nacht offen ist. Sie können dort eine Kerze für jemanden anzünden, ein Weihnachtsgebet beten und an einem stillen Gemeinschaftsgebet teilnehmen, das jede halbe Stunde beginnt.",
  p_title="Online um Gebet bitten – anonymes Gebetsanliegen · Sanctuary",
  p_desc="Teilen Sie Ihr Gebetsanliegen anonym auf der Gebetswand von Sanctuary. Nach kurzer Prüfung beten andere für Sie, und Sie sehen, wie viele gebetet haben.",
  p_h1="Online um Gebet bitten, anonym",
  p_lead="Manche Lasten sind zu schwer, um sie allein zu tragen, und zu persönlich, um sie jemandem ins Gesicht zu sagen. Auf der Gebetswand von Sanctuary können Sie um Gebet bitten, ohne Ihren Namen zu nennen. Andere beten für Sie, und Sie sehen, wie viele es waren.",
  p_how="So funktioniert die Gebetswand", p_steps=["Öffnen Sie die Gebetswand in Sanctuary.", "Schreiben Sie Ihr Anliegen in ein oder zwei Sätzen – ohne Namen, Telefonnummer oder Adresse.", "Nach kurzer Prüfung durch einen Menschen erscheint es an der Wand.", "Besucher tippen auf „Dafür beten“; die Zahl zeigt, wie viele mit Ihnen gebetet haben."],
  p_ex="Wofür Menschen um Gebet bitten", p_list=["Heilung für Eltern, ein Kind, einen Freund", "Kraft bei Arbeitslosigkeit oder Geldsorgen", "Frieden in einer Ehe oder einem Familienstreit", "Klarheit vor einer wichtigen Entscheidung", "Dank für ein erhörtes Gebet"],
  p_safe="Geschützt und respektvoll", p_safe_t="Anliegen sind anonym und werden vor der Veröffentlichung geprüft. Beiträge mit Kontaktdaten, Werbung oder Verletzendem werden nicht veröffentlicht; mehrfach gemeldete Beiträge werden automatisch ausgeblendet.",
  p_prayer_h="Ein Gebet für jemanden, der darum gebeten hat", p_prayer="Herr, du kennst den Menschen hinter diesem Anliegen besser als ich. Trage, was er nicht in Worte fassen konnte. Gib ihm heute, was er braucht, und lass ihn spüren, dass er nicht allein ist. Amen.",
  p_cta="Ein Gebetsanliegen teilen", p_cta2="Für die Anliegen anderer beten",
  pq="Kann ich um Gebet bitten, ohne meinen Namen zu nennen?", pa="Ja. Gebetsanliegen auf der Gebetswand von Sanctuary sind anonym. Sie werden vor dem Erscheinen geprüft, und Sie müssen nie Ihren Namen oder Kontaktdaten angeben."),
 "it": dict(
  x_title="Vigilia di Natale 2026: accendi una candela e prega online · Sanctuary",
  x_desc="La Vigilia di Natale 2026 cade giovedì 24 dicembre. Accendi online una candela per una persona cara, prega una breve preghiera di Natale o prega insieme ad altri, anche lontano da casa.",
  x_h1="Vigilia di Natale 2026: accendi una candela e prega, ovunque tu sia",
  x_lead="La Vigilia di Natale 2026 cade giovedì 24 dicembre, e Natale venerdì 25 dicembre. Se sei in viaggio, al lavoro, malato o lontano dalla famiglia, stasera puoi comunque entrare in una chiesa silenziosa: Sanctuary è aperta tutta la notte.",
  x_for="Questa pagina è per te se", x_list=["Passi il Natale lontano da casa o da solo", "È il tuo primo Natale senza una persona amata", "Vuoi accendere una candela per la famiglia lontana", "Ti manca la Messa di mezzanotte e cerchi un momento di preghiera"],
  x_how="Una Vigilia silenziosa in Sanctuary", x_steps=["Entra nella chiesa dal browser, senza installare nulla.", "Accendi una candela nella cappella per qualcuno a cui pensi.", "Prega la preghiera qui sotto, o resta in silenzio con il timer del respiro.", "Allo scoccare dell’ora o della mezz’ora, unisciti alla preghiera silenziosa comune con persone di molti paesi."],
  x_prayer_h="Una preghiera per la Vigilia di Natale", x_prayer="Signore Gesù, sei venuto a noi nel silenzio della notte, piccolo e povero. Vieni anche in questa notte. Sii vicino a chi è solo, a chi piange una sedia vuota, a chi lavora mentre altri festeggiano. Accendi nelle nostre case la pace che cantavano gli angeli. Amen.",
  x_note="Sanctuary è un luogo di preghiera personale, non una Messa trasmessa in diretta. Molte parrocchie trasmettono la Messa della notte di Natale; Sanctuary è un luogo tranquillo per pregare prima o dopo.",
  x_cta="Accendi una candela di Natale", x_cta2="Prega insieme stasera",
  xq="Come posso pregare la Vigilia di Natale se non posso andare in chiesa?", xa="Sanctuary è una chiesa online aperta tutta la notte. Puoi accendere una candela per qualcuno, pregare una preghiera di Natale e unirti a una preghiera silenziosa comune che inizia ogni mezz’ora.",
  p_title="Chiedere una preghiera online, in forma anonima · Sanctuary",
  p_desc="Condividi un’intenzione di preghiera in forma anonima sul muro della preghiera di Sanctuary. Dopo una breve verifica altri pregano per te e vedi quanti hanno pregato.",
  p_h1="Chiedere una preghiera online, in forma anonima",
  p_lead="Alcuni pesi sono troppo grandi da portare da soli e troppo personali da confidare a voce. Sul muro della preghiera di Sanctuary puoi chiedere una preghiera senza dire il tuo nome. Altri pregano per te e vedi quanti l’hanno fatto.",
  p_how="Come funziona il muro della preghiera", p_steps=["Apri il muro della preghiera in Sanctuary.", "Scrivi la tua intenzione in una o due frasi, senza nomi, telefoni o indirizzi.", "Dopo una breve verifica umana compare sul muro.", "I visitatori toccano «Prega per questo»; il contatore mostra quanti hanno pregato con te."],
  p_ex="Per che cosa si chiede una preghiera", p_list=["La guarigione di un genitore, un figlio, un amico", "La forza nella disoccupazione o nelle difficoltà economiche", "La pace in un matrimonio o in un conflitto familiare", "La luce prima di una decisione importante", "Il ringraziamento per una preghiera esaudita"],
  p_safe="Uno spazio sicuro e rispettoso", p_safe_t="Le intenzioni sono anonime e verificate prima della pubblicazione. I messaggi con contatti, pubblicità o parole offensive non vengono pubblicati; quelli segnalati da più persone vengono nascosti automaticamente.",
  p_prayer_h="Una preghiera per chi l’ha chiesta", p_prayer="Signore, conosci la persona dietro questa intenzione meglio di me. Porta ciò che non è riuscita a dire. Dalle ciò di cui ha bisogno oggi, e falle sentire che non è sola. Amen.",
  p_cta="Condividi un’intenzione", p_cta2="Prega per le intenzioni degli altri",
  pq="Posso chiedere una preghiera senza dire il mio nome?", pa="Sì. Le intenzioni sul muro della preghiera di Sanctuary sono anonime. Vengono verificate prima di comparire e non devi mai indicare il tuo nome o i tuoi contatti."),
 "es": dict(
  x_title="Nochebuena 2026: enciende una vela y ora en línea · Sanctuary",
  x_desc="La Nochebuena de 2026 cae el jueves 24 de diciembre. Enciende en línea una vela por alguien a quien amas, reza una breve oración de Navidad u ora junto a otros, aunque estés lejos de casa.",
  x_h1="Nochebuena 2026: enciende una vela y ora, estés donde estés",
  x_lead="La Nochebuena de 2026 cae el jueves 24 de diciembre, y la Navidad el viernes 25. Si estás de viaje, trabajando, enfermo o lejos de tu familia, esta noche puedes entrar igualmente en una iglesia tranquila: Sanctuary está abierta toda la noche.",
  x_for="Esta página es para ti si", x_list=["Pasas la Navidad lejos de casa o a solas", "Es tu primera Navidad sin un ser querido", "Quieres encender una vela por tu familia que está lejos", "Echas de menos la Misa de Gallo y buscas un momento de oración"],
  x_how="Una Nochebuena tranquila en Sanctuary", x_steps=["Entra en la iglesia desde el navegador, sin instalar nada.", "Enciende una vela en la capilla por alguien en quien piensas.", "Reza la oración de abajo o quédate en silencio con el temporizador de respiración.", "A la hora en punto o a la media, únete a la oración silenciosa común con personas de muchos países."],
  x_prayer_h="Una oración para Nochebuena", x_prayer="Señor Jesús, viniste a nosotros en el silencio de la noche, pequeño y pobre. Ven también a esta noche. Acompaña a quienes están solos, a quienes lloran una silla vacía, a quienes trabajan mientras otros celebran. Enciende en nuestros hogares la paz que cantaron los ángeles. Amén.",
  x_note="Sanctuary es un lugar de oración personal, no una misa transmitida. Muchas parroquias transmiten la Misa de Nochebuena; Sanctuary es un lugar tranquilo para orar antes o después.",
  x_cta="Enciende una vela de Navidad", x_cta2="Ora junto a otros esta noche",
  xq="¿Cómo puedo orar en Nochebuena si no puedo ir a la iglesia?", xa="Sanctuary es una iglesia en línea abierta toda la noche. Puedes encender una vela por alguien, rezar una oración de Navidad y unirte a una oración silenciosa común que empieza cada media hora.",
  p_title="Pedir oración en línea, de forma anónima · Sanctuary",
  p_desc="Comparte una petición de oración de forma anónima en el muro de oración de Sanctuary. Tras una breve revisión, otros oran por ti y ves cuántos han orado.",
  p_h1="Pedir oración en línea, de forma anónima",
  p_lead="Hay cargas demasiado pesadas para llevarlas solo y demasiado personales para contarlas cara a cara. En el muro de oración de Sanctuary puedes pedir oración sin dar tu nombre. Otros oran por ti y ves cuántos lo han hecho.",
  p_how="Cómo funciona el muro de oración", p_steps=["Abre el muro de oración en Sanctuary.", "Escribe tu petición en una o dos frases, sin nombres, teléfonos ni direcciones.", "Tras una breve revisión humana aparece en el muro.", "Los visitantes tocan «Orar por esto»; el contador muestra cuántos han orado contigo."],
  p_ex="Por qué pide oración la gente", p_list=["La sanación de un padre, un hijo, un amigo", "Fuerza en el desempleo o en problemas de dinero", "Paz en un matrimonio o un conflicto familiar", "Luz ante una decisión importante", "Gratitud por una oración respondida"],
  p_safe="Un espacio seguro y respetuoso", p_safe_t="Las peticiones son anónimas y se revisan antes de publicarse. No se publican mensajes con datos de contacto, publicidad o palabras hirientes; los denunciados por varias personas se ocultan automáticamente.",
  p_prayer_h="Una oración por quien la pidió", p_prayer="Señor, tú conoces a la persona detrás de esta petición mejor que yo. Sostén lo que no supo poner en palabras. Dale lo que necesita hoy y hazle sentir que no está sola. Amén.",
  p_cta="Publicar una petición", p_cta2="Orar por las peticiones de otros",
  pq="¿Puedo pedir oración sin dar mi nombre?", pa="Sí. Las peticiones del muro de oración de Sanctuary son anónimas. Se revisan antes de aparecer y nunca tienes que dar tu nombre ni tus datos de contacto."),
 "zh": dict(
  x_title="2026 平安夜：在线点一支蜡烛、为家人祷告 · 云上圣所",
  x_desc="2026 年平安夜是 12 月 24 日（周四）。在线为所爱的人点一支蜡烛，念一段平安夜祷告，或和世界各地的人一起祷告——即使远离家乡。",
  x_h1="2026 平安夜：无论身在何处，点一支蜡烛、安静祷告",
  x_lead="2026 年平安夜是 12 月 24 日（周四），圣诞节是 12 月 25 日（周五）。如果你在旅途中、在上班、生病，或远离家人，今晚依然可以走进一座安静的教堂：云上圣所整夜开放。",
  x_for="这一页写给", x_list=["在异乡或独自过圣诞的人", "第一次在没有亲人的情况下过圣诞的人", "想为远方家人点一支蜡烛的人", "想念平安夜礼拜、想安静祷告片刻的人"],
  x_how="在云上圣所度过安静的平安夜", x_steps=["在浏览器里走进教堂，不用安装任何东西。", "到烛光礼拜堂，为你挂念的人点一支蜡烛。", "念下面的平安夜祷告，或跟着呼吸计时器安静片刻。", "每逢整点和半点，和来自许多国家的人一起安静祷告。"],
  x_prayer_h="平安夜祷告", x_prayer="主耶稣，你在夜的寂静中来到我们中间，卑微而贫穷。求你也来到今夜。陪伴独自一人的人、为空着的座位伤心的人、在别人欢庆时仍在工作的人。愿天使所唱的平安，照亮我们的家。阿们。",
  x_note="云上圣所是个人祷告的地方，不是直播礼拜。许多教会会直播平安夜礼拜；云上圣所适合在礼拜前后安静祷告。",
  x_cta="点一支圣诞蜡烛", x_cta2="今晚一起祷告",
  xq="平安夜去不了教堂，还能怎样祷告？", xa="云上圣所是一座整夜开放的线上教堂。你可以为人点一支蜡烛、念平安夜祷告，并加入每半小时开始一次的集体安静祷告。",
  p_title="在线匿名代祷：把心事交托出去 · 云上圣所",
  p_desc="在云上圣所代祷墙上匿名发布代祷事项。经过简短审核后，其他人会为你祷告，你也能看到有多少人为你祷告了。",
  p_h1="在线匿名请人代祷",
  p_lead="有些重担太重，一个人扛不住；又太私密，说不出口。在云上圣所的代祷墙上，你可以不留姓名请人代祷。别人为你祷告，你能看到一共有多少人祷告过。",
  p_how="代祷墙怎么用", p_steps=["在云上圣所打开代祷墙。", "用一两句话写下代祷事项，不要写真名、电话或地址。", "经过人工简短审核后出现在墙上。", "访客点「为此祷告」，数字会显示有多少人和你一起祷告。"],
  p_ex="大家常为这些事请人代祷", p_list=["父母、孩子或朋友的病痛", "失业或经济困难时的力量", "婚姻或家庭矛盾中的平安", "重要决定前的指引", "为蒙应允的祷告献上感恩"],
  p_safe="安全、受尊重", p_safe_t="代祷事项是匿名的，发布前会审核。含联系方式、广告或伤人内容的不会发布；被多人举报的内容会自动隐藏。",
  p_prayer_h="为请求代祷的人祷告", p_prayer="主啊，你比我更认识这条代祷背后的人。求你托住他说不出口的部分，今天赐给他所需要的，让他知道自己并不孤单。阿们。",
  p_cta="发布代祷事项", p_cta2="为别人的代祷祷告",
  pq="可以不留名字请人代祷吗？", pa="可以。云上圣所代祷墙上的代祷事项都是匿名的，发布前会审核，你不需要提供姓名或联系方式。"),
}

def christmas(l):
    t, c = X[l], B.C[l]
    body = f"""<h1>{E(t['x_h1'])}</h1>
<p class="lead">{E(t['x_lead'])}</p>
<a class="cta" href="{app(l, 'candle', 'christmas2026')}">🕯 {E(t['x_cta'])}</a>
<h2>{E(t['x_for'])}</h2><ul>{''.join(f'<li>{E(x)}</li>' for x in t['x_list'])}</ul>
<h2>{E(t['x_how'])}</h2><ol>{''.join(f'<li>{E(x)}</li>' for x in t['x_steps'])}</ol>
<div class="card"><h2>{E(t['x_prayer_h'])}</h2><p class="pr">{E(t['x_prayer'])}</p></div>
<p class="muted">{E(t['x_note'])}</p>
<p class="muted">{E(c['c_price'])}</p>
<a class="cta" href="{app(l, 'candle', 'christmas2026')}">🕯 {E(t['x_cta'])}</a><a class="cta alt" href="{app(l, 'group', 'christmas2026')}">{E(t['x_cta2'])}</a>
<p><a href="{B.href(l, 'advent')}">{E(c['a_h1'])} →</a><br><a href="{B.href(l, 'pray')}">{E(t['p_h1'])} →</a></p>"""
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": HTML_LANG[l],
          "mainEntity": [{"@type": "Question", "name": t["xq"], "acceptedAnswer": {"@type": "Answer", "text": t["xa"]}}]}
    return B.page(l, "christmas", t["x_title"], t["x_desc"], body, ld)

def pray(l):
    t, c = X[l], B.C[l]
    body = f"""<h1>{E(t['p_h1'])}</h1>
<p class="lead">{E(t['p_lead'])}</p>
<a class="cta" href="{app(l, 'wall', 'prayer_request')}">🙏 {E(t['p_cta'])}</a>
<h2>{E(t['p_how'])}</h2><ol>{''.join(f'<li>{E(x)}</li>' for x in t['p_steps'])}</ol>
<h2>{E(t['p_ex'])}</h2><ul>{''.join(f'<li>{E(x)}</li>' for x in t['p_list'])}</ul>
<h2>{E(t['p_safe'])}</h2><p>{E(t['p_safe_t'])}</p>
<div class="card"><h2>{E(t['p_prayer_h'])}</h2><p class="pr">{E(t['p_prayer'])}</p></div>
<a class="cta" href="{app(l, 'wall', 'prayer_request')}">🙏 {E(t['p_cta'])}</a><a class="cta alt" href="{app(l, 'wall', 'prayer_request')}">{E(t['p_cta2'])}</a>
<p><a href="{B.href(l, 'candle')}">{E(c['c_h1'])} →</a></p>"""
    ld = {"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": HTML_LANG[l],
          "mainEntity": [{"@type": "Question", "name": t["pq"], "acceptedAnswer": {"@type": "Answer", "text": t["pa"]}}]}
    return B.page(l, "pray", t["p_title"], t["p_desc"], body, ld)

def main():
    built = []
    for l in LANGS:
        for kind, fn in (("christmas", christmas), ("pray", pray)):
            p = os.path.join(ROOT, B.path_of(l, kind))
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, "w", encoding="utf-8").write(fn(l))
            built.append((l, kind))
    sm_path = os.path.join(ROOT, "sitemap.xml")
    sm = open(sm_path, encoding="utf-8").read()
    sm = re.sub(r"<!--seo2-->.*?<!--/seo2-->\n?", "", sm, flags=re.S)
    rows = []
    for l, kind in built:
        alts = "".join(f'<xhtml:link rel="alternate" hreflang="{HTML_LANG[x]}" href="{B.href(x, kind)}"/>' for x in LANGS)
        alts += f'<xhtml:link rel="alternate" hreflang="x-default" href="{B.href("en", kind)}"/>'
        rows.append(f"<url><loc>{B.href(l, kind)}</loc><lastmod>{TODAY}</lastmod>{alts}</url>")
    sm = sm.replace("</urlset>", "<!--seo2-->\n" + "\n".join(rows) + "\n<!--/seo2-->\n</urlset>")
    open(sm_path, "w", encoding="utf-8").write(sm)
    print("built", len(built), "pages")

if __name__ == "__main__":
    main()
