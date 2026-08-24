import type { Task } from './taskEngine';

type DeclutterInput = {
  id: string;
  roomId: string;
  title: string;
  minutes: number;
  recurrenceDays: number;
  priority: number;
  steps: string[];
  done?: string;
  childFriendly?: boolean;
  tools?: string[];
  warnings?: string[];
};

function declutterTask(input: DeclutterInput): Task {
  return {
    id: input.id,
    roomId: input.roomId,
    title: input.title,
    category: 'declutter',
    durationMinutes: input.minutes,
    effort: input.minutes >= 40 ? 2 : 1,
    tools: input.tools ?? ['Behållare för behålla', 'Påse för skänka', 'Påse för återvinning'],
    steps: input.steps,
    doneDefinition: [input.done ?? 'Den valda, avgränsade zonen innehåller bara sådant som ska vara kvar där.'],
    modes: ['declutter'],
    childFriendly: input.childFriendly ?? true,
    safetyWarnings: input.warnings,
    recurrenceDays: input.recurrenceDays,
    recommendationPriority: input.priority,
    recommendationReason: 'En liten avgränsad rensning frigör plats utan att hela hemmet behöver bli ett projekt.',
    weeklyRecommendation: true,
  };
}

export const declutterTasks: Task[] = [
  declutterTask({ id: 'declutter-kitchen-drawers', roomId: 'kitchen', title: 'Töm och dammsug kökslådorna', minutes: 45, recurrenceDays: 365, priority: 64,
    steps: ['Välj två eller tre sammanhängande lådor.', 'Töm, kasta skräp och flytta sådant som hör hemma någon annanstans.', 'Dammsug smulor och torka lådorna.', 'Lägg tillbaka det som används, grupperat efter funktion.'] }),
  declutterTask({ id: 'declutter-pantry-shelf', roomId: 'kitchen', title: 'Rensa en hylla i skafferiet', minutes: 25, recurrenceDays: 90, priority: 78,
    steps: ['Töm en enda hylla.', 'Kontrollera datum, skadedjur och skadade förpackningar.', 'Torka hyllan och slå ihop dubbletter.', 'Ställ det äldsta längst fram.'], warnings: ['Smaka inte på mat som verkar skadad eller angripen.'] }),
  declutterTask({ id: 'declutter-fridge', roomId: 'kitchen', title: 'Rensa kylskåpets öppnade burkar', minutes: 15, recurrenceDays: 30, priority: 82,
    steps: ['Ta ut öppnade burkar, såser och rester.', 'Kasta det som är dåligt eller saknar rimligt datum.', 'Torka spill på den berörda hyllan.', 'Ställ tillbaka det som ska ätas först längst fram.'], tools: ['Avfallspåse', 'Mikrofiberduk'] }),
  declutterTask({ id: 'declutter-freezer', roomId: 'kitchen', title: 'Inventera en fryslåda', minutes: 20, recurrenceDays: 90, priority: 70,
    steps: ['Ta en fryslåda i taget och arbeta snabbt.', 'Kasta trasiga eller oidentifierbara förpackningar.', 'Märk otydliga förpackningar med innehåll och datum.', 'Gruppera maten och skriv upp vad som bör användas snart.'], tools: ['Märkpenna', 'Frysetiketter', 'Kylväska'] }),
  declutterTask({ id: 'declutter-spices', roomId: 'kitchen', title: 'Rensa kryddor och smaksättare', minutes: 25, recurrenceDays: 180, priority: 56,
    steps: ['Samla alla kryddor från en zon.', 'Ta bort tomma och uppenbart gamla burkar.', 'Slå ihop säkra dubbletter och torka hyllan.', 'Ordna efter hur ofta de används.'] }),
  declutterTask({ id: 'declutter-food-containers', roomId: 'kitchen', title: 'Para ihop matlådor och lock', minutes: 20, recurrenceDays: 90, priority: 76,
    steps: ['Lägg fram alla matlådor och lock.', 'Para ihop dem.', 'Återvinn trasiga, skeva och ensamma delar.', 'Stapla de kompletta seten så de går att ta ut.'] }),
  declutterTask({ id: 'declutter-kitchen-gadgets', roomId: 'kitchen', title: 'Rensa köksredskap och dubletter', minutes: 30, recurrenceDays: 180, priority: 52,
    steps: ['Välj en redskapslåda eller ett skåp.', 'Lägg undan det som används varje vecka.', 'Skänk hela dubletter och oanvända specialredskap.', 'Ge varje kvarvarande redskap en tydlig plats.'] }),
  declutterTask({ id: 'declutter-mugs', roomId: 'kitchen', title: 'Rensa muggar och glas', minutes: 20, recurrenceDays: 365, priority: 38,
    steps: ['Ta ut muggar och glas från en hylla.', 'Sortera bort kantstötta och oanvända exemplar.', 'Skänk överskott som är helt och rent.', 'Ställ favoriterna mest åtkomligt.'], warnings: ['Hantera sprucket och kantstött glas med skyddade händer.'] }),
  declutterTask({ id: 'declutter-recipes', roomId: 'kitchen', title: 'Rensa recept, menyer och kokböcker', minutes: 25, recurrenceDays: 365, priority: 30,
    steps: ['Samla lösa recept och menyer.', 'Återvinn det som aldrig används.', 'Spara favoriter i en enda mapp eller digitalt.', 'Ställ kokböckerna så de går att nå.'] }),
  declutterTask({ id: 'declutter-makeup', roomId: 'upstairs-bathroom', title: 'Rensa bland sminket', minutes: 25, recurrenceDays: 90, priority: 80,
    steps: ['Samla sminket på en avtorkningsbar yta.', 'Kasta uttorkat, förändrat eller gammalt ögonmakeup.', 'Torka förpackningarnas utsidor och rengör förvaringen.', 'Lägg vardagsprodukterna längst fram.'], tools: ['Avfallspåse', 'Mikrofiberduk'], warnings: ['Dela inte ögonmakeup och använd inte produkter som luktar, ser ut eller känns förändrade.'] }),
  declutterTask({ id: 'declutter-skincare', roomId: 'upstairs-bathroom', title: 'Rensa hud- och hårprodukter', minutes: 25, recurrenceDays: 90, priority: 68,
    steps: ['Samla produkter från dusch och skåp.', 'Kasta tomma och förändrade produkter.', 'Välj ut sådant som faktiskt används.', 'Torka hyllan och ställ tillbaka efter användningsordning.'] }),
  declutterTask({ id: 'declutter-medicine', roomId: 'upstairs-bathroom', title: 'Gå igenom medicinskåpet', minutes: 30, recurrenceDays: 180, priority: 84,
    steps: ['Arbeta utan barn eller husdjur i närheten.', 'Sortera ut utgångna och överblivna läkemedel.', 'Lägg läkemedel som ska bort i en separat påse för apoteket.', 'Ordna kvarvarande förpackningar med etiketter synliga.'], childFriendly: false, tools: ['Påse för apoteksretur'], warnings: ['Läkemedel ska lämnas till apotek, inte spolas ner eller läggas bland hushållssopor. Förvara dem oåtkomligt för barn.'] }),
  declutterTask({ id: 'declutter-bathroom-drawer', roomId: 'downstairs-bathroom', title: 'Rensa en badrumslåda', minutes: 20, recurrenceDays: 90, priority: 62,
    steps: ['Töm en låda eller korg.', 'Kasta tomma förpackningar och flytta dubletter till lagerplats.', 'Torka ur förvaringen.', 'Lägg tillbaka bara det som används i rummet.'] }),
  declutterTask({ id: 'declutter-towels', roomId: 'upstairs-hall', title: 'Rensa handdukar och sänglinne', minutes: 30, recurrenceDays: 180, priority: 58,
    steps: ['Ta en kategori i taget.', 'Behåll rimligt antal hela set per person och säng.', 'Lägg utslitet textil till textilinsamling.', 'Vik och märk hyllorna efter kategori.'] }),
  declutterTask({ id: 'declutter-cleaning-products', roomId: 'laundry-room', title: 'Rensa bland rengöringsmedlen', minutes: 30, recurrenceDays: 180, priority: 74,
    steps: ['Läs etiketterna och samla liknande produkter.', 'Sortera ut tomma och okända behållare utan att blanda innehåll.', 'Lämna farligt avfall enligt kommunens anvisningar.', 'Förvara kvarvarande produkter upprätt och åtskilda.'], childFriendly: false, tools: ['Skyddshandskar', 'Låda för transport'], warnings: ['Blanda eller häll aldrig ihop kemikalier. Behåll originalförpackning och etikett.'] }),
  declutterTask({ id: 'declutter-cleaning-tools', roomId: 'laundry-room', title: 'Rensa trasor, borstar och städredskap', minutes: 20, recurrenceDays: 90, priority: 66,
    steps: ['Samla redskapen på en plats.', 'Kasta utslitna och trasiga delar.', 'Tvätta återanvändbara dukar och borstar.', 'Häng eller ställ tillbaka dem så de kan torka.'] }),
  declutterTask({ id: 'declutter-seasonal-clothes', roomId: 'bedroom-1', title: 'Gör ett säsongsbyte i garderoben', minutes: 45, recurrenceDays: 180, priority: 72,
    steps: ['Ta ut en klädkategori i taget.', 'Prova osäkra plagg och sortera bort fel storlek eller sådant som inte används.', 'Tvätta det som ska långtidsförvaras.', 'Lägg aktuell säsong åtkomligt och märk resten.'] }),
  declutterTask({ id: 'declutter-one-clothing-category', roomId: 'bedroom-2', title: 'Rensa en enda klädkategori', minutes: 25, recurrenceDays: 90, priority: 77,
    steps: ['Välj exempelvis tröjor, träningskläder eller byxor.', 'Lägg allt i kategorin på samma plats.', 'Behåll det som passar, används och mår bra.', 'Skänk hela plagg och lägg utslitet till textilinsamling.'] }),
  declutterTask({ id: 'declutter-shoes', roomId: 'middle-hall', title: 'Rensa skor i hallen', minutes: 25, recurrenceDays: 180, priority: 69,
    steps: ['Para ihop alla skor i hallzonen.', 'Ta bort trasiga, urvuxna och fel säsong.', 'Rengör hyllan.', 'Ställ bara aktuella skor i hallen.'] }),
  declutterTask({ id: 'declutter-outerwear', roomId: 'middle-hall', title: 'Rensa jackor, mössor och vantar', minutes: 30, recurrenceDays: 180, priority: 68,
    steps: ['Töm en krok- eller korgzon.', 'Para ihop handskar och prova osäkra storlekar.', 'Flytta fel säsong till märkt förvaring.', 'Behåll bara aktuell ytterklädsel i entrén.'] }),
  declutterTask({ id: 'declutter-outgrown-kids-clothes', roomId: 'bedroom-3', title: 'Fånga urvuxna barnkläder', minutes: 30, recurrenceDays: 90, priority: 79,
    steps: ['Välj en låda eller klädkategori tillsammans.', 'Sortera det som är urvuxet eller inte används.', 'Dela i ärva, skänka och textilinsamling.', 'Märk nästa storlek och lägg den åtkomligt.'], childFriendly: true }),
  declutterTask({ id: 'declutter-socks', roomId: 'bedroom-4', title: 'Lös strumpornas mysterium', minutes: 15, recurrenceDays: 90, priority: 60,
    steps: ['Samla lösa strumpor från tvätt och lådor.', 'Para ihop allt som går.', 'Ge ensamma strumpor en tidsbegränsad väntpåse.', 'Textilåtervinn trasiga par.'] }),
  declutterTask({ id: 'declutter-bedside', roomId: 'bedroom-1', title: 'Rensa sängbordet', minutes: 15, recurrenceDays: 90, priority: 54,
    steps: ['Töm ovansida och låda.', 'Flytta disk, papper och saker som hör hemma annanstans.', 'Kasta skräp och torka ytorna.', 'Lägg tillbaka bara kvällens och morgonens saker.'] }),
  declutterTask({ id: 'declutter-cables', roomId: 'cinema-office', title: 'Rensa kablar och laddare', minutes: 35, recurrenceDays: 180, priority: 75,
    steps: ['Koppla inte ur utrustning som används.', 'Samla lösa, fristående kablar och laddare.', 'Identifiera och märk det som ska sparas.', 'Lämna okända och trasiga delar till elavfallsinsamling.'], childFriendly: false, tools: ['Etiketter', 'Kabelband', 'Låda för elavfall'], warnings: ['Använd aldrig skadade kablar och lägg inte elektronik i hushållssoporna.'] }),
  declutterTask({ id: 'declutter-electronics', roomId: 'cinema-office', title: 'Rensa gamla teknikprylar', minutes: 40, recurrenceDays: 180, priority: 73,
    steps: ['Samla oanvänd småelektronik från en zon.', 'Separera sådant som används, kan säljas eller ska återvinnas.', 'Radera personuppgifter innan enheter lämnar hemmet.', 'Lägg tillbehör tillsammans med rätt enhet.'], childFriendly: false, tools: ['Låda för elavfall', 'Etiketter'], warnings: ['Svullna eller skadade batterier ska hanteras enligt kommunens säkerhetsanvisningar.'] }),
  declutterTask({ id: 'declutter-batteries', roomId: 'cinema-office', title: 'Samla batterier och elavfall', minutes: 15, recurrenceDays: 90, priority: 81,
    steps: ['Samla lösa batterier och smått elavfall.', 'Tejpa polerna på lösa litiumbatterier vid behov.', 'Förvara dem i lämplig behållare.', 'Planera nästa tur till godkänd insamling.'], childFriendly: false, tools: ['Icke-metallisk behållare', 'Tejp'], warnings: ['Förvara skadade eller svullna batterier brandsäkert och följ lokala instruktioner.'] }),
  declutterTask({ id: 'declutter-paper-inbox', roomId: 'cinema-office', title: 'Töm pappersinkorgen', minutes: 20, recurrenceDays: 30, priority: 83,
    steps: ['Samla posten och lösa papper från en zon.', 'Återvinn reklam och dubletter.', 'Skapa en liten hög för åtgärd och en för arkivering.', 'Utför det som tar under två minuter direkt.'], tools: ['Pappersåtervinning', 'Mapp för åtgärd'] }),
  declutterTask({ id: 'declutter-binders', roomId: 'cinema-office', title: 'Rensa en pärm', minutes: 30, recurrenceDays: 365, priority: 61,
    steps: ['Välj exakt en pärm.', 'Ta bort dubletter och handlingar som inte längre behöver sparas.', 'Strimla känsliga papper.', 'Märk flikar och sätt nyaste handlingen på rätt plats.'], childFriendly: false, tools: ['Pappersåtervinning', 'Dokumentförstörare eller säker rivpåse'], warnings: ['Kontrollera lagringskrav för avtal, skatt och garantier innan något förstörs.'] }),
  declutterTask({ id: 'declutter-manuals', roomId: 'cinema-office', title: 'Rensa manualer, kvitton och garantier', minutes: 30, recurrenceDays: 365, priority: 55,
    steps: ['Samla dokument för produkter som inte längre finns kvar.', 'Kontrollera garantier innan något kastas.', 'Spara relevanta dokument i en märkt mapp eller digitalt.', 'Återvinn resten säkert.'], childFriendly: false }),
  declutterTask({ id: 'declutter-desk-drawer', roomId: 'cinema-office', title: 'Rensa en skrivbordslåda', minutes: 20, recurrenceDays: 90, priority: 65,
    steps: ['Töm en låda helt.', 'Provskriv pennor och kasta skräp.', 'Flytta dubletter till gemensamt lager.', 'Torka och lägg tillbaka efter funktion.'] }),
  declutterTask({ id: 'declutter-books', roomId: 'living-room', title: 'Rensa böcker och tidskrifter', minutes: 30, recurrenceDays: 180, priority: 50,
    steps: ['Välj en enda hylla eller tidningshög.', 'Behåll favoriter och sådant som faktiskt ska läsas.', 'Skänk hela böcker och återvinn gamla tidskrifter.', 'Damma hyllan innan återställning.'] }),
  declutterTask({ id: 'declutter-games', roomId: 'living-room', title: 'Rensa spel och pussel', minutes: 30, recurrenceDays: 180, priority: 49,
    steps: ['Välj en spelhylla.', 'Kontrollera snabbt att viktiga delar finns.', 'Skänk kompletta spel som inte används.', 'Märk ofullständiga spel för reparation eller reservdelar.'], childFriendly: true }),
  declutterTask({ id: 'declutter-hobbies', roomId: 'cinema-office', title: 'Rensa en låda med hobbyprylar', minutes: 30, recurrenceDays: 180, priority: 53,
    steps: ['Välj en enda materialtyp eller låda.', 'Kasta uttorkat och trasigt material.', 'Skänk fungerande material som inte används.', 'Gruppera resten i genomskinlig eller märkt förvaring.'], childFriendly: true }),
  declutterTask({ id: 'declutter-mementos', roomId: 'basement-hall', title: 'Rensa en låda minnessaker', minutes: 45, recurrenceDays: 365, priority: 28,
    steps: ['Välj en enda låda och sätt en tidsgräns.', 'Behåll det som bär en konkret berättelse eller glädje.', 'Fotografera skrymmande minnen som inte behöver sparas fysiskt.', 'Märk och datera det som blir kvar.'], childFriendly: false }),
  declutterTask({ id: 'declutter-donation-exit', roomId: 'middle-hall', title: 'Töm skänka-vidare-zonen', minutes: 20, recurrenceDays: 30, priority: 86,
    steps: ['Samla allt som redan beslutats ska lämna hemmet.', 'Dela upp i skänka, sälja, återvinna och avfall.', 'Boka eller välj exakt mottagare.', 'Ställ det vid utgången eller lasta det direkt.'], done: 'Minst en beslutad kategori har faktiskt lämnat hemmet eller har en bokad hämtning.' }),
  declutterTask({ id: 'declutter-bags', roomId: 'middle-hall', title: 'Rensa väskor och ryggsäckar', minutes: 25, recurrenceDays: 180, priority: 57,
    steps: ['Töm fickor och kasta gamla kvitton och skräp.', 'Flytta saker till deras riktiga plats.', 'Skänk trasiga eller oanvända väskor som går att använda.', 'Förvara vardagsväskor lätt åtkomligt.'] }),
  declutterTask({ id: 'declutter-storage-box', roomId: 'basement-hall', title: 'Rensa en märkt förrådslåda', minutes: 40, recurrenceDays: 365, priority: 42,
    steps: ['Välj en enda låda vars innehåll går att avsluta idag.', 'Töm och gruppera innehållet.', 'Skänk, återvinn eller kasta det som inte ska sparas.', 'Lägg tillbaka och märk lådan med faktiskt innehåll.'], warnings: ['Öppna inte behållare med okända kemikalier eller tecken på skadedjur utan rätt skydd.'] }),
];
