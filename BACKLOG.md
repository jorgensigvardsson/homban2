# Ring På backlogg

Produktbacklogg för Ring På. Arbeta i en iteration i taget och håll varje steg körbart.

## Nuvarande beslut

- Frontend, uppgiftslogik, gamification och innehåll drivs av Malin.
- Databas och senare synk ansvaras av Jörgen.
- Första versionen ska fungera utan databas med lokal tillfällig state.
- Appen ska anpassa sig efter användarens boende, hushåll och vardag.
- Fräschör och lättnad prioriteras framför perfektion, streaks och skuld.

## Nästa steg

### P0: Uppgiftsmotor för Ring Pås eget hus

- [ ] Skapa stabila typer för `Room`, `Task`, `HouseholdMember`, `Assignment` och `CleaningSession`.
- [x] Modellera övervåning, mellanvåning, bottenvåning/källare, altan och biorum/kontor.
- [x] Modellera barn som frivilliga deltagare; ålder används inte som tvingande uppgiftsfilter.
- [x] Bygg uppgiftsbank för kök, hall, vardagsrum, badrum, sovrum och tvättstuga.
- [x] Prioritera efter läge, tidsåtgång, synlighet, hygien, golv och lukt.
- [x] Låt Gäster snart prioritera fasad: plock, hallgolv, snabbdammsugning, sopor och vädring framför detaljrengöring.
- [x] Erbjud en dold, frivillig bonusuppgift med uppskattad extra fräschör när ordinarie pass blir klart med tid kvar.
- [x] Visa aktivitetens varför först och lista delstegen utan separat avbockning; endast hela aktiviteten markeras klar.
- [x] Fördela uppgifter parallellt efter deltagare och svårighetsgrad; barn deltar endast frivilligt.
- [ ] Lägg till `Hoppa över`, `Värre än väntat` och `Saknar utrustning`.
- [x] Visa varför en uppgift valdes och vad som räknas som klart.
- [ ] Lägg tester för prioritering, tidsbegränsning, åldersgränser och dubbla tilldelningar.

### P1: Boendeprofil för framtida användare

Målet är att en ny användare ska kunna beskriva sitt hem utan att mötas av ett långt administrativt formulär.

- [ ] Skapa onboarding med stegvis boendeprofil.
- [ ] Fråga boendeform: villa, radhus, lägenhet, fritidshus eller annat.
- [ ] Fråga antal våningar och vilka delar som finns: entré, kök, vardagsrum, sovrum, badrum, tvätt, uteplats, förråd, kontor och liknande.
- [ ] Låt användaren döpa rum och välja rumstyp.
- [ ] Fråga ungefärlig storlek eller prioriteringsnivå, inte exakta kvadratmeter som krav.
- [ ] Fråga om öppna planlösningar, trappor, känsliga material och svåråtkomliga ytor.
- [ ] Fråga om hushållets personer, åldrar, roller och vad de kan eller vill göra.
- [ ] Fråga om husdjur, allergier och särskilda behov.
- [ ] Fråga om återkommande vardagsproblem: tvätt, disk, hår, kattsand, lukt, förvaring eller annat.
- [ ] Låt användaren välja ambitionsnivå: snabbt, normalt eller grundligt.
- [ ] Skapa en begriplig sammanfattning: "Så här har vi förstått ditt hem".
- [ ] Gör profilen redigerbar utan att hela onboarding behöver göras om.
- [ ] Skapa en första uppgiftsbank automatiskt från profilen.
- [ ] Testa onboarding från tom profil till första användbara pass.

### P1: Lokal data före databas

- [ ] Inför stabila ID:n för rum, uppgifter, personer och sessioner.
- [ ] Flytta seedad data från komponenten till separata domänfiler.
- [ ] Spara boendeprofil och genomförda pass lokalt.
- [ ] Lägg till export/import som JSON.
- [ ] Förbered datamodellen för framtida synk utan att bygga konto eller moln ännu.

### P2: Familj och gamification

- [ ] Profilväljare för vuxen- och barnläge.
- [ ] Barn ser bara sina egna tydliga uppdrag.
- [ ] Veckouppdrag med likvärdiga bytesalternativ.
- [ ] Neutral återkoppling på faktisk insats, aldrig poängliga eller skam.
- [ ] Fräschörspoäng som förklarar effekt, inte prestation.
- [ ] Små uppdrag efter dagsform: 3, 5, 8 eller 12 minuter.
- [ ] Val som "snabbast synliga förbättring", "bara plock" och "värsta först".
- [ ] Återhämtning av pågående pass efter omladdning.

### P2: Proffskort och säkerhet

- [ ] Verktyg, produkter, steg, verkningstid och definition av klart per uppgift.
- [ ] Materialprofiler för glashäll, rostfritt, trä, textil och våtrum.
- [ ] Städskåp med saknad utrustning och inköpslista.
- [ ] Hård säkerhetsregel mot att blanda klorin med syror, ammoniak eller andra medel.
- [ ] Säkra alternativ när en produkt saknas.

### P2: Tvätt, katt och lukt

- [ ] Tvättflöde: sorterad, tvättad, torkad, vikt, utdelad och undanlagd.
- [ ] Ägare och nästa ansvarig för varje tvättomgång.
- [ ] Varning när ren tvätt väntar innan ny maskin startas.
- [ ] Kattincident med plats, material, datum och uppföljning.
- [ ] Enzymrengöring och tydliga varningar för klorin, ammoniak, ånga och eteriska oljor.
- [ ] Doftdiagnos som söker källa före parfym.
- [ ] Rekommendation om veterinärbedömning vid återkommande urinering inne.

### P3: Kommersiell produkt

- [ ] Separera hushållsdata från appens systemdata.
- [ ] Konto och säker inloggning när lokalversionen är beprövad.
- [ ] Synk mellan familjemedlemmar.
- [ ] Versionshantering och migrering av boendeprofiler.
- [ ] Integritetsflöde: export, radering och tydlig information om vad som sparas.
- [ ] Tillgänglig onboarding och test på mobil viewport.
- [ ] PWA/offline-stöd för kärnflöden.
- [ ] Mät vilka uppgifter som faktiskt hjälper användaren, utan att göra hemmet till en prestationsdashboard.

## Frågor att avgöra senare

- Ska boendeprofilen kunna skapas helt manuellt, eller även från en snabb "berätta om ditt hem"-intervju?
- Ska rum kunna grupperas efter våning, eller även efter vardagsflöde som "gäster", "tvätt" och "ute"?
- Ska användaren kunna dela ett hushåll med flera konton direkt, eller först använda profilväljare på samma enhet?
- Vilken information måste vara obligatorisk för att skapa ett första pass?
- Vilken gamification känns belönande utan att skapa press?

## Definition of done för varje punkt

- Ett användarflöde fungerar från start till mål.
- Smalaste relevanta tester är skrivna och passerar.
- `npm run check` och `npm test` passerar.
- Flödet är provat på mobilbredd.
- Kända begränsningar är dokumenterade här eller i produktbriefen.
