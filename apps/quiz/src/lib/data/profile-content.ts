export type ProfileCode = "D" | "I" | "S" | "C" | "DI" | "DC" | "DS" | "IC" | "ID" | "IS" | "SC" | "SD" | "SI" | "CD" | "CI" | "CS";

export interface ProfileContent {
  hoofdstijl: string;
  steunstijlen: string[];
  samenvatting: string[];
  persoonlijkeBeschrijving: string[];
  taakgerichteKwaliteiten: string[];
  mensgerichteKwaliteiten: string[];
  valkuilen: string[];
  behoeften: {
    belangrijk: string;
    energieKost: string[];
    benadering: string[];
  };
}

export const PROFILE_CONTENT: Record<ProfileCode, ProfileContent> = {
  DI: {
    hoofdstijl: "Dominant",
    steunstijlen: ["Interactief"],
    samenvatting: [
      "Je bent energiek en doelgericht bij de dingen die je doet.",
      "Je bent een snelle denker en neemt graag het initiatief.",
      "Je bent gericht op resultaten en houdt van uitdagingen.",
      "Je kunt anderen enthousiasmeren voor jouw plannen.",
      "Grootste kracht: Daadkracht gecombineerd met enthousiasme.",
      "Belangrijk aandachtspunt: Geduld hebben met mensen die een lager tempo hebben."
    ],
    persoonlijkeBeschrijving: [
      "Je bent energiek en doelgericht bij de dingen die je doet. Je bent een snelle denker en neemt graag het initiatief. Je voelt je het beste in een leidinggevende positie waarbij je jouw invloed kunt uitoefenen.",
      "Je houdt van competitie en je durft risico's te nemen. Als je het gevoel hebt dat je een doel kunt bereiken, ga je er vol voor.",
      "In de communicatie is voor jou de 'WAT' het belangrijkste. Daarna wil je de 'WIE' weten. Je bent direct en eerlijk, maar ook hartelijk en sociaal.",
      "Je hebt behoefte aan vrijheid in je handelen en je houdt niet van te veel regels en details. Je bent liever bezig met de grote lijnen en de toekomst."
    ],
    taakgerichteKwaliteiten: [
      "Probleemoplossend vermogen: Je ziet snel waar de knelpunten zitten.",
      "Initiatief: Je wacht niet af, maar onderneemt direct actie.",
      "Resultaatgerichtheid: Je verliest het einddoel nooit uit het oog.",
      "Tempo & daadkracht: Je werkt snel en effectief."
    ],
    mensgerichteKwaliteiten: [
      "Overtuigingskracht: Je weet anderen te winnen voor je ideeën.",
      "Sociale vaardigheden: Je maakt makkelijk contact met mensen.",
      "Inspirerend vermogen: Je energie werkt aanstekelijk.",
      "Relatiegerichtheid: Je vindt een goede sfeer in het team belangrijk."
    ],
    valkuilen: [
      "Te snel gaan voor anderen die meer tijd nodig hebben.",
      "Belangrijke details over het hoofd zien door de focus op het doel.",
      "Bot of ongeduldig overkomen als het niet snel genoeg gaat.",
      "Te optimistisch zijn over wat er in korte tijd haalbaar is."
    ],
    behoeften: {
      belangrijk: "Eerst de WAT, daarna de WIE",
      energieKost: [
        "Gebrek aan richting",
        "Afwachten",
        "Te veel details en routine",
        "Gebrek aan erkenning voor resultaten"
      ],
      benadering: [
        "Wees kernachtig en concreet.",
        "Geef ruimte voor eigen initiatief.",
        "Focus op resultaten en kansen.",
        "Wees eerlijk en direct."
      ]
    }
  },
  D: {
    hoofdstijl: "Dominant",
    steunstijlen: [],
    samenvatting: [
      "Je bent een snelle en doelgerichte denker met een hoog werktempo.",
      "Je durft risico's te nemen en neemt graag de leiding.",
      "Winnen is heel belangrijk voor je.",
      "Je bent vooral gericht op de grote lijnen.",
      "Grootste kracht: Vastberadenheid en resultaatgerichtheid.",
      "Belangrijk aandachtspunt: Rekening houden met de gevoelens van anderen."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een snelle en doelgerichte denker met een hoog werktempo. Je durft risico's te nemen en neemt graag de leiding in situaties. Je bent een natuurlijke leider die graag de controle houdt.",
      "Winnen is heel belangrijk voor je. Je bent competitief ingesteld en streeft er altijd naar om de beste resultaten te behalen. Je bent niet bang voor confrontaties.",
      "In de communicatie ben je direct en kernachtig. Voor jou is de 'WAT' essentieel: wat moet er gebeuren en wanneer moet het af zijn?",
      "Je functioneert het beste in een omgeving waar je zelfstandig beslissingen kunt nemen en waar resultaten worden gewaardeerd boven procedures."
    ],
    taakgerichteKwaliteiten: [
      "Besluitvaardigheid: Je hakt knopen snel door.",
      "Doelgerichtheid: Je bent volledig gefocust op het resultaat.",
      "Ondernemerschap: Je ziet kansen en grijpt ze direct.",
      "Zelfstandigheid: Je kunt uitstekend alleen werken."
    ],
    mensgerichteKwaliteiten: [
      "Directheid: Mensen weten precies wat ze aan je hebben.",
      "Gezag: Je straalt natuurlijke autoriteit uit.",
      "Zelfvertrouwen: Je gelooft in je eigen kunnen.",
      "Krachtige uitstraling: Je komt zelfverzekerd over."
    ],
    valkuilen: [
      "Ongeduldig worden als anderen trager zijn.",
      "Dominant of autoritair overkomen.",
      "Details over het hoofd zien door focus op snelheid.",
      "Minder oog hebben voor de menselijke kant van de zaak."
    ],
    behoeften: {
      belangrijk: "Eerst de WAT, de WIE is ondergeschikt",
      energieKost: [
        "Inefficiëntie",
        "Besluiteloosheid",
        "Geen invloed kunnen uitoefenen",
        "Traagheid in processen"
      ],
      benadering: [
        "Wees zakelijk en direct.",
        "Kom met feiten, niet met emoties.",
        "Geef keuzemogelijkheden.",
        "Focus op het resultaat."
      ]
    }
  },
  I: {
    hoofdstijl: "Interactief",
    steunstijlen: [],
    samenvatting: [
      "Je bent enthousiast, optimistisch en zeer sociaal ingesteld.",
      "Je maakt makkelijk contact en bent een echte netwerker.",
      "Je bent creatief en denkt graag buiten de gebaande paden.",
      "Je hebt een grote behoefte aan erkenning en gezelligheid.",
      "Grootste kracht: Anderen inspireren en motiveren.",
      "Belangrijk aandachtspunt: Focus houden en details niet vergeten."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een enthousiast en optimistisch persoon die energie krijgt van contact met anderen. Je bent hartelijk, joviaal en zeer communicatief vaardig.",
      "In groepen voel je je als een vis in het water. Je bent een echte 'mensen-mens' en vindt een goede sfeer en harmonie erg belangrijk.",
      "Voor jou is de 'WIE' in de communicatie het allerbelangrijkst. Je wilt eerst weten met wie je te maken hebt voordat je de inhoud induikt.",
      "Je bent creatief en hebt vaak veel nieuwe ideeën. Je houdt van afwisseling en wordt niet graag beperkt door te veel regels of routine."
    ],
    taakgerichteKwaliteiten: [
      "Creativiteit: Je komt altijd met nieuwe invalshoeken.",
      "Optimisme: Je ziet overal mogelijkheden.",
      "Overtuigingskracht: Je bent verbaal zeer sterk.",
      "Flexibiliteit: Je past je makkelijk aan nieuwe situaties aan."
    ],
    mensgerichteKwaliteiten: [
      "Empathie: Je voelt de sfeer in een groep goed aan.",
      "Netwerken: Je bouwt razendsnel nieuwe relaties op.",
      "Inspireren: Je krijgt mensen makkelijk mee in je enthousiasme.",
      "Gezelligheid: Je zorgt voor een positieve sfeer."
    ],
    valkuilen: [
      "Snel afgeleid zijn door nieuwe prikkels.",
      "Te veel praten en te weinig luisteren.",
      "Details en afspraken vergeten.",
      "Moeilijk nee kunnen zeggen tegen mensen."
    ],
    behoeften: {
      belangrijk: "Eerst de WIE, daarna de WAT",
      energieKost: [
        "Sociaal isolement",
        "Strenge regels en procedures",
        "Gebrek aan waardering",
        "Negatieve sfeer of conflicten"
      ],
      benadering: [
        "Wees enthousiast en informeel.",
        "Neem de tijd voor een sociaal praatje.",
        "Geef positieve feedback.",
        "Help bij het aanbrengen van structuur."
      ]
    }
  },
  S: {
    hoofdstijl: "Stabiliteit",
    steunstijlen: [],
    samenvatting: [
      "Je bent een rustige, vriendelijke en zeer betrouwbare teamspeler.",
      "Je luistert goed naar anderen en bent erg behulpzaam.",
      "Je houdt van voorspelbaarheid en een stabiele omgeving.",
      "Je bent loyaal en maakt zaken graag zorgvuldig af.",
      "Grootste kracht: Geduld en het bewaren van de harmonie.",
      "Belangrijk aandachtspunt: Duidelijk je eigen grenzen aangeven."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een rustig en stabiel persoon die waarde hecht aan goede relaties en harmonie. Je bent een uitstekende luisteraar en bent oprecht geïnteresseerd in anderen.",
      "Betrouwbaarheid is een van je kernwaarden. Je doet wat je belooft en je bent een loyale steun voor je collega's en vrienden.",
      "In de communicatie is de relatie voor jou leidend. Je wilt dat iedereen zich prettig voelt en je vermijdt liever directe confrontaties.",
      "Je werkt het liefst in een omgeving die voorspelbaar is en waar je de tijd krijgt om je taken zorgvuldig en methodisch uit te voeren."
    ],
    taakgerichteKwaliteiten: [
      "Betrouwbaarheid: Men kan altijd op je rekenen.",
      "Methodisch werken: Je volgt graag een bewezen aanpak.",
      "Zorgvuldigheid: Je maakt af waar je aan begint.",
      "Geduld: Je blijft rustig, ook als het even duurt."
    ],
    mensgerichteKwaliteiten: [
      "Luistervaardigheid: Je geeft anderen echt de aandacht.",
      "Behulpzaamheid: Je staat altijd klaar om een ander te steunen.",
      "Loyaliteit: Je bent een trouwe bondgenoot.",
      "Diplomatie: Je bent tactvol in je omgang met anderen."
    ],
    valkuilen: [
      "Te lang wachten met het nemen van beslissingen.",
      "Eigen mening inslikken om de vrede te bewaren.",
      "Moeilijk kunnen omgaan met plotselinge veranderingen.",
      "Te veel hooi op je vork nemen door geen nee te zeggen."
    ],
    behoeften: {
      belangrijk: "De relatie staat voorop",
      energieKost: [
        "Onverwachte veranderingen",
        "Conflicten en agressie",
        "Tijdsdruk en haast",
        "Gebrek aan duidelijke instructies"
      ],
      benadering: [
        "Wees vriendelijk en oprecht.",
        "Geef de tijd om aan veranderingen te wennen.",
        "Vraag expliciet naar hun mening.",
        "Bied zekerheid en structuur."
      ]
    }
  },
  C: {
    hoofdstijl: "Consciëntieus",
    steunstijlen: [],
    samenvatting: [
      "Je bent analytisch, nauwkeurig en stelt hoge kwaliteitseisen.",
      "Je baseert je beslissingen op feiten, data en logica.",
      "Je werkt graag gestructureerd en volgens de regels.",
      "Je bent gereserveerd en objectief in je communicatie.",
      "Grootste kracht: Grondigheid en oog voor detail.",
      "Belangrijk aandachtspunt: Perfectionisme loslaten wanneer nodig."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een analytisch en consciëntieus persoon die streeft naar perfectie en kwaliteit. Je bent kritisch ingesteld en wilt altijd weten hoe zaken precies in elkaar zitten.",
      "Objectiviteit is belangrijk voor je. Je laat je niet snel leiden door emoties, maar baseert je oordeel op feiten, bewijzen en logische redeneringen.",
      "In de communicatie ben je formeel en afwachtend. Je luistert eerst en verzamelt informatie voordat je je eigen mening geeft.",
      "Je functioneert het beste in een omgeving waar duidelijke regels en procedures zijn en waar nauwkeurigheid en expertise worden gewaardeerd."
    ],
    taakgerichteKwaliteiten: [
      "Analytisch vermogen: Je doorgrondt complexe materie snel.",
      "Nauwkeurigheid: Je maakt zelden fouten.",
      "Kwaliteitsgerichtheid: Je gaat voor het beste resultaat.",
      "Objectiviteit: Je blijft feitelijk en onpartijdig."
    ],
    mensgerichteKwaliteiten: [
      "Discretie: Je bent integer en betrouwbaar met informatie.",
      "Diplomatie: Je communiceert weloverwogen.",
      "Zelfbeheersing: Je blijft kalm en beheerst.",
      "Bescheidenheid: Je hoeft niet op de voorgrond te staan."
    ],
    valkuilen: [
      "Verdrinken in details (analysis paralysis).",
      "Te kritisch zijn naar jezelf en anderen.",
      "Afstandelijk of koel overkomen.",
      "Moeilijk kunnen delegeren uit angst voor kwaliteitsverlies."
    ],
    behoeften: {
      belangrijk: "Eerst de feiten, dan de actie",
      energieKost: [
        "Onnauwkeurigheid",
        "Onlogische beslissingen",
        "Emotionele uitbarstingen",
        "Gebrek aan privacy of ruimte"
      ],
      benadering: [
        "Wees voorbereid en feitelijk.",
        "Geef details en onderbouwing.",
        "Respecteer hun persoonlijke ruimte.",
        "Geef tijd om zaken te overdenken."
      ]
    }
  },
  DC: {
    hoofdstijl: "Dominant",
    steunstijlen: ["Consciëntieus"],
    samenvatting: [
      "Je bent besluitvaardig en analytisch ingesteld.",
      "Je combineert doelgerichtheid met een scherp oog voor kwaliteit.",
      "Je stelt hoge eisen aan jezelf en je omgeving.",
      "Je werkt graag zelfstandig aan uitdagende doelen.",
      "Grootste kracht: Strategisch inzicht en resultaatgerichtheid.",
      "Belangrijk aandachtspunt: Flexibeler zijn naar anderen."
    ],
    persoonlijkeBeschrijving: [
      "Je combineert een sterke drive voor resultaten met een diepe behoefte aan nauwkeurigheid. Je bent een strategisch denker die plannen zorgvuldig uitwerkt voordat je tot actie overgaat.",
      "Je bent onafhankelijk en neemt graag de controle. Je streeft naar perfectie en kunt ongeduldig worden als zaken niet volgens jouw hoge standaarden verlopen.",
      "In de communicatie ben je direct en feitelijk. Je waardeert logica en efficiëntie boven alles.",
      "Je bent gericht op de 'WAT' en de kwaliteit van de uitvoering. Je bent kritisch maar altijd met het doel voor ogen."
    ],
    taakgerichteKwaliteiten: [
      "Strategisch denken: Je plant je stappen zorgvuldig op lange termijn.",
      "Hoge standaarden: Je gaat alleen voor de beste kwaliteit.",
      "Besluitvaardigheid: Je hakt knopen door op basis van feiten.",
      "Analytisch inzicht: Je doorgrondt complexe situaties snel."
    ],
    mensgerichteKwaliteiten: [
      "Objectiviteit: Je blijft zakelijk en onpartijdig.",
      "Betrouwbaarheid: Wat je doet, doe je grondig en correct.",
      "Duidelijkheid: Mensen weten precies wat ze aan je hebben.",
      "Professionaliteit: Je straalt deskundigheid uit."
    ],
    valkuilen: [
      "Te kritisch of veeleisend zijn naar anderen.",
      "Afstandelijk of autoritair overkomen.",
      "Te veel op de inhoud en te weinig op de mens gericht.",
      "Moeilijk kunnen loslaten van de controle."
    ],
    behoeften: {
      belangrijk: "Kwaliteit en resultaat",
      energieKost: ["Onkunde", "Traagheid", "Gebrek aan logica", "Oppervlakkigheid"],
      benadering: ["Wees zakelijk.", "Onderbouw met data.", "Focus op efficiëntie.", "Geef autonomie."]
    }
  },
  IS: {
    hoofdstijl: "Interactief",
    steunstijlen: ["Stabiliteit"],
    samenvatting: [
      "Je bent sociaal, enthousiast en een echte teamspeler.",
      "Je bouwt makkelijk relaties en creëert een positieve sfeer.",
      "Je bent ondersteunend en optimistisch van aard.",
      "Je voelt goed aan wat anderen nodig hebben.",
      "Grootste kracht: Mensgerichtheid en verbindend vermogen.",
      "Belangrijk aandachtspunt: Assertiever zijn en grenzen stellen."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een hartelijk en sociaal persoon die harmonie in het team essentieel vindt. Je combineert je enthousiasme met een zorgzame en luisterende houding.",
      "Je bent een echte verbinder die mensen bij elkaar brengt. Je bent optimistisch en ziet vaak het beste in iedereen.",
      "In de communicatie staat de 'WIE' centraal. Je bent empathisch en diplomatiek.",
      "Je werkt het liefst in een omgeving waar samenwerking en een goede sfeer worden gewaardeerd boven harde competitie."
    ],
    taakgerichteKwaliteiten: [
      "Teamwork: Je functioneert het beste in gezamenlijkheid.",
      "Creativiteit: Je bedenkt oplossingen die mensen verbinden.",
      "Ondersteuning bieden: Je helpt anderen graag hun doelen te bereiken.",
      "Harmonie bewaren: Je zorgt voor een stabiele, prettige werkplek."
    ],
    mensgerichteKwaliteiten: [
      "Empathisch vermogen: Je begrijpt wat er bij anderen speelt.",
      "Sociale vaardigheid: Je bent zeer toegankelijk en vriendelijk.",
      "Inspireren: Je optimisme werkt aanstekelijk voor het team.",
      "Luistervaardigheid: Je geeft anderen echt de ruimte."
    ],
    valkuilen: [
      "Conflicten te veel uit de weg gaan.",
      "Moeilijk nee kunnen zeggen tegen verzoeken.",
      "Te optimistisch zijn over planningen en haalbaarheid.",
      "Te veel focus op de sfeer, waardoor de taak blijft liggen."
    ],
    behoeften: {
      belangrijk: "Samenhang en waardering",
      energieKost: ["Harde confrontaties", "Sociaal isolement", "Onduidelijkheid", "Negativisme"],
      benadering: ["Wees warm en persoonlijk.", "Toon oprechte interesse.", "Geef erkenning.", "Bied veiligheid."]
    }
  },
  SC: {
    hoofdstijl: "Stabiliteit",
    steunstijlen: ["Consciëntieus"],
    samenvatting: [
      "Je bent betrouwbaar, nauwkeurig en werkt methodisch.",
      "Je combineert stabiliteit met een oog voor detail.",
      "Je bent een loyale kracht die zorgt voor constante kwaliteit.",
      "Je bent bescheiden en werkt graag achter de schermen.",
      "Grootste kracht: Grondigheid en betrouwbaarheid.",
      "Belangrijk aandachtspunt: Sneller inspelen op veranderingen."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een rustig en bedachtzaam persoon die taken zeer zorgvuldig uitvoert. Je combineert je behoefte aan harmonie met een sterke focus op kwaliteit en procedures.",
      "Je bent een stabiele factor in elk team. Je bent loyaal, geduldig en stelt hoge eisen aan de nauwkeurigheid van je werk.",
      "In de communicatie ben je afwachtend en feitelijk. Je luistert goed en wilt graag alle informatie hebben voordat je een oordeel vormt.",
      "Je functioneert het beste in een gestructureerde omgeving waar je de tijd krijgt om zaken tot in de puntjes uit te zoeken."
    ],
    taakgerichteKwaliteiten: [
      "Nauwkeurigheid: Je let op elk detail in je werk.",
      "Betrouwbaarheid: Je levert altijd wat is afgesproken.",
      "Methodisch werken: Je volgt processen stap voor stap.",
      "Kwaliteitscontrole: Je bent een natuurlijke bewaker van de standaard."
    ],
    mensgerichteKwaliteiten: [
      "Geduld: Je neemt de tijd voor uitleg en anderen.",
      "Loyaliteit: Je bent trouw aan je team en organisatie.",
      "Discretie: Je gaat integer om met informatie.",
      "Ondersteuning: Je bent een rustige helper op de achtergrond."
    ],
    valkuilen: [
      "Te lang blijven hangen in details.",
      "Moeilijk kunnen omgaan met onverwachte druk.",
      "Weerstand tegen verandering.",
      "Onzeker overkomen door perfectionisme."
    ],
    behoeften: {
      belangrijk: "Zekerheid en precisie",
      energieKost: ["Chaos", "Plotselinge wijzigingen", "Onnauwkeurigheid", "Harde kritiek"],
      benadering: ["Geef duidelijke kaders.", "Bied zekerheid.", "Wees feitelijk en rustig.", "Geef tijd."]
    }
  },
  IC: {
    hoofdstijl: "Interactief",
    steunstijlen: ["Consciëntieus"],
    samenvatting: [
      "Je bent enthousiast maar ook zeer precies in je werk.",
      "Je combineert sociale vaardigheden met een scherp oog voor detail.",
      "Je bent creatief en analytisch tegelijk.",
      "Je kunt complexe zaken helder en inspirerend uitleggen.",
      "Grootste kracht: Communicatieve vaardigheid en expertise.",
      "Belangrijk aandachtspunt: Focus bewaren op hoofdzaken."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een veelzijdig persoon die zowel van mensen als van data houdt. Je kunt enthousiast vertellen over je vakgebied en hebt daarbij oog voor de kleinste details.",
      "Je bent creatief in het vinden van oplossingen, maar je wilt wel dat deze logisch en correct zijn. Je combineert flair met grondigheid.",
      "In de communicatie ben je hartelijk maar ook feitelijk. Je vindt het belangrijk dat anderen je begrijpen en waarderen om je kennis.",
      "Je werkt graag in een omgeving waar ruimte is voor vernieuwing, mits er een degelijke basis onder ligt."
    ],
    taakgerichteKwaliteiten: [
      "Innovatief vermogen: Je bedenkt creatieve, onderbouwde oplossingen.",
      "Analytisch inzicht: Je begrijpt de logica achter de processen.",
      "Presentatievaardigheid: Je legt moeilijke dingen simpel uit.",
      "Kwaliteitsbewaking: Je zorgt dat vernieuwing correct wordt uitgevoerd."
    ],
    mensgerichteKwaliteiten: [
      "Overtuigingskracht: Je weet anderen te winnen voor je ideeën.",
      "Inspireren: Je deelt je visie op een boeiende manier.",
      "Expertise delen: Je vindt het fijn om anderen iets te leren.",
      "Sociale flair: Je bent makkelijk in de omgang."
    ],
    valkuilen: [
      "Te veel details willen delen in je enthousiasme.",
      "Snel afgeleid door nieuwe, interessante zijpaden.",
      "Moeilijk hoofdzaken van bijzaken scheiden.",
      "Soms te kritisch zijn als feiten niet kloppen."
    ],
    behoeften: {
      belangrijk: "Erkenning en correctheid",
      energieKost: ["Onlogica", "Geen gehoor vinden", "Slordig werk", "Routine zonder diepgang"],
      benadering: ["Geef complimenten op expertise.", "Bied afwisseling.", "Wees feitelijk onderbouwd.", "Luister naar hun ideeën."]
    }
  },
  ID: {
    hoofdstijl: "Interactief",
    steunstijlen: ["Dominant"],
    samenvatting: [
      "Je bent enthousiast, direct en zeer gedreven.",
      "Je combineert positieve energie met een no-nonsense aanpak.",
      "Je bent een inspirerende leider die actie onderneemt.",
      "Je ziet overal kansen en grijpt deze direct aan.",
      "Grootste kracht: Dynamiek en overtuigingskracht.",
      "Belangrijk aandachtspunt: Luisteren naar de inbreng van anderen."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een charismatisch en energiek persoon die graag het voortouw neemt. Je combineert je sociale kracht met een sterke drang om resultaten te behalen.",
      "Je bent optimistisch, avontuurlijk en niet bang om op de voorgrond te treden. Je motiveert anderen met je enthousiasme en je tempo.",
      "In de communicatie ben je open en direct. Je bent een snelle prater en een snelle beslisser.",
      "Je gedijt in een dynamische omgeving waar je de vrijheid hebt om te pionieren en waar actie centraal staat."
    ],
    taakgerichteKwaliteiten: [
      "Initiatief tonen: Je wacht niet af maar begint direct.",
      "Snelle besluitvorming: Je weet snel wat je wilt.",
      "Resultaatgerichtheid: Je gaat voor de winst.",
      "Aanjagen van processen: Je brengt beweging in projecten."
    ],
    mensgerichteKwaliteiten: [
      "Inspirerend leiderschap: Je krijgt de groep makkelijk mee.",
      "Netwerken: Je bent een ster in het maken van contacten.",
      "Motiveren: Je straalt zelfvertrouwen en kracht uit.",
      "Zelfverzekerdheid: Je gelooft in je eigen aanpak."
    ],
    valkuilen: [
      "Anderen overschreeuwen in je enthousiasme.",
      "Te snel willen gaan voor de rest van de groep.",
      "Details verwaarlozen door focus op de hoofdlijn.",
      "Minder geduld hebben voor reflectie of analyse."
    ],
    behoeften: {
      belangrijk: "Actie en enthousiasme",
      energieKost: ["Traagheid", "Pessimisme", "Te veel administratie", "Stilzitten"],
      benadering: ["Houd het tempo hoog.", "Wees positief.", "Focus op de 'big picture'.", "Geef uitdaging."]
    }
  },
  DS: {
    hoofdstijl: "Dominant",
    steunstijlen: ["Stabiliteit"],
    samenvatting: [
      "Je bent gedreven maar ook betrouwbaar en stabiel.",
      "Je combineert doelgerichtheid met een constante werkwijze.",
      "Je bent direct in je communicatie en houdt van duidelijkheid.",
      "Je werkt gestaag en krachtig naar je doelen toe.",
      "Grootste kracht: Betrouwbare daadkracht.",
      "Belangrijk aandachtspunt: Meer oog hebben voor de sfeer in de groep."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een krachtig persoon die rust en daadkracht uitstraalt. Je combineert je behoefte aan resultaat met een stabiele en betrouwbare aanpak.",
      "Je bent pragmatisch en houdt van duidelijkheid. Mensen weten precies wat ze aan je hebben: je bent eerlijk en doet wat je zegt.",
      "In de communicatie ben je zakelijk en rustig. Je bent gericht op de 'WAT' maar met respect voor de afgesproken procedures.",
      "Je functioneert het beste in een omgeving waar prestaties worden gewaardeerd en waar een zekere mate van rust en voorspelbaarheid heerst."
    ],
    taakgerichteKwaliteiten: [
      "Vastberadenheid: Je houdt vast aan je doelen.",
      "Betrouwbaarheid: Je bent een rots in de branding.",
      "Doelgerichtheid: Je werkt effectief naar resultaat.",
      "Pragmatisme: Je kiest voor oplossingen die echt werken."
    ],
    mensgerichteKwaliteiten: [
      "Eerlijkheid: Je bent direct en oprecht.",
      "Stabiliteit: Je blijft kalm onder druk.",
      "Zelfbeheersing: Je laat je niet snel meeslepen.",
      "Duidelijke kaders bieden: Je geeft heldere sturing."
    ],
    valkuilen: [
      "Soms te star vasthouden aan eigen plannen.",
      "Bot overkomen door je directheid.",
      "Minder flexibel zijn bij plotselinge wijzigingen.",
      "Eigen emoties of die van anderen soms negeren."
    ],
    behoeften: {
      belangrijk: "Resultaat met zekerheid",
      energieKost: ["Onzekerheid", "Chaos", "Geen resultaat zien", "Veel praten zonder actie"],
      benadering: ["Wees direct maar rustig.", "Kom afspraken na.", "Focus op praktische resultaten.", "Geef stabiliteit."]
    }
  },
  SI: {
    hoofdstijl: "Stabiliteit",
    steunstijlen: ["Interactief"],
    samenvatting: [
      "Je bent harmonieus, sociaal en een echte teamspeler.",
      "Je creëert een prettige sfeer en bent zeer ondersteunend.",
      "Je luistert empathisch en voelt anderen goed aan.",
      "Je bent geduldig en brengt rust in drukke tijden.",
      "Grootste kracht: Empathie en sfeerbeheer.",
      "Belangrijk aandachtspunt: Sneller beslissingen durven nemen."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een warm en toegankelijk persoon die het welzijn van de groep voorop stelt. Je combineert je rustige aard met een gezonde dosis enthousiasme en sociale interesse.",
      "Je bent een uitstekende teamplayer die altijd klaarstaat voor anderen. Je bent optimistisch en brengt mensen graag op een vriendelijke manier samen.",
      "In de communicatie staat de verbinding centraal. Je bent een geduldige luisteraar en een tactvolle spreker.",
      "Je gedijt in een informele, veilige omgeving waar mensen centraal staan en waar samenwerking de norm is."
    ],
    taakgerichteKwaliteiten: [
      "Ondersteuning bieden: Je helpt het team optimaal te draaien.",
      "Harmonie bewaren: Je lost irritaties in de kiem op.",
      "Geduldig uitvoeren: Je brengt projecten rustig tot een einde.",
      "Sfeer verbeteren: Je bent de sociale lijm van de groep."
    ],
    mensgerichteKwaliteiten: [
      "Empathie: Je begrijpt gevoelens van anderen feilloos.",
      "Luistervaardigheid: Je bent een echte vertrouwenspersoon.",
      "Vriendelijkheid: Je bent zeer benaderbaar.",
      "Teamgeest: Je denkt altijd in 'wij' in plaats van 'ik'."
    ],
    valkuilen: [
      "Confrontaties te veel vermijden.",
      "Moeilijk zelfstandig besluiten kunnen nemen.",
      "Te veel gericht zijn op anderen, waardoor je jezelf vergeet.",
      "Traagheid bij noodzakelijke veranderingen."
    ],
    behoeften: {
      belangrijk: "Gezelligheid en harmonie",
      energieKost: ["Agressie", "Harde competitie", "Alleen moeten werken", "Onvriendelijkheid"],
      benadering: ["Wees hartelijk.", "Focus op de menselijke kant.", "Geef tijd voor overleg.", "Waardeer hun inzet."]
    }
  },
  SD: {
    hoofdstijl: "Stabiliteit",
    steunstijlen: ["Dominant"],
    samenvatting: [
      "Je bent een stabiele en gedreven kracht.",
      "Je bent betrouwbaar maar neemt ook graag de leiding.",
      "Je werkt geduldig en vasthoudend naar resultaten toe.",
      "Je zoekt naar praktische oplossingen die echt werken.",
      "Grootste kracht: Volharding en betrouwbaarheid.",
      "Belangrijk aandachtspunt: Openstaan voor nieuwe werkwijzen."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een vasthoudend persoon die met een rustige kracht doelen bereikt. Je combineert je behoefte aan stabiliteit met een sterke focus op het eindresultaat.",
      "Je bent loyaal aan je team, maar schuwt de verantwoordelijkheid niet als er knopen doorgehakt moeten worden. Je bent pragmatisch en nuchter.",
      "In de communicatie ben je gereserveerd maar duidelijk. Je bent een luisteraar die pas spreekt als je zeker van je zaak bent.",
      "Je werkt het liefst in een omgeving waar je gestaag kunt doorwerken aan tastbare doelen zonder al te veel afleiding."
    ],
    taakgerichteKwaliteiten: [
      "Volharding: Je geeft niet op voor het doel is bereikt.",
      "Betrouwbaarheid: Je doet wat je zegt, zonder gedoe.",
      "Resultaatgerichtheid: Je werkt gestaag naar de uitkomst.",
      "Pragmatische aanpak: Je houdt van simpele, werkende methodes."
    ],
    mensgerichteKwaliteiten: [
      "Loyaliteit: Je bent een trouwe partner in samenwerking.",
      "Geduld: Je laat je niet opjagen door de waan van de dag.",
      "Zelfverzekerdheid: Je straalt kalme autoriteit uit.",
      "Kalmte onder druk: Je raakt niet snel in paniek."
    ],
    valkuilen: [
      "Te star vasthouden aan tradities of oude methodes.",
      "Weerstand hebben tegen plotselinge verandering.",
      "Soms te gesloten of onbereikbaar overkomen.",
      "Minder oog hebben voor de emotionele dynamiek in de groep."
    ],
    behoeften: {
      belangrijk: "Stabiliteit en resultaat",
      energieKost: ["Chaos", "Onnodige risico's", "Onduidelijke doelen", "Gezeur"],
      benadering: ["Houd het feitelijk.", "Toon respect voor ervaring.", "Geef rust en ruimte.", "Focus op nut en noodzaak."]
    }
  },
  CI: {
    hoofdstijl: "Consciëntieus",
    steunstijlen: ["Interactief"],
    samenvatting: [
      "Je bent analytisch ingesteld maar ook zeer sociaal vaardig.",
      "Je combineert nauwkeurigheid met het vermogen anderen te betrekken.",
      "Je communiceert helder, gestructureerd en met een glimlach.",
      "Je graaft graag diep en deelt je bevindingen enthousiast.",
      "Grootste kracht: Diplomatieke grondigheid.",
      "Belangrijk aandachtspunt: Perfectie durven loslaten voor snelheid."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een bedachtzaam persoon die waarde hecht aan zowel kwaliteit als goede relaties. Je combineert je analytische kracht met een tactvolle en sociale houding.",
      "Je bent diplomatiek en houdt rekening met de standpunten van anderen, zonder daarbij de feiten uit het oog te verliezen. Je bent een gedegen adviseur.",
      "In de communicatie ben je zorgvuldig en hartelijk. Je legt zaken graag goed uit en waardeert een inhoudelijke dialoog.",
      "Je functioneert het beste in een omgeving waar vakmanschap en menselijke maat hand in hand gaan."
    ],
    taakgerichteKwaliteiten: [
      "Analytisch vermogen: Je doorgrondt de diepte van zaken.",
      "Diplomatie: Je regelt zaken op een correcte manier.",
      "Kwaliteitsbewaking: Je zorgt dat alles tot in de puntjes klopt.",
      "Helder communiceren: Je deelt feiten op een boeiende wijze."
    ],
    mensgerichteKwaliteiten: [
      "Tact: Je weet hoe je lastige dingen netjes brengt.",
      "Luistervaardigheid: Je bent aandachtig en objectief.",
      "Expertise delen: Je vindt het fijn om anderen iets te leren.",
      "Samenwerking: Je zoekt naar de 'wij' op basis van kwaliteit."
    ],
    valkuilen: [
      "Besluitvorming vertragen door te veel te willen analyseren.",
      "Te voorzichtig zijn in je uitspraken om fouten te vermijden.",
      "Moeilijk kunnen omgaan met ongestructureerde mensen.",
      "Angst hebben om een onvolmaakt resultaat op te leveren."
    ],
    behoeften: {
      belangrijk: "Kwaliteit en harmonie",
      energieKost: ["Slordigheid", "Conflicten", "Hoge druk zonder plan", "Onvriendelijke kritiek"],
      benadering: ["Wees vriendelijk en feitelijk.", "Geef onderbouwing.", "Respecteer hun tempo.", "Geef tijd voor kwaliteit."]
    }
  },
  CD: {
    hoofdstijl: "Consciëntieus",
    steunstijlen: ["Dominant"],
    samenvatting: [
      "Je bent analytisch en zeer gedreven om resultaten te boeken.",
      "Je combineert precisie met een sterke focus op de uitkomst.",
      "Je stelt hoge eisen aan de kwaliteit van je eigen werk.",
      "Je plant strategisch en let daarbij op elk detail.",
      "Grootste kracht: Analytische daadkracht.",
      "Belangrijk aandachtspunt: Anderen meer betrekken bij je proces."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een serieus en doelgericht persoon die gaat voor de allerhoogste kwaliteit. Je combineert je analytische instelling met een sterke behoefte aan autonomie en resultaat.",
      "Je bent kritisch, onafhankelijk en streeft naar excellentie in alles wat je doet. Je bent een strategisch denker die niets aan het toeval overlaat.",
      "In de communicatie ben je formeel, gereserveerd en zeer direct als het om de inhoud gaat. Je waardeert deskundigheid boven alles.",
      "Je functioneert het beste in een professionele omgeving waar je de ruimte krijgt om je expertise in te zetten voor uitdagende doelen."
    ],
    taakgerichteKwaliteiten: [
      "Strategisch plannen: Niets wordt aan het toeval overgelaten.",
      "Hoge kwaliteitsstandaard: Alleen het beste is goed genoeg.",
      "Probleemanalyse: Je vindt de echte oorzaak van elk defect.",
      "Resultaatgerichtheid: Je gaat voor de meest efficiënte oplossing."
    ],
    mensgerichteKwaliteiten: [
      "Integriteit: Je bent zeer eerlijk en oprecht.",
      "Objectiviteit: Je baseert je oordeel op pure feiten.",
      "Zelfstandigheid: Je hebt weinig sturing nodig van anderen.",
      "Expertise: Je bent een vakinhoudelijk baken voor het team."
    ],
    valkuilen: [
      "Te afstandelijk of koel overkomen in de samenwerking.",
      "Anderen buitensluiten door je sterke focus op de taak.",
      "Perfectionisme dat de voortgang in de weg staat.",
      "Ongeduldig zijn met mensen die je als minder deskundig ziet."
    ],
    behoeften: {
      belangrijk: "Kwaliteit en autonomie",
      energieKost: ["Incompetentie", "Onduidelijke kaders", "Emotioneel gedoe", "Fouten maken"],
      benadering: ["Wees deskundig.", "Kom met bewijzen.", "Respecteer hun onafhankelijkheid.", "Focus op de inhoud."]
    }
  },
  CS: {
    hoofdstijl: "Consciëntieus",
    steunstijlen: ["Stabiliteit"],
    samenvatting: [
      "Je bent zorgvuldig, betrouwbaar en werkt gestructureerd.",
      "Je combineert precisie met een behoefte aan stabiliteit.",
      "Je volgt procedures nauwgezet en zorgt voor hoge kwaliteit.",
      "Je helpt anderen graag met je expertise en geduld.",
      "Grootste kracht: Betrouwbare nauwkeurigheid.",
      "Belangrijk aandachtspunt: Meer durven vertrouwen op je gevoel."
    ],
    persoonlijkeBeschrijving: [
      "Je bent een bescheiden en consciëntieus persoon die zaken graag tot in de puntjes verzorgt. Je combineert je behoefte aan kwaliteit met een rustige en ondersteunende houding.",
      "Je bent een loyale werker die procedures volgt en zorgt dat alles klopt. Je bent geduldig en neemt de tijd om zaken goed uit te leggen aan anderen.",
      "In de communicatie ben je afwachtend, formeel en feitelijk. Je bent een aandachtige luisteraar die waarde hecht aan feiten en bewijzen.",
      "Je functioneert het beste in een stabiele, voorspelbare omgeving waar nauwkeurigheid en integriteit de norm zijn."
    ],
    taakgerichteKwaliteiten: [
      "Nauwkeurigheid: Je maakt zelden een fout in de details.",
      "Proceduregerichtheid: Je houdt van duidelijke werkafspraken.",
      "Kwaliteitsbewaking: Je bent de bewaker van de goede afloop.",
      "Methodisch werken: Je houdt van structuur en rust."
    ],
    mensgerichteKwaliteiten: [
      "Geduld: Je legt dingen graag nog een keer uit.",
      "Loyaliteit: Je bent een zeer trouwe medewerker.",
      "Discretie: Vertrouwelijke zaken zijn bij jou veilig.",
      "Ondersteuning: Je helpt anderen vanuit je eigen expertise."
    ],
    valkuilen: [
      "Moeilijk kunnen loslaten van regels als de situatie daarom vraagt.",
      "Verdrinken in details en bijzaken.",
      "Onzeker overkomen als er geen duidelijke kaders zijn.",
      "Angst hebben om risico's te nemen."
    ],
    behoeften: {
      belangrijk: "Veiligheid en correctheid",
      energieKost: ["Onvoorspelbaarheid", "Slordigheid", "Haastwerk", "Geen duidelijke regels"],
      benadering: ["Wees rustig en geduldig.", "Geef duidelijke instructies.", "Bied zekerheid.", "Toon respect voor hun grondigheid."]
    }
  }
};
